"use server"

import { supabaseAdmin } from "@/utils/supabase-admin"

export async function getOrganizations() {
  try {
    const { data, error } = await supabaseAdmin.from("organizations").select("id, name")

    if (error) {
      console.error("Error al cargar organizaciones:", error)
      return {
        success: false,
        error: error.message,
        organizations: [],
      }
    }

    return {
      success: true,
      organizations: data || [],
    }
  } catch (error) {
    console.error("Error inesperado al cargar organizaciones:", error)
    return {
      success: false,
      error: "Error inesperado",
      organizations: [],
    }
  }
}
