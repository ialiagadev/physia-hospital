"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, ChevronLeft, ChevronRight, Download } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface WorkSession {
  id: string
  work_date: string
  local_clock_in: string | null
  local_clock_out: string | null
  total_hours: number | null
  status: string | null
  user_name: string | null
  user_email: string | null
}

interface WorkSessionsTableProps {
  sessions: WorkSession[]
  loading: boolean
  totalRecords: number
  currentPage: number
  totalPages: number
  pageSize: number
  onPageChange: (page: number, pageSize: number) => void
  onExport?: () => void
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
}: WorkSessionsTableProps) {
  const [currentPageSize, setCurrentPageSize] = useState(pageSize)

  const formatTime = (timeString: string | null) => {
    if (!timeString) return "--:--:--"
    return format(new Date(timeString), "HH:mm:ss")
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy")
  }

  const formatDateLong = (dateString: string) => {
    return format(new Date(dateString), "EEE dd/MM", { locale: es })
  }

  const getStatusBadge = (status: string | null) => {
    if (!status)
      return (
        <Badge variant="outline" className="text-xs">
          --
        </Badge>
      )

    const variants = {
      complete: "default",
      incomplete: "secondary",
      missing_clock_out: "destructive",
    } as const

    const labels = {
      complete: "Completa",
      incomplete: "Incompleta",
      missing_clock_out: "Sin salida",
    }

    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"} className="text-xs">
        {labels[status as keyof typeof labels] || status}
      </Badge>
    )
  }

  const handlePageSizeChange = (newSize: string) => {
    const size = Number(newSize)
    setCurrentPageSize(size)
    onPageChange(1, size)
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page, currentPageSize)
    }
  }

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">Cargando registros...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg font-medium">Registros de Fichaje</CardTitle>
            <Badge variant="outline" className="text-xs">
              {totalRecords}
            </Badge>
          </div>
          {onExport && (
            <Button onClick={onExport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {totalRecords === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No hay registros disponibles</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Controles */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Mostrar</span>
                <Select value={currentPageSize.toString()} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="w-16 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Tabla */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="border-b">
                    <TableHead className="font-medium">Fecha</TableHead>
                    <TableHead className="font-medium">Entrada</TableHead>
                    <TableHead className="font-medium">Salida</TableHead>
                    <TableHead className="font-medium">Horas</TableHead>
                    <TableHead className="font-medium">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session, index) => (
                    <TableRow key={session.id} className={index % 2 === 0 ? "bg-muted/20" : ""}>
                      <TableCell className="font-medium tabular-nums">{formatDateLong(session.work_date)}</TableCell>
                      <TableCell>
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                          {formatTime(session.local_clock_in)}
                        </code>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                          {formatTime(session.local_clock_out)}
                        </code>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {session.total_hours ? `${session.total_hours.toFixed(2)}h` : "--"}
                      </TableCell>
                      <TableCell>{getStatusBadge(session.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Info de paginación */}
            <div className="text-center text-xs text-muted-foreground">
              {(currentPage - 1) * currentPageSize + 1} - {Math.min(currentPage * currentPageSize, totalRecords)} de{" "}
              {totalRecords}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
