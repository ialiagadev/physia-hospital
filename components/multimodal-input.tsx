"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Paperclip, Mic, MicOff, ImageIcon } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface MultimodalInputProps {
  onSend: (message: string, attachments?: File[]) => void
  disabled?: boolean
  placeholder?: string
}

export function MultimodalInput({
  onSend,
  disabled = false,
  placeholder = "Escribe tu mensaje...",
}: MultimodalInputProps) {
  const [message, setMessage] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    const trimmedMessage = (message || "").trim()
    if (!trimmedMessage && attachments.length === 0) return

    onSend(trimmedMessage, attachments.length > 0 ? attachments : undefined)
    setMessage("")
    setAttachments([])

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }, [message, attachments, onSend])

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setAttachments((prev) => [...prev, ...files])
      toast({
        title: "Archivos adjuntados",
        description: `${files.length} archivo(s) seleccionado(s)`,
      })
    }
  }, [])

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      const chunks: BlobPart[] = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" })
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: "audio/webm" })
        setAttachments((prev) => [...prev, file])
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo acceder al micrófono",
        variant: "destructive",
      })
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [isRecording])

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)

    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }, [])

  return (
    <div className="border-t bg-background p-4">
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div key={index} className="flex items-center gap-2 rounded-md bg-muted px-3 py-1 text-sm">
              {file.type.startsWith("image/") ? (
                <ImageIcon className="h-4 w-4" />
              ) : file.type.startsWith("audio/") ? (
                <Mic className="h-4 w-4" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
              <span className="truncate max-w-[100px]">{file.name}</span>
              <Button variant="ghost" size="sm" className="h-4 w-4 p-0" onClick={() => removeAttachment(index)}>
                ×
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            className="min-h-[40px] max-h-[120px] resize-none"
            rows={1}
          />
        </div>

        <div className="flex gap-1">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,audio/*,.pdf,.doc,.docx,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="h-10 w-10 p-0"
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled}
            className={`h-10 w-10 p-0 ${isRecording ? "text-red-500" : ""}`}
          >
            {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>

          <Button
            onClick={handleSend}
            disabled={disabled || (!(message || "").trim() && attachments.length === 0)}
            size="sm"
            className="h-10 w-10 p-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
