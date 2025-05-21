// Tipos para los estados de las historias clínicas
export type ClinicalRecordStatus =
  | "draft"
  | "active"
  | "follow_up"
  | "resolved"
  | "archived"
  | "pending_review"
  | "confidential"

// Tipos para los estados de las consultas
export type ConsultationStatus = "draft" | "completed" | "cancelled" | "pending_review" | "in_progress" // Añadido este estado que faltaba

// Tipos para los estados de los tratamientos
export type TreatmentStatus = "active" | "completed" | "cancelled" | "on_hold"

// Tipos para los estados de los seguimientos
export type FollowUpStatus = "pending" | "completed" | "cancelled" | "rescheduled"

// Interfaz para la tabla clinical_records
export interface ClinicalRecord {
  id: number
  created_at: string
  updated_at: string
  patient_id: number
  professional_id: number
  organization_id: number
  title: string
  description: string | null
  start_date: string // Formato ISO para fechas
  end_date: string | null
  status: ClinicalRecordStatus
  is_confidential: boolean
}

// Interfaz para la tabla clinical_consultations
export interface ClinicalConsultation {
  id: number
  created_at: string
  updated_at: string
  clinical_record_id: number
  professional_id: number
  consultation_date: string // Formato ISO para fechas con hora
  chief_complaint: string | null
  subjective: string | null
  objective: string | null
  assessment: string | null
  plan: string | null
  notes: string | null
  status: ConsultationStatus
  is_billed: boolean
  invoice_id: number | null
}

// Interfaz para la tabla clinical_diagnoses
export interface ClinicalDiagnosis {
  id: number
  created_at: string
  consultation_id: number
  code: string | null
  description: string
  type: string | null
  is_primary: boolean
}

// Interfaz para la tabla clinical_treatments
export interface ClinicalTreatment {
  id: number
  created_at: string
  updated_at: string
  consultation_id: number
  description: string
  instructions: string | null
  duration: string | null
  frequency: string | null
  status: TreatmentStatus
  start_date: string | null // Formato ISO para fechas
  end_date: string | null
}

// Interfaz para la tabla clinical_follow_ups
export interface ClinicalFollowUp {
  id: number
  created_at: string
  clinical_record_id: number
  professional_id: number
  scheduled_date: string // Formato ISO para fechas
  description: string | null
  status: FollowUpStatus
  completed_at: string | null
  notes: string | null
}

// Interfaz para la tabla clinical_tags
export interface ClinicalTag {
  id: number
  created_at: string
  organization_id: number
  name: string
  color: string | null
}

// Interfaz para la tabla clinical_record_tags (tabla de relación)
export interface ClinicalRecordTag {
  clinical_record_id: number
  tag_id: number
}

// Interfaz para la tabla clinical_templates
export interface ClinicalTemplate {
  id: number
  created_at: string
  updated_at: string
  organization_id: number
  name: string
  description: string | null
  template_data: any // JSONB en la base de datos
  created_by: number
  is_default: boolean
}

// Interfaz para la tabla clinical_audit_log
export interface ClinicalAuditLog {
  id: number
  created_at: string
  user_id: number
  record_type: string
  record_id: number
  action: string
  previous_data: any | null // JSONB en la base de datos
  new_data: any | null // JSONB en la base de datos
}

// Interfaces extendidas para incluir relaciones

// Importación de tipos de Supabase
import type { Database } from "./supabase"

// Interfaces con relaciones
export interface ClinicalRecordWithRelations extends ClinicalRecord {
  patient?: Database["public"]["Tables"]["clients"]["Row"]
  professional?: Database["public"]["Tables"]["professionals"]["Row"]
  organization?: Database["public"]["Tables"]["organizations"]["Row"] // Añadida esta relación
  consultations?: ClinicalConsultation[]
  follow_ups?: ClinicalFollowUp[]
  tags?: ClinicalTag[]
}

export interface ClinicalConsultationWithRelations extends ClinicalConsultation {
  clinical_record?: ClinicalRecord
  professional?: Database["public"]["Tables"]["professionals"]["Row"]
  diagnoses?: ClinicalDiagnosis[]
  treatments?: ClinicalTreatment[]
  invoice?: Database["public"]["Tables"]["invoices"]["Row"]
}

// Tipos para los formularios de creación y actualización

export type ClinicalRecordInsert = Omit<ClinicalRecord, "id" | "created_at" | "updated_at">
export type ClinicalRecordUpdate = Partial<Omit<ClinicalRecord, "id" | "created_at" | "updated_at">>

export type ClinicalConsultationInsert = Omit<ClinicalConsultation, "id" | "created_at" | "updated_at">
export type ClinicalConsultationUpdate = Partial<Omit<ClinicalConsultation, "id" | "created_at" | "updated_at">>

export type ClinicalDiagnosisInsert = Omit<ClinicalDiagnosis, "id" | "created_at">
export type ClinicalTreatmentInsert = Omit<ClinicalTreatment, "id" | "created_at" | "updated_at">
export type ClinicalFollowUpInsert = Omit<ClinicalFollowUp, "id" | "created_at">
export type ClinicalTagInsert = Omit<ClinicalTag, "id" | "created_at">
export type ClinicalTemplateInsert = Omit<ClinicalTemplate, "id" | "created_at" | "updated_at">
