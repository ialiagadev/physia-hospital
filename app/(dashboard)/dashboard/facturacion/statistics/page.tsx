"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RevenueStats } from "@/components/dashboard/revenue-stats"
import { RevenueByProfessional } from "@/components/statistics/revenue-by-professional"
import { RevenueByService } from "@/components/statistics/revenue-by-service"
import { CalendarDays } from "lucide-react"

export default function StatisticsPage() {
  const [timePeriod, setTimePeriod] = useState("month")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Estadísticas</h1>
        <p className="text-muted-foreground">Análisis detallado de ingresos y rendimiento</p>
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

      <Tabs defaultValue="revenue" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="revenue">Ingresos</TabsTrigger>
          <TabsTrigger value="by-professional">Por Profesional</TabsTrigger>
          <TabsTrigger value="by-service">Por Servicio</TabsTrigger>
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
      </Tabs>
    </div>
  )
}
