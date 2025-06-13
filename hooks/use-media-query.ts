"use client"

import { useState, useEffect } from "react"

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    // Crear el objeto MediaQueryList
    const media = window.matchMedia(query)
    
    // Establecer el estado inicial
    setMatches(media.matches)
    
    // Definir el callback para cuando cambie el estado
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }
    
    // Añadir el listener
    media.addEventListener("change", listener)
    
    // Limpiar al desmontar
    return () => {
      media.removeEventListener("change", listener)
    }
  }, [query])

  return matches
}