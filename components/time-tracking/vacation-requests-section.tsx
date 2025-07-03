"use client"

import { useState, useEffect } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { Button } from "@/components/ui/button"

import { Badge } from "@/components/ui/badge"

import { Label } from "@/components/ui/label"

import { Textarea } from "@/components/ui/textarea"

import { Input } from "@/components/ui/input"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { useVacationRequests, type VacationType, type VacationStatus } from "@/hooks/use-vacation-requests"

import { useToast } from "@/hooks/use-toast"

import { format, differenceInDays, parseISO } from "date-fns"

import { es } from "date-fns/locale"

import { Plus, Check, X, Clock, Filter, UserPlus, Calendar, FileText } from "lucide-react"

interface GeneralRequestsSectionProps {
  userProfile: any
  isAdmin: boolean
  selectedUser?: any
  organizationUsers: any[]
}

const REQUEST_TYPES = [
  { value: "vacation" as VacationType, label: "Vacaciones", color: "bg-blue-500", icon: "🏖️" },
  { value: "sick_leave" as VacationType, label: "Baja médica", color: "bg-red-500", icon: "🏥" },
  { value: "personal" as VacationType, label: "Asunto personal", color: "bg-yellow-500", icon: "👤" },
  { value: "maternity" as VacationType, label: "Maternidad/Paternidad", color: "bg-pink-500", icon: "👶" },
  { value: "training" as VacationType, label: "Formación", color: "bg-green-500", icon: "📚" },
  { value: "other" as VacationType, label: "Otros", color: "bg-gray-500", icon: "📋" },
]

