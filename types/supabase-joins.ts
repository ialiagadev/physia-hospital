// Define los tipos para las consultas con joins
export interface InvoiceWithClient {
    id: number
    invoice_number: string
    issue_date: string
    total_amount: number
    clients: {
      name: string
    } | null
  }
  
  // Tipo alternativo para cuando clients viene como array
  export interface InvoiceWithClientArray {
    id: number
    invoice_number: string
    issue_date: string
    total_amount: number
    clients: Array<{
      name: string
    }>
  }
  
  // Tipo unión para manejar ambos casos
  export type InvoiceWithClientData = InvoiceWithClient | InvoiceWithClientArray
  