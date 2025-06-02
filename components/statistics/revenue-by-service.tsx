"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"

interface RevenueByServiceProps {
  organizationId: string
  period: string
}

export function RevenueByService({ organizationId, period }: RevenueByServiceProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#A4DE6C"]

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

        console.log("Fetching revenue by service data:", {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          organizationId,
        })

        // Primero, obtener todas las facturas en el rango de fechas
        let invoicesQuery = supabase
          .from("invoices")
          .select("id, organization_id")
          .gte("issue_date", startDate.toISOString().split("T")[0])
          .lte("issue_date", endDate.toISOString().split("T")[0])

        if (organizationId !== "all") {
          invoicesQuery = invoicesQuery.eq("organization_id", organizationId)
        }

        const { data: invoices, error: invoicesError } = await invoicesQuery

        if (invoicesError) {
          console.error("Error fetching invoices:", invoicesError)
          setError(`Error al obtener facturas: ${invoicesError.message}`)
          return
        }

        console.log("Invoices found:", invoices?.length || 0)

        if (!invoices || invoices.length === 0) {
          setData([{ name: "Sin datos", value: 100 }])
          setLoading(false)
          return
        }

        // Obtener los IDs de las facturas
        const invoiceIds = invoices.map((inv) => inv.id)

        // Consultar líneas de factura
        const { data: invoiceLines, error: linesError } = await supabase
          .from("invoice_lines")
          .select("description, line_amount")
          .in("invoice_id", invoiceIds)

        if (linesError) {
          console.error("Error fetching invoice lines:", linesError)
          setError(`Error al obtener líneas de factura: ${linesError.message}`)
          return
        }

        console.log("Invoice lines:", invoiceLines?.length || 0)

        // Agrupar por descripción del servicio
        const serviceRevenue: Record<string, { name: string; value: number }> = {}

        invoiceLines?.forEach((line) => {
          // Extraer el nombre del servicio (primera parte de la descripción hasta el primer guión o todo si no hay guión)
          const serviceName = line.description.split(" - ")[0]
          const amount = line.line_amount

          if (!serviceRevenue[serviceName]) {
            serviceRevenue[serviceName] = {
              name: serviceName,
              value: 0,
            }
          }

          serviceRevenue[serviceName].value += amount
        })

        // Convertir a array para el gráfico
        const chartData = Object.values(serviceRevenue)
        console.log("Service revenue data:", chartData)

        // Si no hay datos, mostrar datos de ejemplo
        if (chartData.length === 0) {
          setData([{ name: "Sin datos", value: 100 }])
        } else {
          setData(chartData)
        }
      } catch (error: any) {
        console.error("Error in fetchData:", error)
        setError(`Error inesperado: ${error.message || "Desconocido"}`)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [organizationId, period])

  // Formatear números como moneda
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

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={true}
            outerRadius={150}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatCurrency(value as number)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
