// Definición de tipos para facturas
export interface Invoice {
  id?: number
  created_at?: string
  updated_at?: string
  organization_id: number
  invoice_number: string
  client_id?: number | null
  issue_date: string
  invoice_type: "normal" | "rectificativa" | "simplificada"
  original_invoice_number?: string | null
  rectification_reason?: string | null
  rectification_type?: "substitution" | "differences" | null
  status?: string
  base_amount: number
  vat_amount: number
  irpf_amount?: number
  retention_amount?: number
  total_amount: number
  notes?: string | null
  pdf_path?: string | null
  pdf_url?: string | null
  xml_path?: string | null
  signature?: string | null
  signature_url?: string | null
}

export interface InvoiceLine {
  id?: number
  created_at?: string
  invoice_id?: number | null
  description: string
  quantity: number
  unit_price: number
  vat_rate: number
  irpf_rate?: number
  retention_rate?: number
  line_amount: number
  professional_id?: number | null
}

export interface RectificativeData {
  original_invoice_number: string
  rectification_reason: string
  rectification_type: "substitution" | "differences"
}

export type InvoiceType = "normal" | "rectificativa" | "simplificada"

// Nueva interfaz para la configuración de numeración
export interface InvoiceNumberingConfig {
  prefix: string
  paddingLength: number
  currentNumber: number // El número real actual basado en la BD
  nextNumber: number // El próximo número que se usará
  userOverride?: number // Si el usuario quiere cambiar el próximo número
}
