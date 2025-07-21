"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
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

        // Obtener todos los usuarios (sin filtro de tipo)
        let query = supabase.from("users").select("id, name, email")

        // Si el usuario no es admin de Physia, filtrar por su organización
        if (userProfile && !userProfile.is_physia_admin && userProfile.organization_id) {
          query = query.eq("organization_id", userProfile.organization_id)
        }

        const { data: users, error: usersError } = await query

        if (usersError) {
          setError(`Error al obtener usuarios: ${usersError.message}`)
          return
        }

        if (!users || users.length === 0) {
          setData([])
          setLoading(false)
          return
        }

        // Crear un mapa de usuarios para referencia rápida
        const usersMap = new Map(
          users.map((user) => [
            user.id,
            {
              id: user.id,
              name: user.name || user.email || "Sin nombre",
              revenue: 0,
              count: 0,
            },
          ]),
        )

        // Obtener facturas creadas por usuarios en el rango de fechas
        let invoiceQuery = supabase
          .from("invoices")
          .select("id, total_amount, issue_date, created_by")
          .gte("issue_date", startDate.toISOString().split("T")[0])
          .lte("issue_date", endDate.toISOString().split("T")[0])
          .in("status", ["sent", "paid"])
          .in("created_by", Array.from(usersMap.keys()))

        // Si el usuario no es admin de Physia, filtrar por su organización
        if (userProfile && !userProfile.is_physia_admin && userProfile.organization_id) {
          invoiceQuery = invoiceQuery.eq("organization_id", userProfile.organization_id)
        }

        const { data: invoices, error: invError } = await invoiceQuery

        if (invError) {
          setError(`Error al obtener facturas: ${invError.message}`)
          return
        }

        if (!invoices || invoices.length === 0) {
          setData([])
          setLoading(false)
          return
        }

        // Calcular ingresos por usuario basado en created_by
        let total = 0

        invoices.forEach((invoice) => {
          const userId = invoice.created_by
          const amount = invoice.total_amount || 0

          if (usersMap.has(userId)) {
            const user = usersMap.get(userId)!
            user.revenue += amount
            user.count += 1
            total += amount
          }
        })

        // Convertir a array y calcular porcentajes
        const usersData = Array.from(usersMap.values())
          .filter((user) => user.revenue > 0)
          .map((user) => ({
            ...user,
            percentage: total > 0 ? (user.revenue / total) * 100 : 0,
          }))
          .sort((a, b) => b.revenue - a.revenue)

        setData(usersData)
        setTotalRevenue(total)
      } catch (error: any) {
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
      <div className="w-full h-[300px] sm:h-[400px] flex items-center justify-center">
        <Skeleton className="w-full h-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-[300px] sm:h-[400px] flex items-center justify-center">
        <div className="text-center text-red-500 px-4">
          <p className="text-sm sm:text-base">Error al cargar los datos</p>
          <p className="text-xs sm:text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="w-full h-[300px] sm:h-[400px] flex items-center justify-center">
        <div className="text-center text-muted-foreground px-4">
          <Users className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-4 opacity-50" />
          <p className="text-sm sm:text-base">No hay datos de usuarios disponibles</p>
          <p className="text-xs sm:text-sm">para el período seleccionado</p>
        </div>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="space-y-2 sm:space-y-4">
        {data.slice(0, 5).map((user, index) => (
          <div
            key={user.id}
            className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-white/50 dark:bg-gray-800/50"
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div
                className="w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-xs sm:text-sm truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.count} facturas</p>
              </div>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              <p className="font-semibold text-xs sm:text-sm">{formatCurrency(user.revenue)}</p>
              <p className="text-xs text-muted-foreground">{user.percentage.toFixed(1)}%</p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-8">
      {/* Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs sm:text-sm font-medium text-muted-foreground">Usuarios</div>
            <div className="text-lg sm:text-2xl font-bold mt-1">{data.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs sm:text-sm font-medium text-muted-foreground">Total</div>
            <div className="text-lg sm:text-2xl font-bold mt-1 truncate">{formatCurrency(totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs sm:text-sm font-medium text-muted-foreground">Promedio</div>
            <div className="text-lg sm:text-2xl font-bold mt-1 truncate">
              {formatCurrency(data.length > 0 ? totalRevenue / data.length : 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs sm:text-sm font-medium text-muted-foreground">Top Usuario</div>
            <div className="text-lg sm:text-2xl font-bold mt-1 truncate">{data[0]?.name || "N/A"}</div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico y tabla */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Gráfico */}
        <div className="w-full">
          <div className="h-[300px] sm:h-[400px] lg:h-[450px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius="80%"
                  fill="#8884d8"
                  dataKey="revenue"
                  label={({ name, percentage }) =>
                    data.length <= 6 ? `${name}: ${percentage.toFixed(1)}%` : `${percentage.toFixed(1)}%`
                  }
                  fontSize={12}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(value as number)}
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: "14px",
                  }}
                />
                {data.length > 6 && <Legend wrapperStyle={{ fontSize: "12px" }} iconSize={8} />}
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabla */}
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-base sm:text-lg font-medium">Detalle por usuario</h3>
          <div className="space-y-2 max-h-[300px] sm:max-h-[400px] lg:max-h-[450px] overflow-y-auto">
            {data.map((user, index) => (
              <div key={user.id} className="flex items-center justify-between p-2 sm:p-3 border rounded-lg">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div
                    className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base truncate">{user.name}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{user.count} facturas</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="font-bold text-sm sm:text-base">{formatCurrency(user.revenue)}</p>
                  <Badge variant="outline" className="text-xs">
                    {user.percentage.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
