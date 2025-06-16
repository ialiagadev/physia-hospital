"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface TimeClockProps {
  user: {
    id: string
    name: string
    email: string
  }
  onClockInOut: (userId: string, type: "entrada" | "salida") => Promise<void>
  lastEntry?: {
    entry_type: string
    entry_timestamp: string
  }
}

export function TimeClock({ user, onClockInOut, lastEntry }: TimeClockProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Actualizar reloj cada segundo
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const nextAction = lastEntry?.entry_type === "entrada" ? "salida" : "entrada"
  const buttonText = nextAction === "entrada" ? "FICHAR ENTRADA" : "FICHAR SALIDA"
  const buttonColor = nextAction === "entrada" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"

  const handleClock = async () => {
    setIsLoading(true)
    try {
      await onClockInOut(user.id, nextAction)
      toast({
        title: "✅ Fichaje registrado",
        description: `${buttonText} a las ${currentTime.toLocaleTimeString("es-ES", { timeZone: "Europe/Madrid" })}`,
      })
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "No se pudo registrar el fichaje",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto space-y-4">
      {/* Reloj */}
      <Card>
        <CardHeader className="text-center pb-2">
          <CardTitle className="flex items-center justify-center gap-2">
            <Clock className="h-5 w-5" />
            Control Horario
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="text-4xl font-mono font-bold">
            {currentTime.toLocaleTimeString("es-ES", { timeZone: "Europe/Madrid" })}
          </div>
          <div className="text-sm text-muted-foreground">
            {currentTime.toLocaleDateString("es-ES", {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: "Europe/Madrid",
            })}
          </div>
          <Badge variant="outline" className="text-sm">
            {user.email} - {user.name}
          </Badge>
        </CardContent>
      </Card>

      {/* Estado actual */}
      {lastEntry && (
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-sm text-muted-foreground">Último fichaje:</p>
            <p className="font-semibold text-lg">{lastEntry.entry_type.toUpperCase()}</p>
            <p className="text-sm">
              {new Date(lastEntry.entry_timestamp).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Botón de fichaje */}
      <Button onClick={handleClock} disabled={isLoading} className={`w-full h-16 text-xl font-bold ${buttonColor}`}>
        {isLoading ? "FICHANDO..." : buttonText}
      </Button>

      {/* Aviso legal mínimo */}
      <div className="text-xs text-center text-muted-foreground bg-muted p-2 rounded">
        📋 Sistema conforme RD-ley 8/2019 • Conservación 4 años
      </div>
    </div>
  )
}
