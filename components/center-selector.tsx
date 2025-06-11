"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

interface Center {
  id: number
  name: string
  address: string | null
  active: boolean
}

interface CenterSelectorProps {
  organizationId: number
  value?: number | null
  onValueChange: (centerId: number | null) => void
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  showInactiveMessage?: boolean
}

export function CenterSelector({
  organizationId,
  value,
  onValueChange,
  label = "Centro",
  placeholder = "Selecciona un centro",
  required = false,
  disabled = false,
  showInactiveMessage = true,
}: CenterSelectorProps) {
  const [centers, setCenters] = useState<Center[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCenters()
  }, [organizationId])

  const loadCenters = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from("centers")
        .select("id, name, address, active")
        .eq("organization_id", organizationId)
        .order("name")

      if (fetchError) throw fetchError

      setCenters(data || [])
    } catch (err) {
      console.error("Error loading centers:", err)
      setError("Error al cargar los centros")
    } finally {
      setIsLoading(false)
    }
  }

  const activeCenters = centers.filter((center) => center.active)
  const hasActiveCenters = activeCenters.length > 0

  const handleValueChange = (centerId: string) => {
    if (centerId === "none") {
      onValueChange(null)
    } else {
      onValueChange(Number.parseInt(centerId))
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {label && <Label>{label}</Label>}
        <div className="flex items-center space-x-2 h-10 px-3 py-2 border border-input bg-background rounded-md">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Cargando centros...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-2">
        {label && <Label>{label}</Label>}
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!hasActiveCenters) {
    return (
      <div className="space-y-2">
        {label && <Label>{label}</Label>}
        <Alert>
          <AlertDescription>
            No hay centros activos disponibles para esta organización.
            {showInactiveMessage && " Puedes crear centros desde la configuración de la organización."}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <Select value={value ? value.toString() : undefined} onValueChange={handleValueChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {!required && (
            <SelectItem value="none">
              <span className="text-muted-foreground">Sin centro específico</span>
            </SelectItem>
          )}
          {activeCenters.map((center) => (
            <SelectItem key={center.id} value={center.id.toString()}>
              <div className="flex flex-col">
                <span>{center.name}</span>
                {center.address && <span className="text-xs text-muted-foreground">{center.address}</span>}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