export function GeneralRequestsSection({
  userProfile,
  isAdmin,
  selectedUser,
  organizationUsers,
}: GeneralRequestsSectionProps) {
  const { requests, loading, createRequest, updateRequestStatus, getRequests } = useVacationRequests()
  const { toast } = useToast()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    user_id: "",
    type: "" as VacationType,
    start_date: "",
    end_date: "",
    reason: "",
  })

  // Añadir este estado al inicio del componente, después de los otros useState
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filtros
  const [filters, setFilters] = useState({
    status: "all",
    type: "all",
    user: "all",
  })

  useEffect(() => {
    if (userProfile?.organization_id) {
      getRequests(userProfile.organization_id, isAdmin ? undefined : userProfile.id)
    }
  }, [userProfile, isAdmin])

  // Resetear formulario cuando se abre el diálogo
  useEffect(() => {
    if (isDialogOpen) {
      const today = new Date().toISOString().split("T")[0]
      setFormData({
        user_id: isAdmin ? "" : userProfile?.id || "",
        type: "" as VacationType,
        start_date: today,
        end_date: today,
        reason: "",
      })
    }
  }, [isDialogOpen, isAdmin, userProfile])

  const handleSubmit = async () => {
    console.log("=== INICIO handleSubmit ===")
    console.log("formData:", formData)
    console.log("userProfile:", userProfile)
    console.log("isAdmin:", isAdmin)

    const targetUserId = isAdmin ? formData.user_id : userProfile.id
    console.log("targetUserId:", targetUserId)

    // Validaciones más detalladas
    if (!formData.type) {
      console.log("Error: Tipo no seleccionado")
      toast({
        title: "Error",
        description: "Por favor selecciona el tipo de solicitud",
        variant: "destructive",
      })
      return
    }

    if (!formData.start_date) {
      console.log("Error: Fecha de inicio no seleccionada")
      toast({
        title: "Error",
        description: "Por favor selecciona la fecha de inicio",
        variant: "destructive",
      })
      return
    }

    if (!formData.end_date) {
      console.log("Error: Fecha de fin no seleccionada")
      toast({
        title: "Error",
        description: "Por favor selecciona la fecha de fin",
        variant: "destructive",
      })
      return
    }

    if (isAdmin && !targetUserId) {
      console.log("Error: Usuario no seleccionado (admin)")
      toast({
        title: "Error",
        description: "Por favor selecciona un usuario",
        variant: "destructive",
      })
      return
    }

    if (!userProfile?.organization_id) {
      console.log("Error: No hay organization_id")
      toast({
        title: "Error",
        description: "No se pudo obtener la información de la organización",
        variant: "destructive",
      })
      return
    }

    try {
      const startDate = parseISO(formData.start_date)
      const endDate = parseISO(formData.end_date)
      console.log("startDate:", startDate)
      console.log("endDate:", endDate)

      if (startDate > endDate) {
        console.log("Error: Fechas inválidas")
        toast({
          title: "Error",
          description: "La fecha de fin debe ser igual o posterior a la fecha de inicio",
          variant: "destructive",
        })
        return
      }

      const totalDays = differenceInDays(endDate, startDate) + 1
      console.log("totalDays:", totalDays)

      const requestData = {
        user_id: targetUserId,
        organization_id: userProfile.organization_id,
        type: formData.type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        total_days: totalDays,
        reason: formData.reason,
        status: (isAdmin ? "approved" : "pending") as VacationStatus,
      }

      console.log("requestData a enviar:", requestData)

      // Mostrar loading
      toast({
        title: "Creando solicitud...",
        description: "Por favor espera",
      })

      const result = await createRequest(requestData)
      console.log("Resultado createRequest:", result)

      const targetUser = organizationUsers.find((u) => u.id === targetUserId)
      const userName = targetUser?.name || targetUser?.email || "usuario"

      toast({
        title: "✅ Solicitud creada exitosamente",
        description: isAdmin
          ? `Solicitud creada y aprobada para ${userName}`
          : "Tu solicitud ha sido enviada correctamente",
      })

      setIsDialogOpen(false)

      // Limpiar formulario
      setFormData({
        user_id: "",
        type: "" as VacationType,
        start_date: "",
        end_date: "",
        reason: "",
      })

      // Recargar solicitudes
      console.log("Recargando solicitudes...")
      await getRequests(userProfile.organization_id, isAdmin ? undefined : userProfile.id)
      console.log("Solicitudes recargadas")
    } catch (error) {
      console.error("=== ERROR en handleSubmit ===", error)

      // Mostrar error más detallado
      const errorMessage = error instanceof Error ? error.message : "Error desconocido"

      toast({
        title: "❌ Error al crear la solicitud",
        description: `Detalles: ${errorMessage}`,
        variant: "destructive",
      })
    }

    console.log("=== FIN handleSubmit ===")
  }

  const handleStatusUpdate = async (requestId: string, status: "approved" | "rejected") => {
    try {
      await updateRequestStatus(requestId, status)
      toast({
        title: "Estado actualizado",
        description: `Solicitud ${status === "approved" ? "aprobada" : "rechazada"} correctamente`,
      })
      getRequests(userProfile.organization_id, isAdmin ? undefined : userProfile.id)
    } catch (error) {
      console.error("Error updating status:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
            <Clock className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="outline" className="text-green-600 border-green-600">
            <Check className="h-3 w-3 mr-1" />
            Aprobado
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="outline" className="text-red-600 border-red-600">
            <X className="h-3 w-3 mr-1" />
            Rechazado
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTypeInfo = (type: VacationType) => {
    return REQUEST_TYPES.find((t) => t.value === type) || REQUEST_TYPES[REQUEST_TYPES.length - 1]
  }

  // Filtrar solicitudes
  const filteredRequests = requests.filter((request) => {
    if (filters.status !== "all" && request.status !== filters.status) return false
    if (filters.type !== "all" && request.type !== filters.type) return false
    if (filters.user !== "all" && request.user_id !== filters.user) return false
    return true
  })

  // Estadísticas
  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  }

  // Calcular días totales cuando cambien las fechas
  const calculateDays = () => {
    if (formData.start_date && formData.end_date) {
      const startDate = parseISO(formData.start_date)
      const endDate = parseISO(formData.end_date)
      if (endDate >= startDate) {
        return differenceInDays(endDate, startDate) + 1
      }
    }
    return 0
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total solicitudes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-sm text-muted-foreground">Pendientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-sm text-muted-foreground">Aprobadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <p className="text-sm text-muted-foreground">Rechazadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Header con botón de nueva solicitud */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Solicitudes
          </h2>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Gestiona las solicitudes de tu organización" : "Gestiona tus solicitudes"}
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              {isAdmin ? <UserPlus className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              {isAdmin ? "Añadir Solicitud" : "Nueva Solicitud"}
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {isAdmin ? "Añadir Solicitud a Usuario" : "Nueva Solicitud"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Selector de usuario (solo para admins) */}
              {isAdmin && (
                <div>
                  <Label htmlFor="user">Usuario *</Label>
                  <Select
                    value={formData.user_id}
                    onValueChange={(value) => setFormData({ ...formData, user_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizationUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="type">Tipo de solicitud *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: VacationType) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {REQUEST_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <span>{type.icon}</span>
                          <div className={`w-3 h-3 rounded-full ${type.color}`} />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Fecha de inicio *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    min={!isAdmin ? new Date().toISOString().split("T")[0] : undefined}
                    className="w-full"
                  />
                </div>

                <div>
                  <Label htmlFor="end_date">Fecha de fin *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    min={formData.start_date || (!isAdmin ? new Date().toISOString().split("T")[0] : undefined)}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Mostrar días calculados */}
              {formData.start_date && formData.end_date && calculateDays() > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">
                      Total de días: {calculateDays()} día{calculateDays() !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="text-sm text-blue-600 mt-1">
                    Del {format(parseISO(formData.start_date), "dd/MM/yyyy", { locale: es })} al{" "}
                    {format(parseISO(formData.end_date), "dd/MM/yyyy", { locale: es })}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="reason">Motivo (opcional)</Label>
                <Textarea
                  id="reason"
                  placeholder="Describe el motivo de la solicitud (opcional)..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  onClick={async () => {
                    setIsSubmitting(true)
                    await handleSubmit()
                    setIsSubmitting(false)
                  }}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {isAdmin ? "Creando..." : "Enviando..."}
                    </>
                  ) : isAdmin ? (
                    "Crear y Aprobar"
                  ) : (
                    "Enviar Solicitud"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Estado</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="approved">Aprobadas</SelectItem>
                  <SelectItem value="rejected">Rechazadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {REQUEST_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isAdmin && (
              <div>
                <Label>Usuario</Label>
                <Select value={filters.user} onValueChange={(value) => setFilters({ ...filters, user: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {organizationUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabla de solicitudes */}
      <Card>
        <CardHeader>
          <CardTitle>Solicitudes ({filteredRequests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Cargando solicitudes...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No hay solicitudes que mostrar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {isAdmin && <TableHead>Usuario</TableHead>}
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fechas</TableHead>
                  <TableHead>Días</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Motivo</TableHead>
                  {isAdmin && <TableHead>Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => {
                  const typeInfo = getTypeInfo(request.type)
                  const user = organizationUsers.find((u) => u.id === request.user_id)

                  return (
                    <TableRow key={request.id}>
                      {isAdmin && (
                        <TableCell>
                          <div className="font-medium">{user?.name || user?.email || "Usuario desconocido"}</div>
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{typeInfo.icon}</span>
                          <div className={`w-3 h-3 rounded-full ${typeInfo.color}`} />
                          {typeInfo.label}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{format(new Date(request.start_date), "dd/MM/yyyy", { locale: es })}</div>
                          <div className="text-muted-foreground">
                            {format(new Date(request.end_date), "dd/MM/yyyy", { locale: es })}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{request.total_days} días</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate" title={request.reason}>
                          {request.reason}
                        </div>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          {request.status === "pending" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 border-green-600 hover:bg-green-50 bg-transparent"
                                onClick={() => handleStatusUpdate(request.id, "approved")}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-600 hover:bg-red-50 bg-transparent"
                                onClick={() => handleStatusUpdate(request.id, "rejected")}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
