export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: number
          created_at: string
          name: string
          tax_id: string
          address: string
          postal_code: string
          city: string
          province: string
          country: string
          email: string | null
          phone: string | null
          logo_path: string | null
          certificate_path: string | null
          last_invoice_number: number
          invoice_prefix: string
          active: boolean
          subscription_tier: string
          subscription_expires: string | null
        }
        Insert: {
          id?: number
          created_at?: string
          name: string
          tax_id: string
          address: string
          postal_code: string
          city: string
          province: string
          country?: string
          email?: string | null
          phone?: string | null
          logo_path?: string | null
          certificate_path?: string | null
          last_invoice_number?: number
          invoice_prefix?: string
          active?: boolean
          subscription_tier?: string
          subscription_expires?: string | null
        }
        Update: {
          id?: number
          created_at?: string
          name?: string
          tax_id?: string
          address?: string
          postal_code?: string
          city?: string
          province?: string
          country?: string
          email?: string | null
          phone?: string | null
          logo_path?: string | null
          certificate_path?: string | null
          last_invoice_number?: number
          invoice_prefix?: string
          active?: boolean
          subscription_tier?: string
          subscription_expires?: string | null
        }
      }
      users: {
        Row: {
          id: string
          created_at: string
          email: string
          organization_id: number | null
          role: string
          name: string | null
          avatar_url: string | null
          is_physia_admin: boolean
        }
        Insert: {
          id: string
          created_at?: string
          email: string
          organization_id?: number | null
          role?: string
          name?: string | null
          avatar_url?: string | null
          is_physia_admin?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          email?: string
          organization_id?: number | null
          role?: string
          name?: string | null
          avatar_url?: string | null
          is_physia_admin?: boolean
        }
      }
      clients: {
        Row: {
          id: number
          created_at: string
          organization_id: number
          name: string
          tax_id: string
          address: string
          postal_code: string
          city: string
          province: string
          country: string
          client_type: string
          dir3_codes: Json | null
          email: string | null
          phone: string | null
        }
        Insert: {
          id?: number
          created_at?: string
          organization_id: number
          name: string
          tax_id: string
          address: string
          postal_code: string
          city: string
          province: string
          country?: string
          client_type: string
          dir3_codes?: Json | null
          email?: string | null
          phone?: string | null
        }
        Update: {
          id?: number
          created_at?: string
          organization_id?: number
          name?: string
          tax_id?: string
          address?: string
          postal_code?: string
          city?: string
          province?: string
          country?: string
          client_type?: string
          dir3_codes?: Json | null
          email?: string | null
          phone?: string | null
        }
      }
      invoices: {
        Row: {
          id: number
          created_at: string
          updated_at: string
          organization_id: number
          invoice_number: string
          client_id: number | null
          issue_date: string
          invoice_type: string
          status: string
          base_amount: number
          vat_amount: number
          irpf_amount: number
          retention_amount: number
          total_amount: number
          notes: string | null
          pdf_path: string | null
          xml_path: string | null
          signature: string | null
          signature_url: string | null
        }
        Insert: {
          id?: number
          created_at?: string
          updated_at?: string
          organization_id: number
          invoice_number: string
          client_id?: number | null
          issue_date: string
          invoice_type: string
          status?: string
          base_amount: number
          vat_amount: number
          irpf_amount?: number
          retention_amount?: number
          total_amount: number
          notes?: string | null
          pdf_path?: string | null
          xml_path?: string | null
          signature?: string | null
          signature_url?: string | null
        }
        Update: {
          id?: number
          created_at?: string
          updated_at?: string
          organization_id?: number
          invoice_number?: string
          client_id?: number | null
          issue_date?: string
          invoice_type?: string
          status?: string
          base_amount?: number
          vat_amount?: number
          irpf_amount?: number
          retention_amount?: number
          total_amount?: number
          notes?: string | null
          pdf_path?: string | null
          xml_path?: string | null
          signature?: string | null
          signature_url?: string | null
        }
      }
      invoice_lines: {
        Row: {
          id: number
          created_at: string
          invoice_id: number | null
          description: string
          quantity: number
          unit_price: number
          vat_rate: number
          irpf_rate: number
          retention_rate: number
          line_amount: number
          professional_id: number | null
        }
        Insert: {
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
        Update: {
          id?: number
          created_at?: string
          invoice_id?: number | null
          description?: string
          quantity?: number
          unit_price?: number
          vat_rate?: number
          irpf_rate?: number
          retention_rate?: number
          line_amount?: number
          professional_id?: number | null
        }
      }
      services: {
        Row: {
          id: number
          created_at: string
          organization_id: number
          name: string
          description: string | null
          price: number
          vat_rate: number
          irpf_rate: number
          retention_rate: number
          active: boolean
          category: string | null
          professional_id: number | null
        }
        Insert: {
          id?: number
          created_at?: string
          organization_id: number
          name: string
          description?: string | null
          price: number
          vat_rate: number
          irpf_rate?: number
          retention_rate?: number
          active?: boolean
          category?: string | null
          professional_id?: number | null
        }
        Update: {
          id?: number
          created_at?: string
          organization_id?: number
          name?: string
          description?: string | null
          price?: number
          vat_rate?: number
          irpf_rate?: number
          retention_rate?: number
          active?: boolean
          category?: string | null
          professional_id?: number | null
        }
      }
      professionals: {
        Row: {
          id: number
          created_at: string
          organization_id: number
          name: string
          active: boolean
        }
        Insert: {
          id?: number
          created_at?: string
          organization_id: number
          name: string
          active?: boolean
        }
        Update: {
          id?: number
          created_at?: string
          organization_id?: number
          name?: string
          active?: boolean
        }
      }
    }
  }
}
