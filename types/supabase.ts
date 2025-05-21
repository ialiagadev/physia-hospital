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
      notifications: {
        Row: {
          id: string
          created_at: string
          user_id: string
          title: string
          message: string
          type: string
          read: boolean
          related_entity_type: string | null
          related_entity_id: string | null
          action_url: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          title: string
          message: string
          type: string
          read?: boolean
          related_entity_type?: string | null
          related_entity_id?: string | null
          action_url?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          title?: string
          message?: string
          type?: string
          read?: boolean
          related_entity_type?: string | null
          related_entity_id?: string | null
          action_url?: string | null
        }
      }
      // Nuevas tablas de historias clínicas
      clinical_records: {
        Row: {
          id: number
          created_at: string
          updated_at: string
          patient_id: number
          professional_id: number
          organization_id: number
          title: string
          description: string | null
          start_date: string
          end_date: string | null
          status: string
          is_confidential: boolean
        }
        Insert: {
          id?: number
          created_at?: string
          updated_at?: string
          patient_id: number
          professional_id: number
          organization_id: number
          title: string
          description?: string | null
          start_date: string
          end_date?: string | null
          status?: string
          is_confidential?: boolean
        }
        Update: {
          id?: number
          created_at?: string
          updated_at?: string
          patient_id?: number
          professional_id?: number
          organization_id?: number
          title?: string
          description?: string | null
          start_date?: string
          end_date?: string | null
          status?: string
          is_confidential?: boolean
        }
      }
      clinical_consultations: {
        Row: {
          id: number
          created_at: string
          updated_at: string
          clinical_record_id: number
          professional_id: number
          consultation_date: string
          chief_complaint: string | null
          subjective: string | null
          objective: string | null
          assessment: string | null
          plan: string | null
          notes: string | null
          status: string
          is_billed: boolean
          invoice_id: number | null
        }
        Insert: {
          id?: number
          created_at?: string
          updated_at?: string
          clinical_record_id: number
          professional_id: number
          consultation_date: string
          chief_complaint?: string | null
          subjective?: string | null
          objective?: string | null
          assessment?: string | null
          plan?: string | null
          notes?: string | null
          status?: string
          is_billed?: boolean
          invoice_id?: number | null
        }
        Update: {
          id?: number
          created_at?: string
          updated_at?: string
          clinical_record_id?: number
          professional_id?: number
          consultation_date?: string
          chief_complaint?: string | null
          subjective?: string | null
          objective?: string | null
          assessment?: string | null
          plan?: string | null
          notes?: string | null
          status?: string
          is_billed?: boolean
          invoice_id?: number | null
        }
      }
      clinical_diagnoses: {
        Row: {
          id: number
          created_at: string
          consultation_id: number
          code: string | null
          description: string
          type: string | null
          is_primary: boolean
        }
        Insert: {
          id?: number
          created_at?: string
          consultation_id: number
          code?: string | null
          description: string
          type?: string | null
          is_primary?: boolean
        }
        Update: {
          id?: number
          created_at?: string
          consultation_id?: number
          code?: string | null
          description?: string
          type?: string | null
          is_primary?: boolean
        }
      }
      clinical_treatments: {
        Row: {
          id: number
          created_at: string
          updated_at: string
          consultation_id: number
          description: string
          instructions: string | null
          duration: string | null
          frequency: string | null
          status: string
          start_date: string | null
          end_date: string | null
        }
        Insert: {
          id?: number
          created_at?: string
          updated_at?: string
          consultation_id: number
          description: string
          instructions?: string | null
          duration?: string | null
          frequency?: string | null
          status?: string
          start_date?: string | null
          end_date?: string | null
        }
        Update: {
          id?: number
          created_at?: string
          updated_at?: string
          consultation_id?: number
          description?: string
          instructions?: string | null
          duration?: string | null
          frequency?: string | null
          status?: string
          start_date?: string | null
          end_date?: string | null
        }
      }
      clinical_follow_ups: {
        Row: {
          id: number
          created_at: string
          clinical_record_id: number
          professional_id: number
          scheduled_date: string
          description: string | null
          status: string
          completed_at: string | null
          notes: string | null
        }
        Insert: {
          id?: number
          created_at?: string
          clinical_record_id: number
          professional_id: number
          scheduled_date: string
          description?: string | null
          status?: string
          completed_at?: string | null
          notes?: string | null
        }
        Update: {
          id?: number
          created_at?: string
          clinical_record_id?: number
          professional_id?: number
          scheduled_date?: string
          description?: string | null
          status?: string
          completed_at?: string | null
          notes?: string | null
        }
      }
      clinical_tags: {
        Row: {
          id: number
          created_at: string
          organization_id: number
          name: string
          color: string | null
        }
        Insert: {
          id?: number
          created_at?: string
          organization_id: number
          name: string
          color?: string | null
        }
        Update: {
          id?: number
          created_at?: string
          organization_id?: number
          name?: string
          color?: string | null
        }
      }
      clinical_record_tags: {
        Row: {
          clinical_record_id: number
          tag_id: number
        }
        Insert: {
          clinical_record_id: number
          tag_id: number
        }
        Update: {
          clinical_record_id?: number
          tag_id?: number
        }
      }
      clinical_templates: {
        Row: {
          id: number
          created_at: string
          updated_at: string
          organization_id: number
          name: string
          description: string | null
          template_data: Json
          created_by: number
          is_default: boolean
        }
        Insert: {
          id?: number
          created_at?: string
          updated_at?: string
          organization_id: number
          name: string
          description?: string | null
          template_data: Json
          created_by: number
          is_default?: boolean
        }
        Update: {
          id?: number
          created_at?: string
          updated_at?: string
          organization_id?: number
          name?: string
          description?: string | null
          template_data?: Json
          created_by?: number
          is_default?: boolean
        }
      }
      clinical_audit_log: {
        Row: {
          id: number
          created_at: string
          user_id: number
          record_type: string
          record_id: number
          action: string
          previous_data: Json | null
          new_data: Json | null
        }
        Insert: {
          id?: number
          created_at?: string
          user_id: number
          record_type: string
          record_id: number
          action: string
          previous_data?: Json | null
          new_data?: Json | null
        }
        Update: {
          id?: number
          created_at?: string
          user_id?: number
          record_type?: string
          record_id?: number
          action?: string
          previous_data?: Json | null
          new_data?: Json | null
        }
      }
    }
  }
}
