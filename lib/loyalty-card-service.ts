import { supabase } from "@/lib/supabase"
import type { LoyaltyCard, CardFormData, CardSession } from "@/types/loyalty-cards"

export const LoyaltyCardService = {
  // Obtener todas las tarjetas de fidelización
  async getCards(organizationId?: number): Promise<LoyaltyCard[]> {
    let query = supabase
      .from("loyalty_cards")
      .select(`
        *,
        clients (name, tax_id),
        professionals (name)
      `)
      .order("created_at", { ascending: false })

    if (organizationId) {
      query = query.eq("organization_id", organizationId)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching loyalty cards:", error)
      throw new Error("No se pudieron cargar las tarjetas de fidelización")
    }

    return data || []
  },

  // Obtener una tarjeta específica
  async getCard(cardId: number | string): Promise<LoyaltyCard> {
    // Asegurarse de que cardId sea un número válido
    const id = typeof cardId === "string" ? Number.parseInt(cardId, 10) : cardId

    if (isNaN(id)) {
      throw new Error("ID de tarjeta inválido")
    }

    const { data, error } = await supabase
      .from("loyalty_cards")
      .select(`
        *,
        clients (name, tax_id),
        professionals (name)
      `)
      .eq("id", id)
      .single()

    if (error) {
      console.error("Error fetching loyalty card:", error)
      throw new Error("No se pudo cargar la tarjeta de fidelización")
    }

    return data
  },

  // Crear una nueva tarjeta
  async createCard(cardData: CardFormData): Promise<number> {
    const { data, error } = await supabase
      .from("loyalty_cards")
      .insert({
        organization_id: cardData.organization_id,
        professional_id: cardData.professional_id,
        client_id: cardData.client_id,
        template_id: cardData.template_id,
        business_name: cardData.business_name,
        total_sessions: cardData.total_sessions,
        completed_sessions: 0,
        reward: cardData.reward,
        expiry_date: cardData.expiry_date,
        status: "active",
        custom_data: cardData.custom_data || {},
      })
      .select("id")
      .single()

    if (error) {
      console.error("Error creating loyalty card:", error)
      throw new Error("No se pudo crear la tarjeta de fidelización")
    }

    return data.id
  },

  // Actualizar una tarjeta existente
  async updateCard(cardId: number, cardData: Partial<LoyaltyCard>): Promise<void> {
    const { error } = await supabase
      .from("loyalty_cards")
      .update({
        ...cardData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cardId)

    if (error) {
      console.error("Error updating loyalty card:", error)
      throw new Error("No se pudo actualizar la tarjeta de fidelización")
    }
  },

  // Registrar una nueva sesión
  async addSession(cardId: number, professionalId?: number, notes?: string): Promise<void> {
    // Primero obtenemos la tarjeta actual
    const { data: card, error: cardError } = await supabase.from("loyalty_cards").select("*").eq("id", cardId).single()

    if (cardError) {
      console.error("Error fetching card for session:", cardError)
      throw new Error("No se pudo cargar la tarjeta para registrar la sesión")
    }

    // Verificar si la tarjeta ya está completada
    if (card.completed_sessions >= card.total_sessions) {
      throw new Error("Esta tarjeta ya tiene todas las sesiones completadas")
    }

    // Iniciar una transacción
    const today = new Date().toISOString().split("T")[0]

    // 1. Registrar la sesión
    const { error: sessionError } = await supabase.from("card_sessions").insert({
      card_id: cardId,
      professional_id: professionalId || null,
      session_date: today,
      notes: notes || null,
    })

    if (sessionError) {
      console.error("Error registering session:", sessionError)
      throw new Error("No se pudo registrar la sesión")
    }

    // 2. Actualizar el contador de sesiones y la fecha de última visita
    const newCompletedSessions = card.completed_sessions + 1
    const newStatus = newCompletedSessions >= card.total_sessions ? "completed" : "active"

    const { error: updateError } = await supabase
      .from("loyalty_cards")
      .update({
        completed_sessions: newCompletedSessions,
        last_visit_date: today,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cardId)

    if (updateError) {
      console.error("Error updating card after session:", updateError)
      throw new Error("No se pudo actualizar la tarjeta después de registrar la sesión")
    }
  },

  // Obtener el historial de sesiones de una tarjeta
  async getCardSessions(cardId: number): Promise<CardSession[]> {
    const { data, error } = await supabase
      .from("card_sessions")
      .select(`
        *,
        professionals (name)
      `)
      .eq("card_id", cardId)
      .order("session_date", { ascending: false })

    if (error) {
      console.error("Error fetching card sessions:", error)
      throw new Error("No se pudo cargar el historial de sesiones")
    }

    return data || []
  },

  // Canjear una recompensa
  async redeemReward(cardId: number): Promise<void> {
    // Primero verificamos que la tarjeta esté completada
    const { data: card, error: cardError } = await supabase.from("loyalty_cards").select("*").eq("id", cardId).single()

    if (cardError) {
      console.error("Error fetching card for redemption:", cardError)
      throw new Error("No se pudo cargar la tarjeta para canjear la recompensa")
    }

    if (card.completed_sessions < card.total_sessions) {
      throw new Error("Esta tarjeta no tiene suficientes sesiones para canjear la recompensa")
    }

    if (card.status === "redeemed") {
      throw new Error("Esta recompensa ya ha sido canjeada")
    }

    // Actualizar el estado de la tarjeta
    const { error: updateError } = await supabase
      .from("loyalty_cards")
      .update({
        status: "redeemed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", cardId)

    if (updateError) {
      console.error("Error redeeming reward:", updateError)
      throw new Error("No se pudo canjear la recompensa")
    }
  },
}
