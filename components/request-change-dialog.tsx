"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit, Calendar } from "lucide-react"
import { format, parseISO } from "date-fns"
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
  user_id: string
  notes?: string | null
}

interface RequestChangeDialogProps {
  session: WorkSession
  onSubmitRequest: (requestData: any) => Promise<void>
}

export function RequestChangeDialog({ session, onSubmitRequest }: RequestChangeDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [requestType, setRequestType] = useState<string>("")
  const [newClockIn, setNewClockIn] = useState(
    session.local_clock_in ? format(parseISO(session.local_clock_in), "HH:mm") : "",
  )
  const [newClockOut, setNewClockOut] = useState(
    session.local_clock_out ? format(parseISO(session.local_clock_out), "HH:mm") : "",
  )
  const [reason, setReason] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!requestType || !reason.trim()) return

    setLoading(true)
    try {
      const requestData = {
        session_id: session.id,
        request_type: requestType,
        current_clock_in: session.local_clock_in,
        current_clock_out: session.local_clock_out,
        requested_clock_in:
          requestType === "modify_times" || requestType === "modify_clock_in"
            ? `${session.work_date}T${newClockIn}:00`
            : null,
        requested_clock_out:
          requestType === "modify_times" || requestType === "modify_clock_out"
            ? `${session.work_date}T${newClockOut}:00`
            : null,
        reason: reason,
        status: "pending",
      }

      await onSubmitRequest(requestData)
      setOpen(false)
      setRequestType("")
      setReason("")
    } catch (error) {
      console.error("Error submitting request:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Solicitar Cambio
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Solicitar Cambio de Registro
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información del registro actual */}
          <div className="bg-muted p-3 rounded-lg space-y-2">
            <p className="font-medium text-sm">Registro actual:</p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>📅 {format(parseISO(session.work_date), "dd MMM yyyy", { locale: es })}</p>
              <p>
                🟢 Entrada:{" "}
                {session.local_clock_in ? format(parseISO(session.local_clock_in), "HH:mm") : "Sin registro"}
              </p>
              <p>
                🔴 Salida:{" "}
                {session.local_clock_out ? format(parseISO(session.local_clock_out), "HH:mm") : "Sin registro"}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="request-type">Tipo de solicitud</Label>
              <Select value={requestType} onValueChange={setRequestType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el tipo de cambio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="modify_times">Modificar horarios de entrada y salida</SelectItem>
                  <SelectItem value="modify_clock_in">Modificar solo hora de entrada</SelectItem>
                  <SelectItem value="modify_clock_out">Modificar solo hora de salida</SelectItem>
                  <SelectItem value="add_missing_entry">Agregar entrada faltante</SelectItem>
                  <SelectItem value="add_missing_exit">Agregar salida faltante</SelectItem>
                  <SelectItem value="delete_record">Eliminar registro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campos de tiempo según el tipo de solicitud */}
            {(requestType === "modify_times" ||
              requestType === "modify_clock_in" ||
              requestType === "add_missing_entry") && (
              <div>
                <Label htmlFor="new-clock-in">Nueva hora de entrada</Label>
                <Input
                  id="new-clock-in"
                  type="time"
                  value={newClockIn}
                  onChange={(e) => setNewClockIn(e.target.value)}
                  required
                />
              </div>
            )}

            {(requestType === "modify_times" ||
              requestType === "modify_clock_out" ||
              requestType === "add_missing_exit") && (
              <div>
                <Label htmlFor="new-clock-out">Nueva hora de salida</Label>
                <Input
                  id="new-clock-out"
                  type="time"
                  value={newClockOut}
                  onChange={(e) => setNewClockOut(e.target.value)}
                  required
                />
              </div>
            )}

            <div>
              <Label htmlFor="reason">Motivo de la solicitud *</Label>
              <Textarea
                id="reason"
                placeholder="Explica el motivo de tu solicitud..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading || !requestType || !reason.trim()}>
                {loading ? "Enviando..." : "Enviar Solicitud"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
