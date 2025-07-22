"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RevenueStats } from "@/components/dashboard/revenue-stats"
import { ExpenseStats } from "@/components/dashboard/expense-stats"
import { RevenueByProfessional } from "@/components/statistics/revenue-by-professional"
import { RevenueByService } from "@/components/statistics/revenue-by-service"
import { ExpensesByCategory } from "@/components/statistics/expenses-by-category"
import { ExpensesBySupplier } from "@/components/statistics/expenses-by-supplier"
import { RevenueByPaymentMethod } from "@/components/statistics/revenue-by-payment-method"
import { CalendarDays } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/app/contexts/auth-context"
export default function StatisticsPage() {
  const [timePeriod, setTimePeriod] = useState("month")
  const { userProfile, isLoading } = useAuth()

  const getPeriodInDays = (period: string): string => {
    switch (period) {
      case "day":
        return "1"
      case "week":
        return "7"
      case "month":
        return "30"
      case "quarter":
        return "90"
      case "semester":
        return "180"
      case "year":
        return "365"
      default:
        return "30"
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estadísticas</h1>
          <p className="text-muted-foreground">Cargando datos...</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded" />
          ))}
        </div>
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  if (!userProfile) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estadísticas</h1>
          <p className="text-muted-foreground">Análisis detallado de ingresos, gastos y rendimiento</p>
        </div>
        <Alert variant="destructive">
          <AlertDescription>
            No se pudo cargar el perfil del usuario. Por favor, inicia sesión nuevamente.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Estadísticas</h1>
        <p className="text-muted-foreground">Análisis detallado de ingresos, gastos y rendimiento</p>
        {process.env.NODE_ENV === "development" && (
          <p className="text-xs text-muted-foreground">
            Organization ID: {userProfile.organization_id} | User: {userProfile.name}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <Select value={timePeriod} onValueChange={setTimePeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Seleccionar período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Diario</SelectItem>
            <SelectItem value="week">Semanal</SelectItem>
            <SelectItem value="month">Mensual</SelectItem>
            <SelectItem value="quarter">Trimestral</SelectItem>
            <SelectItem value="semester">Semestral</SelectItem>
            <SelectItem value="year">Anual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="by-payment" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="revenue">Ingresos</TabsTrigger>
          <TabsTrigger value="expenses">Gastos</TabsTrigger>
          <TabsTrigger value="by-professional">Por Profesional</TabsTrigger>
          <TabsTrigger value="by-service">Por Servicio</TabsTrigger>
          <TabsTrigger value="by-payment">Por Método Pago</TabsTrigger>
          <TabsTrigger value="expenses-analysis">Análisis Gastos</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>Evolución de Ingresos</CardTitle>
              <CardDescription>Análisis de ingresos en el período seleccionado</CardDescription>
            </CardHeader>
            <CardContent>
              <RevenueStats period={timePeriod} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle>Evolución de Gastos</CardTitle>
              <CardDescription>Análisis de gastos en el período seleccionado</CardDescription>
            </CardHeader>
            <CardContent>
              <ExpenseStats period={timePeriod} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-professional">
          <Card>
            <CardHeader>
              <CardTitle>Ingresos por Profesional</CardTitle>
              <CardDescription>Distribución de ingresos por profesional</CardDescription>
            </CardHeader>
            <CardContent>
              <RevenueByProfessional period={timePeriod} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-service">
          <Card>
            <CardHeader>
              <CardTitle>Ingresos por Servicio</CardTitle>
              <CardDescription>Distribución de ingresos por tipo de servicio</CardDescription>
            </CardHeader>
            <CardContent>
              <RevenueByService period={timePeriod} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-payment">
          <Card>
            <CardHeader>
              <CardTitle>Ingresos por Método de Pago</CardTitle>
              <CardDescription>Distribución de ingresos por método de pago utilizado</CardDescription>
            </CardHeader>
            <CardContent>
              <RevenueByPaymentMethod
                period={getPeriodInDays(timePeriod)}
                organizationId={userProfile.organization_id.toString()}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses-analysis">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Gastos por Categoría</CardTitle>
                <CardDescription>Distribución de gastos por categoría</CardDescription>
              </CardHeader>
              <CardContent>
                <ExpensesByCategory period={timePeriod} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Gastos por Proveedor</CardTitle>
                <CardDescription>Principales proveedores por volumen de gastos</CardDescription>
              </CardHeader>
              <CardContent>
                <ExpensesBySupplier period={timePeriod} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
