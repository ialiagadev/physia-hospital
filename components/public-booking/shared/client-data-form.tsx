"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User, Phone, Mail } from 'lucide-react'
import { COMMON_PHONE_PREFIXES } from "@/types/chat"

interface ClientData {
  name: string
  phone: string
  phone_prefix: string // ✅ Nuevo campo añadido
  email?: string
}

interface ClientDataFormProps {
  onSubmit: (data: ClientData) => void
  loading?: boolean
}

export function ClientDataForm({ onSubmit, loading = false }: ClientDataFormProps) {
  const [formData, setFormData] = useState<ClientData>({
    name: "",
    phone: "",
    phone_prefix: "+34", // ✅ Valor por defecto
    email: "",
  })

  const [errors, setErrors] = useState<Partial<ClientData>>({})

  // ✅ Validación mejorada que considera el prefijo
  const validateForm = (): boolean => {
    const newErrors: Partial<ClientData> = {}

    if (!formData.name.trim()) {
      newErrors.name = "El nombre es obligatorio"
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "El teléfono es obligatorio"
    } else {
      // Validación básica del teléfono (solo verificar que tenga dígitos)
      const cleanPhone = formData.phone.replace(/[\s\-()]/g, "")
      if (!/^\d{6,15}$/.test(cleanPhone)) {
        newErrors.phone = "El teléfono debe tener entre 6 y 15 dígitos"
      }
    }

    if (!formData.phone_prefix) {
      newErrors.phone_prefix = "Selecciona un prefijo telefónico"
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Formato de email inválido"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) {
      return
    }

    // ✅ Limpiar el teléfono antes de enviar
    const cleanedData = {
      ...formData,
      phone: formData.phone.replace(/[\s\-()]/g, ""), // Limpiar espacios y caracteres
    }

    onSubmit(cleanedData)
  }

  const handleInputChange = (field: keyof ClientData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const handlePrefixChange = (value: string) => {
    setFormData((prev) => ({ ...prev, phone_prefix: value }))
    if (errors.phone_prefix) {
      setErrors((prev) => ({ ...prev, phone_prefix: undefined }))
    }
  }

  // ✅ Función para formatear el teléfono completo como preview
  const getFullPhonePreview = (): string => {
    if (formData.phone && formData.phone_prefix) {
      const cleanPhone = formData.phone.replace(/[\s\-()]/g, "")
      return `${formData.phone_prefix}${cleanPhone}`
    }
    return ""
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">Tus Datos</h2>
        <p className="text-gray-600 mt-2">Completa la información para confirmar tu cita</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5" />
            Información Personal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre completo *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Tu nombre completo"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
            </div>

            {/* ✅ Campo de teléfono mejorado con selector de prefijo */}
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono *</Label>
              <div className="flex gap-2">
                <Select value={formData.phone_prefix} onValueChange={handlePrefixChange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_PHONE_PREFIXES.map((prefix) => (
                      <SelectItem key={prefix.countryCode} value={prefix.prefix}>
                        <div className="flex items-center gap-2">
                          <span>{prefix.flag}</span>
                          <span>{prefix.prefix}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="600 000 000"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    className={`pl-10 ${errors.phone ? "border-red-500" : ""}`}
                  />
                </div>
              </div>
              {errors.phone_prefix && <p className="text-sm text-red-600">{errors.phone_prefix}</p>}
              {errors.phone && <p className="text-sm text-red-600">{errors.phone}</p>}
              
              {/* ✅ Preview del teléfono completo */}
              {getFullPhonePreview() && (
                <p className="text-sm text-gray-500">
                  Teléfono completo: <strong>{getFullPhonePreview()}</strong>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email (opcional)</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className={`pl-10 ${errors.email ? "border-red-500" : ""}`}
                />
              </div>
              {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Procesando..." : "Continuar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
