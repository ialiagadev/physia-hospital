"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { useAuth } from "@/app/contexts/auth-context"
import { Skeleton } from "@/components/ui/skeleton"

interface ExpensesByCategoryProps {
  period: string
}

interface CategoryData {
  name: string
  value: number
  color: string
}

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"]

export function ExpensesByCategory({ period }: ExpensesByCategoryProps) {
  const { userProfile } = useAuth()
  const [data, setData] = useState<CategoryData[]>([])
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
    async function loadExpensesByCategory() {
      if (!userProfile?.organization_id) return

      setLoading(true)
      try {
        const { startDate, endDate } = getDateRange(period)

        // Consultar gastos agrupados por descripción (como categoría)
        const expensesQuery = supabase
          .from("expenses")
          .select("amount, description")
          .eq("organization_id", userProfile.organization_id)
          .gte("expense_date", startDate.toISOString().split("T")[0])
          .lte("expense_date", endDate.toISOString().split("T")[0])

        const { data: expenses, error } = await expensesQuery

        if (error) {
          console.error("Error fetching expenses by category:", error)
          return
        }

        // Agrupar por categoría (usando las primeras palabras de la descripción)
        const categoryTotals: { [key: string]: number } = {}

        expenses?.forEach((expense) => {
          // Extraer categoría de la descripción (primeras 2 palabras)
          const category =
            expense.description
              ?.split(" ")
              .slice(0, 2)
              .join(" ")
              .toLowerCase()
              .replace(/^\w/, (c: string) => c.toUpperCase()) || "Sin categoría"

          categoryTotals[category] = (categoryTotals[category] || 0) + (expense.amount || 0)
        })

        // Convertir a formato para el gráfico
        const chartData: CategoryData[] = Object.entries(categoryTotals)
          .map(([name, value], index) => ({
            name,
            value,
            color: COLORS[index % COLORS.length],
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 7) // Top 7 categorías

        setData(chartData)
      } catch (error) {
        console.error("Error loading expenses by category:", error)
      } finally {
        setLoading(false)
      }
    }

    loadExpensesByCategory()
  }, [period, userProfile])

  if (loading) {
    return <Skeleton className="h-80" />
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-80">
        <p className="text-muted-foreground">No hay datos de gastos para mostrar</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => formatCurrency(value)} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
