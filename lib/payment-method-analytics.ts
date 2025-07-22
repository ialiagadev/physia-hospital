// Tipos TypeScript para las estadísticas de métodos de pago
export interface PaymentMethodStats {
    payment_method: string
    payment_method_other: string
    invoice_count: number
    total_amount: number
    average_amount: number
    percentage: number
  }
  
  export interface PaymentMethodEvolution {
    month: string
    payment_method: string
    invoice_count: number
    total_amount: number
  }
  
  // Función para obtener estadísticas de métodos de pago
  export async function getPaymentMethodStats(
    organizationId: number,
    startDate?: string,
    endDate?: string,
  ): Promise<PaymentMethodStats[]> {
    try {
      // En producción, esto haría una llamada a tu API
      const response = await fetch(
        `/api/analytics/payment-methods?org=${organizationId}&start=${startDate}&end=${endDate}`,
      )
  
      if (!response.ok) {
        throw new Error("Failed to fetch payment method stats")
      }
  
      return await response.json()
    } catch (error) {
      console.error("Error fetching payment method stats:", error)
      return []
    }
  }
  
  // Función para obtener evolución temporal
  export async function getPaymentMethodEvolution(
    organizationId: number,
    monthsBack = 12,
  ): Promise<PaymentMethodEvolution[]> {
    try {
      const response = await fetch(`/api/analytics/payment-methods/evolution?org=${organizationId}&months=${monthsBack}`)
  
      if (!response.ok) {
        throw new Error("Failed to fetch payment method evolution")
      }
  
      return await response.json()
    } catch (error) {
      console.error("Error fetching payment method evolution:", error)
      return []
    }
  }
  
  // Mapeo de valores del enum a etiquetas legibles
  export const PAYMENT_METHOD_LABELS: Record<string, string> = {
    tarjeta: "Tarjeta",
    efectivo: "Efectivo",
    transferencia: "Transferencia",
    bizum: "Bizum",
    cheque: "Cheque",
    no_especificado: "No Especificado",
  }
  
  // Colores para los gráficos
  export const PAYMENT_METHOD_COLORS: Record<string, string> = {
    tarjeta: "hsl(var(--chart-1))",
    efectivo: "hsl(var(--chart-2))",
    transferencia: "hsl(var(--chart-3))",
    bizum: "hsl(var(--chart-4))",
    cheque: "hsl(var(--chart-5))",
    no_especificado: "hsl(var(--muted))",
  }
  