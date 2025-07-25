"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Trash2, Plus, MessageSquare, User } from "lucide-react"
import type { NotaTarea, Usuario } from "@/types/tasks"

interface TaskNotesProps {
  notas: NotaTarea[]
  taskId: number
  onAddNote: (taskId: number, content: string) => Promise<void>
  onDeleteNote: (noteId: number) => Promise<void>
  getNombreUsuario: (id?: string) => string
  usuarios: Usuario[]
}

export function TaskNotes({ notas, taskId, onAddNote, onDeleteNote, getNombreUsuario, usuarios }: TaskNotesProps) {
  const [nuevaNota, setNuevaNota] = useState("")
  const [agregandoNota, setAgregandoNota] = useState(false)

  const handleAddNote = async () => {
    if (!nuevaNota.trim()) return

    try {
      setAgregandoNota(true)
      await onAddNote(taskId, nuevaNota)
      setNuevaNota("")
    } catch (error) {
      // Error ya manejado en el hook
    } finally {
      setAgregandoNota(false)
    }
  }

  const handleDeleteNote = async (noteId: number) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar esta nota?")) {
      await onDeleteNote(noteId)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-gray-600" />
        <h4 className="font-medium text-sm">Notas ({notas.length})</h4>
      </div>

      {/* Lista de notas existentes */}
      <div className="space-y-3 max-h-60 overflow-y-auto">
        {notas.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">No hay notas para esta tarea</div>
        ) : (
          notas.map((nota) => (
            <Card key={nota.id} className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-3">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <User className="h-3 w-3" />
                    <span className="font-medium">{getNombreUsuario(nota.created_by)}</span>
                    <span>•</span>
                    <span>
                      {nota.created_at.toLocaleDateString("es-ES")}{" "}
                      {nota.created_at.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-red-100"
                    onClick={() => handleDeleteNote(nota.id)}
                    title="Eliminar nota"
                  >
                    <Trash2 className="h-3 w-3 text-red-600" />
                  </Button>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{nota.content}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Formulario para nueva nota */}
      <div className="space-y-2 border-t pt-3">
        <Textarea
          placeholder="Añadir una nota..."
          value={nuevaNota}
          onChange={(e) => setNuevaNota(e.target.value)}
          rows={2}
          className="resize-none"
        />
        <div className="flex justify-end">
          <Button
            onClick={handleAddNote}
            disabled={!nuevaNota.trim() || agregandoNota}
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="h-3 w-3" />
            {agregandoNota ? "Añadiendo..." : "Añadir Nota"}
          </Button>
        </div>
      </div>
    </div>
  )
}
