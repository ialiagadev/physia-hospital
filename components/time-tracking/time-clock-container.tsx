"use client"

import { TimeClock } from "./time-clock"
import { useTimeTracking } from "@/hooks/use-time-tracking"
import { Card, CardContent } from "@/components/ui/card"
import { Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useEffect, useState, useCallback } from "react"

interface TimeClockContainerProps {
  selectedUser?: {
    id: string
    name: string | null
    email: string | null
    organization_id: number | null
  } | null
  onClockSuccess?: () => void
}

export function TimeClockContainer({ selectedUser, onClockSuccess }: TimeClockContainerProps) {
  const { userProfile, loading, error, clockInOut, getLastEntry, getActivePause } = useTimeTracking()
  const { toast } = useToast()

  const [lastEntry, setLastEntry] = useState<any>(null)
  const [activePause, setActivePause] = useState<any>(null)
  const [isLoadingEntry, setIsLoadingEntry] = useState(false)

  const targetUser = selectedUser || userProfile

  const loadUserData = useCallback(
    async (userId: string) => {
      if (!userId || typeof userId !== "string" || userId.trim() === "") {
        setLastEntry(null)
        setActivePause(null)
        return
      }

      setIsLoadingEntry(true)
      try {
        const [entry, pause] = await Promise.all([getLastEntry(userId), getActivePause(userId)])
        setLastEntry(entry)
        setActivePause(pause)
      } catch (err) {
        console.error("Error loading user data:", err)
        setLastEntry(null)
        setActivePause(null)
      } finally {
        setIsLoadingEntry(false)
      }
    },
    [getLastEntry, getActivePause],
  )

  useEffect(() => {
    if (targetUser?.id) {
      loadUserData(targetUser.id)
    } else {
      setLastEntry(null)
      setActivePause(null)
    }
  }, [targetUser?.id, loadUserData])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center h-64">
          <p>Cargando...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center h-64">
          <div className="text-center text-red-500">
            <p>Error: {error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!targetUser || !targetUser.organization_id) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center h-64">
          <div className="text-center text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No se pudo cargar el usuario</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleClockInOut = async (entryType: "entrada" | "salida" | "pausa_inicio" | "pausa_fin") => {
    if (!targetUser.id || !targetUser.organization_id) {
      toast({
        title: "❌ Error",
        description: "Información de usuario incompleta",
        variant: "destructive",
      })
      return
    }

    try {
      const isAdminAction = Boolean(selectedUser && userProfile?.role === "admin")
      const result = await clockInOut(targetUser.id, targetUser.organization_id, entryType, isAdminAction)

      if (result.success) {
        const messages = {
          entrada: "✅ Entrada registrada",
          salida: "✅ Salida registrada",
          pausa_inicio: "⏸️ Pausa iniciada",
          pausa_fin: "▶️ Pausa finalizada",
        }

        toast({
          title: messages[entryType],
          description: `Fichaje de ${entryType.replace("_", " ")} guardado correctamente.`,
        })

        // Recargar datos del usuario
        await loadUserData(targetUser.id)

        if (onClockSuccess) {
          onClockSuccess()
        }
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al fichar"
      toast({
        title: "❌ Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  return (
    <TimeClock
      user={targetUser}
      lastEntry={lastEntry}
      activePause={activePause}
      onClockInOut={handleClockInOut}
      isLoading={loading || isLoadingEntry}
    />
  )
}
