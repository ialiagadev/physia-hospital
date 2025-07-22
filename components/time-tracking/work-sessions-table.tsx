"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, Calendar, Clock, User, MessageSquare, Pause, Coffee } from "lucide-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { EditWorkSessionDialog } from "@/components/edit-work-session-dialog"
import { RequestChangeDialog } from "@/components/request-change-dialog"
import { useTimeTracking } from "@/hooks/use-time-tracking"
import { useMemo, useState, useEffect } from "react"

interface WorkSession {
  id: string
  work_date: string
  clock_in_time: string | null
  clock_out_time: string | null
  total_minutes: number | null
  status: string | null
  user_name: string | null
  user_email: string | null
  user_id: string
  notes?: string | null
  created_at?: string
  updated_at?: string
  organization_id?: number
  total_pause_minutes?: number | null
  pause_count?: number | null
}

interface PauseDetail {
  pause_number: number
  local_pause_start: string
  local_pause_end: string | null
  duration_minutes: number | null
}

interface WorkSessionsTableProps {
  sessions: WorkSession[]
  loading: boolean
  totalRecords: number
  currentPage: number
  totalPages: number
  pageSize: number
  onPageChange: (page: number, pageSize: number) => void
  onExport: () => void
  onRefresh: () => void // Hacer obligatorio
  onSubmitChangeRequest?: (requestData: any) => Promise<void>
}

