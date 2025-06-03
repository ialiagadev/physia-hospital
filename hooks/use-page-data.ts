"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { PageCacheService } from "@/lib/page-cache"

export function usePageData<T>(key: string, fetchFn: () => Promise<T>, dependencies: any[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // Cancelar request anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    async function loadData() {
      try {
        // Intentar obtener de caché primero
        const cachedData = PageCacheService.get(key)
        if (cachedData) {
          setData(cachedData)
          setLoading(false)
          return
        }

        setLoading(true)
        setError(null)

        const result = await fetchFn()

        if (!controller.signal.aborted) {
          setData(result)
          PageCacheService.set(key, result)
          setLoading(false)
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Error desconocido")
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      controller.abort()
    }
  }, dependencies)

  const refresh = useCallback(() => {
    // Limpiar caché específica para esta clave
    PageCacheService.remove(key)

    // Cancelar request anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Indicar que estamos cargando de nuevo
    setLoading(true)
    setError(null)

    // Crear nuevo controlador
    const controller = new AbortController()
    abortControllerRef.current = controller

    // Ejecutar fetch de nuevo
    fetchFn()
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result)
          PageCacheService.set(key, result)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.error("Error refrescando datos:", err)
          setError(err instanceof Error ? err.message : "Error desconocido")
          setLoading(false)
        }
      })
  }, [key, fetchFn])

  return { data, loading, error, refresh }
}
