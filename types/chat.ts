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
  
  // Interface que extiende Conversation con el último mensaje y etiquetas
  export interface ConversationWithLastMessage extends Conversation {
    last_message?: Message
    conversation_tags?: ConversationTag[]
  }
  
  export interface Message {
    id: string
    conversation_id: string
    sender_type: "contact" | "agent" | "system"
    user_id?: string
    content: string
    message_type: "text" | "image" | "audio" | "video" | "document" | "location" | "system"
    media_url?: string
    is_read: boolean
    external_message_id?: string
    created_at: string
    metadata?: {
      system_message?: boolean
      visible_to_user?: string
      action?: SystemMessageAction
      target_users?: string[]
      timestamp?: string
      [key: string]: any
    }
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
  
  // Nuevas interfaces para notas y etiquetas
  export interface ConversationNote {
    id: string
    conversation_id: string
    content: string
    created_by: string
    created_at: string
    updated_at: string
    // Relación con usuario
    user?: User
  }
  
  export interface ConversationTag {
    id: string
    conversation_id: string
    tag_name: string
    created_by: string
    created_at: string
    // Relación con usuario
    user?: User
  }
  
  // Interface extendida de Conversation con notas y etiquetas
  export interface ConversationWithNotesAndTags extends ConversationWithLastMessage {
    notes?: ConversationNote[]
    tags?: ConversationTag[]
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
  
  // Tipos para las acciones de mensajes de sistema
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
  