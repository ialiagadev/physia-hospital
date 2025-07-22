"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Edit, Trash2, Save, X } from "lucide-react"
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
  created_at?: string
  updated_at?: string
  organization_id?: number
}

interface EditWorkSessionDialogProps {
  session: WorkSession
  onUpdate: (
    sessionId: string,
    updates: {
      clock_in_time?: string | null
      clock_out_time?: string | null
      notes?: string | null
    },
    reason?: string,
  ) => Promise<{ success: boolean; error?: string }>
  onDelete: (sessionId: string, reason?: string) => Promise<{ success: boolean; error?: string }>
  onRefresh: () => void
}

export function EditWorkSessionDialog({ session, onUpdate, onDelete, onRefresh }: EditWorkSessionDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [clockIn, setClockIn] = useState(session.clock_in_time ? format(parseISO(session.clock_in_time), "HH:mm") : "")
  const [clockOut, setClockOut] = useState(
    session.clock_out_time ? format(parseISO(session.clock_out_time), "HH:mm") : "",
  )
  const [notes, setNotes] = useState(session.notes || "")
  const [reason, setReason] = useState("")

  const { toast } = useToast()

  const handleSave = async () => {
    setLoading(true)
    try {
      const updates: {
        clock_in_time?: string | null
        clock_out_time?: string | null
        notes?: string | null
      } = {}

      // Validar que si hay salida, también haya entrada
      if (clockOut && !clockIn) {
        throw new Error("No puedes tener hora de salida sin hora de entrada")
      }

      // Validar que la entrada sea anterior a la salida
      if (clockIn && clockOut) {
        const entryTime = new Date(`${session.work_date}T${clockIn}:00`)
        const exitTime = new Date(`${session.work_date}T${clockOut}:00`)

        if (entryTime >= exitTime) {
          throw new Error("La hora de entrada debe ser anterior a la hora de salida")
        }
      }

      if (clockIn) {
        const clockInDateTime = new Date(`${session.work_date}T${clockIn}:00`)
        updates.clock_in_time = clockInDateTime.toISOString()
      } else {
        updates.clock_in_time = null
      }

      if (clockOut) {
        const clockOutDateTime = new Date(`${session.work_date}T${clockOut}:00`)
        updates.clock_out_time = clockOutDateTime.toISOString()
      } else {
        updates.clock_out_time = null
      }

      // Siempre incluir notas (puede ser string vacío)
      updates.notes = notes.trim() || null

      const updateReason = reason.trim() || `Edición manual de registro para ${session.user_name || session.user_email}`

      const result = await onUpdate(session.id, updates, updateReason)

      if (result.success) {
        toast({
          title: "✅ Registro actualizado",
          description: "Los cambios se han guardado correctamente",
        })
        setOpen(false)
        onRefresh()
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      toast({
        title: "❌ Error",
        description: err instanceof Error ? err.message : "Error al actualizar",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de que quieres eliminar este registro?")) return

    setLoading(true)
    try {
      const deleteReason =
        reason.trim() || `Eliminación manual de registro para ${session.user_name || session.user_email}`

      const result = await onDelete(session.id, deleteReason)

      if (result.success) {
        toast({
          title: "✅ Registro eliminado",
          description: "El registro se ha eliminado correctamente",
        })
        setOpen(false)
        onRefresh()
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      toast({
        title: "❌ Error",
        description: err instanceof Error ? err.message : "Error al eliminar",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatMinutes = (minutes: number | null) => {
    if (!minutes) return "0h 0m"
    const hours = Math.floor(Math.abs(minutes) / 60)
    const mins = Math.abs(minutes) % 60
    return `${hours}h ${mins}m`
  }

  // Calcular tiempo estimado basado en las horas actuales
  const calculateEstimatedTime = () => {
    if (!clockIn || !clockOut) return null

    try {
      const entryTime = new Date(`${session.work_date}T${clockIn}:00`)
      const exitTime = new Date(`${session.work_date}T${clockOut}:00`)
      const diffMinutes = Math.floor((exitTime.getTime() - entryTime.getTime()) / (1000 * 60))
      return diffMinutes > 0 ? diffMinutes : null
    } catch {
      return null
    }
  }

  const estimatedMinutes = calculateEstimatedTime()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Registro</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Usuario</Label>
            <p className="text-sm text-muted-foreground">{session.user_name || session.user_email}</p>
          </div>

          <div>
            <Label className="text-sm font-medium">Fecha</Label>
            <p className="text-sm text-muted-foreground">{format(parseISO(session.work_date), "dd/MM/yyyy")}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="clock-in">Hora de Entrada</Label>
              <Input
                id="clock-in"
                type="time"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="clock-out">Hora de Salida</Label>
              <Input
                id="clock-out"
                type="time"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Mostrar tiempo estimado */}
          {estimatedMinutes !== null && (
            <div className="bg-muted p-3 rounded-md">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Tiempo estimado:</span>
                <span className="text-sm font-mono">{formatMinutes(estimatedMinutes)}</span>
              </div>
              {session.total_minutes && session.total_minutes !== estimatedMinutes && (
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm text-muted-foreground">Tiempo actual:</span>
                  <span className="text-sm font-mono text-muted-foreground">
                    {formatMinutes(session.total_minutes)}
                  </span>
                </div>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              placeholder="Agregar notas sobre este registro..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="reason">Motivo del cambio</Label>
            <Input
              id="reason"
              placeholder="Describe el motivo de esta modificación..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
