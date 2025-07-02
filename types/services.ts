export interface Service {
    id: number
    created_at: string
    organization_id: number
    name: string
    description?: string
    price: number
    vat_rate: number
    irpf_rate: number
    retention_rate: number
    active: boolean
    category?: string
    duration: number
    color: string
    icon?: string
    sort_order: number
    updated_at: string
  }
  
  export interface ServiceInsert {
    organization_id: number
    name: string
    description?: string
    price: number
    vat_rate?: number
    irpf_rate?: number
    retention_rate?: number
    active?: boolean
    category?: string
    duration?: number
    color?: string
    icon?: string
    sort_order?: number
  }
  
  export interface UserService {
    id: number
    user_id: string
    service_id: number
    created_at: string
    service?: Service
    services?: Service // Para compatibilidad con la consulta de Supabase
  }
  
  export interface UserServiceWithDetails extends UserService {
    service: Service
  }
  