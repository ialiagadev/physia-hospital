"use client"

import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

interface Organization {
  id: string
  name: string
}

interface OrganizationSelectorProps {
  selectedOrgId: string
  onSelectOrganization: (orgId: string) => void
  className?: string
  placeholder?: string
  showAllOption?: boolean
  disabled?: boolean
}

export function OrganizationSelector({
  selectedOrgId,
  onSelectOrganization,
  className,
  placeholder = "Selecciona una organización",
  showAllOption = true,
  disabled = false,
}: OrganizationSelectorProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadOrganizations() {
      try {
        setLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase.from("organizations").select("id, name").order("name")

        if (fetchError) {
          console.error("Error cargando organizaciones:", fetchError)
          setError("Error al cargar las organizaciones")
          return
        }

        setOrganizations(data || [])
      } catch (err) {
        console.error("Error en loadOrganizations:", err)
        setError("Error inesperado al cargar organizaciones")
      } finally {
        setLoading(false)
      }
    }

    loadOrganizations()
  }, [])

  const handleValueChange = (value: string) => {
    onSelectOrganization(value)
  }

  if (error) {
    return (
      <div className={className}>
        <Label className="mb-2 block text-sm font-medium">Filtrar por organización</Label>
        <div className="flex items-center space-x-2 text-sm text-red-600">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <Label htmlFor="organization-select" className="mb-2 block text-sm font-medium">
        Filtrar por organización
      </Label>
      <Select value={selectedOrgId} onValueChange={handleValueChange} disabled={loading || disabled}>
        <SelectTrigger id="organization-select" className="w-full md:w-[300px]">
          <SelectValue placeholder={loading ? "Cargando..." : placeholder} />
          {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
        </SelectTrigger>
        <SelectContent>
          {showAllOption && <SelectItem value="all">Todas las organizaciones</SelectItem>}
          {organizations.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              {org.name}
            </SelectItem>
          ))}
          {/* ✅ CORREGIDO: Usar valor no vacío */}
          {organizations.length === 0 && !loading && (
            <SelectItem value="no-organizations" disabled>
              No hay organizaciones disponibles
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  )
}
  