"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown } from "lucide-react"
import { useAuth } from "@/app/contexts/auth-context"

interface RevenueStatsProps {
  period: string
}

interface RevenueData {
  date: string
  amount: number
}

export function RevenueStats({ period }: RevenueStatsProps) {
  const { userProfile } = useAuth()
  const [data, setData] = useState<RevenueData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [previousRevenue, setPreviousRevenue] = useState(0)
  const [percentageChange, setPercentageChange] = useState(0)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)

      try {
        // Determinar el rango de fechas según el período
        const endDate = new Date()
        const startDate = new Date()
        const previousStartDate = new Date()
        const previousEndDate = new Date()

        switch (period) {
          case "day":
            startDate.setHours(0, 0, 0, 0)
            previousStartDate.setDate(previousStartDate.getDate() - 1)
            previousStartDate.setHours(0, 0, 0, 0)
            previousEndDate.setDate(previousEndDate.getDate() - 1)
            previousEndDate.setHours(23, 59, 59, 999)
            break
          case "week":
            startDate.setDate(startDate.getDate() - 7)
            previousStartDate.setDate(previousStartDate.getDate() - 14)
            previousEndDate.setDate(previousEndDate.getDate() - 7)
            break
          case "month":
            startDate.setMonth(startDate.getMonth() - 1)
            previousStartDate.setMonth(previousStartDate.getMonth() - 2)
            previousEndDate.setMonth(previousEndDate.getMonth() - 1)
            break
          case "quarter":
            startDate.setMonth(startDate.getMonth() - 3)
            previousStartDate.setMonth(previousStartDate.getMonth() - 6)
            previousEndDate.setMonth(previousEndDate.getMonth() - 3)
            break
          case "semester":
            startDate.setMonth(startDate.getMonth() - 6)
            previousStartDate.setMonth(previousStartDate.getMonth() - 12)
            previousEndDate.setMonth(previousEndDate.getMonth() - 6)
            break
          case "year":
            startDate.setFullYear(startDate.getFullYear() - 1)
            previousStartDate.setFullYear(previousStartDate.getFullYear() - 2)
            previousEndDate.setFullYear(previousEndDate.getFullYear() - 1)
            break
          default:
            startDate.setMonth(startDate.getMonth() - 1)
            previousStartDate.setMonth(previousStartDate.getMonth() - 2)
            previousEndDate.setMonth(previousEndDate.getMonth() - 1)
        }

        // Obtener facturas del período actual
        let invoiceQuery = supabase
          .from("invoices")
          .select("issue_date, total_amount")
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

        // Obtener facturas del período anterior para comparación
        let previousQuery = supabase
          .from("invoices")
          .select("total_amount")
          .gte("issue_date", previousStartDate.toISOString().split("T")[0])
          .lte("issue_date", previousEndDate.toISOString().split("T")[0])
          .in("status", ["sent", "paid"])

        // Si el usuario no es admin de Physia, filtrar por su organización
        if (userProfile && !userProfile.is_physia_admin && userProfile.organization_id) {
          previousQuery = previousQuery.eq("organization_id", userProfile.organization_id)
        }

        const { data: previousInvoices, error: prevError } = await previousQuery

        if (prevError) {
          console.error("Error fetching previous invoices:", prevError)
          // No interrumpimos por error en datos de comparación
        }

        // Agrupar por fecha
        const revenueByDate = new Map<string, number>()
        let total = 0

        invoices?.forEach((invoice) => {
          const date = invoice.issue_date
          const amount = invoice.total_amount || 0

          total += amount

          if (!revenueByDate.has(date)) {
            revenueByDate.set(date, 0)
          }

          revenueByDate.set(date, revenueByDate.get(date)! + amount)
        })

        // Calcular ingresos del período anterior
        const previousTotal = previousInvoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0

        // Calcular porcentaje de cambio
        const change = previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : total > 0 ? 100 : 0

        // Convertir a array para el gráfico
        const chartData = Array.from(revenueByDate.entries())
          .map(([date, amount]) => ({
            date,
            amount,
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        setData(chartData)
        setTotalRevenue(total)
        setPreviousRevenue(previousTotal)
        setPercentageChange(change)
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
    }).format(date)
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
          <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No hay datos de ingresos disponibles</p>
          <p className="text-sm">para el período seleccionado</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-muted-foreground">Ingresos Totales</div>
            <div className="text-2xl font-bold mt-1">{formatCurrency(totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-muted-foreground">Período Anterior</div>
            <div className="text-2xl font-bold mt-1">{formatCurrency(previousRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-muted-foreground">Variación</div>
            <div className="flex items-center gap-2 mt-1">
              <div className="text-2xl font-bold">{percentageChange.toFixed(1)}%</div>
              {percentageChange > 0 ? (
                <Badge variant="success" className="bg-green-100 text-green-800">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Aumento
                </Badge>
              ) : percentageChange < 0 ? (
                <Badge variant="destructive" className="bg-red-100 text-red-800">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Descenso
                </Badge>
              ) : (
                <Badge variant="outline">Sin cambios</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico */}
      <div className="w-full h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={formatDate} minTickGap={15} />
            <YAxis tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(value) => formatCurrency(value as number)}
              labelFormatter={(label) => formatDate(label as string)}
            />
            <Line type="monotone" dataKey="amount" stroke="#8884d8" activeDot={{ r: 8 }} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
