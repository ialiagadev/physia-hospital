"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Filter, X } from "lucide-react"
import { format } from "date-fns"

interface WorkSessionsFiltersProps {
  startDate?: string
  endDate?: string
  onFiltersChange: (filters: { startDate?: string; endDate?: string }) => void
  onClearFilters: () => void
}

export function WorkSessionsFilters({ startDate, endDate, onFiltersChange, onClearFilters }: WorkSessionsFiltersProps) {
  const [localStartDate, setLocalStartDate] = useState(startDate || "")
  const [localEndDate, setLocalEndDate] = useState(endDate || "")

  const handleApplyFilters = () => {
    onFiltersChange({
      startDate: localStartDate || undefined,
      endDate: localEndDate || undefined,
    })
  }

  const handleClearFilters = () => {
    setLocalStartDate("")
    setLocalEndDate("")
    onClearFilters()
  }

  const hasActiveFilters = startDate || endDate

  // Obtener fecha de hace 30 días para sugerencia
  const thirtyDaysAgo = format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")
  const today = format(new Date(), "yyyy-MM-dd")

  const setQuickFilter = (days: number) => {
    const startDate = format(new Date(Date.now() - days * 24 * 60 * 60 * 1000), "yyyy-MM-dd")
    const endDate = format(new Date(), "yyyy-MM-dd")
    setLocalStartDate(startDate)
    setLocalEndDate(endDate)
    onFiltersChange({ startDate, endDate })
  }

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4" />
          <h3 className="font-medium">Filtros</h3>
          {hasActiveFilters && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Filtros activos</span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <Label htmlFor="start-date" className="text-sm font-medium">
              Fecha de inicio
            </Label>
            <Input
              id="start-date"
              type="date"
              value={localStartDate}
              onChange={(e) => setLocalStartDate(e.target.value)}
              max={localEndDate || today}
            />
          </div>

          <div>
            <Label htmlFor="end-date" className="text-sm font-medium">
              Fecha de fin
            </Label>
            <Input
              id="end-date"
              type="date"
              value={localEndDate}
              onChange={(e) => setLocalEndDate(e.target.value)}
              min={localStartDate}
              max={today}
            />
          </div>

          <div className="flex items-end gap-2">
            <Button onClick={handleApplyFilters} className="flex-1">
              <Filter className="h-4 w-4 mr-2" />
              Aplicar
            </Button>
            {hasActiveFilters && (
              <Button onClick={handleClearFilters} variant="outline">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Filtros rápidos */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Filtros rápidos:</span>
          <Button variant="outline" size="sm" onClick={() => setQuickFilter(7)}>
            Últimos 7 días
          </Button>
          <Button variant="outline" size="sm" onClick={() => setQuickFilter(30)}>
            Últimos 30 días
          </Button>
          <Button variant="outline" size="sm" onClick={() => setQuickFilter(90)}>
            Últimos 3 meses
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const startOfMonth = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd")
              setLocalStartDate(startOfMonth)
              setLocalEndDate(today)
              onFiltersChange({ startDate: startOfMonth, endDate: today })
            }}
          >
            Este mes
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
