export interface CardTemplate {
  id: number
  created_at: string
  organization_id: number
  name: string
  description: string | null
  style_data: CardStyle
  is_active: boolean
}

export interface CardStyle {
  type: string
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
  }
  icon?: string
}

export interface LoyaltyCard {
  id: number
  created_at: string
  updated_at: string
  organization_id: number
  professional_id?: number | null
  client_id: number
  template_id: number | null
  business_name: string
  total_sessions: number
  completed_sessions: number
  reward: string
  expiry_date: string | null
  last_visit_date: string | null
  status: "active" | "completed" | "expired" | "cancelled" | "redeemed"
  custom_data?: any

  // Joined data
  clients?: {
    name: string
    tax_id: string
  }
  professionals?: {
    name: string
  }
}

export interface CardSession {
  id: number
  created_at: string
  card_id: number
  professional_id?: number | null
  session_date: string
  notes: string | null
  professionals?: {
    name: string
  }
}

export interface CardFormData {
  organization_id: number
  client_id: number | null
  template_id: number | null
  business_name: string
  total_sessions: number
  reward: string
  expiry_date: string | null
  custom_data?: any
}
