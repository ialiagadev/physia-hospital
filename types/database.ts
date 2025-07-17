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
          invoice_number_format: string | null
          invoice_start_number: number | null
          logo_url: string | null
          invoice_format: string | null
          invoice_padding_length: number | null
          last_simplified_invoice_number: number | null
          last_rectificative_invoice_number: number | null
          simplified_invoice_format: string | null
          rectificative_invoice_format: string | null
          created_by: string | null
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
          invoice_number_format?: string | null
          invoice_start_number?: number | null
          logo_url?: string | null
          invoice_format?: string | null
          invoice_padding_length?: number | null
          last_simplified_invoice_number?: number | null
          last_rectificative_invoice_number?: number | null
          simplified_invoice_format?: string | null
          rectificative_invoice_format?: string | null
          created_by?: string | null
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
          invoice_number_format?: string | null
          invoice_start_number?: number | null
          logo_url?: string | null
          invoice_format?: string | null
          invoice_padding_length?: number | null
          last_simplified_invoice_number?: number | null
          last_rectificative_invoice_number?: number | null
          simplified_invoice_format?: string | null
          rectificative_invoice_format?: string | null
          created_by?: string | null
        }
      }
      users: {
        Row: {
          id: string
          created_at: string | null
          email: string | null
          organization_id: number | null
          role: string | null // 'admin' | 'user' | 'viewer'
          name: string | null
          avatar_url: string | null
          is_physia_admin: boolean | null
          type: number | null
          prompt: string | null
        }
        Insert: {
          id: string
          created_at?: string | null
          email?: string | null
          organization_id?: number | null
          role?: string | null
          name?: string | null
          avatar_url?: string | null
          is_physia_admin?: boolean | null
          type?: number | null
          prompt?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          email?: string | null
          organization_id?: number | null
          role?: string | null
          name?: string | null
          avatar_url?: string | null
          is_physia_admin?: boolean | null
          type?: number | null
          prompt?: string | null
        }
      }
      // TABLAS DE FICHAJE
      time_entries: {
        Row: {
          id: string
          user_id: string
          organization_id: number
          entry_type: string
          timestamp: string
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          organization_id: number
          entry_type: string
          timestamp?: string
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: number
          entry_type?: string
          timestamp?: string
          notes?: string | null
          created_at?: string | null
        }
      }
      work_sessions: {
        Row: {
          id: string
          user_id: string
          organization_id: number
          work_date: string
          clock_in_time: string | null
          clock_out_time: string | null
          total_minutes: number | null
          status: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          organization_id: number
          work_date: string
          clock_in_time?: string | null
          clock_out_time?: string | null
          total_minutes?: number | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: number
          work_date?: string
          clock_in_time?: string | null
          clock_out_time?: string | null
          total_minutes?: number | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      // TUS OTRAS TABLAS EXISTENTES...
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
    Views: {
      time_entries_with_user: {
        Row: {
          id: string | null
          user_id: string | null
          organization_id: number | null
          entry_type: string | null
          timestamp: string | null
          local_timestamp: string | null
          notes: string | null
          created_at: string | null
          user_name: string | null
          user_email: string | null
          user_role: string | null
        }
      }
      work_sessions_with_user: {
        Row: {
          id: string | null
          user_id: string | null
          organization_id: number | null
          work_date: string | null
          clock_in_time: string | null
          clock_out_time: string | null
          local_clock_in: string | null
          local_clock_out: string | null
          total_minutes: number | null
          total_hours: number | null
          status: string | null
          created_at: string | null
          updated_at: string | null
          user_name: string | null
          user_email: string | null
          user_role: string | null
        }
      }
      organization_time_stats: {
        Row: {
          organization_id: number | null
          organization_name: string | null
          active_users: number | null
          total_work_days: number | null
          total_minutes_worked: number | null
          avg_hours_per_day: number | null
          complete_days: number | null
          incomplete_days: number | null
        }
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Tipos simplificados para usar en la aplicación
export type User = Database["public"]["Tables"]["users"]["Row"]
export type Organization = Database["public"]["Tables"]["organizations"]["Row"]
