"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { CreditCard, Banknote, Smartphone, Building2, MoreHorizontal, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface PaymentMethodData {
  method: string
  amount: number
  count: number
  percentage: number
  color: string
}

interface RevenueByPaymentMethodProps {
  period: string
  organizationId: string
}

const paymentMethodIcons = {
  tarjeta: CreditCard,
  efectivo: Banknote,
  transferencia: Building2,
  bizum: Smartphone,
  cheque: FileText,
  no_especificado: MoreHorizontal,
}

const paymentMethodLabels = {
  tarjeta: "Tarjeta",
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  bizum: "Bizum",
  cheque: "Cheque",
  no_especificado: "No Especificado",
}

export function RevenueByPaymentMethod({ period, organizationId }: RevenueByPaymentMethodProps) {
  const [data, setData] = useState<PaymentMethodData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalRevenue, setTotalRevenue] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `/api/analytics/revenue-by-payment-method?organizationId=${organizationId}&period=${period}`,
        )

        if (!response.ok) {
          throw new Error("Error al cargar los datos")
        }

        const result = await response.json()

        const total = result.reduce((sum: number, item: PaymentMethodData) => sum + item.amount, 0)
        setTotalRevenue(total)
        setData(result)
      } catch (error) {
        console.error("Error fetching payment method data:", error)
        setError(error instanceof Error ? error.message : "Error desconocido")
      } finally {
        setLoading(false)
      }
    }

    if (organizationId) {
      fetchData()
    }
  }, [period, organizationId])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded" />
          ))}
        </div>
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Error al cargar los datos: {error}</AlertDescription>
      </Alert>
    )
  }

  if (data.length === 0) {
    return (
      <Alert>
        <AlertDescription>No hay datos de facturación para el período seleccionado.</AlertDescription>
      </Alert>
    )
  }

  const totalInvoices = data.reduce((sum, item) => sum + item.count, 0)
  const averageTicket = totalInvoices > 0 ? totalRevenue / totalInvoices : 0

  return (
    <div className="space-y-6">
      {/* Resumen de totales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              €{totalRevenue.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Total Ingresos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totalInvoices}</div>
            <p className="text-xs text-muted-foreground">Total Facturas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              €{averageTicket.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Ticket Medio</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{data.length}</div>
            <p className="text-xs text-muted-foreground">Métodos Usados</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="chart" className="w-full">
        <TabsList>
          <TabsTrigger value="chart">Gráfico de Barras</TabsTrigger>
          <TabsTrigger value="pie">Gráfico Circular</TabsTrigger>
          <TabsTrigger value="table">Tabla Detallada</TabsTrigger>
        </TabsList>

        <TabsContent value="chart">
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis
                  dataKey="method"
                  tickFormatter={(value) => paymentMethodLabels[value as keyof typeof paymentMethodLabels]}
                />
                <YAxis tickFormatter={(value) => `€${value.toLocaleString()}`} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `€${value.toLocaleString("es-ES", { minimumFractionDigits: 2 })}`,
                    paymentMethodLabels[name as keyof typeof paymentMethodLabels],
                  ]}
                  labelFormatter={(label) => paymentMethodLabels[label as keyof typeof paymentMethodLabels]}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent value="pie">
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ method, percentage }) =>
                    `${paymentMethodLabels[method as keyof typeof paymentMethodLabels]} ${percentage}%`
                  }
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `€${value.toLocaleString("es-ES", { minimumFractionDigits: 2 })}`,
                    paymentMethodLabels[name as keyof typeof paymentMethodLabels],
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent value="table">
          <div className="space-y-4">
            {data.map((item) => {
              const Icon = paymentMethodIcons[item.method as keyof typeof paymentMethodIcons]
              const ticketMedio = item.count > 0 ? item.amount / item.count : 0

              return (
                <Card key={item.method}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: `${item.color}20` }}>
                          <Icon className="h-5 w-5" style={{ color: item.color }} />
                        </div>
                        <div>
                          <h3 className="font-semibold">
                            {paymentMethodLabels[item.method as keyof typeof paymentMethodLabels]}
                          </h3>
                          <p className="text-sm text-muted-foreground">{item.count} facturas</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          €{item.amount.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
                        </div>
                        <Badge variant="secondary">{item.percentage}%</Badge>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-sm text-muted-foreground mb-1">
                        <span>Ticket medio</span>
                        <span>€{ticketMedio.toLocaleString("es-ES", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${item.percentage}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
