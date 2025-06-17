"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface TimeClockProps {
  user: {
    id: string
    name: string | null
    email: string | null // Cambiado a string | null
  }
  lastEntry?: {
    entry_type: string
    local_timestamp: string
  } | null
  onClockInOut: (entryType: "entrada" | "salida") => Promise<void>
  isLoading: boolean
}

export function TimeClock({ user, lastEntry, onClockInOut, isLoading }: TimeClockProps) {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const nextAction = lastEntry?.entry_type === "entrada" ? "salida" : "entrada"
  const buttonText = nextAction === "entrada" ? "Entrada" : "Salida"
  const buttonVariant = nextAction === "entrada" ? "default" : "destructive"

  const handleClock = async () => {
    await onClockInOut(nextAction)
  }

  return (
    <div className="max-w-md mx-auto">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-8 text-center space-y-6">
          {/* Usuario */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            {user.name || user.email || "Usuario sin nombre"}
          </div>

          {/* Reloj */}
          <div className="space-y-2">
            <div className="text-5xl font-light tabular-nums tracking-tight">{format(currentTime, "HH:mm:ss")}</div>
            <div className="text-sm text-muted-foreground">
              {format(currentTime, "EEEE, d MMMM yyyy", { locale: es })}
            </div>
          </div>

          {/* Estado actual */}
          {lastEntry && (
            <div className="py-3 px-4 bg-muted/50 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Último registro</div>
              <div className="flex items-center justify-center gap-2">
                <Badge variant={lastEntry.entry_type === "entrada" ? "default" : "secondary"} className="text-xs">
                  {lastEntry.entry_type.toUpperCase()}
                </Badge>
                <span className="text-sm tabular-nums">{format(new Date(lastEntry.local_timestamp), "HH:mm:ss")}</span>
              </div>
            </div>
          )}

          {/* Botón de fichaje */}
          <Button
            onClick={handleClock}
            disabled={isLoading}
            variant={buttonVariant}
            size="lg"
            className="w-full h-12 text-base font-medium"
          >
            {isLoading ? "Procesando..." : buttonText}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
