"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { StickyNote, X } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import type { ConversationNote, User } from "@/types/chat"

interface ConversationNotesModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  conversationId: string
  currentUser: User
  clientName: string
}

const formatTime = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch (error) {
    return dateStr
  }
}

export function ConversationNotesModal({
  isOpen,
  onOpenChange,
  conversationId,
  currentUser,
  clientName,
}: ConversationNotesModalProps) {
  const [notes, setNotes] = useState<ConversationNote[]>([])
  const [newNote, setNewNote] = useState("")
  const [notesLoading, setNotesLoading] = useState(false)

  useEffect(() => {
    if (isOpen && conversationId) {
      loadConversationNotes()
    }
  }, [isOpen, conversationId])

  const loadConversationNotes = async () => {
    setNotesLoading(true)
    try {
      const { data, error } = await supabase
        .from("conversation_notes")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })

      if (error) throw error

      setNotes(data || [])
    } catch (error) {
      console.error("Error loading notes:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las notas",
        variant: "destructive",
      })
    } finally {
      setNotesLoading(false)
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return

    const noteContent = newNote.trim()

    setNotesLoading(true)
    try {
      const { data, error } = await supabase
        .from("conversation_notes")
        .insert({
          conversation_id: conversationId,
          content: noteContent,
          created_by: currentUser.id,
        })
        .select("*")
        .single()

      if (error) throw error

      setNotes((prev) => [data, ...prev])
      setNewNote("")

      toast({
        title: "Nota guardada",
        description: "La nota se ha guardado correctamente",
      })
    } catch (error) {
      console.error("Error adding note:", error)
      toast({
        title: "Error",
        description: "No se pudo guardar la nota",
        variant: "destructive",
      })
    } finally {
      setNotesLoading(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    setNotesLoading(true)
    try {
      const { error } = await supabase.from("conversation_notes").delete().eq("id", noteId)

      if (error) throw error

      setNotes((prev) => prev.filter((note) => note.id !== noteId))

      toast({
        title: "Nota eliminada",
        description: "La nota se ha eliminado correctamente",
      })
    } catch (error) {
      console.error("Error deleting note:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la nota",
        variant: "destructive",
      })
    } finally {
      setNotesLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-blue-600" />
            Notas de conversación - {clientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Input para nueva nota */}
          <div className="space-y-2">
            <Textarea
              rows={3}
              className="resize-none"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Agregar una nota sobre esta conversación..."
              disabled={notesLoading}
            />
            <Button size="sm" className="w-full" disabled={!newNote.trim() || notesLoading} onClick={handleAddNote}>
              {notesLoading ? "Guardando..." : "Guardar Nota"}
            </Button>
          </div>

          {/* Lista de notas */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {notesLoading && notes.length === 0 ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            ) : notes.length > 0 ? (
              notes.map((note) => (
                <div key={note.id} className="p-3 bg-gray-50 rounded-lg relative group">
                  <p className="text-gray-800 pr-8">{note.content}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-gray-500">{formatTime(note.created_at)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeleteNote(note.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center p-8 text-gray-500">
                <StickyNote className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No hay notas para esta conversación</p>
                <p className="text-sm">Agrega la primera nota arriba</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
