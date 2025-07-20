"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Check, X, Eye, User, MessageSquare, AlertCircle } from "lucide-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface ChangeRequest {
  id: string
  session_id: string
  user_id: string
  user_name: string
  user_email: string
  request_type: string
  current_clock_in: string | null
  current_clock_out: string | null
  requested_clock_in: string | null
  requested_clock_out: string | null
  reason: string
  status: "pending" | "approved" | "rejected"
  admin_notes?: string | null
  created_at: string
  work_date: string
}

interface RequestsManagementProps {
  onApproveRequest: (requestId: string, adminNotes?: string) => Promise<void>
  onRejectRequest: (requestId: string, adminNotes: string) => Promise<void>
}

export function RequestsManagement({ onApproveRequest, onRejectRequest }: RequestsManagementProps) {
  const [requests, setRequests] = useState<ChangeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null)
  const [adminNotes, setAdminNotes] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  // Simular carga de solicitudes - aquí conectarías con tu API
  useEffect(() => {
    const loadRequests = async () => {
      setLoading(true)
      try {
        // Aquí harías la llamada a tu API
        // const response = await fetch('/api/change-requests')
        // const data = await response.json()

        // Datos de ejemplo
        const mockRequests: ChangeRequest[] = [
          {
            id: "req-1",
            session_id: "session-1",
            user_id: "user-1",
            user_name: "Juan Pérez",
            user_email: "juan@empresa.com",
            request_type: "modify_times",
            current_clock_in: "2024-01-15T09:15:00",
            current_clock_out: "2024-01-15T17:30:00",
            requested_clock_in: "2024-01-15T09:00:00",
            requested_clock_out: "2024-01-15T18:00:00",
            reason:
              "Llegué temprano pero el sistema no registró correctamente mi entrada. Salí más tarde para compensar.",
            status: "pending",
            created_at: "2024-01-15T10:00:00",
            work_date: "2024-01-15",
          },
        ]

        setRequests(mockRequests)
      } catch (error) {
        console.error("Error loading requests:", error)
      } finally {
        setLoading(false)
      }
    }

    loadRequests()
  }, [])

  const getRequestTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      modify_times: "Modificar horarios",
      modify_clock_in: "Modificar entrada",
      modify_clock_out: "Modificar salida",
      add_missing_entry: "Agregar entrada",
      add_missing_exit: "Agregar salida",
      delete_record: "Eliminar registro",
    }
    return types[type] || type
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pendiente</Badge>
      case "approved":
        return (
          <Badge variant="default" className="bg-green-600">
            Aprobada
          </Badge>
        )
      case "rejected":
        return <Badge variant="destructive">Rechazada</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleApprove = async () => {
    if (!selectedRequest) return

    setActionLoading(true)
    try {
      await onApproveRequest(selectedRequest.id, adminNotes)
      setRequests((prev) =>
        prev.map((req) =>
          req.id === selectedRequest.id ? { ...req, status: "approved" as const, admin_notes: adminNotes } : req,
        ),
      )
      setSelectedRequest(null)
      setAdminNotes("")
    } catch (error) {
      console.error("Error approving request:", error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!selectedRequest || !adminNotes.trim()) return

    setActionLoading(true)
    try {
      await onRejectRequest(selectedRequest.id, adminNotes)
      setRequests((prev) =>
        prev.map((req) =>
          req.id === selectedRequest.id ? { ...req, status: "rejected" as const, admin_notes: adminNotes } : req,
        ),
      )
      setSelectedRequest(null)
      setAdminNotes("")
    } catch (error) {
      console.error("Error rejecting request:", error)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center h-64">
          <p>Cargando solicitudes...</p>
        </CardContent>
      </Card>
    )
  }

  const pendingRequests = requests.filter((req) => req.status === "pending")

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Solicitudes de Cambio
            {pendingRequests.length > 0 && <Badge variant="secondary">{pendingRequests.length} pendientes</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hay solicitudes de cambio</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Creada</TableHead>
                    <TableHead className="w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium text-sm">{request.user_name}</div>
                            <div className="text-xs text-muted-foreground">{request.user_email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{format(parseISO(request.work_date), "dd MMM yyyy", { locale: es })}</TableCell>
                      <TableCell>{getRequestTypeLabel(request.request_type)}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>{format(parseISO(request.created_at), "dd MMM HH:mm", { locale: es })}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => setSelectedRequest(request)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para revisar solicitud */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Revisar Solicitud de Cambio</DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6">
              {/* Información del usuario */}
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <User className="h-5 w-5" />
                <div>
                  <p className="font-medium">{selectedRequest.user_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedRequest.user_email}</p>
                </div>
              </div>

              {/* Detalles de la solicitud */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Registro Actual</h4>
                  <div className="space-y-1 text-sm">
                    <p>📅 {format(parseISO(selectedRequest.work_date), "dd MMM yyyy", { locale: es })}</p>
                    <p>
                      🟢 Entrada:{" "}
                      {selectedRequest.current_clock_in
                        ? format(parseISO(selectedRequest.current_clock_in), "HH:mm")
                        : "Sin registro"}
                    </p>
                    <p>
                      🔴 Salida:{" "}
                      {selectedRequest.current_clock_out
                        ? format(parseISO(selectedRequest.current_clock_out), "HH:mm")
                        : "Sin registro"}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Cambio Solicitado</h4>
                  <div className="space-y-1 text-sm">
                    <p>
                      <strong>Tipo:</strong> {getRequestTypeLabel(selectedRequest.request_type)}
                    </p>
                    {selectedRequest.requested_clock_in && (
                      <p>🟢 Nueva entrada: {format(parseISO(selectedRequest.requested_clock_in), "HH:mm")}</p>
                    )}
                    {selectedRequest.requested_clock_out && (
                      <p>🔴 Nueva salida: {format(parseISO(selectedRequest.requested_clock_out), "HH:mm")}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Motivo */}
              <div>
                <h4 className="font-medium mb-2">Motivo</h4>
                <p className="text-sm bg-muted p-3 rounded-lg">{selectedRequest.reason}</p>
              </div>

              {/* Notas del administrador */}
              {selectedRequest.status === "pending" && (
                <div>
                  <Label htmlFor="admin-notes">Notas del administrador (opcional)</Label>
                  <Textarea
                    id="admin-notes"
                    placeholder="Agregar comentarios sobre la decisión..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              {/* Acciones */}
              {selectedRequest.status === "pending" ? (
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleApprove} disabled={actionLoading} className="bg-green-600 hover:bg-green-700">
                    <Check className="h-4 w-4 mr-2" />
                    {actionLoading ? "Procesando..." : "Aprobar"}
                  </Button>
                  <Button variant="destructive" onClick={handleReject} disabled={actionLoading || !adminNotes.trim()}>
                    <X className="h-4 w-4 mr-2" />
                    Rechazar
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                    Cerrar
                  </Button>
                </div>
              ) : (
                <div className="pt-4">
                  <p className="text-sm text-muted-foreground mb-2">Estado: {getStatusBadge(selectedRequest.status)}</p>
                  {selectedRequest.admin_notes && (
                    <p className="text-sm bg-muted p-3 rounded-lg">
                      <strong>Notas del admin:</strong> {selectedRequest.admin_notes}
                    </p>
                  )}
                  <Button variant="outline" onClick={() => setSelectedRequest(null)} className="mt-3">
                    Cerrar
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
