"use client"

import { useState, useEffect } from "react"
import { WorkScheduleService } from "@/lib/services/work-schedules"
import type { WorkSchedule } from "@/types/calendar"

export function useWorkSchedules(userId?: string) {
  const [schedules, setSchedules] = useState<WorkSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSchedules = async () => {
    if (!userId) return

    try {
      setLoading(true)
      setError(null)
      const data = await WorkScheduleService.getWorkSchedules(userId)
      setSchedules(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error fetching schedules"
      setError(errorMessage)
      console.error("Error in useWorkSchedules:", err)
    } finally {
      setLoading(false)
    }
  }

  const saveSchedules = async (newSchedules: Partial<WorkSchedule>[]) => {
    if (!userId) throw new Error("User ID is required")

    try {
      const savedSchedules = await WorkScheduleService.saveWorkSchedules(userId, newSchedules)
      setSchedules(savedSchedules)
      return savedSchedules
    } catch (err) {
      console.error("Error saving schedules:", err)
      throw err
    }
  }

  const checkAvailability = async (date: Date, startTime: string, endTime: string) => {
    if (!userId) return false

    try {
      return await WorkScheduleService.isUserAvailable(userId, date, startTime, endTime)
    } catch (err) {
      console.error("Error checking availability:", err)
      return false
    }
  }

  const getAvailableSlots = async (date: Date, slotDuration?: number) => {
    if (!userId) return []

    try {
      return await WorkScheduleService.getAvailableSlots(userId, date, slotDuration)
    } catch (err) {
      console.error("Error getting available slots:", err)
      return []
    }
  }

  useEffect(() => {
    fetchSchedules()
  }, [userId])

  return {
    schedules,
    loading,
    error,
    saveSchedules,
    checkAvailability,
    getAvailableSlots,
    refetch: fetchSchedules,
  }
}
