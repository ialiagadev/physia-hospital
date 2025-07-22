"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  SearchIcon,
  PlusCircle,
  MessageCircle,
  Facebook,
  Instagram,
  Send,
  Mail,
  Smartphone,
  RadioTower,
  ArrowRight,
  Loader2,
  AlertTriangle,
  Settings2,
  type LucideIcon,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { LiquidGlass } from "@/components/liquid-glass"

interface Canal {
  id: number
  nombre: string
  descripcion: string | null
  imagen: string | null
  href_button_action: string | null
  estado: number | null // 0: Inactivo, 1: Activo
}

function ChannelCard({ channel }: { channel: Canal }) {
  const getChannelIcon = (nombre: string): LucideIcon => {
    const lowerNombre = nombre.toLowerCase()
    if (lowerNombre.includes("whatsapp")) return MessageCircle
    if (lowerNombre.includes("facebook")) return Facebook
    if (lowerNombre.includes("instagram")) return Instagram
    if (lowerNombre.includes("telegram")) return Send
    if (lowerNombre.includes("email") || lowerNombre.includes("correo")) return Mail
    if (lowerNombre.includes("sms")) return Smartphone
    return RadioTower
  }

  const IconComponent = useMemo(() => getChannelIcon(channel.nombre), [channel.nombre])
  const channelUrl = `/dashboard/canales/${channel.id}` // Ruta corregida

  const getChannelColors = (nombre: string) => {
    const lowerNombre = nombre.toLowerCase()
    if (lowerNombre.includes("whatsapp"))
      return {
        gradient: "from-green-50 to-green-100",
        border: "border-green-200",
        icon: "text-green-600",
        text: "text-green-800",
      }
    if (lowerNombre.includes("facebook"))
      return {
        gradient: "from-blue-50 to-blue-100",
        border: "border-blue-200",
        icon: "text-blue-600",
        text: "text-blue-800",
      }
    if (lowerNombre.includes("instagram"))
      return {
        gradient: "from-pink-50 to-purple-100",
        border: "border-pink-200",
        icon: "text-pink-600",
        text: "text-pink-800",
      }
    if (lowerNombre.includes("telegram"))
      return {
        gradient: "from-sky-50 to-sky-100",
        border: "border-sky-200",
        icon: "text-sky-600",
        text: "text-sky-800",
      }
    if (lowerNombre.includes("email"))
      return {
        gradient: "from-orange-50 to-orange-100",
        border: "border-orange-200",
        icon: "text-orange-600",
        text: "text-orange-800",
      }
    if (lowerNombre.includes("sms"))
      return {
        gradient: "from-indigo-50 to-indigo-100",
        border: "border-indigo-200",
        icon: "text-indigo-600",
        text: "text-indigo-800",
      }
    return {
      gradient: "from-gray-50 to-gray-100",
      border: "border-gray-200",
      icon: "text-gray-600",
      text: "text-gray-800",
    }
  }

  const colors = getChannelColors(channel.nombre)

  const CardContent = (
    <LiquidGlass
      variant="card"
      intensity="strong"
      className={`group relative flex flex-col h-full transition-all duration-300 ${
        channel.estado === 1 ? "cursor-pointer" : "cursor-not-allowed"
      } ${
        channel.estado === 0 ? "opacity-75" : ""
      } bg-gradient-to-br ${colors.gradient} ${colors.border} shadow-lg hover:shadow-xl`}
      style={{
        background: "rgba(255, 255, 255, 0.7)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(0, 0, 0, 0.1)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
      }}
      rippleEffect={channel.estado === 1}
      flowOnHover={channel.estado === 1}
    >
      {/* Header */}
      <div className="flex flex-col items-center justify-center p-6 min-h-[120px] relative">
        {/* Icon positioned absolutely in top-left */}
        <div className="absolute left-6 top-6">
          {channel.imagen ? (
            <Image
              src={channel.imagen || "/placeholder.svg"}
              alt={channel.nombre}
              width={28}
              height={28}
              className="w-7 h-7 object-cover rounded"
            />
          ) : (
            <IconComponent
              className={`w-7 h-7 ${colors.icon} transition-transform duration-300 ${
                channel.estado === 1 ? "group-hover:scale-110" : ""
              }`}
            />
          )}
        </div>

        {/* Centered name and status - completely independent of icon */}
        <div className="flex flex-col items-center justify-center text-center w-full">
          <h3
            className={`text-lg font-semibold ${colors.text} transition-opacity duration-300 leading-tight mb-3 line-clamp-2 ${
              channel.estado === 1 ? "group-hover:opacity-80" : ""
            }`}
          >
            {channel.nombre}
          </h3>
          <LiquidGlass
            variant="button"
            intensity="subtle"
            className="px-3 py-1 text-xs font-medium inline-block"
            style={
              channel.estado === 1
                ? {
                    background: "rgba(34, 197, 94, 0.15)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(34, 197, 94, 0.3)",
                  }
                : {
                    background: "rgba(156, 163, 175, 0.15)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(156, 163, 175, 0.3)",
                  }
            }
          >
            <span className={channel.estado === 1 ? "text-green-700" : "text-gray-600"}>
              {channel.estado === 1 ? "Activo" : "Inactivo"}
            </span>
          </LiquidGlass>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 mt-auto border-t border-black/10">
        <div
          className={`flex items-center text-sm font-medium ${colors.text} transition-opacity duration-300 ${
            channel.estado === 1 ? "group-hover:opacity-80" : ""
          }`}
        >
          <Settings2 className="mr-2 h-4 w-4 flex-shrink-0" />
          <span className="flex-1">Configurar Canal</span>
          {channel.estado === 1 && (
            <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
          )}
        </div>
      </div>
    </LiquidGlass>
  )

  return channel.estado === 1 && channel.href_button_action ? (
    <Link href={channelUrl} className="block h-full">
      {CardContent}
    </Link>
  ) : (
    <div className="block h-full">{CardContent}</div>
  )
}

