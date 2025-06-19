"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit } from "lucide-react"

interface PersonalInfoSectionProps {
  formData: any
  setFormData: React.Dispatch<React.SetStateAction<any>>
  organizations: any[]
  isEditing: boolean
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>
  isSaving: boolean
  onSubmit: (e: React.FormEvent) => Promise<void>
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onSelectChange: (name: string, value: string) => void
  onDir3Change: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function PersonalInfoSection({
  formData,
  setFormData,
  organizations,
  isEditing,
  setIsEditing,
  isSaving,
  onSubmit,
  onInputChange,
  onSelectChange,
  onDir3Change,
}: PersonalInfoSectionProps) {
  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Información del cliente</CardTitle>
            <CardDescription>Introduce los datos del cliente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="organization_id" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Organización
              </Label>
              {isEditing ? (
                <Select
                  value={formData.organization_id}
                  onValueChange={(value) => onSelectChange("organization_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una organización" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id.toString()}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md border">
                  <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                    {organizations.find((org) => org.id.toString() === formData.organization_id)?.name || "No asignada"}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="name" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Nombre o Razón Social
              </Label>
              {isEditing ? (
                <Input id="name" name="name" value={formData.name} onChange={onInputChange} required />
              ) : (
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md border">
                  <p className="text-base font-medium text-gray-900 dark:text-gray-100">{formData.name}</p>
                </div>
              )}
            </div>

            {/* Add all other form fields following the same pattern */}

            {formData.client_type === "public" && (
              <div className="space-y-4 border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 border-b border-blue-300 dark:border-blue-700 pb-2">
                  Códigos DIR3
                </h3>
                {/* DIR3 fields */}
              </div>
            )}
          </CardContent>
          {isEditing && (
            <CardFooter className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Guardando..." : "Guardar Cliente"}
              </Button>
            </CardFooter>
          )}
        </Card>
      </form>

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
