"use client"

import { useState, useEffect } from "react"
import { toast } from "@/hooks/use-toast"

interface ConversationNote {
  id: string
  content: string
  timestamp: string
  author: string
}

export function useConversationNotes(conversationId: string) {
  const [notes, setNotes] = useState<ConversationNote[]>([])
  const [newNote, setNewNote] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Cargar notas al cambiar de conversación
  useEffect(() => {
    if (conversationId) {
      loadNotes()
    }
  }, [conversationId])

  const loadNotes = () => {
    try {
      const key = `conversation_${conversationId}_notes`
      const savedNotes = localStorage.getItem(key)
      if (savedNotes) {
        setNotes(JSON.parse(savedNotes))
      } else {
        setNotes([])
      }
    } catch (error) {
      console.error("Error loading notes:", error)
      setNotes([])
    }
  }

  const saveNotes = (notesToSave: ConversationNote[]) => {
    try {
      const key = `conversation_${conversationId}_notes`
      localStorage.setItem(key, JSON.stringify(notesToSave))
    } catch (error) {
      console.error("Error saving notes:", error)
      toast({
        title: "Error",
        description: "No se pudieron guardar las notas",
        variant: "destructive",
      })
    }
  }

  const addNote = async () => {
    if (!newNote.trim() || !conversationId) return

    setIsLoading(true)
    try {
      const note: ConversationNote = {
        id: Date.now().toString(),
        content: newNote.trim(),
        timestamp: new Date().toLocaleString("es-ES", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        author: "current_user", // En tu caso sería el ID del usuario actual
      }

      const updatedNotes = [note, ...notes]
      setNotes(updatedNotes)
      saveNotes(updatedNotes)
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
      setIsLoading(false)
    }
  }

  const deleteNote = (noteId: string) => {
    try {
      const updatedNotes = notes.filter((note) => note.id !== noteId)
      setNotes(updatedNotes)
      saveNotes(updatedNotes)

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
    }
  }

  const updateNote = (noteId: string, newContent: string) => {
    try {
      const updatedNotes = notes.map((note) =>
        note.id === noteId ? { ...note, content: newContent, timestamp: new Date().toLocaleString("es-ES") } : note,
      )
      setNotes(updatedNotes)
      saveNotes(updatedNotes)

      toast({
        title: "Nota actualizada",
        description: "La nota se ha actualizado correctamente",
      })
    } catch (error) {
      console.error("Error updating note:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar la nota",
        variant: "destructive",
      })
    }
  }

  return {
    notes,
    newNote,
    setNewNote,
    isLoading,
    addNote,
    deleteNote,
    updateNote,
    loadNotes,
  }
}
