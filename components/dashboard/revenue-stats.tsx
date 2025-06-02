"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"

interface RevenueStatsProps {
  organizationId: string
  period: string
}

export function RevenueStats({ organizationId, period }: RevenueStatsProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRevenueData() {
      setLoading(true)
      setError(null)
      try {
        // Determinar el rango de fechas según el período
        const endDate = new Date()
        const startDate = new Date()

        switch (period) {
          case "day":
            startDate.setDate(startDate.getDate() - 7) // Últimos 7 días
            break
          case "week":
            startDate.setDate(startDate.getDate() - 28) // Últimas 4 semanas
            break
          case "month":
            startDate.setMonth(startDate.getMonth() - 6) // Últimos 6 meses
            break
          case "quarter":
            startDate.setMonth(startDate.getMonth() - 12) // Últimos 4 trimestres
            break
          case "semester":
            startDate.setMonth(startDate.getMonth() - 12) // Últimos 2 semestres
            break
          case "year":
            startDate.setFullYear(startDate.getFullYear() - 3) // Últimos 3 años
            break
          default:
            startDate.setMonth(startDate.getMonth() - 6) // Por defecto, últimos 6 meses
        }

        console.log("Fetching revenue data:", {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          organizationId,
        })

        // Consultar facturas en el rango de fechas - NO filtramos por estado
        let query = supabase
          .from("invoices")
          .select("issue_date, total_amount")
          .gte("issue_date", startDate.toISOString().split("T")[0])
          .lte("issue_date", endDate.toISOString().split("T")[0])
          .order("issue_date", { ascending: true })

        if (organizationId !== "all") {
          query = query.eq("organization_id", organizationId)
        }

        const { data: invoices, error } = await query

        if (error) {
          console.error("Error fetching revenue data:", error)
          setError(`Error al obtener datos: ${error.message}`)
          return
        }

        console.log("Invoices data:", invoices)

        // Calcular el total de ingresos
        const total = invoices ? invoices.reduce((sum, invoice) => sum + invoice.total_amount, 0) : 0
        setTotalRevenue(total)

        // Procesar los datos según el período
        const processedData = processDataByPeriod(invoices || [], period, startDate, endDate)
        console.log("Processed data:", processedData)
        setData(processedData)
      } catch (error: any) {
        console.error("Error in fetchRevenueData:", error)
        setError(`Error inesperado: ${error.message || "Desconocido"}`)
      } finally {
        setLoading(false)
      }
    }

    fetchRevenueData()
  }, [organizationId, period])

  // Función para procesar los datos según el período
  function processDataByPeriod(invoices: any[], period: string, startDate: Date, endDate: Date) {
    const result: any[] = []

    if (!invoices || invoices.length === 0) {
      console.log("No invoices data, generating sample data")
      // Si no hay datos, generar datos de ejemplo para mostrar el gráfico
      return generateSampleData(period, startDate, endDate)
    }

    // Agrupar facturas por período
    const groupedData: Record<string, number> = {}

    invoices.forEach((invoice) => {
      const date = new Date(invoice.issue_date)
      let key = ""

      switch (period) {
        case "day":
          key = date.toISOString().split("T")[0] // YYYY-MM-DD
          break
        case "week":
          // Obtener el lunes de la semana
          const day = date.getDay()
          const diff = date.getDate() - day + (day === 0 ? -6 : 1)
          const monday = new Date(date)
          monday.setDate(diff)
          key = monday.toISOString().split("T")[0]
          break
        case "month":
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
          break
        case "quarter":
          const quarter = Math.floor(date.getMonth() / 3) + 1
          key = `${date.getFullYear()}-Q${quarter}`
          break
        case "semester":
          const semester = Math.floor(date.getMonth() / 6) + 1
          key = `${date.getFullYear()}-S${semester}`
          break
        case "year":
          key = date.getFullYear().toString()
          break
        default:
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      }

      if (!groupedData[key]) {
        groupedData[key] = 0
      }
      groupedData[key] += invoice.total_amount
    })

    console.log("Grouped data:", groupedData)

    // Convertir a formato para el gráfico
    for (const [key, value] of Object.entries(groupedData)) {
      let name = key

      // Formatear el nombre según el período
      if (period === "month") {
        const [year, month] = key.split("-")
        const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, 1)
        name = date.toLocaleString("default", { month: "short" }) + " " + year
      } else if (period === "quarter") {
        name = key.replace("-Q", " Q")
      } else if (period === "semester") {
        name = key.replace("-S", " S")
      }

      result.push({
        name,
        value,
      })
    }

    return result
  }

  // Generar datos de ejemplo si no hay datos reales
  function generateSampleData(period: string, startDate: Date, endDate: Date) {
    const result: any[] = []
    const current = new Date(startDate)

    while (current <= endDate) {
      let name = ""
      let increment = 0

      switch (period) {
        case "day":
          name = current.toISOString().split("T")[0]
          increment = 1
          current.setDate(current.getDate() + increment)
          break
        case "week":
          name = `Semana ${Math.ceil((current.getDate() + current.getDay()) / 7)}`
          increment = 7
          current.setDate(current.getDate() + increment)
          break
        case "month":
          name = current.toLocaleString("default", { month: "short" }) + " " + current.getFullYear()
          increment = 1
          current.setMonth(current.getMonth() + increment)
          break
        case "quarter":
          const quarter = Math.floor(current.getMonth() / 3) + 1
          name = `${current.getFullYear()} Q${quarter}`
          increment = 3
          current.setMonth(current.getMonth() + increment)
          break
        case "semester":
          const semester = Math.floor(current.getMonth() / 6) + 1
          name = `${current.getFullYear()} S${semester}`
          increment = 6
          current.setMonth(current.getMonth() + increment)
          break
        case "year":
          name = current.getFullYear().toString()
          increment = 1
          current.setFullYear(current.getFullYear() + increment)
          break
        default:
          name = current.toLocaleString("default", { month: "short" }) + " " + current.getFullYear()
          increment = 1
          current.setMonth(current.getMonth() + increment)
      }

      result.push({
        name,
        value: 0, // Valor cero para datos de ejemplo
      })
    }

    return result
  }

  // Formatear números como moneda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value)
  }

  if (loading) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center">
        <Skeleton className="w-full h-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center">
        <div className="text-center text-red-500">
          <p>Error al cargar los datos</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
      <div className="w-full h-[300px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Bar dataKey="value" fill="#8884d8" name="Ingresos" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">No hay datos disponibles para este período</p>
          </div>
        )}
      </div>
    </div>
  )
}
