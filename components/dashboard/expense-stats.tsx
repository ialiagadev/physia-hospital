"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { useAuth } from "@/app/contexts/auth-context"
import { Skeleton } from "@/components/ui/skeleton"

interface ExpenseStatsProps {
  period: string
}

interface ExpenseData {
  date: string
  amount: number
  count: number
}

interface ExpenseSummary {
  totalAmount: number
  totalCount: number
  averageExpense: number
  previousPeriodAmount: number
  growth: number
}

export function ExpenseStats({ period }: ExpenseStatsProps) {
  const { userProfile } = useAuth()
  const [expenseData, setExpenseData] = useState<ExpenseData[]>([])
  const [summary, setSummary] = useState<ExpenseSummary>({
    totalAmount: 0,
    totalCount: 0,
    averageExpense: 0,
    previousPeriodAmount: 0,
    growth: 0,
  })
  const [loading, setLoading] = useState(true)

  // Formatear número como moneda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value)
  }

  // Obtener el formato de fecha según el período
  const getDateFormat = (period: string) => {
    switch (period) {
      case "day":
        return "HH:mm"
      case "week":
      case "month":
        return "DD/MM"
      case "quarter":
      case "semester":
      case "year":
        return "MMM YYYY"
      default:
        return "DD/MM"
    }
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
    async function loadExpenseStats() {
      if (!userProfile?.organization_id) return

      setLoading(true)
      try {
        const { startDate, endDate } = getDateRange(period)

        // Consultar gastos del período actual
        const expensesQuery = supabase
          .from("expenses")
          .select("amount, expense_date")
          .eq("organization_id", userProfile.organization_id)
          .gte("expense_date", startDate.toISOString().split("T")[0])
          .lte("expense_date", endDate.toISOString().split("T")[0])
          .order("expense_date", { ascending: true })

        const { data: expenses, error } = await expensesQuery

        if (error) {
          console.error("Error fetching expenses:", error)
          return
        }

        // Procesar datos para el gráfico
        const processedData: ExpenseData[] = []
        const expensesByDate: { [key: string]: { amount: number; count: number } } = {}

        expenses?.forEach((expense) => {
          const date = new Date(expense.expense_date)
          let dateKey: string

          switch (period) {
            case "day":
              dateKey = date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
              break
            case "week":
            case "month":
              dateKey = date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })
              break
            case "quarter":
            case "semester":
            case "year":
              dateKey = date.toLocaleDateString("es-ES", { month: "short", year: "numeric" })
              break
            default:
              dateKey = date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })
          }

          if (!expensesByDate[dateKey]) {
            expensesByDate[dateKey] = { amount: 0, count: 0 }
          }

          expensesByDate[dateKey].amount += expense.amount || 0
          expensesByDate[dateKey].count += 1
        })

        // Convertir a array para el gráfico
        Object.entries(expensesByDate).forEach(([date, data]) => {
          processedData.push({
            date,
            amount: data.amount,
            count: data.count,
          })
        })

        // Calcular resumen
        const totalAmount = expenses?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0
        const totalCount = expenses?.length || 0
        const averageExpense = totalCount > 0 ? totalAmount / totalCount : 0

        // Calcular período anterior para comparación
        const previousStartDate = new Date(startDate)
        const previousEndDate = new Date(endDate)
        const periodDiff = endDate.getTime() - startDate.getTime()
        previousStartDate.setTime(startDate.getTime() - periodDiff)
        previousEndDate.setTime(endDate.getTime() - periodDiff)

        const previousExpensesQuery = supabase
          .from("expenses")
          .select("amount")
          .eq("organization_id", userProfile.organization_id)
          .gte("expense_date", previousStartDate.toISOString().split("T")[0])
          .lte("expense_date", previousEndDate.toISOString().split("T")[0])

        const { data: previousExpenses } = await previousExpensesQuery

        const previousPeriodAmount = previousExpenses?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0
        const growth =
          previousPeriodAmount > 0 ? ((totalAmount - previousPeriodAmount) / previousPeriodAmount) * 100 : 0

        setExpenseData(processedData)
        setSummary({
          totalAmount,
          totalCount,
          averageExpense,
          previousPeriodAmount,
          growth,
        })
      } catch (error) {
        console.error("Error loading expense stats:", error)
      } finally {
        setLoading(false)
      }
    }

    loadExpenseStats()
  }, [period, userProfile])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-80" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Resumen de gastos */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {summary.growth >= 0 ? "+" : ""}
              {summary.growth.toFixed(1)}% vs período anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Número de Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalCount}</div>
            <p className="text-xs text-muted-foreground">gastos registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Gasto Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.averageExpense)}</div>
            <p className="text-xs text-muted-foreground">por gasto</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de evolución */}
      <Card>
        <CardHeader>
          <CardTitle>Evolución de Gastos</CardTitle>
          <CardDescription>Gastos a lo largo del tiempo</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={expenseData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), "Gastos"]}
                labelFormatter={(label) => `Fecha: ${label}`}
              />
              <Line type="monotone" dataKey="amount" stroke="#ef4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de barras por cantidad */}
      <Card>
        <CardHeader>
          <CardTitle>Cantidad de Gastos</CardTitle>
          <CardDescription>Número de gastos por período</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={expenseData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value: number) => [value, "Gastos"]} labelFormatter={(label) => `Fecha: ${label}`} />
              <Bar dataKey="count" fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
