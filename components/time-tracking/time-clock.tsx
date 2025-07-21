"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LogIn, LogOut } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface TimeClockProps {
  user: {
    id: string
    name: string | null
    email: string | null
  }
  lastEntry: {
    entry_type: "entrada" | "salida"
    local_timestamp: string
  } | null
  onClockInOut: (type: "entrada" | "salida") => void
  isLoading: boolean
}

// Mantener el componente TimeClock con un solo botón que alterne entre entrada y salida

export function TimeClock({ user, lastEntry, onClockInOut, isLoading }: TimeClockProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [elapsedTime, setElapsedTime] = useState<string | null>(null)

  // Determinar el próximo tipo de fichaje basado en el último entry
  const nextAction = lastEntry?.entry_type === "entrada" ? "salida" : "entrada"

  // Actualizar la hora actual cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())

      // Si el último fichaje es de entrada, calcular el tiempo transcurrido
      if (lastEntry?.entry_type === "entrada") {
        const entryTime = new Date(lastEntry.local_timestamp)
        const diff = new Date().getTime() - entryTime.getTime()
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)

        setElapsedTime(
          `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
        )
      } else {
        setElapsedTime(null)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [lastEntry])

  const formattedTime = format(currentTime, "HH:mm:ss", { locale: es })
  const formattedDate = format(currentTime, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })

  const handleClockInOut = () => {
    onClockInOut(nextAction)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Reloj de fichaje</span>
          {lastEntry?.entry_type === "entrada" && (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          )}
        </CardTitle>
        <CardDescription>
          {user.name ? `${user.name}` : "Usuario"}
          {user.email && ` (${user.email})`}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col items-center space-y-4">
        <div className="text-4xl font-bold">{formattedTime}</div>
        <div className="text-sm text-muted-foreground capitalize">{formattedDate}</div>

        {lastEntry && (
          <div className="text-sm mt-2 p-2 bg-muted rounded-md w-full">
            <div className="flex justify-between">
              <span>Último fichaje:</span>
              <span className={lastEntry.entry_type === "entrada" ? "text-green-500" : "text-red-500"}>
                {lastEntry.entry_type === "entrada" ? "Entrada" : "Salida"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Hora:</span>
              <span>{format(new Date(lastEntry.local_timestamp), "HH:mm:ss", { locale: es })}</span>
            </div>
            {elapsedTime && (
              <div className="flex justify-between mt-2 font-medium">
                <span>Tiempo trabajando:</span>
                <span className="text-green-500">{elapsedTime}</span>
              </div>
            )}
          </div>
        )}

        
      </CardContent>

      <CardFooter>
        <Button
          onClick={handleClockInOut}
          disabled={isLoading}
          className="w-full"
          variant={nextAction === "entrada" ? "default" : "destructive"}
        >
          {isLoading ? (
            "Procesando..."
          ) : (
            <>
              {nextAction === "entrada" ? (
                <>
                  <LogIn className="mr-2 h-4 w-4" /> Fichar entrada
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" /> Fichar salida
                </>
              )}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
