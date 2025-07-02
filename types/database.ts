export interface Database {
    public: {
      Tables: {
        users: {
          Row: {
            id: string
            email: string
            name: string | null
            role: "admin" | "professional"
            organization_id: number
            created_at: string
            updated_at: string
          }
          Insert: {
            id?: string
            email: string
            name?: string | null
            role?: "admin" | "professional"
            organization_id: number
            created_at?: string
            updated_at?: string
          }
          Update: {
            id?: string
            email?: string
            name?: string | null
            role?: "admin" | "professional"
            organization_id?: number
            created_at?: string
            updated_at?: string
          }
        }
      }
    }
  }
  