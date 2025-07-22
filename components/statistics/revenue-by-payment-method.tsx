"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { CreditCard, Banknote, Smartphone, Building2, MoreHorizontal } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PaymentMethodData {
  method: string
  amount: number
  count: number
  percentage: number
  color: string
}

interface RevenueByPaymentMethodProps {
  period: string
}

// Actualizar las constantes para reflejar los valores reales del enum
const paymentMethodIcons = {
  tarjeta: CreditCard,
  efectivo: Banknote,
  transferencia: Building2,
  bizum: Smartphone,
  cheque: Building2,
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

export function RevenueByPaymentMethod({ period }: RevenueByPaymentMethodProps) {
  const [data, setData] = useState<PaymentMethodData[]>([])
  const [loading, setLoading] = useState(true)
  const [totalRevenue, setTotalRevenue] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Simular datos - en producción esto vendría de tu API
        // Actualizar los datos de ejemplo para usar valores válidos del enum
        const mockData: PaymentMethodData[] = [
          {
            method: "tarjeta",
            amount: 15420.5,
            count: 89,
            percentage: 65.2,
            color: "hsl(var(--chart-1))",
          },
          {
            method: "efectivo",
            amount: 4230.0,
            count: 34,
            percentage: 17.9,
            color: "hsl(var(--chart-2))",
          },
          {
            method: "transferencia",
            amount: 2890.75,
            count: 12,
            percentage: 12.2,
            color: "hsl(var(--chart-3))",
          },
          {
            method: "bizum",
            amount: 890.25,
            count: 8,
            percentage: 3.8,
            color: "hsl(var(--chart-4))",
          },
          {
            method: "no_especificado",
            amount: 210.5,
            count: 3,
            percentage: 0.9,
            color: "hsl(var(--muted))",
          },
        ]

        const total = mockData.reduce((sum, item) => sum + item.amount, 0)
        setTotalRevenue(total)
        setData(mockData)
      } catch (error) {
        console.error("Error fetching payment method data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [period])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Resumen de totales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">€{totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total Ingresos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{data.reduce((sum, item) => sum + item.count, 0)}</div>
            <p className="text-xs text-muted-foreground">Total Facturas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              €{(totalRevenue / data.reduce((sum, item) => sum + item.count, 0)).toFixed(0)}
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
                    `€${value.toLocaleString()}`,
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
                    `€${value.toLocaleString()}`,
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
                        <div className="text-2xl font-bold">€{item.amount.toLocaleString()}</div>
                        <Badge variant="secondary">{item.percentage}%</Badge>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-sm text-muted-foreground mb-1">
                        <span>Ticket medio</span>
                        <span>€{(item.amount / item.count).toFixed(2)}</span>
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
