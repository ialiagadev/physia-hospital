export interface Canal {
  id: number
  nombre: string
  descripcion?: string
  imagen?: string
  href_button_action?: string
  estado?: number
}

export interface CanalesOrganization {
  id: number
  id_canal: number
  id_organization: number
  fecha_activacion?: string
  estado?: boolean
  canal?: Canal
  waba?: Waba[]
}

export interface Client {
  id: number
  name: string
  phone?: string | null
  phone_prefix?: string | null
  full_phone?: string | null
  email?: string | null
  avatar_url?: string | null
  channel?: "whatsapp" | "instagram" | "facebook" | "webchat"
  channel_id?: number
  external_id?: string | null
  last_interaction_at?: string | null
  organization_id: number
  created_at: string
  tax_id?: string | null
  address?: string | null
  postal_code?: string | null
  city?: string | null
  province?: string | null
  country?: string | null
  client_type?: "private" | "public"
  chat_metadata?: any
  canal?: Canal
  birth_date?: string | null
  gender?: string | null
  blood_type?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  emergency_contact_relationship?: string | null
  medical_notes?: string | null
  has_medical_history?: boolean
  dir3_codes?: any
}

export interface Conversation {
  id: string
  organization_id: number
  client_id: number
  assigned_user_id?: string
  assigned_user_ids?: string[]
  status: "active" | "pending" | "resolved" | "closed"
  last_message_at?: string
  unread_count: number
  title?: string
  created_at: string
  updated_at: string
  metadata?: any
  client?: Client
  id_canales_organization?: number
  canales_organization?: CanalesOrganization
}

export interface ConversationWithLastMessage extends Conversation {
  assigned_to: string | undefined
  last_message?: Message
  conversation_tags?: ConversationTag[]
}

export interface Message {
  user: any
  id: string
  conversation_id: string
  sender_type: "contact" | "agent" | "system"
  user_id?: string
  content: string
  message_type: "text" | "image" | "audio" | "video" | "document" | "location" | "system"
  media_url?: string
  duration?: number // Added duration property for audio/video messages
  is_read: boolean
  external_message_id?: string
  created_at: string
  metadata?: {
    system_message?: boolean
    visible_to_user?: string
    action?: SystemMessageAction
    target_users?: string[]
    timestamp?: string
    whatsapp_send_failed?: boolean
    whatsapp_error?: string
    whatsapp_sent?: boolean
    whatsapp_sent_at?: string
    whatsapp_phone?: string
    [key: string]: any
  }
}

export interface User {
  id: string
  email: string
  name?: string | null
  avatar_url?: string | null
  role?: string
  organization_id?: number
  is_physia_admin?: boolean
  type?: number
  prompt?: string
  created_at?: string
}

export interface ConversationNote {
  id: string
  conversation_id: string
  content: string
  created_by: string
  created_at: string
  updated_at: string
  user?: User
}

// ✅ Interface corregida con color obligatorio como string
export interface ConversationTag {
  id: string
  conversation_id: string
  tag_name: string
  created_by: string
  created_at: string
  color: string // ✅ Cambiado de opcional a obligatorio
  user?: User
}

export interface ConversationWithNotesAndTags extends ConversationWithLastMessage {
  notes?: ConversationNote[]
  tags?: ConversationTag[]
}

export type UserProfile = User

export interface Waba {
  id: number
  id_canales_organization: number
  waba_id?: number
  numero: string
  nombre?: string
  descripcion?: string
  activar_reasignar_agentes?: number
  minutos_reasignar_agentes?: number
  activar_reasignar_sin_respuesta?: boolean
  minutos_reasignar_sin_respuesta?: number
  estado?: number
  id_proyecto?: string
  token_proyecto?: string
  id_usuario?: string
  fecha_alta?: string
  webhook?: string
  fecha_baja?: string
  fecha_solicitud_baja?: string
}

export interface ConversationsResponse {
  conversations: ConversationWithLastMessage[]
  total: number
  page: number
  limit: number
}

export interface MessagesResponse {
  messages: Message[]
  total: number
  page: number
  limit: number
}

export type SystemMessageAction =
  | "user_assigned"
  | "user_unassigned"
  | "multiple_users_assigned"
  | "multiple_users_unassigned"

export interface SystemMessageMetadata {
  system_message: boolean
  visible_to_user: string
  action: SystemMessageAction
  target_users: string[]
  timestamp: string
}

export interface CreateClientData {
  name: string
  phone?: string
  phone_prefix?: string
  email?: string
  external_id?: string
  avatar_url?: string
  organization_id: number
  tax_id?: string
  address?: string
  postal_code?: string
  city?: string
  province?: string
  country?: string
  client_type?: "private" | "public"
  birth_date?: string
  gender?: string
  blood_type?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relationship?: string
  medical_notes?: string
  has_medical_history?: boolean
}

export interface UpdateClientData extends Partial<CreateClientData> {
  id: number
}

export interface PhoneValidationResult {
  isValid: boolean
  formattedPhone?: string
  country?: string
  error?: string
}

export interface CountryPhonePrefix {
  country: string
  countryCode: string
  prefix: string
  flag: string
  format?: string
}

export const COMMON_PHONE_PREFIXES: CountryPhonePrefix[] = [
  { country: "España", countryCode: "ES", prefix: "+34", flag: "🇪🇸" },
  { country: "Francia", countryCode: "FR", prefix: "+33", flag: "🇫🇷" },
  { country: "Reino Unido", countryCode: "GB", prefix: "+44", flag: "🇬🇧" },
  { country: "Alemania", countryCode: "DE", prefix: "+49", flag: "🇩🇪" },
  { country: "Italia", countryCode: "IT", prefix: "+39", flag: "🇮🇹" },
  { country: "Portugal", countryCode: "PT", prefix: "+351", flag: "🇵🇹" },
  { country: "Estados Unidos", countryCode: "US", prefix: "+1", flag: "🇺🇸" },
  { country: "México", countryCode: "MX", prefix: "+52", flag: "🇲🇽" },
  { country: "Argentina", countryCode: "AR", prefix: "+54", flag: "🇦🇷" },
  { country: "Colombia", countryCode: "CO", prefix: "+57", flag: "🇨🇴" },
]

// ✅ Tipos específicos para Supabase con tipado estricto
export interface SupabaseTagData {
  id: string
  conversation_id: string
  created_at: string
  created_by: string
  tag_id: string
  organization_tags: {
    id: string
    tag_name: string
    color: string
  } | null
}

export interface OrganizationTag {
  id: string
  tag_name: string
  color: string
  organization_id: number
  created_by: string
  created_at: string
  updated_at: string
}