export default function CanalesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [canales, setCanales] = useState<Canal[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCanales = async () => {
      try {
        setLoading(true)
        setError(null)
        // Simulación de datos para demostración
        // await new Promise((resolve) => setTimeout(resolve, 1500))
        const demoData: Canal[] = [
          {
            id: 1,
            nombre: "WhatsApp ",
            descripcion: "Conecta con tus clientes directamente a través de mensajes instantáneos.",
            imagen: null,
            href_button_action: null, // Cambiar a null para indicar que no hay página de configuración
            estado: 1, // Cambiar a 1 para que aparezca como activo
          },
          {
            id: 2,
            nombre: "Facebook ",
            descripcion: "Automatiza respuestas y ofrece soporte al cliente 24/7.",
            imagen: null,
            href_button_action: null,
            estado: 0,
          },
          {
            id: 3,
            nombre: "Instagram ",
            descripcion: "Interactúa con tu audiencia de forma visual y atractiva.",
            imagen: null,
            href_button_action: "/config/instagram",
            estado: 0,
          },
          {
            id: 4,
            nombre: "Telegram ",
            descripcion: "Bot automatizado para atención al cliente en Telegram.",
            imagen: null,
            href_button_action: "/config/telegram",
            estado: 0,
          },
        ]
        setCanales(demoData)
      } catch (err: any) {
        console.error("Unexpected error:", err)
        setError(err.message || "Error inesperado al cargar canales")
      } finally {
        setLoading(false)
      }
    }

    fetchCanales()
  }, [])

  const filteredChannels = useMemo(
    () =>
      canales.filter(
        (channel) =>
          channel.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (channel.descripcion && channel.descripcion.toLowerCase().includes(searchQuery.toLowerCase())),
      ),
    [canales, searchQuery],
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
        <LiquidGlass
          variant="card"
          intensity="medium"
          className="flex flex-col items-center justify-center p-12"
          style={{
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(0, 0, 0, 0.1)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Loader2 className="h-16 w-16 animate-spin text-blue-600 mb-6" />
          <p className="text-xl font-medium text-gray-800">Cargando tus canales...</p>
        </LiquidGlass>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
        <LiquidGlass
          variant="card"
          intensity="medium"
          className="flex flex-col items-center justify-center p-12 text-center max-w-md"
          style={{
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            boxShadow: "0 8px 32px rgba(239, 68, 68, 0.1)",
          }}
        >
          <AlertTriangle className="h-16 w-16 text-red-500 mb-6" />
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">¡Ups! Algo salió mal</h2>
          <p className="text-gray-600 mb-4">
            No pudimos cargar tus canales en este momento. Por favor, inténtalo de nuevo más tarde.
          </p>
          <p className="text-sm text-red-600 mb-6">Detalle: {error}</p>
          <Button onClick={() => window.location.reload()} className="bg-red-500 hover:bg-red-600 text-white">
            Intentar de Nuevo
          </Button>
        </LiquidGlass>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Efectos de fondo sutiles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl" />
        <div className="absolute top-3/4 left-3/4 w-64 h-64 bg-green-200/20 rounded-full blur-2xl" />
      </div>

      <div className="container mx-auto max-w-7xl relative z-10">
        {/* Efecto de luz adicional */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none rounded-xl" />
        <div className="absolute inset-0 bg-gradient-to-tl from-white/30 via-transparent to-white/5 pointer-events-none rounded-xl" />

        {/* Header */}
        <LiquidGlass
          variant="card"
          intensity="medium"
          className="mb-8 p-8"
          style={{
            background: "rgba(255, 255, 255, 0.7)",
            backdropFilter: "blur(30px)",
            border: "1px solid rgba(0, 0, 0, 0.1)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
          }}
        >
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-gray-800 sm:text-5xl mb-3">Mis Canales</h1>
              <p className="text-lg text-gray-600 max-w-2xl">
                Gestiona, configura y optimiza todos tus canales de comunicación desde un solo lugar.
              </p>
            </div>
          </div>
        </LiquidGlass>

        {/* Search */}
        <LiquidGlass
          variant="card"
          intensity="medium"
          className="mb-8 p-6"
          style={{
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(0, 0, 0, 0.1)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
          }}
        >
          <div className="relative max-w-lg">
            <SearchIcon className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              type="search"
              placeholder="Buscar canal por nombre o descripción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/50 border-gray-200 text-gray-800 placeholder:text-gray-500 pl-11 pr-4 py-3 rounded-lg backdrop-blur-sm focus:bg-white/70 focus:border-gray-300"
            />
          </div>
        </LiquidGlass>

        {/* Content */}
        {filteredChannels.length === 0 ? (
          <LiquidGlass
            variant="card"
            intensity="medium"
            className="flex flex-col items-center justify-center p-12 text-center min-h-[350px]"
            style={{
              background: "rgba(255, 255, 255, 0.8)",
              backdropFilter: "blur(20px)",
              border: "2px dashed rgba(0, 0, 0, 0.2)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            }}
          >
            <RadioTower className="mx-auto h-16 w-16 text-gray-400 mb-6" />
            <h3 className="text-2xl font-semibold text-gray-800 mb-2">
              {searchQuery ? "Ningún canal coincide" : "Aún no tienes canales"}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md">
              {searchQuery
                ? "Prueba con otros términos o revisa si hay errores tipográficos."
                : "Comienza añadiendo tu primer canal para conectar con tus clientes."}
            </p>
            {!searchQuery && (
              <LiquidGlass
                variant="button"
                intensity="medium"
                className="cursor-pointer px-6 py-3"
                style={{
                  background: "rgba(34, 197, 94, 0.15)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(34, 197, 94, 0.3)",
                  boxShadow: "0 4px 16px rgba(34, 197, 94, 0.1)",
                }}
                rippleEffect={true}
              >
                <div className="flex items-center text-green-700 font-medium">
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Añadir Mi Primer Canal
                </div>
              </LiquidGlass>
            )}
          </LiquidGlass>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredChannels.map((channel) => (
              <ChannelCard key={channel.id} channel={channel} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
