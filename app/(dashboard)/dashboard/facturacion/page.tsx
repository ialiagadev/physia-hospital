"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Users, CreditCard, Receipt } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendIndicator } from "@/components/ui/trend-indicator"
import { useCountAnimation } from "@/hooks/use-count-animation"
import { useAuth } from "@/app/contexts/auth-context"

interface DashboardStats {
  clients: number
  invoices: number
  totalRevenue: number
  averageTicket: number
  totalExpenses: number
  averageExpense: number
  profitMargin: number
  monthlyGrowthRate: number
}

interface PeriodStats {
  revenue: number
  invoices: number
  clients: number
  expenses: number
  expenseCount: number
}

interface TrendData {
  clients: number
  invoices: number
  totalRevenue: number
  averageTicket: number
  periodRevenue: number
  totalExpenses: number
  averageExpense: number
  periodExpenses: number
  profitMargin: number
}

interface RecentInvoice {
  id: string
  invoice_number: string
  issue_date: string
  total_amount: number
  status: string
  clients: { name: string }[] | null
}

interface RecentClient {
  id: string
  name: string
  tax_id: string
  client_type: string
  created_at: string
}

interface RecentExpense {
  id: number
  description: string
  amount: number
  expense_date: string
  status: string
  supplier_name: string | null
}

interface InvoiceData {
  total_amount: number | null
  client_id: string | null
}

interface ExpenseData {
  amount: number | null
}

interface TopClient {
  id: string
  name: string
  totalRevenue: number
  invoiceCount: number
}

