"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { PageCacheService } from "@/lib/page-cache"

interface UseRobustDataOptions {
  timeout?: number
  retries?: number
  cacheKey?: string
}

export function useRobustData<T>(
  fetchFn: () => Promise<T>,
  dependencies: any[] = [],
  options: UseRobustDataOptions = {},
) {
  const { timeout = 10000, retries = 3, cacheKey } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const retryCountRef = useRef(0)

  const fetchWithTimeout = useCallback(async (): Promise<T> => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout después de ${timeout}ms`))
      }, timeout)

      fetchFn()
        .then((result) => {
          clearTimeout(timeoutId)
          resolve(result)
        })
        .catch((error) => {
          clearTimeout(timeoutId)
          reject(error)
        })
    })
  }, [fetchFn, timeout])

  const loadData = useCallback(
    async (isRetry = false) => {
      // Cancelar request anterior
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        // Intentar caché solo si no es un retry
        if (!isRetry && cacheKey) {
          const cachedData = PageCacheService.get(cacheKey)
          if (cachedData) {
            console.log("📦 Datos obtenidos del caché:", cacheKey)
            setData(cachedData)
            setLoading(false)
            return
          }
        }

        setLoading(true)
        setError(null)

        console.log("🔄 Cargando datos...", { isRetry, attempt: retryCountRef.current + 1 })

        const result = await fetchWithTimeout()

        if (!controller.signal.aborted) {
          console.log("✅ Datos cargados exitosamente")
          setData(result)
          if (cacheKey) {
            PageCacheService.set(cacheKey, result)
          }
          setLoading(false)
          retryCountRef.current = 0
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("❌ Error cargando datos:", err)

          // Intentar retry si no hemos alcanzado el límite
          if (retryCountRef.current < retries) {
            retryCountRef.current++
            console.log(`🔄 Reintentando... (${retryCountRef.current}/${retries})`)

            setTimeout(() => {
              loadData(true)
            }, 1000 * retryCountRef.current) // Delay incremental
          } else {
            setError(err instanceof Error ? err.message : "Error desconocido")
            setLoading(false)
            retryCountRef.current = 0
          }
        }
      }
    },
    [fetchWithTimeout, cacheKey, retries],
  )

  useEffect(() => {
    loadData()

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, dependencies)

  const refresh = useCallback(() => {
    console.log("🔄 Refrescando datos manualmente...")
    if (cacheKey) {
      PageCacheService.remove(cacheKey)
    }
    retryCountRef.current = 0
    loadData(true)
  }, [loadData, cacheKey])

  return { data, loading, error, refresh }
}
