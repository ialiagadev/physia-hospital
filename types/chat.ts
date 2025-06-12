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
  }
  
  export interface Client {
    id: number // Es serial, no string
    name: string
    phone?: string
    email?: string
    avatar_url?: string
    channel?: "whatsapp" | "instagram" | "facebook" | "webchat"
    channel_id?: number // Añadir referencia al canal
    external_id?: string
    last_interaction_at?: string
    organization_id: number
    created_at: string
    // Campos adicionales de la tabla clients
    tax_id?: string
    address?: string
    postal_code?: string
    city?: string
    province?: string
    country?: string
    client_type?: "private" | "public"
    chat_metadata?: any
    canal?: Canal // Añadir la relación con canal
  }
  
  export interface Conversation {
    id: string
    organization_id: number
    client_id: number
    assigned_user_id?: string
    assigned_user_ids?: string[] // Añadimos este campo como array de strings (UUIDs)
    status: "active" | "pending" | "resolved" | "closed"
    last_message_at?: string
    unread_count: number
    title?: string
    created_at: string
    updated_at: string
    metadata?: any
    // Relación con cliente
    client?: Client
    // Relación con canal-organización
    id_canales_organization?: number
    canales_organization?: CanalesOrganization
  }
  
  // Interface que extiende Conversation con el último mensaje
  export interface ConversationWithLastMessage extends Conversation {
    last_message?: Message
  }
  
  export interface Message {
    id: string
    conversation_id: string
    sender_type: "contact" | "agent"
    user_id?: string
    content: string
    message_type: "text" | "image" | "audio" | "video" | "document" | "location"
    media_url?: string
    is_read: boolean
    external_message_id?: string
    created_at: string
    metadata?: any
  }
  
  export interface User {
    id: string // UUID
    email: string
    name?: string
    avatar_url?: string
    role?: string
    organization_id?: string // Cambiado a string para ser consistente
    is_physia_admin?: boolean
    type?: number // 1 = Usuario normal, 2 = Agente IA
    prompt?: string // Prompt para agentes IA
    created_at?: string
  }
  
  // Alias para mantener compatibilidad
  export type UserProfile = User
  
  // Interfaces adicionales para el sistema de canales
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
  
  // Tipos para las respuestas de la API
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
  