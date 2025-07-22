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
import { useMemo } from "react"

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

interface WorkSessionsTableProps {
  sessions: WorkSession[]
  loading: boolean
  totalRecords: number
  currentPage: number
  totalPages: number
  pageSize: number
  onPageChange: (page: number, pageSize: number) => void
  onExport: () => void
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
  onSubmitChangeRequest,
}: WorkSessionsTableProps) {
  const { isAdmin, updateWorkSession, deleteWorkSession } = useTimeTracking()

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

  const formatMinutes = (minutes: number | null) => {
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

  const formatPauses = (pauseCount: number | null, totalPauseMinutes: number | null) => {
    if (!pauseCount || pauseCount === 0) {
      return <span className="text-muted-foreground text-sm">Sin pausas</span>
    }

    return (
      <div className="flex items-center gap-1">
        <Coffee className="h-4 w-4 text-orange-600" />
        <span className="font-mono text-sm">
          {pauseCount} pausa{pauseCount > 1 ? "s" : ""} ({formatMinutes(totalPauseMinutes)})
        </span>
      </div>
    )
  }

  const calculateNetTime = (totalMinutes: number | null, pauseMinutes: number | null) => {
    if (!totalMinutes) return null
    const pauseTime = pauseMinutes || 0
    return totalMinutes + pauseTime // total_minutes ya debería ser neto, pero por si acaso
  }

  const handleRefresh = () => {
    onPageChange(currentPage, pageSize)
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
              {sessions.map((session) => (
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
                  <TableCell>
                    {formatPauses(session.pause_count ?? null, session.total_pause_minutes ?? null)}
                  </TableCell>
                  <TableCell>
                    {session.total_minutes ? (
                      <div className="flex items-center gap-1">
                        <Pause className="h-4 w-4 text-blue-600" />
                        <span className="font-mono font-medium">{formatMinutes(session.total_minutes)}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(session.status, session.clock_in_time, session.clock_out_time)}</TableCell>
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
                          onRefresh={handleRefresh}
                        />
                      ) : (
                        onSubmitChangeRequest && (
                          <RequestChangeDialog session={session} onSubmitRequest={onSubmitChangeRequest} />
                        )
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
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
