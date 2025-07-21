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
  