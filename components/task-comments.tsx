"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, MessageCircle } from "lucide-react"
import { toast } from "sonner"

export type Comentario = {
  id: number
  texto: string
  autor: string
  fecha: Date
  editado?: boolean
}

interface TaskCommentsProps {
  comentarios: Comentario[]
  onAddComment: (texto: string) => void
  onEditComment: (id: number, texto: string) => void
  onDeleteComment: (id: number) => void
}

export function TaskComments({ comentarios, onAddComment, onEditComment, onDeleteComment }: TaskCommentsProps) {
  const [nuevoComentario, setNuevoComentario] = useState("")
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [textoEditado, setTextoEditado] = useState("")

  const handleAddComment = () => {
    if (nuevoComentario.trim()) {
      onAddComment(nuevoComentario.trim())
      setNuevoComentario("")
      toast.success("Comentario añadido")
    }
  }

  const handleEditComment = (id: number) => {
    if (textoEditado.trim()) {
      onEditComment(id, textoEditado.trim())
      setEditandoId(null)
      setTextoEditado("")
      toast.success("Comentario actualizado")
    }
  }

  const startEdit = (comentario: Comentario) => {
    setEditandoId(comentario.id)
    setTextoEditado(comentario.texto)
  }

  const cancelEdit = () => {
    setEditandoId(null)
    setTextoEditado("")
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4" />
        <h4 className="font-medium">Comentarios</h4>
        <Badge variant="secondary">{comentarios.length}</Badge>
      </div>

      {/* Lista de comentarios */}
      <div className="space-y-3 max-h-60 overflow-y-auto">
        {comentarios.map((comentario) => (
          <Card key={comentario.id} className="p-3">
            <CardContent className="p-0">
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {comentario.autor
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{comentario.autor}</span>
                      <span className="text-xs text-gray-500">
                        {comentario.fecha.toLocaleDateString("es-ES")}{" "}
                        {comentario.fecha.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {comentario.editado && (
                        <Badge variant="outline" className="text-xs">
                          editado
                        </Badge>
                      )}
                    </div>

                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => startEdit(comentario)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                        onClick={() => onDeleteComment(comentario.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {editandoId === comentario.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={textoEditado}
                        onChange={(e) => setTextoEditado(e.target.value)}
                        className="min-h-[60px] text-sm"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleEditComment(comentario.id)}>
                          Guardar
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{comentario.texto}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {comentarios.length === 0 && (
          <div className="text-center py-4 text-gray-500 text-sm">No hay comentarios aún</div>
        )}
      </div>

      {/* Nuevo comentario */}
      <div className="space-y-2">
        <Textarea
          placeholder="Escribe un comentario..."
          value={nuevoComentario}
          onChange={(e) => setNuevoComentario(e.target.value)}
          className="min-h-[80px]"
        />
        <div className="flex justify-end">
          <Button onClick={handleAddComment} disabled={!nuevoComentario.trim()} size="sm">
            Añadir Comentario
          </Button>
        </div>
      </div>
    </div>
  )
}
