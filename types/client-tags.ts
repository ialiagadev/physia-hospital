export interface Client {
    id: number
    name: string
    email?: string
    phone?: string
    organization_id: number
    created_at: string
    client_tags?: ClientTag[]
  }
  
  export interface ClientTag {
    id: string
    client_id: number
    tag_name: string
    created_by?: string
    created_at: string
    updated_at: string
    source: string
    organization_id: number
  }
  
  export interface OrganizationTag {
    id: number
    organization_id: number
    tag_name: string
    color: string
    created_by?: string
    created_at: string
    updated_at: string
  }
  
  export interface TagWithColor {
    id: number
    tag_name: string
    color: string
    count: number
  }
  