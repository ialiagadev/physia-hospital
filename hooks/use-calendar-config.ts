"use client"

import { useState, useEffect } from "react"
import type { IntervaloTiempo } from "@/types/calendar"

const CALENDAR_CONFIG_KEY = "physia-calendar-config"

interface CalendarConfigData {
  intervaloTiempo: IntervaloTiempo
}

const defaultConfig: CalendarConfigData = {
  intervaloTiempo: 60,
}

export function useCalendarConfig() {
  const [config, setConfig] = useState<CalendarConfigData>(defaultConfig)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem(CALENDAR_CONFIG_KEY)
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig) as CalendarConfigData
        setConfig(parsedConfig)
      }
    } catch (error) {
      console.error("Error loading calendar config:", error)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  const updateConfig = (newConfig: Partial<CalendarConfigData>) => {
    const updatedConfig = { ...config, ...newConfig }
    setConfig(updatedConfig)

    try {
      localStorage.setItem(CALENDAR_CONFIG_KEY, JSON.stringify(updatedConfig))
    } catch (error) {
      console.error("Error saving calendar config:", error)
    }
  }

  const updateIntervaloTiempo = (intervalo: IntervaloTiempo) => {
    updateConfig({ intervaloTiempo: intervalo })
  }

  return {
    config,
    isLoaded,
    updateIntervaloTiempo,
    intervaloTiempo: config.intervaloTiempo,
  }
}
