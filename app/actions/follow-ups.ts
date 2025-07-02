"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export interface CreateFollowUpData {
  client_id: number
  follow_up_type: string
  description: string
  recommendations?: string
  professional_name?: string
}

export async function createFollowUp(data: CreateFollowUpData) {
  try {
    const { error } = await supabase.from("patient_follow_ups").insert({
      client_id: data.client_id,
      follow_up_date: new Date().toISOString().split("T")[0],
      follow_up_type: data.follow_up_type,
      description: data.description.trim(),
      recommendations: data.recommendations?.trim() || null,
      professional_name: data.professional_name || "Dr. Usuario",
      is_active: true,
    })

    if (error) {
      console.error("Error creating follow-up:", error)
      throw new Error(`Error al guardar el seguimiento: ${error.message}`)
    }

    // Revalidate any cached data
    revalidatePath("/")

    return { success: true }
  } catch (error) {
    console.error("Server action error:", error)
    throw error
  }
}
