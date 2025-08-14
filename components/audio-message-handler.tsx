"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Send } from "lucide-react"
import { sendAudioAsText } from "@/lib/whatsapp-utils"

interface AudioMessageHandlerProps {
  onSendMessage: (message: string, type: "text" | "audio") => void
  recipientPhone: string
  whatsappToken: string
}

export function AudioMessageHandler({ onSendMessage, recipientPhone, whatsappToken }: AudioMessageHandlerProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: BlobPart[] = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" })
        setAudioBlob(blob)
        stream.getTracks().forEach((track) => track.stop())
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
    } catch (error) {
      console.error("Error accessing microphone:", error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
      setIsRecording(false)
      setMediaRecorder(null)
    }
  }

  const sendAudio = async () => {
    if (!audioBlob) return

    try {
      setIsTranscribing(true)

      const audioUrl = URL.createObjectURL(audioBlob)
      onSendMessage(audioUrl, "audio")

      await sendAudioAsText({
        to: recipientPhone,
        audioFile: audioBlob,
        token: whatsappToken,
      })

      console.log("✅ Audio enviado como texto al cliente")

      // Limpiar el audio grabado
      setAudioBlob(null)
    } catch (error) {
      console.error("Error enviando audio:", error)
    } finally {
      setIsTranscribing(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {!audioBlob ? (
        <Button
          onClick={isRecording ? stopRecording : startRecording}
          variant={isRecording ? "destructive" : "outline"}
          size="sm"
        >
          {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {isRecording ? "Detener" : "Grabar"}
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <audio controls src={URL.createObjectURL(audioBlob)} className="h-8" />
          <Button onClick={sendAudio} disabled={isTranscribing} size="sm">
            <Send className="h-4 w-4" />
            {isTranscribing ? "Transcribiendo..." : "Enviar"}
          </Button>
          <Button onClick={() => setAudioBlob(null)} variant="outline" size="sm">
            Cancelar
          </Button>
        </div>
      )}
    </div>
  )
}
