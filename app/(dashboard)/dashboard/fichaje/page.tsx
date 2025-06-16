"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TimeClock } from "@/components/time-tracking/time-clock"
import { useTimeTracking } from "@/hooks/use-time-tracking"
import { Clock, Users, FileText, Download, Calendar, Eye, ChevronLeft, ChevronRight, Shield } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function FichajePage() {
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [lastEntry, setLastEntry] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [organizationId, setOrganizationId] = useState<number | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userWorkDays, setUserWorkDays] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const [pageSize, setPageSize] = useState(30)
  const [loadingRecords, setLoadingRecords] = useState(false)

  const timeTracking = useTimeTracking(organizationId || 0)
  const { toast } = useToast()

  // Obtener organización del usuario actual
  useEffect(() => {
    getCurrentUserOrganization()
  }, [])

  // Cargar usuarios cuando tengamos organization_id
  useEffect(() => {
    if (organizationId) {
      loadUsers()
    }
  }, [organizationId, isAdmin, currentUser])

  // Cargar registros cuando cambie la página o el tamaño
  useEffect(() => {
    if (organizationId && currentUserId) {
      loadUserWorkDays()
    }
  }, [organizationId, currentUserId, currentPage, pageSize])

  // Cargar último fichaje cuando se selecciona empleado
  useEffect(() => {
    if (selectedUser && organizationId) {
      timeTracking.getLastEntry(selectedUser.id).then(setLastEntry)
    }
  }, [selectedUser, organizationId])

  // Auto-seleccionar usuario si no es admin
  useEffect(() => {
    if (currentUser) {
      if (isAdmin) {
        // Los admins no tienen auto-selección, deben elegir
        setSelectedUser(null)
      } else {
        // Los usuarios normales se auto-seleccionan
        setSelectedUser(currentUser)
      }
    }
  }, [isAdmin, currentUser])

  const getCurrentUserOrganization = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("users")
        .select("id, organization_id, name, email, role")
        .eq("id", user.id)
        .single()

      if (error) throw error

      console.log("Usuario actual:", data)
      setOrganizationId(data.organization_id)
      setCurrentUserId(user.id)
      setCurrentUser(data)
      setIsAdmin(data.role === "admin")
    } catch (err) {
      console.error("Error getting organization:", err)
      toast({
        title: "Error",
        description: "No se pudo obtener la organización del usuario",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    if (!organizationId) return

    // Solo los admins pueden ver todos los usuarios
    if (isAdmin) {
      const userData = await timeTracking.getOrganizationUsers()
      console.log("Usuarios cargados (admin):", userData)
      setUsers(userData)
    } else {
      // Los usuarios normales solo se ven a sí mismos
      if (currentUser) {
        setUsers([currentUser])
        console.log("Usuario cargado (user):", currentUser)
      }
    }
  }

  const loadUserWorkDays = async () => {
    if (!organizationId || !currentUserId) return

    setLoadingRecords(true)
    try {
      // Calcular offset para paginación
      const offset = (currentPage - 1) * pageSize

      // Obtener total de registros (solo los que el usuario puede ver)
      const { count } = await supabase
        .from("simple_work_days")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("user_id", currentUserId) // Solo sus propios registros

      setTotalRecords(count || 0)
      setTotalPages(Math.ceil((count || 0) / pageSize))

      // Obtener registros paginados usando la vista segura
      const { data, error } = await supabase
        .from("work_days_with_user_secure")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("user_id", currentUserId) // Solo sus propios registros
        .order("work_date", { ascending: false })
        .range(offset, offset + pageSize - 1)

      if (error) throw error
      setUserWorkDays(data || [])
    } catch (err) {
      console.error("Error loading user work days:", err)
      toast({
        title: "Error",
        description: "No se pudieron cargar los registros",
        variant: "destructive",
      })
    } finally {
      setLoadingRecords(false)
    }
  }

  const handleClockInOut = async (userId: string, type: "entrada" | "salida") => {
    if (!organizationId) return
    const result = await timeTracking.clockInOut(userId, type)

    if (result.success) {
      // Recargar último fichaje
      const newEntry = await timeTracking.getLastEntry(userId)
      setLastEntry(newEntry)

      // Si es el usuario actual, recargar sus registros
      if (userId === currentUserId) {
        loadUserWorkDays()
      }

      toast({
        title: type === "entrada" ? "✅ Entrada registrada" : "✅ Salida registrada",
        description: `Fichaje de ${type} guardado correctamente`,
      })
    }
  }

  const generateReport = async () => {
    if (!organizationId || !isAdmin) {
      toast({
        title: "❌ Sin permisos",
        description: "Solo los administradores pueden generar reportes generales",
        variant: "destructive",
      })
      return
    }

    const endDate = new Date().toISOString().split("T")[0]
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

    const report = await timeTracking.getWorkDays(startDate, endDate)

    // Generar CSV
    const csv = [
      "Usuario,Email,Fecha,Entrada,Salida,Horas",
      ...report.map(
        (r) =>
          `${r.user_name},${r.user_email},${r.work_date},${r.entry_time || ""},${r.exit_time || ""},${r.total_hours}`,
      ),
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `fichajes_${startDate}_${endDate}.csv`
    a.click()

    toast({
      title: "📊 Reporte generado",
      description: "Archivo CSV descargado correctamente",
    })
  }

  const generateUserReport = async () => {
    if (!currentUserId || !organizationId) return

    setLoadingRecords(true)
    try {
      // Obtener TODOS los registros del usuario (sin paginación)
      const { data, error } = await supabase
        .from("work_days_with_user_secure")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("user_id", currentUserId)
        .order("work_date", { ascending: false })

      if (error) throw error

      const csv = [
        "Fecha,Entrada,Salida,Horas Trabajadas",
        ...(data || []).map(
          (day) => `${day.work_date},${day.entry_time || ""},${day.exit_time || ""},${day.total_hours || 0}`,
        ),
      ].join("\n")

      const blob = new Blob([csv], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `mis_fichajes_completos_${new Date().toISOString().split("T")[0]}.csv`
      a.click()

      toast({
        title: "📊 Reporte completo generado",
        description: `${data?.length || 0} registros descargados correctamente`,
      })
    } catch (err) {
      console.error("Error generating user report:", err)
      toast({
        title: "Error",
        description: "No se pudo generar el reporte",
        variant: "destructive",
      })
    } finally {
      setLoadingRecords(false)
    }
  }

  // Formatear hora completa con segundos
  const formatTimeComplete = (timeString: string | null) => {
    if (!timeString) return "--:--:--"
    if (timeString.includes(":") && timeString.split(":").length === 3) {
      return timeString
    }
    if (timeString.includes(":") && timeString.split(":").length === 2) {
      return `${timeString}:00`
    }
    return timeString
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const changePageSize = (newSize: string) => {
    setPageSize(Number.parseInt(newSize))
    setCurrentPage(1)
  }

  if (loading) {
    return <div className="flex justify-center p-8">Cargando organización...</div>
  }

  if (!organizationId) {
    return (
      <div className="flex justify-center p-8">
        <div className="text-center">
          <p className="text-red-500">Error: No se pudo obtener la organización del usuario</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">📋 Control Horario</h1>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground">Sistema básico conforme RD-ley 8/2019</p>
            {isAdmin && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Administrador
              </Badge>
            )}
          </div>
        </div>
        {isAdmin && (
          <Button onClick={generateReport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Descargar Reporte General
          </Button>
        )}
      </div>

      <Tabs defaultValue="fichaje" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="fichaje" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Fichar
          </TabsTrigger>
          <TabsTrigger value="registros" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Mis Registros
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fichaje" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lista de empleados - Solo visible para admins */}
            {isAdmin ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Seleccionar Empleado ({users.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {users.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No hay empleados en tu organización</p>
                  ) : (
                    users.map((user) => (
                      <Button
                        key={user.id}
                        variant={selectedUser?.id === user.id ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={() => setSelectedUser(user)}
                      >
                        <div className="flex justify-between w-full">
                          <span>{user.name}</span>
                          <div className="flex items-center gap-2">
                            {user.role === "admin" && (
                              <Badge variant="secondary" className="text-xs">
                                Admin
                              </Badge>
                            )}
                            {user.role === "user" && (
                              <Badge variant="outline" className="text-xs">
                                Usuario
                              </Badge>
                            )}
                            {user.id === currentUserId && (
                              <Badge variant="default" className="text-xs">
                                Tú
                              </Badge>
                            )}
                            <span className="text-xs opacity-70">{user.email}</span>
                          </div>
                        </div>
                      </Button>
                    ))
                  )}
                </CardContent>
              </Card>
            ) : (
              // Para usuarios normales, mostrar solo su información
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Mi Perfil
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{currentUser?.name}</p>
                        <p className="text-sm text-muted-foreground">{currentUser?.email}</p>
                      </div>
                      <Badge variant="outline">Usuario</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reloj de fichaje */}
            <div>
              {selectedUser ? (
                <TimeClock user={selectedUser} lastEntry={lastEntry} onClockInOut={handleClockInOut} />
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center h-64">
                    <div className="text-center text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>{isAdmin ? "Selecciona un empleado para fichar" : "Cargando tu perfil..."}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="registros" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Mis Registros de Fichaje
                  <Badge variant="outline" className="ml-2">
                    {totalRecords} registros totales
                  </Badge>
                </CardTitle>
                <Button onClick={generateUserReport} variant="outline" size="sm" disabled={loadingRecords}>
                  <Download className="h-4 w-4 mr-2" />
                  {loadingRecords ? "Generando..." : "Descargar TODOS mis fichajes"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {totalRecords === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No tienes registros de fichaje aún</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Controles de paginación superior */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Mostrar:</span>
                      <Select value={pageSize.toString()} onValueChange={changePageSize}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="30">30</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">por página</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1 || loadingRecords}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        Página {currentPage} de {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages || loadingRecords}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Resumen de la página actual */}
                  {userWorkDays.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{userWorkDays.length}</p>
                        <p className="text-sm text-muted-foreground">En esta página</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {userWorkDays.reduce((acc, day) => acc + (day.total_hours || 0), 0).toFixed(1)}h
                        </p>
                        <p className="text-sm text-muted-foreground">Horas en página</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600">{totalRecords}</p>
                        <p className="text-sm text-muted-foreground">Total histórico</p>
                      </div>
                    </div>
                  )}

                  {/* Tabla de registros */}
                  {loadingRecords ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Cargando registros...</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Entrada</TableHead>
                          <TableHead>Salida</TableHead>
                          <TableHead className="text-right">Horas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userWorkDays.map((day) => (
                          <TableRow key={day.id}>
                            <TableCell className="font-medium">{formatDate(day.work_date)}</TableCell>
                            <TableCell>
                              <Badge variant={day.entry_time ? "default" : "secondary"} className="font-mono">
                                {formatTimeComplete(day.entry_time)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={day.exit_time ? "default" : "outline"} className="font-mono">
                                {formatTimeComplete(day.exit_time)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {day.total_hours ? `${day.total_hours.toFixed(2)}h` : "--"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}

                  {/* Controles de paginación inferior */}
                  <div className="flex justify-center items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(1)}
                      disabled={currentPage === 1 || loadingRecords}
                    >
                      Primera
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1 || loadingRecords}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {/* Páginas numeradas */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                      if (pageNum > totalPages) return null
                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(pageNum)}
                          disabled={loadingRecords}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages || loadingRecords}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(totalPages)}
                      disabled={currentPage === totalPages || loadingRecords}
                    >
                      Última
                    </Button>
                  </div>

                  <div className="text-center text-sm text-muted-foreground">
                    Mostrando {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalRecords)} de{" "}
                    {totalRecords} registros
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Información legal */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Cumplimiento Legal y Privacidad
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="font-semibold">✅ Registro Obligatorio</p>
              <p className="text-muted-foreground">Hora entrada y salida</p>
            </div>
            <div>
              <p className="font-semibold">🗄️ Conservación</p>
              <p className="text-muted-foreground">4 años mínimo</p>
            </div>
            <div>
              <p className="font-semibold">👁️ Acceso Personal</p>
              <p className="text-muted-foreground">Solo tus registros</p>
            </div>
            <div>
              <p className="font-semibold">🔒 Privacidad</p>
              <p className="text-muted-foreground">Datos protegidos</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
