"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LogIn, LogOut, Pause, Play } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface TimeClockProps {
  user: {
    id: string
    name: string | null
    email: string | null
  }
  lastEntry: {
    entry_type: "entrada" | "salida" | "pausa_inicio" | "pausa_fin"
    local_timestamp: string
  } | null
  activePause: {
    local_pause_start: string
    pause_number: number
  } | null
  onClockInOut: (type: "entrada" | "salida" | "pausa_inicio" | "pausa_fin") => void
  isLoading: boolean
}

export function TimeClock({ user, lastEntry, activePause, onClockInOut, isLoading }: TimeClockProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [workingTime, setWorkingTime] = useState<string | null>(null)
  const [pauseTime, setPauseTime] = useState<string | null>(null)

  // Determinar el próximo tipo de fichaje
  const getNextAction = () => {
    if (!lastEntry) return "entrada"
    if (activePause) return "pausa_fin"

    switch (lastEntry.entry_type) {
      case "entrada":
      case "pausa_fin":
        return "pausa_inicio"
      case "salida":
        return "entrada"
      case "pausa_inicio":
        return "pausa_fin"
      default:
        return "entrada"
    }
  }

  const canClockOut = () => {
    if (!lastEntry) return false
    if (activePause) return false
    return lastEntry.entry_type === "entrada" || lastEntry.entry_type === "pausa_fin"
  }

  const nextAction = getNextAction()

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())

      // Calcular tiempo trabajando (desde la entrada, sin contar pausas)
      if (lastEntry?.entry_type === "entrada" && !activePause) {
        const entryTime = new Date(lastEntry.local_timestamp)
        const diff = new Date().getTime() - entryTime.getTime()
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)
        setWorkingTime(
          `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
        )
      } else {
        setWorkingTime(null)
      }

      // Calcular tiempo en pausa
      if (activePause) {
        const pauseStart = new Date(activePause.local_pause_start)
        const diff = new Date().getTime() - pauseStart.getTime()
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)
        setPauseTime(
          `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
        )
      } else {
        setPauseTime(null)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [lastEntry, activePause])

  const formattedTime = format(currentTime, "HH:mm:ss", { locale: es })
  const formattedDate = format(currentTime, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })

  const getActionButton = () => {
    if (nextAction === "entrada") {
      return (
        <Button onClick={() => onClockInOut("entrada")} disabled={isLoading} className="w-full" variant="default">
          {isLoading ? (
            "Procesando..."
          ) : (
            <>
              <LogIn className="mr-2 h-4 w-4" /> Fichar entrada
            </>
          )}
        </Button>
      )
    }

    if (nextAction === "pausa_inicio") {
      return (
        <div className="flex gap-2 w-full">
          <Button
            onClick={() => onClockInOut("pausa_inicio")}
            disabled={isLoading}
            variant="outline"
            className="flex-1"
          >
            {isLoading ? (
              "..."
            ) : (
              <>
                <Pause className="mr-2 h-4 w-4" /> Iniciar pausa
              </>
            )}
          </Button>
          {canClockOut() && (
            <Button
              onClick={() => onClockInOut("salida")}
              disabled={isLoading}
              variant="destructive"
              className="flex-1"
            >
              {isLoading ? (
                "..."
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" /> Fichar salida
                </>
              )}
            </Button>
          )}
        </div>
      )
    }

    if (nextAction === "pausa_fin") {
      return (
        <Button onClick={() => onClockInOut("pausa_fin")} disabled={isLoading} className="w-full" variant="default">
          {isLoading ? (
            "Procesando..."
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" /> Finalizar pausa
            </>
          )}
        </Button>
      )
    }

    return null
  }

  const getStatusText = () => {
    if (!lastEntry) return "Sin fichar"
    if (activePause) return `En pausa #${activePause.pause_number}`

    switch (lastEntry.entry_type) {
      case "entrada":
        return "Trabajando"
      case "salida":
        return "Jornada finalizada"
      case "pausa_inicio":
        return "En pausa"
      case "pausa_fin":
        return "Trabajando"
      default:
        return "Estado desconocido"
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Reloj de fichaje</span>
          {activePause && (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
            </span>
          )}
          {lastEntry?.entry_type === "entrada" && !activePause && (
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

        <div className="text-center">
          <div className="text-lg font-medium">{getStatusText()}</div>
        </div>

        {lastEntry && (
          <div className="text-sm mt-2 p-3 bg-muted rounded-md w-full">
            <div className="flex justify-between mb-2">
              <span>Último fichaje:</span>
              <span
                className={
                  lastEntry.entry_type === "entrada"
                    ? "text-green-500"
                    : lastEntry.entry_type === "salida"
                      ? "text-red-500"
                      : lastEntry.entry_type === "pausa_inicio"
                        ? "text-orange-500"
                        : "text-blue-500"
                }
              >
                {lastEntry.entry_type === "entrada"
                  ? "Entrada"
                  : lastEntry.entry_type === "salida"
                    ? "Salida"
                    : lastEntry.entry_type === "pausa_inicio"
                      ? "Inicio pausa"
                      : "Fin pausa"}
              </span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Hora:</span>
              <span>{format(new Date(lastEntry.local_timestamp), "HH:mm:ss", { locale: es })}</span>
            </div>

            {workingTime && (
              <div className="flex justify-between mt-2 font-medium">
                <span>Tiempo trabajando:</span>
                <span className="text-green-500">{workingTime}</span>
              </div>
            )}

            {pauseTime && activePause && (
              <div className="flex justify-between mt-2 font-medium">
                <span>En pausa #{activePause.pause_number}:</span>
                <span className="text-orange-500">{pauseTime}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter>{getActionButton()}</CardFooter>
    </Card>
  )
}
