"use client"
import { Phone, Mail, MessageCircle, Calendar, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import type { Client } from "@/types/chat"

interface ContactInfoDialogProps {
  client: Client | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ContactInfoDialog({ client, open, onOpenChange }: ContactInfoDialogProps) {
  if (!client) return null

  const getChannelColor = (channel?: string) => {
    switch (channel) {
      case "whatsapp":
        return "bg-green-500"
      case "instagram":
        return "bg-pink-500"
      case "facebook":
        return "bg-blue-500"
      case "webchat":
        return "bg-purple-500"
      default:
        return "bg-gray-500"
    }
  }

  const getChannelName = (channel?: string) => {
    switch (channel) {
      case "whatsapp":
        return "WhatsApp"
      case "instagram":
        return "Instagram"
      case "facebook":
        return "Facebook"
      case "webchat":
        return "Web Chat"
      default:
        return "Desconocido"
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "No disponible"
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Información del contacto
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Avatar y nombre */}
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={client.avatar_url || "/placeholder.svg"} alt={client.name} />
                <AvatarFallback className="text-2xl">{client.name.charAt(0)}</AvatarFallback>
              </Avatar>
              {client.channel && (
                <div
                  className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white ${getChannelColor(client.channel)}`}
                  title={getChannelName(client.channel)}
                />
              )}
            </div>
            <h3 className="text-xl font-semibold mt-3">{client.name}</h3>
            {client.channel && (
              <Badge variant="secondary" className="mt-1">
                {getChannelName(client.channel)}
              </Badge>
            )}
          </div>

          {/* Información de contacto */}
          <div className="space-y-3">
            {client.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Teléfono</p>
                  <p className="text-sm text-gray-600">{client.phone}</p>
                </div>
              </div>
            )}

            {client.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-gray-600">{client.email}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium">Última interacción</p>
                <p className="text-sm text-gray-600">{formatDate(client.last_interaction_at)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium">Cliente desde</p>
                <p className="text-sm text-gray-600">{formatDate(client.created_at)}</p>
              </div>
            </div>

            {client.external_id && (
              <div className="flex items-center gap-3">
                <MessageCircle className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">ID externo</p>
                  <p className="text-sm text-gray-600 font-mono">{client.external_id}</p>
                </div>
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" className="flex-1" size="sm">
              <Phone className="h-4 w-4 mr-2" />
              Llamar
            </Button>
            <Button variant="outline" className="flex-1" size="sm">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
