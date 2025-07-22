"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MessageSquare, Send, X } from "lucide-react"
import { format, parseISO } from "date-fns"
import { useToast } from "@/hooks/use-toast"

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
}

interface RequestChangeDialogProps {
  session: WorkSession
  onSubmitRequest: (requestData: {
    session_id: string
    requested_clock_in?: string | null
    requested_clock_out?: string | null
    reason: string
    notes?: string
  }) => Promise<void>
}

export function RequestChangeDialog({ session, onSubmitRequest }: RequestChangeDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [clockIn, setClockIn] = useState(session.clock_in_time ? format(parseISO(session.clock_in_time), "HH:mm") : "")
  const [clockOut, setClockOut] = useState(
    session.clock_out_time ? format(parseISO(session.clock_out_time), "HH:mm") : "",
  )
  const [reason, setReason] = useState("")
  const [notes, setNotes] = useState("")

  const { toast } = useToast()

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({
        title: "❌ Error",
        description: "Debes proporcionar un motivo para la solicitud",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const requestData = {
        session_id: session.id,
        requested_clock_in: clockIn ? `${session.work_date}T${clockIn}:00` : null,
        requested_clock_out: clockOut ? `${session.work_date}T${clockOut}:00` : null,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      }

      await onSubmitRequest(requestData)

      toast({
        title: "✅ Solicitud enviada",
        description: "Tu solicitud de cambio ha sido enviada al administrador",
      })

      setOpen(false)
      setReason("")
      setNotes("")
    } catch (err) {
      toast({
        title: "❌ Error",
        description: err instanceof Error ? err.message : "Error al enviar solicitud",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <MessageSquare className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar Cambio</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Fecha</Label>
            <p className="text-sm text-muted-foreground">{format(parseISO(session.work_date), "dd/MM/yyyy")}</p>
          </div>

          <div className="bg-muted p-3 rounded-md">
            <h4 className="text-sm font-medium mb-2">Registro actual:</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Entrada:</span>
                <p>{session.clock_in_time ? format(parseISO(session.clock_in_time), "HH:mm") : "No registrada"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Salida:</span>
                <p>{session.clock_out_time ? format(parseISO(session.clock_out_time), "HH:mm") : "No registrada"}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="new-clock-in">Nueva Hora de Entrada</Label>
              <Input
                id="new-clock-in"
                type="time"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="new-clock-out">Nueva Hora de Salida</Label>
              <Input
                id="new-clock-out"
                type="time"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="reason">Motivo del cambio *</Label>
            <Textarea
              id="reason"
              placeholder="Explica por qué necesitas este cambio..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
              rows={3}
              required
            />
          </div>

          <div>
            <Label htmlFor="additional-notes">Notas adicionales</Label>
            <Textarea
              id="additional-notes"
              placeholder="Información adicional (opcional)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !reason.trim()}>
              <Send className="h-4 w-4 mr-2" />
              {loading ? "Enviando..." : "Enviar Solicitud"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
