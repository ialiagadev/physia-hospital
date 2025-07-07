export interface Service {
  id: number
  created_at: string
  organization_id: number
  name: string
  description: string | null // ✅ Cambiado de optional a nullable
  price: number
  vat_rate: number
  irpf_rate: number
  retention_rate: number
  active: boolean
  category: string | null // ✅ Cambiado de optional a nullable
  duration: number
  color: string
  icon: string | null // ✅ Cambiado de optional a nullable
  sort_order: number
  updated_at: string
}

export interface ServiceInsert {
  organization_id: number
  name: string
  description?: string | null
  price: number
  vat_rate?: number
  irpf_rate?: number
  retention_rate?: number
  active?: boolean
  category?: string | null
  duration?: number
  color?: string
  icon?: string | null
  sort_order?: number
}

export interface ServiceUpdate extends Partial<ServiceInsert> {
  id: number
  updated_at?: string
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

// Tipos adicionales útiles
export interface ServiceFilters {
  active?: boolean
  category?: string
  organization_id?: number
}

export interface ServiceWithUserCount extends Service {
  user_count?: number
}
