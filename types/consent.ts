export interface ConsentForm {
    id: string
    created_at: string
    updated_at: string
    organization_id: number
    title: string
    content: string
    description: string | null
    is_active: boolean
    created_by: string | null
    category: string
    version: number
  }
  
  export interface ConsentToken {
    id: string
    created_at: string
    client_id: number
    consent_form_id: string
    token: string
    expires_at: string
    used_at: string | null
    created_by: string
    sent_via: "whatsapp" | "email" | "qr" | "manual" | null
    recipient_info: {
      email?: string
      phone?: string
      method?: string
      processed_content?: string
      organization_data?: any
      placeholders_replaced?: boolean
      organization_source?: string
    } | null
  }
  
  export interface PatientConsent {
    id: string
    created_at: string
    client_id: number
    consent_form_id: string
    consent_token_id: string
    signature_base64: string
    patient_name: string
    patient_tax_id: string
    signed_at: string
    ip_address: string | null
    user_agent: string | null
    browser_info: {
      platform?: string
      language?: string
      screen?: string
    } | null
    identity_verified: boolean
    is_valid: boolean
  
    // Campos de aceptación básicos
    terms_accepted: boolean
    terms_accepted_at: string | null
    document_read_understood: boolean
    document_read_at: string | null
    marketing_notifications_accepted: boolean
    marketing_accepted_at: string | null
    acceptance_text_version: string | null
  
    // ✅ CAMPOS DE TRATAMIENTO MÉDICO (OPCIONALES)
    medical_treatment_accepted?: boolean
    medical_treatment_accepted_at?: string | null
    medical_treatment_rejected?: boolean
    medical_treatment_rejected_at?: string | null
  
    // Campos de contenido procesado
    consent_content?: string | null
    organization_data?: {
      id: number
      name: string
      tax_id: string
      address?: string
      city: string
      province?: string
      postal_code?: string
      email?: string
      phone?: string
      website?: string
      logo_url?: string
    } | null
  
    // Campos de rechazo básicos
    terms_rejected?: boolean
    terms_rejected_at?: string | null
    document_rejected?: boolean
    document_rejected_at?: string | null
    marketing_rejected?: boolean
    marketing_rejected_at?: string | null
  }
  
  export interface ConsentTokenWithDetails extends ConsentToken {
    consent_forms: ConsentForm
    clients: {
      id: number
      name: string
      tax_id: string
      email: string | null
      phone: string | null
    }
    created_by_user: {
      id: string
      name: string | null
      email: string | null
    }
  }
  
  export interface PatientConsentWithDetails extends PatientConsent {
    consent_forms: ConsentForm
    clients: {
      id: number
      name: string
      tax_id: string
    }
    consent_tokens: ConsentToken
  }
  
  // Para el formulario de creación de consentimiento
  export interface CreateConsentTokenData {
    client_id: number
    consent_form_id: string
    expires_in_days?: number // por defecto 7 días
    sent_via?: "whatsapp" | "email" | "qr" | "manual"
    recipient_info?: {
      email?: string
      phone?: string
      method?: string
    }
  }
  
  // ✅ ACTUALIZADA PARA INCLUIR TRATAMIENTO MÉDICO
  export interface ConsentValidationData {
    patient_name: string
    patient_tax_id: string
    signature_base64: string
    terms_accepted: boolean
    document_read_understood: boolean
    marketing_notifications_accepted: boolean
    medical_treatment_accepted?: boolean // ✅ OPCIONAL
  }
  