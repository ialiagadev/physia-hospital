"use client"
import { Phone, Mail, MapPin, Calendar, MessageCircle, X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import type { Client } from "@/types/chat"

interface ContactInfoDialogProps {
  client: Client | null | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ContactInfoDialog({ client, open, onOpenChange }: ContactInfoDialogProps) {
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
        return "bg-gray-500"
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

    const date = new Date(dateString)
    return date.toLocaleDateString("es-ES", {
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
        <DialogHeader className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-6 w-6 p-0"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
          <DialogTitle className="text-left">Información del contacto</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Avatar y nombre principal */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={client.avatar_url || "/placeholder.svg"} alt={client.name} />
                <AvatarFallback className="text-2xl">{client.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              {client.channel && (
                <div
                  className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white ${getChannelColor(
                    client.channel,
                  )} flex items-center justify-center`}
                >
                  <MessageCircle className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{client.name}</h3>
              {client.channel && (
                <Badge variant="secondary" className="mt-1">
                  {getChannelName(client.channel)}
                </Badge>
              )}
            </div>
          </div>

          {/* Información de contacto */}
          <div className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 text-sm uppercase tracking-wide">Contacto</h4>

              {client.phone && (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <Phone className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{client.phone}</p>
                    <p className="text-xs text-gray-500">Teléfono</p>
                  </div>
                </div>
              )}

              {client.email && (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Mail className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{client.email}</p>
                    <p className="text-xs text-gray-500">Email</p>
                  </div>
                </div>
              )}

              {(client.address || client.city) && (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {[client.address, client.city, client.province].filter(Boolean).join(", ")}
                    </p>
                    <p className="text-xs text-gray-500">Dirección</p>
                  </div>
                </div>
              )}
            </div>

            {/* Información adicional */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 text-sm uppercase tracking-wide">Información</h4>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Tipo de cliente</p>
                  <p className="font-medium capitalize">{client.client_type || "No especificado"}</p>
                </div>

                {client.tax_id && (
                  <div>
                    <p className="text-gray-500">ID Fiscal</p>
                    <p className="font-medium">{client.tax_id}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{formatDate(client.last_interaction_at)}</p>
                  <p className="text-xs text-gray-500">Última interacción</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{formatDate(client.created_at)}</p>
                  <p className="text-xs text-gray-500">Cliente desde</p>
                </div>
              </div>
            </div>
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
