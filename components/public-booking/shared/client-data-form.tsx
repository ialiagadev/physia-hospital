"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Phone, Mail } from "lucide-react"

interface ClientData {
  name: string
  phone: string
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
    email: "",
  })
  const [errors, setErrors] = useState<Partial<ClientData>>({})

  const validateForm = (): boolean => {
    const newErrors: Partial<ClientData> = {}

    if (!formData.name.trim()) {
      newErrors.name = "El nombre es obligatorio"
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "El teléfono es obligatorio"
    } else if (!/^\+?[\d\s-()]+$/.test(formData.phone)) {
      newErrors.phone = "Formato de teléfono inválido"
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

    onSubmit(formData)
  }

  const handleInputChange = (field: keyof ClientData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
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

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+34 600 000 000"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className={`pl-10 ${errors.phone ? "border-red-500" : ""}`}
                />
              </div>
              {errors.phone && <p className="text-sm text-red-600">{errors.phone}</p>}
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
 