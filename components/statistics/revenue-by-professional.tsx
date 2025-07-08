"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users } from "lucide-react"
import { useAuth } from "@/app/contexts/auth-context"

interface RevenueByProfessionalProps {
  period: string
  compact?: boolean
}

interface ProfessionalData {
  id: string
  name: string
  revenue: number
  count: number
  percentage: number
}

export function RevenueByProfessional({ period, compact = false }: RevenueByProfessionalProps) {
  const { userProfile } = useAuth()
  const [data, setData] = useState<ProfessionalData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalRevenue, setTotalRevenue] = useState(0)

  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884D8",
    "#82CA9D",
    "#A4DE6C",
    "#FFC658",
    "#FF7C7C",
    "#8DD1E1",
  ]

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)

      try {
        // Determinar el rango de fechas según el período
        const endDate = new Date()
        const startDate = new Date()

        switch (period) {
          case "day":
            startDate.setHours(0, 0, 0, 0)
            break
          case "week":
            startDate.setDate(startDate.getDate() - 7)
            break
          case "month":
            startDate.setMonth(startDate.getMonth() - 1)
            break
          case "quarter":
            startDate.setMonth(startDate.getMonth() - 3)
            break
          case "semester":
            startDate.setMonth(startDate.getMonth() - 6)
            break
          case "year":
            startDate.setFullYear(startDate.getFullYear() - 1)
            break
          default:
            startDate.setMonth(startDate.getMonth() - 1)
        }

        // Obtener profesionales (usuarios con type = 1)
        let query = supabase.from("users").select("id, name").eq("type", 1)

        // Si el usuario no es admin de Physia, filtrar por su organización
        if (userProfile && !userProfile.is_physia_admin && userProfile.organization_id) {
          query = query.eq("organization_id", userProfile.organization_id)
        }

        const { data: professionals, error: profError } = await query

        if (profError) {
          console.error("Error fetching professionals:", profError)
          setError(`Error al obtener profesionales: ${profError.message}`)
          return
        }

        if (!professionals || professionals.length === 0) {
          setData([])
          setLoading(false)
          return
        }

        // Crear un mapa de profesionales para referencia rápida
        const professionalsMap = new Map(
          professionals.map((prof) => [prof.id, { id: prof.id, name: prof.name, revenue: 0, count: 0 }]),
        )

        // Obtener facturas en el rango de fechas
        let invoiceQuery = supabase
          .from("invoices")
          .select("id, total_amount")
          .gte("issue_date", startDate.toISOString().split("T")[0])
          .lte("issue_date", endDate.toISOString().split("T")[0])
          .in("status", ["sent", "paid"])

        // Si el usuario no es admin de Physia, filtrar por su organización
        if (userProfile && !userProfile.is_physia_admin && userProfile.organization_id) {
          invoiceQuery = invoiceQuery.eq("organization_id", userProfile.organization_id)
        }

        const { data: invoices, error: invError } = await invoiceQuery

        if (invError) {
          console.error("Error fetching invoices:", invError)
          setError(`Error al obtener facturas: ${invError.message}`)
          return
        }

        if (!invoices || invoices.length === 0) {
          setData([])
          setLoading(false)
          return
        }

        // Obtener líneas de factura con profesional asignado
        const { data: invoiceLines, error: lineError } = await supabase
          .from("invoice_lines")
          .select("professional_id, line_amount")
          .in(
            "invoice_id",
            invoices.map((inv) => inv.id),
          )
          .not("professional_id", "is", null)

        if (lineError) {
          console.error("Error fetching invoice lines:", lineError)
          setError(`Error al obtener líneas de factura: ${lineError.message}`)
          return
        }

        // Calcular ingresos por profesional
        let total = 0

        invoiceLines?.forEach((line) => {
          const profId = line.professional_id
          const amount = line.line_amount || 0

          if (professionalsMap.has(profId)) {
            const prof = professionalsMap.get(profId)!
            prof.revenue += amount
            prof.count += 1
            total += amount
          }
        })

        // Convertir a array y calcular porcentajes
        const professionalsData = Array.from(professionalsMap.values())
          .filter((prof) => prof.revenue > 0)
          .map((prof) => ({
            ...prof,
            percentage: total > 0 ? (prof.revenue / total) * 100 : 0,
          }))
          .sort((a, b) => b.revenue - a.revenue)

        setData(professionalsData)
        setTotalRevenue(total)
      } catch (error: any) {
        console.error("Error in fetchData:", error)
        setError(`Error inesperado: ${error.message || "Desconocido"}`)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [period, userProfile])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value)
  }

  if (loading) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center">
        <Skeleton className="w-full h-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center">
        <div className="text-center text-red-500">
          <p>Error al cargar los datos</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No hay datos de profesionales disponibles</p>
          <p className="text-sm">para el período seleccionado</p>
        </div>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="space-y-4">
        {data.slice(0, 5).map((prof, index) => (
          <div
            key={prof.id}
            className="flex items-center justify-between p-3 rounded-lg bg-white/50 dark:bg-gray-800/50"
          >
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
              <div>
                <p className="font-medium text-sm">{prof.name}</p>
                <p className="text-xs text-muted-foreground">{prof.count} facturas</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-sm">{formatCurrency(prof.revenue)}</p>
              <p className="text-xs text-muted-foreground">{prof.percentage.toFixed(1)}%</p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-muted-foreground">Profesionales</div>
            <div className="text-2xl font-bold mt-1">{data.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-muted-foreground">Total</div>
            <div className="text-2xl font-bold mt-1">{formatCurrency(totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-muted-foreground">Promedio</div>
            <div className="text-2xl font-bold mt-1">
              {formatCurrency(data.length > 0 ? totalRevenue / data.length : 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-muted-foreground">Top Profesional</div>
            <div className="text-2xl font-bold mt-1 truncate">{data[0]?.name || "N/A"}</div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico y tabla */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico */}
        <div className="w-full h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={150}
                fill="#8884d8"
                dataKey="revenue"
                label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Tabla */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Detalle por profesional</h3>
          <div className="space-y-2">
            {data.map((prof, index) => (
              <div key={prof.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <div>
                    <p className="font-medium">{prof.name}</p>
                    <p className="text-sm text-muted-foreground">{prof.count} facturas</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(prof.revenue)}</p>
                  <Badge variant="outline">{prof.percentage.toFixed(1)}%</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
