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
  local_clock_in: string | null
  local_clock_out: string | null
  total_hours: number | null
  status: string | null
  user_name: string | null
  user_email: string | null
  user_id: string
  notes?: string | null // ✅ AGREGADO
}

interface EditWorkSessionDialogProps {
  session: WorkSession
  onUpdate: (sessionId: string, updates: any) => Promise<{ success: boolean; error?: string }>
  onDelete: (sessionId: string) => Promise<{ success: boolean; error?: string }>
  onRefresh: () => void
}

export function EditWorkSessionDialog({ session, onUpdate, onDelete, onRefresh }: EditWorkSessionDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [clockIn, setClockIn] = useState(
    session.local_clock_in ? format(parseISO(session.local_clock_in), "HH:mm") : "",
  )
  const [clockOut, setClockOut] = useState(
    session.local_clock_out ? format(parseISO(session.local_clock_out), "HH:mm") : "",
  )
  const [notes, setNotes] = useState(session.notes || "") // ✅ INICIALIZAR CON NOTAS EXISTENTES
  const { toast } = useToast()

  const handleSave = async () => {
    setLoading(true)
    try {
      const updates: any = {}

      if (clockIn) {
        const clockInDateTime = new Date(session.work_date + "T" + clockIn + ":00")
        updates.clock_in_time = clockInDateTime.toISOString() // ✅ CAMBIO: usar clock_in_time
      } else {
        updates.clock_in_time = null
      }

      if (clockOut) {
        const clockOutDateTime = new Date(session.work_date + "T" + clockOut + ":00")
        updates.clock_out_time = clockOutDateTime.toISOString() // ✅ CAMBIO: usar clock_out_time
      } else {
        updates.clock_out_time = null
      }

      // ✅ SIEMPRE INCLUIR NOTAS (puede ser string vacío)
      updates.notes = notes.trim() || null

      const result = await onUpdate(session.id, updates)

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
      const result = await onDelete(session.id)

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
