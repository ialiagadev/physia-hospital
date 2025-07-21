"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useAuth } from "@/app/contexts/auth-context"
import { Skeleton } from "@/components/ui/skeleton"

interface ExpensesBySupplierProps {
  period: string
}

interface SupplierData {
  name: string
  amount: number
  count: number
}

export function ExpensesBySupplier({ period }: ExpensesBySupplierProps) {
  const { userProfile } = useAuth()
  const [data, setData] = useState<SupplierData[]>([])
  const [loading, setLoading] = useState(true)

  // Formatear número como moneda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value)
  }

  // Generar rango de fechas según el período
  const getDateRange = (period: string) => {
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

    return { startDate, endDate }
  }

  useEffect(() => {
    async function loadExpensesBySupplier() {
      if (!userProfile?.organization_id) return

      setLoading(true)
      try {
        const { startDate, endDate } = getDateRange(period)

        // Consultar gastos agrupados por proveedor
        const expensesQuery = supabase
          .from("expenses")
          .select("amount, supplier_name")
          .eq("organization_id", userProfile.organization_id)
          .gte("expense_date", startDate.toISOString().split("T")[0])
          .lte("expense_date", endDate.toISOString().split("T")[0])

        const { data: expenses, error } = await expensesQuery

        if (error) {
          console.error("Error fetching expenses by supplier:", error)
          return
        }

        // Agrupar por proveedor
        const supplierTotals: { [key: string]: { amount: number; count: number } } = {}

        expenses?.forEach((expense) => {
          const supplier = expense.supplier_name || "Sin proveedor"

          if (!supplierTotals[supplier]) {
            supplierTotals[supplier] = { amount: 0, count: 0 }
          }

          supplierTotals[supplier].amount += expense.amount || 0
          supplierTotals[supplier].count += 1
        })

        // Convertir a formato para el gráfico
        const chartData: SupplierData[] = Object.entries(supplierTotals)
          .map(([name, data]) => ({
            name: name.length > 20 ? name.substring(0, 20) + "..." : name,
            amount: data.amount,
            count: data.count,
          }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 10) // Top 10 proveedores

        setData(chartData)
      } catch (error) {
        console.error("Error loading expenses by supplier:", error)
      } finally {
        setLoading(false)
      }
    }

    loadExpensesBySupplier()
  }, [period, userProfile])

  if (loading) {
    return <Skeleton className="h-80" />
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-80">
        <p className="text-muted-foreground">No hay datos de proveedores para mostrar</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="horizontal">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
        <YAxis dataKey="name" type="category" width={100} />
        <Tooltip
          formatter={(value: number) => [formatCurrency(value), "Total"]}
          labelFormatter={(label) => `Proveedor: ${label}`}
        />
        <Bar dataKey="amount" fill="#ef4444" />
      </BarChart>
    </ResponsiveContainer>
  )
}
