export interface Expense {
  id: number
  created_at: string
  updated_at: string
  organization_id: number
  user_id?: string | null
  description: string
  amount: number
  expense_date: string
  receipt_path?: string | null
  receipt_url?: string | null
  notes?: string | null
  status: "pending" | "approved" | "rejected" | "paid"
  payment_method?: string | null
  supplier_name?: string | null
  supplier_tax_id?: string | null
  is_deductible: boolean
  vat_rate: number
  vat_amount: number
  retention_rate?: number
  retention_amount?: number
  created_by?: string | null
}

export interface ExpenseWithDetails extends Expense {
  user?: {
    id: string
    name: string
    email: string
    type?: number
  } | null
  creator?: {
    id: string
    name: string
    email: string
    type?: number
  } | null
}

export interface ExpenseFormData {
  description: string
  amount: number
  expense_date: string
  user_id?: string
  notes?: string
  payment_method?: string
  supplier_name?: string
  supplier_tax_id?: string
  is_deductible: boolean
  vat_rate: number
  retention_rate?: number
  receipt_file?: File
}

export interface ExpenseFilters {
  user_id?: string
  status?: "pending" | "approved" | "rejected" | "paid" | "all"
  date_from?: string
  date_to?: string
  min_amount?: number
  max_amount?: number
  search?: string
}

export interface ExpenseStats {
  total_expenses: number
  total_amount: number
  pending_amount: number
  approved_amount: number
  by_user: Array<{
    user_id: string
    user_name: string
    amount: number
    count: number
  }>
  by_month: Array<{
    month: string
    amount: number
    count: number
  }>
}

export interface ExpenseCalculation {
  baseAmount: number
  vatAmount: number
  retentionAmount: number
  totalAmount: number
}

/**
 * Calcula los importes relacionados con un gasto: base, IVA, retención y total
 * @param baseAmount Importe base del gasto
 * @param vatRate Porcentaje de IVA (ej: 21 para 21%)
 * @param retentionRate Porcentaje de retención (ej: 15 para 15%)
 * @returns Objeto con todos los importes calculados
 */
export const calculateExpenseAmounts = (baseAmount: number, vatRate = 21, retentionRate = 0): ExpenseCalculation => {
  // Aseguramos que los valores son números
  baseAmount = Number(baseAmount) || 0
  vatRate = Number(vatRate) || 0
  retentionRate = Number(retentionRate) || 0

  // Calculamos los importes
  const vatAmount = (baseAmount * vatRate) / 100
  const retentionAmount = (baseAmount * retentionRate) / 100
  const totalAmount = baseAmount + vatAmount - retentionAmount

  // Redondeamos a 2 decimales para evitar problemas con números flotantes
  return {
    baseAmount: Math.round(baseAmount * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    retentionAmount: Math.round(retentionAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
  }
}

// Constantes útiles
export const DEFAULT_VAT_RATE = 21
export const DEFAULT_RETENTION_RATE = 0

export const EXPENSE_STATUSES = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  PAID: "paid",
} as const

export const PAYMENT_METHODS = [
  "Efectivo",
  "Tarjeta de crédito",
  "Tarjeta de débito",
  "Transferencia bancaria",
  "Bizum",
  "PayPal",
  "Otro",
] as const
