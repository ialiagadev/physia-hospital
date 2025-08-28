// types/balance.ts
export interface BalanceMovement {
    id: number
    type: "ingreso" | "gasto"
    concept: string
    amount: number   // siempre number
    created_at: string
    notes?: string
  }
  