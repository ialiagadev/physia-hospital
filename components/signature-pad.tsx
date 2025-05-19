"use client"

import type React from "react"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Eraser } from "lucide-react"

interface SignaturePadProps {
  width?: number
  height?: number
  onSignatureChange: (signature: string | null) => void
  className?: string
}

export function SignaturePad({ width = 400, height = 200, onSignatureChange, className }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Configurar el canvas
    ctx.lineWidth = 2
    ctx.lineCap = "round"
    ctx.strokeStyle = "#000000"

    // Limpiar el canvas
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Dibujar un borde
    ctx.strokeStyle = "#e2e8f0"
    ctx.strokeRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = "#000000"
  }, [])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    setIsDrawing(true)
    setHasSignature(true)

    // Obtener las coordenadas del mouse o touch
    const rect = canvas.getBoundingClientRect()
    let x, y

    if ("touches" in e) {
      // Es un evento touch
      x = e.touches[0].clientX - rect.left
      y = e.touches[0].clientY - rect.top
    } else {
      // Es un evento mouse
      x = e.clientX - rect.left
      y = e.clientY - rect.top
    }

    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Obtener las coordenadas del mouse o touch
    const rect = canvas.getBoundingClientRect()
    let x, y

    if ("touches" in e) {
      // Es un evento touch
      x = e.touches[0].clientX - rect.left
      y = e.touches[0].clientY - rect.top
    } else {
      // Es un evento mouse
      x = e.clientX - rect.left
      y = e.clientY - rect.top
    }

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const endDrawing = () => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.closePath()
    setIsDrawing(false)

    // Guardar la firma como imagen
    const signatureDataUrl = canvas.toDataURL("image/png")
    onSignatureChange(signatureDataUrl)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Limpiar el canvas
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Dibujar un borde
    ctx.strokeStyle = "#e2e8f0"
    ctx.strokeRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = "#000000"

    setHasSignature(false)
    onSignatureChange(null)
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative border rounded-md overflow-hidden">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={endDrawing}
          className="touch-none cursor-crosshair"
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none">
            Firme aquí
          </div>
        )}
      </div>
      <div className="mt-2">
        <Button type="button" variant="outline" size="sm" onClick={clearSignature}>
          <Eraser className="h-4 w-4 mr-2" />
          Borrar firma
        </Button>
      </div>
    </div>
  )
}
