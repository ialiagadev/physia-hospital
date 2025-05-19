"use client"

import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"

interface OrganizationSelectorProps {
  selectedOrgId: string
  onSelectOrganization: (orgId: string) => void
  className?: string
}

export function OrganizationSelector({ selectedOrgId, onSelectOrganization, className }: OrganizationSelectorProps) {
  const [organizations, setOrganizations] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadOrganizations() {
      setLoading(true)
      const { data } = await supabase.from("organizations").select("id, name").order("name")
      setOrganizations(data || [])
      setLoading(false)
    }

    loadOrganizations()
  }, [])

  return (
    <div className={className}>
      <Label htmlFor="organization-select" className="mb-2 block">
        Filtrar por organización
      </Label>
      <Select value={selectedOrgId} onValueChange={onSelectOrganization} disabled={loading}>
        <SelectTrigger id="organization-select" className="w-full md:w-[300px]">
          <SelectValue placeholder="Selecciona una organización" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las organizaciones</SelectItem>
          {organizations.map((org) => (
            <SelectItem key={org.id} value={org.id.toString()}>
              {org.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