export default function DashboardPage() {
  const { userProfile } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    clients: 0,
    invoices: 0,
    totalRevenue: 0,
    averageTicket: 0,
    totalExpenses: 0,
    averageExpense: 0,
    profitMargin: 0,
    monthlyGrowthRate: 0,
  })
  const [periodRevenue, setPeriodRevenue] = useState(0)
  const [periodExpenses, setPeriodExpenses] = useState(0)
  const [selectedRevenuePeriod, setSelectedRevenuePeriod] = useState("month")
  const [selectedExpensesPeriod, setSelectedExpensesPeriod] = useState("month")
  const [trends, setTrends] = useState<TrendData>({
    clients: 0,
    invoices: 0,
    totalRevenue: 0,
    averageTicket: 0,
    periodRevenue: 0,
    totalExpenses: 0,
    averageExpense: 0,
    periodExpenses: 0,
    profitMargin: 0,
  })
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([])
  const [recentClients, setRecentClients] = useState<RecentClient[]>([])
  const [recentExpenses, setRecentExpenses] = useState<RecentExpense[]>([])
  const [topClients, setTopClients] = useState<TopClient[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Determinar si debemos mostrar animaciones (solo en la primera carga del día)
  const [showAnimations, setShowAnimations] = useState(false)

  useEffect(() => {
    // Comprobar si ya hemos mostrado animaciones hoy
    const today = new Date().toDateString()
    const lastAnimationDate = localStorage.getItem("lastDashboardAnimationDate")
    const shouldShowAnimations = lastAnimationDate !== today

    setShowAnimations(shouldShowAnimations)

    // Si mostramos animaciones, actualizar la fecha en localStorage
    if (shouldShowAnimations) {
      localStorage.setItem("lastDashboardAnimationDate", today)
    }
  }, [])

  // Formatear número como moneda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value)
  }

  // Llamar a los hooks de animación en el nivel superior (regla de hooks)
  const animatedClientsValue = useCountAnimation(stats.clients, 600, 0, Math.round)
  const animatedInvoicesValue = useCountAnimation(stats.invoices, 600, 100, Math.round)
  const animatedRevenueValue = useCountAnimation(stats.totalRevenue, 800, 200, formatCurrency)
  const animatedPeriodRevenueValue = useCountAnimation(periodRevenue, 800, 300, formatCurrency)
  const animatedTicketValue = useCountAnimation(stats.averageTicket, 800, 400, formatCurrency)
  const animatedExpensesValue = useCountAnimation(stats.totalExpenses, 800, 500, formatCurrency)
  const animatedAverageExpenseValue = useCountAnimation(stats.averageExpense, 800, 600, formatCurrency)
  const animatedPeriodExpensesValue = useCountAnimation(periodExpenses, 800, 700, formatCurrency)
  const animatedProfitMarginValue = useCountAnimation(stats.profitMargin, 800, 800, formatCurrency)
  const animatedGrowthRateValue = useCountAnimation(
    stats.monthlyGrowthRate,
    600,
    900,
    (value) => `${value.toFixed(1)}%`,
  )

  // Decidir si usar valores animados o estáticos
  const clientsValue = showAnimations ? animatedClientsValue : stats.clients
  const invoicesValue = showAnimations ? animatedInvoicesValue : stats.invoices
  const revenueValue = showAnimations ? animatedRevenueValue : formatCurrency(stats.totalRevenue)
  const periodRevenueValue = showAnimations ? animatedPeriodRevenueValue : formatCurrency(periodRevenue)
  const ticketValue = showAnimations ? animatedTicketValue : formatCurrency(stats.averageTicket)
  const expensesValue = showAnimations ? animatedExpensesValue : formatCurrency(stats.totalExpenses)
  const averageExpenseValue = showAnimations ? animatedAverageExpenseValue : formatCurrency(stats.averageExpense)
  const periodExpensesValue = showAnimations ? animatedPeriodExpensesValue : formatCurrency(periodExpenses)
  const profitMarginValue = showAnimations ? animatedProfitMarginValue : formatCurrency(stats.profitMargin)
  const growthRateValue = showAnimations ? animatedGrowthRateValue : `${stats.monthlyGrowthRate.toFixed(1)}%`

  // Función para calcular el rango de fechas según el período seleccionado
  const getDateRange = (period: string) => {
    const endDate = new Date()
    const startDate = new Date()

    switch (period) {
      case "day":
        startDate.setHours(0, 0, 0, 0)
        break
      case "week":
        const day = startDate.getDay() || 7
        if (day !== 1) startDate.setHours(-24 * (day - 1))
        startDate.setHours(0, 0, 0, 0)
        break
      case "month":
        startDate.setDate(1)
        startDate.setHours(0, 0, 0, 0)
        break
      case "year":
        startDate.setMonth(0, 1)
        startDate.setHours(0, 0, 0, 0)
        break
      default:
        startDate.setDate(1)
        startDate.setHours(0, 0, 0, 0)
    }

    return { startDate, endDate }
  }

  // Función para obtener el rango del período anterior
  const getPreviousDateRange = (period: string) => {
    const { startDate, endDate } = getDateRange(period)
    const previousStartDate = new Date(startDate)
    const previousEndDate = new Date(endDate)

    switch (period) {
      case "day":
        previousStartDate.setDate(previousStartDate.getDate() - 1)
        previousEndDate.setDate(previousEndDate.getDate() - 1)
        break
      case "week":
        previousStartDate.setDate(previousStartDate.getDate() - 7)
        previousEndDate.setDate(previousEndDate.getDate() - 7)
        break
      case "month":
        previousStartDate.setMonth(previousStartDate.getMonth() - 1)
        previousEndDate.setMonth(previousEndDate.getMonth() - 1)
        break
      case "year":
        previousStartDate.setFullYear(previousStartDate.getFullYear() - 1)
        previousEndDate.setFullYear(previousEndDate.getFullYear() - 1)
        break
    }

    return { startDate: previousStartDate, endDate: previousEndDate }
  }

  // Función para calcular tendencias reales
  const calculateTrend = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  // Función para obtener estadísticas de un período específico
  const getPeriodStats = async (startDate: Date, endDate: Date): Promise<PeriodStats> => {
    try {
      // Construir query base para facturas
      let invoicesQuery = supabase
        .from("invoices")
        .select("total_amount, client_id")
        .gte("issue_date", startDate.toISOString().split("T")[0])
        .lte("issue_date", endDate.toISOString().split("T")[0])
        .in("status", ["issued", "sent", "paid"]) // 👈 incluir estos estados

      let appointmentsQuery = supabase
        .from("appointments")
        .select("payment_amount, client_id")
        .eq("payment_status", "paid")
        .not("payment_amount", "is", null)
        .gte("payment_date", startDate.toISOString().split("T")[0])
        .lte("payment_date", endDate.toISOString().split("T")[0])

      // Construir query base para gastos
      let expensesQuery = supabase
        .from("expenses")
        .select("amount")
        .gte("expense_date", startDate.toISOString().split("T")[0])
        .lte("expense_date", endDate.toISOString().split("T")[0])

      // Filtrar por organización del usuario
      if (userProfile?.organization_id) {
        invoicesQuery = invoicesQuery.eq("organization_id", userProfile.organization_id)
        appointmentsQuery = appointmentsQuery.eq("organization_id", userProfile.organization_id) // Filter appointments by organization
        expensesQuery = expensesQuery.eq("organization_id", userProfile.organization_id)
      }

      const [invoicesResult, appointmentsResult, expensesResult] = await Promise.all([
        invoicesQuery,
        appointmentsQuery, // Add appointments query
        expensesQuery,
      ])

      if (invoicesResult.error) {
        console.error("Error fetching period invoices:", invoicesResult.error)
      }
      if (appointmentsResult.error) {
        // Handle appointments error
        console.error("Error fetching period appointments:", appointmentsResult.error)
      }
      if (expensesResult.error) {
        console.error("Error fetching period expenses:", expensesResult.error)
      }

      const invoices = invoicesResult.data || []
      const appointments = appointmentsResult.data || [] // Get appointments data
      const expenses = expensesResult.data || []

      const invoiceRevenue = invoices.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0)
      const appointmentRevenue = appointments.reduce((sum, appointment) => sum + (appointment.payment_amount || 0), 0)
      const revenue = invoiceRevenue + appointmentRevenue

      const invoiceCount = invoices.length
      const uniqueClients = new Set([
        ...invoices.map((inv) => inv.client_id).filter(Boolean),
        ...appointments.map((app) => app.client_id).filter(Boolean), // Include appointment clients
      ]).size
      const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
      const expenseCount = expenses.length

      return {
        revenue,
        invoices: invoiceCount,
        clients: uniqueClients,
        expenses: totalExpenses,
        expenseCount,
      }
    } catch (error) {
      console.error("Error in getPeriodStats:", error)
      return { revenue: 0, invoices: 0, clients: 0, expenses: 0, expenseCount: 0 }
    }
  }

  // Cargar ingresos del período seleccionado y calcular tendencias
  useEffect(() => {
    async function loadPeriodRevenue() {
      try {
        const { startDate, endDate } = getDateRange(selectedRevenuePeriod)
        const { startDate: prevStartDate, endDate: prevEndDate } = getPreviousDateRange(selectedRevenuePeriod)

        // Obtener estadísticas del período actual y anterior
        const [currentStats, previousStats] = await Promise.all([
          getPeriodStats(startDate, endDate),
          getPeriodStats(prevStartDate, prevEndDate),
        ])

        setPeriodRevenue(currentStats.revenue)

        // Calcular tendencias reales
        setTrends((prev) => ({
          ...prev,
          periodRevenue: calculateTrend(currentStats.revenue, previousStats.revenue),
        }))
      } catch (error) {
        console.error("Error loading period revenue:", error)
      }
    }

    if (!loading) {
      loadPeriodRevenue()
    }
  }, [selectedRevenuePeriod, loading, userProfile])

  // Cargar gastos del período seleccionado y calcular tendencias
  useEffect(() => {
    async function loadPeriodExpenses() {
      try {
        const { startDate, endDate } = getDateRange(selectedExpensesPeriod)
        const { startDate: prevStartDate, endDate: prevEndDate } = getPreviousDateRange(selectedExpensesPeriod)

        // Obtener estadísticas del período actual y anterior
        const [currentStats, previousStats] = await Promise.all([
          getPeriodStats(startDate, endDate),
          getPeriodStats(prevStartDate, prevEndDate),
        ])

        setPeriodExpenses(currentStats.expenses)

        // Calcular tendencias reales
        setTrends((prev) => ({
          ...prev,
          periodExpenses: calculateTrend(currentStats.expenses, previousStats.expenses),
        }))
      } catch (error) {
        console.error("Error loading period expenses:", error)
      }
    }

    if (!loading) {
      loadPeriodExpenses()
    }
  }, [selectedExpensesPeriod, loading, userProfile])

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true)
      try {
        // OPTIMIZACIÓN: Crear funciones que devuelven Promises reales
        const getClientsCount = async () => {
          let clientsQuery = supabase.from("clients").select("id", { count: "exact", head: true })
          if (userProfile?.organization_id) {
            clientsQuery = clientsQuery.eq("organization_id", userProfile.organization_id)
          }
          return await clientsQuery
        }

        const getInvoicesData = async () => {
          let invoicesQuery = supabase
            .from("invoices")
            .select("total_amount, client_id")
            .in("status", ["issued", "sent", "paid"]) // ✅ incluir todos los estados válidos

          if (userProfile?.organization_id) {
            invoicesQuery = invoicesQuery.eq("organization_id", userProfile.organization_id)
          }

          return await invoicesQuery
        }

        const getPaidAppointmentsData = async () => {
          let appointmentsQuery = supabase
            .from("appointments")
            .select("payment_amount, client_id, payment_date")
            .eq("payment_status", "paid")
            .not("payment_amount", "is", null)

          if (userProfile?.organization_id) {
            appointmentsQuery = appointmentsQuery.eq("organization_id", userProfile.organization_id)
          }

          return await appointmentsQuery
        }

        const getExpensesData = async () => {
          let expensesQuery = supabase.from("expenses").select("amount")
          if (userProfile?.organization_id) {
            expensesQuery = expensesQuery.eq("organization_id", userProfile.organization_id)
          }
          return await expensesQuery
        }

        const getRecentInvoices = async () => {
          let recentInvoicesQuery = supabase
            .from("invoices")
            .select(`
            id,
            invoice_number,
            issue_date,
            total_amount,
            status,
            clients (name)
          `)
            .order("created_at", { ascending: false })
            .limit(5)

          if (userProfile?.organization_id) {
            recentInvoicesQuery = recentInvoicesQuery.eq("organization_id", userProfile.organization_id)
          }
          return await recentInvoicesQuery
        }

        const getRecentClients = async () => {
          let recentClientsQuery = supabase
            .from("clients")
            .select("id, name, tax_id, client_type, created_at")
            .order("created_at", { ascending: false })
            .limit(5)

          if (userProfile?.organization_id) {
            recentClientsQuery = recentClientsQuery.eq("organization_id", userProfile.organization_id)
          }
          return await recentClientsQuery
        }

        const getRecentExpenses = async () => {
          let recentExpensesQuery = supabase
            .from("expenses")
            .select("id, description, amount, expense_date, status, supplier_name")
            .order("created_at", { ascending: false })
            .limit(5)

          if (userProfile?.organization_id) {
            recentExpensesQuery = recentExpensesQuery.eq("organization_id", userProfile.organization_id)
          }
          return await recentExpensesQuery
        }

        const getTopClients = async () => {
          let topClientsQuery = supabase
            .from("invoices")
            .select(`
              client_id,
              total_amount,
              clients (id, name)
            `)
            .in("status", ["issued", "sent", "paid"]) // 👈 igual aquí
          if (userProfile?.organization_id) {
            topClientsQuery = topClientsQuery.eq("organization_id", userProfile.organization_id)
          }
          return await topClientsQuery
        }

        // Calcular fechas para estadísticas
        const currentMonth = new Date()
        const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
        const currentMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

        const previousMonth = new Date()
        previousMonth.setMonth(previousMonth.getMonth() - 1)
        const previousMonthStart = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1)
        const previousMonthEnd = new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0)

        // EJECUTAR TODAS LAS CONSULTAS EN PARALELO
        const [
          clientsResult,
          invoicesResult,
          paidAppointmentsResult, // Add paid appointments query
          expensesResult,
          currentMonthStats,
          previousMonthStats,
          recentInvoicesResult,
          recentClientsResult,
          recentExpensesResult,
          topClientsResult,
        ] = await Promise.all([
          getClientsCount(),
          getInvoicesData(),
          getPaidAppointmentsData(), // Add paid appointments query
          getExpensesData(),
          getPeriodStats(currentMonthStart, currentMonthEnd),
          getPeriodStats(previousMonthStart, previousMonthEnd),
          getRecentInvoices(),
          getRecentClients(),
          getRecentExpenses(),
          getTopClients(),
        ])

        // Procesar resultados
        const clientsCount = clientsResult?.count || 0
        const invoicesData = (invoicesResult?.data as InvoiceData[]) || []
        const paidAppointmentsData = (paidAppointmentsResult?.data || []) as any[] // Add paid appointments data
        const expensesData = (expensesResult?.data as ExpenseData[]) || []
        const recentInvoicesData = (recentInvoicesResult?.data || []) as unknown as RecentInvoice[]
        const recentClientsData = (recentClientsResult?.data as RecentClient[]) || []
        const recentExpensesData = (recentExpensesResult?.data as RecentExpense[]) || []

        const invoiceRevenue = invoicesData.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0)
        const appointmentRevenue = paidAppointmentsData.reduce(
          (sum, appointment) => sum + (appointment.payment_amount || 0),
          0,
        )
        const totalRevenue = invoiceRevenue + appointmentRevenue // Include appointment revenue

        const invoicesCount = invoicesData.length
        const averageTicket = invoicesCount > 0 ? totalRevenue / invoicesCount : 0

        // Calcular métricas de gastos
        const totalExpenses = expensesData.reduce((sum, expense) => sum + (expense.amount || 0), 0)
        const expensesCount = expensesData.length
        const averageExpense = expensesCount > 0 ? totalExpenses / expensesCount : 0

        // Procesar top clients data
        const topClientsData = topClientsResult?.data || []
        const clientsMap = new Map<string, { name: string; totalRevenue: number; invoiceCount: number }>()

        topClientsData.forEach((invoice: any) => {
          if (invoice.clients && invoice.client_id) {
            const clientId = invoice.client_id
            const clientName = invoice.clients.name
            const amount = invoice.total_amount || 0

            if (clientsMap.has(clientId)) {
              const existing = clientsMap.get(clientId)!
              existing.totalRevenue += amount
              existing.invoiceCount += 1
            } else {
              clientsMap.set(clientId, {
                name: clientName,
                totalRevenue: amount,
                invoiceCount: 1,
              })
            }
          }
        })

        const topClientsArray = Array.from(clientsMap.entries())
          .map(([id, data]) => ({ id, ...data }))
          .sort((a, b) => b.totalRevenue - a.totalRevenue)
          .slice(0, 5)

        // Calcular new KPIs
        const profitMargin = totalRevenue - totalExpenses
        const monthlyGrowthRate = calculateTrend(currentMonthStats.revenue, previousMonthStats.revenue)

        // Actualizar estadísticas
        setStats({
          clients: clientsCount,
          invoices: invoicesCount,
          totalRevenue,
          averageTicket,
          totalExpenses,
          averageExpense,
          profitMargin,
          monthlyGrowthRate,
        })

        // Calcular tendencias reales usando los datos ya obtenidos
        setTrends({
          clients: calculateTrend(currentMonthStats.clients, previousMonthStats.clients),
          invoices: calculateTrend(currentMonthStats.invoices, previousMonthStats.invoices),
          totalRevenue: calculateTrend(totalRevenue, previousMonthStats.revenue),
          averageTicket: calculateTrend(
            currentMonthStats.invoices > 0 ? currentMonthStats.revenue / currentMonthStats.invoices : 0,
            previousMonthStats.invoices > 0 ? previousMonthStats.revenue / previousMonthStats.invoices : 0,
          ),
          totalExpenses: calculateTrend(totalExpenses, previousMonthStats.expenses),
          averageExpense: calculateTrend(
            currentMonthStats.expenseCount > 0 ? currentMonthStats.expenses / currentMonthStats.expenseCount : 0,
            previousMonthStats.expenseCount > 0 ? previousMonthStats.expenses / previousMonthStats.expenseCount : 0,
          ),
          periodRevenue: 0, // Se calculará en el otro useEffect
          periodExpenses: 0, // Se calculará en el otro useEffect
          profitMargin: calculateTrend(profitMargin, previousMonthStats.revenue - previousMonthStats.expenses),
        })

        // Actualizar datos recientes
        setRecentInvoices(recentInvoicesData)
        setRecentClients(recentClientsData)
        setRecentExpenses(recentExpensesData)
        setTopClients(topClientsArray)

        setLoading(false)
      } catch (error) {
        console.error("Error loading dashboard data:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos del dashboard",
          variant: "destructive",
        })
        setLoading(false)
      }
    }

    if (userProfile) {
      loadDashboardData()
    }
  }, [userProfile, toast])

  // Obtener el título y descripción del período para mostrar
  const getPeriodTitle = (type: "revenue" | "expenses") => {
    const period = type === "revenue" ? selectedRevenuePeriod : selectedExpensesPeriod
    const prefix = type === "revenue" ? "Ingresos" : "Gastos"

    switch (period) {
      case "day":
        return `${prefix} Diarios`
      case "week":
        return `${prefix} Semanales`
      case "month":
        return `${prefix} Mensuales`
      case "year":
        return `${prefix} Anuales`
      default:
        return `${prefix} Mensuales`
    }
  }

  const getPeriodDescription = (type: "revenue" | "expenses") => {
    const period = type === "revenue" ? selectedRevenuePeriod : selectedExpensesPeriod
    const prefix = type === "revenue" ? "ingresos" : "gastos"

    switch (period) {
      case "day":
        return `${prefix} del día actual`
      case "week":
        return `${prefix} de la semana actual`
      case "month":
        return `${prefix} del mes actual`
      case "year":
        return `${prefix} del año actual`
      default:
        return `${prefix} del mes actual`
    }
  }

  // Helper function to get client name from invoice
  const getClientName = (invoice: RecentInvoice): string => {
    if (invoice.clients && Array.isArray(invoice.clients) && invoice.clients.length > 0) {
      return invoice.clients[0].name
    }
    return "Cliente desconocido"
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Bienvenido al sistema de facturación</p>
          </div>
        </div>
        <div className="h-12 mb-6"></div>
        <div className="rounded-md border">
          <div className="h-24 flex items-center justify-center">
            <p className="text-muted-foreground">Cargando datos...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Bienvenido al sistema de facturación</p>
        </div>
      </div>

      {/* Primera fila: Clientes, Facturas */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-l-4 border-l-indigo-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold">{clientsValue}</div>
              <TrendIndicator value={trends.clients} />
            </div>
            <p className="text-xs text-muted-foreground">Total de clientes</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturas</CardTitle>
            <FileText className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold">{invoicesValue}</div>
              <TrendIndicator value={trends.invoices} />
            </div>
            <p className="text-xs text-muted-foreground">Total de facturas</p>
          </CardContent>
        </Card>
      </div>

      {/* Segunda fila: Ingresos Totales, Ingresos del Período, Ticket Medio */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-2xl font-bold text-blue-600">{revenueValue}</div>
              <TrendIndicator value={trends.totalRevenue} />
            </div>
            <p className="text-xs text-muted-foreground">Ingresos totales acumulados</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{getPeriodTitle("revenue")}</CardTitle>
            <Select value={selectedRevenuePeriod} onValueChange={setSelectedRevenuePeriod}>
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue placeholder="Seleccionar período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Diarios</SelectItem>
                <SelectItem value="week">Semanales</SelectItem>
                <SelectItem value="month">Mensuales</SelectItem>
                <SelectItem value="year">Anuales</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-2xl font-bold text-green-600">{periodRevenueValue}</div>
              <TrendIndicator value={trends.periodRevenue} />
            </div>
            <p className="text-xs text-muted-foreground">Total de {getPeriodDescription("revenue")}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-cyan-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Medio</CardTitle>
            <CreditCard className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold">{ticketValue}</div>
              <TrendIndicator value={trends.averageTicket} />
            </div>
            <p className="text-xs text-muted-foreground">Promedio por factura</p>
          </CardContent>
        </Card>
      </div>

      {/* Tercera fila: Gastos Totales, Gastos del Período */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Totales</CardTitle>
            <Receipt className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold text-red-600">{expensesValue}</div>
              <TrendIndicator value={trends.totalExpenses} />
            </div>
            <p className="text-xs text-muted-foreground">Total de gastos</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{getPeriodTitle("expenses")}</CardTitle>
            <Select value={selectedExpensesPeriod} onValueChange={setSelectedExpensesPeriod}>
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue placeholder="Seleccionar período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Diarios</SelectItem>
                <SelectItem value="week">Semanales</SelectItem>
                <SelectItem value="month">Mensuales</SelectItem>
                <SelectItem value="year">Anuales</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-2xl font-bold text-orange-600">{periodExpensesValue}</div>
              <TrendIndicator value={trends.periodExpenses} />
            </div>
            <p className="text-xs text-muted-foreground">Total de {getPeriodDescription("expenses")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Nueva fila: Margen de Beneficio y Crecimiento Mensual */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margen de Beneficio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className={`text-2xl font-bold ${stats.profitMargin >= 0 ? "text-green-600" : "text-red-600"}`}>
                {profitMarginValue}
              </div>
              <TrendIndicator value={trends.profitMargin} />
            </div>
            <p className="text-xs text-muted-foreground">Ingresos menos gastos</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crecimiento Mensual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className={`text-2xl font-bold ${stats.monthlyGrowthRate >= 0 ? "text-green-600" : "text-red-600"}`}>
                {growthRateValue}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Crecimiento de ingresos vs mes anterior</p>
          </CardContent>
        </Card>
      </div>

      {/* Cuarta fila: Top Clientes, Facturas recientes, Gastos recientes */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-t-4 border-t-blue-500">
          <CardHeader>
            <CardTitle>Top Clientes</CardTitle>
            <CardDescription>Clientes con mayor facturación</CardDescription>
          </CardHeader>
          <CardContent>
            {topClients && topClients.length > 0 ? (
              <div className="space-y-2">
                {topClients.map((client, index) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-600">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-sm text-muted-foreground">{client.invoiceCount} facturas</p>
                      </div>
                    </div>
                    <div className="font-medium text-blue-600">{formatCurrency(client.totalRevenue)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No hay datos de clientes</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-green-500">
          <CardHeader>
            <CardTitle>Facturas recientes</CardTitle>
            <CardDescription>Últimas facturas emitidas</CardDescription>
          </CardHeader>
          <CardContent>
            {recentInvoices && recentInvoices.length > 0 ? (
              <div className="space-y-2">
                {recentInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">#{invoice.invoice_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {getClientName(invoice)} - {new Date(invoice.issue_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="font-medium text-green-600">{formatCurrency(invoice.total_amount || 0)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No hay facturas recientes</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-red-500">
          <CardHeader>
            <CardTitle>Gastos recientes</CardTitle>
            <CardDescription>Últimos gastos registrados</CardDescription>
          </CardHeader>
          <CardContent>
            {recentExpenses && recentExpenses.length > 0 ? (
              <div className="space-y-2">
                {recentExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{expense.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(expense.expense_date).toLocaleDateString()} -{" "}
                        {expense.supplier_name || "Sin proveedor"}
                      </p>
                    </div>
                    <div className="font-medium text-red-600">{formatCurrency(expense.amount || 0)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No hay gastos recientes</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