export function WorkSessionsTable({
  sessions,
  loading,
  totalRecords,
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  onExport,
  onRefresh,
  onSubmitChangeRequest,
}: WorkSessionsTableProps) {
  const { isAdmin, updateWorkSession, deleteWorkSession } = useTimeTracking()
  const [pauseDetails, setPauseDetails] = useState<Record<string, PauseDetail[]>>({})

  // Cargar detalles de pausas para todas las sesiones
  useEffect(() => {
    const loadAllPauseDetails = async () => {
      if (sessions.length === 0) return

      const { supabase } = await import("@/lib/supabase/client")
      const sessionsWithPauses = sessions.filter((s) => s.pause_count && s.pause_count > 0)

      if (sessionsWithPauses.length === 0) return

      try {
        const { data, error } = await supabase
          .from("work_pauses_with_user")
          .select("user_id, work_date, pause_number, local_pause_start, local_pause_end, duration_minutes")
          .in(
            "user_id",
            sessionsWithPauses.map((s) => s.user_id),
          )
          .in(
            "work_date",
            sessionsWithPauses.map((s) => s.work_date),
          )
          .order("pause_number")

        if (error) throw error

        // Agrupar por user_id + work_date
        const grouped: Record<string, PauseDetail[]> = {}
        data?.forEach((pause) => {
          const key = `${pause.user_id}-${pause.work_date}`
          if (!grouped[key]) grouped[key] = []
          grouped[key].push(pause)
        })

        setPauseDetails(grouped)
      } catch (err) {
        console.error("Error loading pause details:", err)
      }
    }

    loadAllPauseDetails()
  }, [sessions])

  const getStatusBadge = useMemo(
    () => (status: string | null, clockIn: string | null, clockOut: string | null) => {
      if (!clockIn) {
        return <Badge variant="secondary">Sin entrada</Badge>
      }
      if (!clockOut) {
        return <Badge variant="default">En curso</Badge>
      }
      if (status === "complete") {
        return <Badge variant="outline">Completado</Badge>
      }
      return <Badge variant="secondary">Incompleto</Badge>
    },
    [],
  )

  const formatMinutes = (minutes: number | null | undefined) => {
    if (!minutes || minutes === 0) return "-"
    const hours = Math.floor(Math.abs(minutes) / 60)
    const mins = Math.abs(minutes) % 60
    return `${hours}h ${mins}m`
  }

  const formatTime = (timeString: string | null) => {
    if (!timeString) return "-"
    try {
      return format(parseISO(timeString), "HH:mm")
    } catch (error) {
      console.error("Error formatting time:", error)
      return "-"
    }
  }

  const renderPauseDetails = (session: WorkSession) => {
    if (!session.pause_count || session.pause_count === 0) {
      return <span className="text-muted-foreground text-sm">Sin pausas</span>
    }

    const key = `${session.user_id}-${session.work_date}`
    const details = pauseDetails[key] || []

    if (details.length === 0) {
      return (
        <div className="flex items-center gap-1">
          <Coffee className="h-4 w-4 text-orange-600" />
          <span className="font-mono text-sm">
            {session.pause_count} pausa{session.pause_count > 1 ? "s" : ""} (
            {formatMinutes(session.total_pause_minutes ?? null)})
          </span>
        </div>
      )
    }

    return (
      <div className="space-y-1">
        {details.map((pause) => (
          <div key={pause.pause_number} className="flex items-center gap-1 text-xs">
            <Coffee className="h-3 w-3 text-orange-600" />
            <span className="font-mono">
              {formatTime(pause.local_pause_start)}-{formatTime(pause.local_pause_end)}(
              {formatMinutes(pause.duration_minutes ?? null)})
            </span>
          </div>
        ))}
        {details.length > 1 && (
          <div className="text-xs text-muted-foreground font-medium">
            Total: {formatMinutes(session.total_pause_minutes ?? null)}
          </div>
        )}
      </div>
    )
  }

  const calculateNetTime = (session: WorkSession) => {
    // El total_minutes ya debería ser el tiempo neto (descontando pausas)
    // Si no, calculamos: tiempo bruto - tiempo pausas
    if (!session.clock_in_time || !session.clock_out_time) {
      return null
    }

    if (session.total_minutes) {
      return session.total_minutes
    }

    // Calcular tiempo bruto si no tenemos total_minutes
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

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center h-64">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <p>Cargando registros...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center h-64">
          <div className="text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No hay registros disponibles</p>
            <p className="text-sm mt-1">Los registros aparecerán aquí una vez que se realicen fichajes</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Registros de Trabajo
          <Badge variant="outline" className="ml-2">
            {totalRecords} registros
          </Badge>
        </CardTitle>
        <Button onClick={onExport} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                {isAdmin && <TableHead>Usuario</TableHead>}
                <TableHead>Entrada</TableHead>
                <TableHead>Salida</TableHead>
                <TableHead>Pausas</TableHead>
                <TableHead>Tiempo Neto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Notas</TableHead>
                <TableHead className="w-[140px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => {
                const netTime = calculateNetTime(session)
                return (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">
                      {format(parseISO(session.work_date), "dd MMM yyyy", { locale: es })}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium text-sm">{session.user_name || "Sin nombre"}</div>
                            <div className="text-xs text-muted-foreground">{session.user_email}</div>
                          </div>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      {session.clock_in_time ? (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-green-600" />
                          <span className="font-mono">{formatTime(session.clock_in_time)}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {session.clock_out_time ? (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-red-600" />
                          <span className="font-mono">{formatTime(session.clock_out_time)}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="min-w-[150px]">{renderPauseDetails(session)}</TableCell>
                    <TableCell>
                      {netTime ? (
                        <div className="flex items-center gap-1">
                          <Pause className="h-4 w-4 text-blue-600" />
                          <span className="font-mono font-medium">{formatMinutes(netTime)}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(session.status, session.clock_in_time, session.clock_out_time)}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      {session.notes ? (
                        <div className="flex items-start gap-1">
                          <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground truncate" title={session.notes}>
                            {session.notes}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {isAdmin ? (
                          <EditWorkSessionDialog
                            session={session}
                            onUpdate={updateWorkSession}
                            onDelete={deleteWorkSession}
                            onRefresh={onRefresh}
                          />
                        ) : (
                          onSubmitChangeRequest && (
                            <RequestChangeDialog session={session} onSubmitRequest={onSubmitChangeRequest} />
                          )
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Paginación mejorada */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Mostrando {(currentPage - 1) * pageSize + 1} a {Math.min(currentPage * pageSize, totalRecords)} de{" "}
              {totalRecords} registros
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onPageChange(1, pageSize)} disabled={currentPage <= 1}>
                Primera
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1, pageSize)}
                disabled={currentPage <= 1}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1, pageSize)}
                disabled={currentPage >= totalPages}
              >
                Siguiente
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(totalPages, pageSize)}
                disabled={currentPage >= totalPages}
              >
                Última
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
