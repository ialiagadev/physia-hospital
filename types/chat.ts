export interface Client {
    id: number // Es serial, no string
    name: string
    phone?: string
    email?: string
    avatar_url?: string
    channel?: "whatsapp" | "instagram" | "facebook" | "webchat"
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
  }
  
  export interface Conversation {
    id: string
    organization_id: number
    client_id: number
    assigned_user_id?: string
    status: "active" | "pending" | "resolved" | "closed"
    last_message_at?: string
    unread_count: number
    title?: string
    created_at: string
    updated_at: string
    metadata?: any
    // Relación con cliente
    client?: Client
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
    created_at?: string
  }
  
  // Alias para mantener compatibilidad
  export type UserProfile = User
  