"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, Calendar, Clock, User, MessageSquare } from "lucide-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { EditWorkSessionDialog } from "@/components/edit-work-session-dialog"
import { RequestChangeDialog } from "@/components/request-change-dialog"
import { useTimeTracking } from "@/hooks/use-time-tracking"

interface WorkSession {
  id: string
  work_date: string
  local_clock_in: string | null
  local_clock_out: string | null
  total_hours: number | null
  status: string | null
  user_name: string | null
  user_email: string | null
  user_id: string
  notes?: string | null
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

  const getStatusBadge = (status: string | null, clockIn: string | null, clockOut: string | null) => {
    if (!clockIn) {
      return <Badge variant="secondary">Sin entrada</Badge>
    }
    if (!clockOut) {
      return <Badge variant="default">En curso</Badge>
    }
    return <Badge variant="outline">Completado</Badge>
  }

  const handleRefresh = () => {
    onPageChange(currentPage, pageSize)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center h-64">
          <p>Cargando registros...</p>
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
        </CardTitle>
        <Button onClick={onExport} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                {isAdmin && <TableHead>Usuario</TableHead>}
                <TableHead>Entrada</TableHead>
                <TableHead>Salida</TableHead>
                <TableHead>Horas</TableHead>
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
                    {session.local_clock_in ? (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-green-600" />
                        {format(parseISO(session.local_clock_in), "HH:mm")}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {session.local_clock_out ? (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-red-600" />
                        {format(parseISO(session.local_clock_out), "HH:mm")}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {session.total_hours ? (
                      <span className="font-mono">{session.total_hours.toFixed(2)}h</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(session.status, session.local_clock_in, session.local_clock_out)}
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

        {/* Paginación */}
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Mostrando {(currentPage - 1) * pageSize + 1} a {Math.min(currentPage * pageSize, totalRecords)} de{" "}
            {totalRecords} registros
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1, pageSize)}
              disabled={currentPage <= 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1, pageSize)}
              disabled={currentPage >= totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
