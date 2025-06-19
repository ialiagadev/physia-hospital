"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Phone, Mail, MapPin, Calendar, Edit } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface SummarySectionProps {
  formData: any
  setFormData: React.Dispatch<React.SetStateAction<any>>
  isEditing: boolean
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>
  isSaving: boolean
  clinicalStats: {
    totalRecords: number
    activeRecords: number
    lastVisit: string | null
    nextAppointment: string | null
  }
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onSubmit: (e: React.FormEvent) => Promise<void>
  onDir3Change: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function SummarySection({
  formData,
  setFormData,
  isEditing,
  setIsEditing,
  isSaving,
  clinicalStats,
  onInputChange,
  onSubmit,
  onDir3Change,
}: SummarySectionProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Sin fecha"
    try {
      const date = new Date(dateString)
      return format(date, "dd/MM/yyyy", { locale: es })
    } catch (error) {
      return "Fecha no válida"
    }
  }

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return "No especificada"
    try {
      const birth = new Date(birthDate)
      const today = new Date()
      let age = today.getFullYear() - birth.getFullYear()
      const monthDiff = today.getMonth() - birth.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--
      }
      return `${age} años`
    } catch (error) {
      return "No especificada"
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-500" />
              Información Personal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm text-gray-500">Nombre completo</Label>
              {isEditing ? (
                <Input name="name" value={formData.name} onChange={onInputChange} required className="mt-1" />
              ) : (
                <p className="font-medium mt-1">{formData.name}</p>
              )}
            </div>

            <div>
              <Label className="text-sm text-gray-500">Fecha de nacimiento</Label>
              {isEditing ? (
                <Input
                  name="birth_date"
                  type="date"
                  value={formData.birth_date}
                  onChange={onInputChange}
                  className="mt-1"
                />
              ) : (
                <p className="font-medium mt-1">{formatDate(formData.birth_date)}</p>
              )}
            </div>

            <div>
              <Label className="text-sm text-gray-500">Edad</Label>
              <p className="font-medium mt-1">{calculateAge(formData.birth_date)}</p>
            </div>

            <div>
              <Label className="text-sm text-gray-500">ID Paciente</Label>
              {isEditing ? (
                <Input name="tax_id" value={formData.tax_id} onChange={onInputChange} required className="mt-1" />
              ) : (
                <p className="font-medium mt-1">{formData.tax_id}</p>
              )}
            </div>

            <div>
              <Label className="text-sm text-gray-500">Tipo de Cliente</Label>
              {isEditing ? (
                <RadioGroup
                  value={formData.client_type}
                  onValueChange={(value: "private" | "public") =>
                    setFormData((prev: any) => ({ ...prev, client_type: value }))
                  }
                  className="flex space-x-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="private" id="private" />
                    <Label htmlFor="private">Privado</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="public" id="public" />
                    <Label htmlFor="public">Administración Pública</Label>
                  </div>
                </RadioGroup>
              ) : (
                <p className="font-medium mt-1">
                  {formData.client_type === "public" ? "Administración Pública" : "Privado"}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-green-500" />
              Información de Contacto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm text-gray-500 flex items-center gap-1">
                <Phone className="h-3 w-3" />
                Teléfono
              </Label>
              {isEditing ? (
                <Input name="phone" value={formData.phone} onChange={onInputChange} className="mt-1" />
              ) : (
                <p className="font-medium mt-1">{formData.phone || "No registrado"}</p>
              )}
            </div>

            <div>
              <Label className="text-sm text-gray-500 flex items-center gap-1">
                <Mail className="h-3 w-3" />
                Email
              </Label>
              {isEditing ? (
                <Input name="email" type="email" value={formData.email} onChange={onInputChange} className="mt-1" />
              ) : (
                <p className="font-medium mt-1">{formData.email || "No registrado"}</p>
              )}
            </div>

            <div>
              <Label className="text-sm text-gray-500 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Dirección
              </Label>
              {isEditing ? (
                <Textarea name="address" value={formData.address} onChange={onInputChange} className="mt-1" />
              ) : (
                <p className="font-medium mt-1">{formData.address || "No registrada"}</p>
              )}
            </div>

            {isEditing && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-sm text-gray-500">Código Postal</Label>
                  <Input name="postal_code" value={formData.postal_code} onChange={onInputChange} className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Ciudad</Label>
                  <Input name="city" value={formData.city} onChange={onInputChange} className="mt-1" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Visit History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              Historial de Visitas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm text-gray-500">Última visita</Label>
              <p className="font-medium mt-1">{formatDate(clinicalStats.lastVisit)}</p>
            </div>

            <div>
              <Label className="text-sm text-gray-500">Próxima cita</Label>
              <p className="font-medium mt-1 text-green-600">
                {clinicalStats.nextAppointment ? formatDate(clinicalStats.nextAppointment) : "No programada"}
              </p>
            </div>

            <div>
              <Label className="text-sm text-gray-500">Total de historias</Label>
              <p className="font-medium mt-1">{clinicalStats.totalRecords}</p>
            </div>

            <div>
              <Label className="text-sm text-gray-500">Historias activas</Label>
              <p className="font-medium mt-1">{clinicalStats.activeRecords}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action buttons for summary */}
      {isEditing && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={onSubmit}>
              {formData.client_type === "public" && (
                <div className="space-y-4 border p-4 rounded-md mb-4">
                  <h3 className="font-medium">Códigos DIR3</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="CentroGestor">Centro Gestor</Label>
                      <Input
                        id="CentroGestor"
                        name="CentroGestor"
                        value={formData.dir3_codes.CentroGestor}
                        onChange={onDir3Change}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="UnidadTramitadora">Unidad Tramitadora</Label>
                      <Input
                        id="UnidadTramitadora"
                        name="UnidadTramitadora"
                        value={formData.dir3_codes.UnidadTramitadora}
                        onChange={onDir3Change}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="OficinaContable">Oficina Contable</Label>
                      <Input
                        id="OficinaContable"
                        name="OficinaContable"
                        value={formData.dir3_codes.OficinaContable}
                        onChange={onDir3Change}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!isEditing && (
        <div className="flex justify-end">
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar Cliente
          </Button>
        </div>
      )}
    </div>
  )
}
