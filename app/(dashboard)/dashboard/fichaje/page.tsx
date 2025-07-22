"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TimeClockContainer } from "@/components/time-tracking/time-clock-container"
import { WorkSessionsTable } from "@/components/time-tracking/work-sessions-table"
import { WorkSessionsFilters } from "@/components/work-sessions-filters"
import { UserSelector } from "@/components/time-tracking/user-selector"
import { GeneralRequestsSection } from "@/components/time-tracking/vacation-requests-section"
import { VacationCalendarView } from "@/components/time-tracking/vacation-calendar-view"
import { useTimeTracking } from "@/hooks/use-time-tracking"
import { useVacationRequests } from "@/hooks/use-vacation-requests"
import { useToast } from "@/hooks/use-toast"
import { Clock, Users, Calendar, Shield, Plane, CalendarDays } from "lucide-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

export default function FichajePage() {
  const { userProfile, isAdmin, loading: userLoading, getWorkDays, getOrganizationUsers } = useTimeTracking()
  const { toast } = useToast()

  // Hook para obtener solicitudes de vacaciones y calcular badge
  const { requests } = useVacationRequests(
    userProfile?.organization_id ? Number(userProfile.organization_id) : undefined,
  )

  // Calcular solicitudes pendientes para el badge
  const pendingRequestsCount = requests.filter((request) => request.status === "pending").length

  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [organizationUsers, setOrganizationUsers] = useState<any[]>([])
  const [workSessions, setWorkSessions] = useState<any[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(false)

  // Estados para filtros de fecha
  const [startDate, setStartDate] = useState<string | undefined>()
  const [endDate, setEndDate] = useState<string | undefined>()

  // Añadir un estado simple para controlar la actualización de registros:
  const [refreshKey, setRefreshKey] = useState(0)

  // Crear una función simple para refrescar los datos:
  const refreshWorkSessions = () => {
    console.log("Refreshing work sessions...")
    setRefreshKey((prev) => prev + 1)
  }

  // Cargar usuarios de la organización si es admin
  useEffect(() => {
    const loadUsers = async () => {
      if (isAdmin && userProfile?.organization_id) {
        const result = await getOrganizationUsers()
        if (result.users) {
          setOrganizationUsers(result.users)
        }
      }
    }
    loadUsers()
  }, [isAdmin, userProfile])

  // Auto-seleccionar usuario si no es admin
  useEffect(() => {
    if (userProfile && !isAdmin) {
      setSelectedUser(userProfile)
    }
  }, [userProfile, isAdmin])

  // Cargar jornadas con filtros de fecha
  useEffect(() => {
    const loadWorkSessions = async () => {
      if (!userProfile?.organization_id) return

      setLoading(true)
      try {
        const result = await getWorkDays({
          userId: isAdmin ? selectedUser?.id : userProfile.id,
          organizationId: userProfile.organization_id,
          page: currentPage,
          pageSize: pageSize,
          startDate,
          endDate,
        })

        if (result.sessions) {
          setWorkSessions(result.sessions)
          setTotalRecords(result.totalRecords)
          setTotalPages(result.totalPages)
        }
      } catch (error) {
        console.error("Error loading work sessions:", error)
      } finally {
        setLoading(false)
      }
    }

    loadWorkSessions()
  }, [userProfile, currentPage, pageSize, isAdmin, selectedUser, startDate, endDate, refreshKey])

  const handlePageChange = (page: number, newPageSize: number) => {
    setCurrentPage(page)
    setPageSize(newPageSize)
  }

  // Manejar cambios de filtros
  const handleFiltersChange = (filters: { startDate?: string; endDate?: string }) => {
    setStartDate(filters.startDate)
    setEndDate(filters.endDate)
    setCurrentPage(1) // Resetear a la primera página cuando se aplican filtros
  }

  // Limpiar filtros
  const handleClearFilters = () => {
    setStartDate(undefined)
    setEndDate(undefined)
    setCurrentPage(1)
  }

  const formatMinutes = (minutes: number | null | undefined) => {
    if (!minutes || minutes === 0) return "0h 0m"
    const hours = Math.floor(Math.abs(minutes) / 60)
    const mins = Math.abs(minutes) % 60
    return `${hours}h ${mins}m`
  }

  const formatTime = (timeString: string | null) => {
    if (!timeString) return ""
    try {
      return format(parseISO(timeString), "HH:mm")
    } catch (error) {
      return ""
    }
  }

  const calculateNetTime = (session: any) => {
    if (!session.clock_in_time || !session.clock_out_time) {
      return null
    }

    if (session.total_minutes) {
      return session.total_minutes
    }

    try {
      const startTime = new Date(session.clock_in_time)
      const endTime = new Date(session.clock_out_time)
      const grossMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60))
      const pauseMinutes = session.total_pause_minutes ?? 0
      return grossMinutes - pauseMinutes
    } catch {
      return null
    }
  }

  const handleExportData = async () => {
    if (!userProfile?.organization_id) return

    try {
      // Cargar TODOS los registros para exportar (sin paginación)
      const result = await getWorkDays({
        userId: isAdmin ? selectedUser?.id : userProfile.id,
        organizationId: userProfile.organization_id,
        page: 1,
        pageSize: 10000, // Cargar todos
        startDate,
        endDate,
      })

      if (!result.sessions || result.sessions.length === 0) {
        toast({
          title: "Sin datos",
          description: "No hay registros para exportar",
          variant: "destructive",
        })
        return
      }

      // Definir columnas del CSV
      const headers = [
        "Fecha",
        ...(isAdmin ? ["Usuario", "Email"] : []),
        "Hora Entrada",
        "Hora Salida",
        "Número de Pausas",
        "Tiempo Total Pausas",
        "Tiempo Neto",
        "Estado",
        "Notas",
        "Fecha Creación",
        "Última Actualización",
      ]

      // Convertir datos a filas CSV
      const rows = result.sessions.map((session: any) => {
        const netTime = calculateNetTime(session)
        return [
          format(parseISO(session.work_date), "dd/MM/yyyy", { locale: es }),
          ...(isAdmin ? [session.user_name || "Sin nombre", session.user_email || ""] : []),
          formatTime(session.clock_in_time),
          formatTime(session.clock_out_time),
          session.pause_count?.toString() || "0",
          formatMinutes(session.total_pause_minutes),
          formatMinutes(netTime),
          !session.clock_in_time
            ? "Sin entrada"
            : !session.clock_out_time
              ? "En curso"
              : session.status === "complete"
                ? "Completado"
                : "Incompleto",
          session.notes || "",
          session.created_at ? format(parseISO(session.created_at), "dd/MM/yyyy HH:mm", { locale: es }) : "",
          session.updated_at ? format(parseISO(session.updated_at), "dd/MM/yyyy HH:mm", { locale: es }) : "",
        ]
      })

      // Crear contenido CSV
      const csvContent = [
        [`# Reporte de Jornadas Laborales`],
        [`# Generado el: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`],
        [`# Total de registros: ${result.sessions.length}`],
        [], // Línea vacía
        headers,
        ...rows,
      ]
        .filter((row) => row.length > 0)
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n")

      // Crear y descargar archivo
      const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `fichajes_${new Date().toISOString().split("T")[0]}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Exportación completada",
        description: `Se han exportado ${result.sessions.length} registros correctamente`,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al exportar datos"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  if (userLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  if (!userProfile) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card className="w-full max-w-md border-0 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-center text-red-500">Error al cargar usuario</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Control Horario</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-muted-foreground">Sistema de registro laboral y gestión de solicitudes</p>
            {isAdmin && (
              <Badge variant="secondary" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                Admin
              </Badge>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="fichaje" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-10">
          <TabsTrigger value="fichaje" className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" />
            Fichar
          </TabsTrigger>
          <TabsTrigger value="registros" className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4" />
            Registros
          </TabsTrigger>
          <TabsTrigger value="vacaciones" className="flex items-center gap-2 text-sm">
            <Plane className="h-4 w-4" />
            Solicitudes
            {pendingRequestsCount > 0 && (
              <Badge variant="destructive" className="h-5 min-w-[20px] text-xs bg-red-500 hover:bg-red-600 px-1.5 ml-1">
                {pendingRequestsCount > 99 ? "99+" : pendingRequestsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="calendario" className="flex items-center gap-2 text-sm">
            <CalendarDays className="h-4 w-4" />
            Calendario
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fichaje" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Selector de usuario (solo para admins) */}
            {isAdmin && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Empleados
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <UserSelector
                    users={organizationUsers}
                    selectedUser={selectedUser}
                    onSelectUser={setSelectedUser}
                    currentUserId={userProfile.id}
                  />
                </CardContent>
              </Card>
            )}

            {/* Reloj de fichaje */}
            <div className={isAdmin ? "lg:col-span-2" : "lg:col-span-3"}>
              <TimeClockContainer selectedUser={selectedUser} onClockSuccess={refreshWorkSessions} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="registros">
          {/* Mostrar información sobre qué registros se están viendo */}
          {isAdmin && (
            <div className="mb-4">
              <Badge variant="outline" className="text-sm">
                {selectedUser
                  ? `Viendo registros de: ${selectedUser.name || selectedUser.email}`
                  : "Viendo todos los registros de la organización"}
              </Badge>
            </div>
          )}

          {/* Componente de filtros */}
          <WorkSessionsFilters
            startDate={startDate}
            endDate={endDate}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
          />

          <WorkSessionsTable
            sessions={workSessions}
            loading={loading}
            totalRecords={totalRecords}
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onExport={handleExportData}
            onRefresh={refreshWorkSessions}
          />
        </TabsContent>

        <TabsContent value="vacaciones">
          <GeneralRequestsSection
            userProfile={userProfile}
            isAdmin={isAdmin}
            selectedUser={selectedUser}
            organizationUsers={organizationUsers}
          />
        </TabsContent>

        <TabsContent value="calendario">
          <VacationCalendarView
            userProfile={userProfile}
            isAdmin={isAdmin}
            selectedUser={selectedUser}
            organizationUsers={organizationUsers}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
