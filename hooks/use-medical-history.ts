    "use client"

import { useState, useEffect } from "react"
import { getMedicalHistory, getMedicalAlerts } from "@/lib/actions/medical-history"
import { useToast } from "@/hooks/use-toast"

export function useMedicalHistory(clientId: string) {
  const [medicalHistory, setMedicalHistory] = useState<any>(null)
  const [medicalAlerts, setMedicalAlerts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const loadMedicalHistory = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await getMedicalHistory(clientId)

      if (error) {
        setError(error)
        return
      }

      setMedicalHistory(data)
    } catch (err) {
      setError("Error al cargar el historial médico")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMedicalAlerts = async () => {
    try {
      const { data, error } = await getMedicalAlerts(clientId)

      if (error) {
        console.error("Error loading medical alerts:", error)
        return
      }

      setMedicalAlerts(data || [])
    } catch (err) {
      console.error("Error loading medical alerts:", err)
    }
  }

  useEffect(() => {
    if (clientId) {
      loadMedicalHistory()
      loadMedicalAlerts()
    }
  }, [clientId])

  const refreshData = () => {
    loadMedicalHistory()
    loadMedicalAlerts()
  }

  return {
    medicalHistory,
    medicalAlerts,
    isLoading,
    error,
    refreshData,
  }
}
