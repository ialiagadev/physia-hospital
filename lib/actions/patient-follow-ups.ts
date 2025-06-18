"use server"

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import type { Database } from "@/types/supabase"

export interface PatientFollowUpData {
  followUpDate: string
  followUpType: string
  description: string
  recommendations?: string
  nextAppointmentNote?: string
  professionalName?: string
}

export interface PatientFollowUp {
  id: number
  created_at: string
  updated_at: string
  client_id: number
  professional_id?: number
  organization_id: number
  follow_up_date: string
  follow_up_type: string
  description: string
  recommendations?: string
  next_appointment_note?: string
  is_active: boolean
  professional_name?: string
}

export async function getPatientFollowUps(clientId: string) {
  try {
    const supabase = createServerComponentClient<Database>({ cookies })

    const { data, error } = await supabase
      .from("patient_follow_ups")
      .select(`
        *,
        professional:professionals(name),
        client:clients(name)
      `)
      .eq("client_id", clientId)
      .eq("is_active", true)
      .order("follow_up_date", { ascending: false })

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    console.error("Error fetching patient follow-ups:", error)
    return { data: null, error: "Error al obtener los seguimientos del paciente" }
  }
}

export async function createPatientFollowUp(clientId: string, followUpData: PatientFollowUpData) {
  try {
    const supabase = createServerComponentClient<Database>({ cookies })

    // Obtener información del usuario actual
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error("Usuario no autenticado")
    }

    // Obtener organización del usuario
    const { data: userOrg } = await supabase.from("users").select("organization_id").eq("id", user.id).single()

    if (!userOrg || !userOrg.organization_id) {
      throw new Error("Usuario sin organización asignada")
    }

    // Obtener professional_id si existe
    const { data: professional } = await supabase.from("professionals").select("id").eq("user_id", user.id).single()

    const { data, error } = await supabase
      .from("patient_follow_ups")
      .insert({
        client_id: Number.parseInt(clientId),
        professional_id: professional?.id || null,
        organization_id: userOrg.organization_id,
        follow_up_date: followUpData.followUpDate,
        follow_up_type: followUpData.followUpType,
        description: followUpData.description,
        recommendations: followUpData.recommendations || null,
        next_appointment_note: followUpData.nextAppointmentNote || null,
        professional_name: followUpData.professionalName || null,
      })
      .select()
      .single()

    if (error) throw error

    // Revalidar la página del cliente
    revalidatePath(`/dashboard/facturacion/clients/${clientId}`)

    return { data, error: null }
  } catch (error) {
    console.error("Error creating patient follow-up:", error)
    return { data: null, error: "Error al crear el seguimiento del paciente" }
  }
}

export async function updatePatientFollowUp(followUpId: number, followUpData: PatientFollowUpData) {
  try {
    const supabase = createServerComponentClient<Database>({ cookies })

    const { data, error } = await supabase
      .from("patient_follow_ups")
      .update({
        follow_up_date: followUpData.followUpDate,
        follow_up_type: followUpData.followUpType,
        description: followUpData.description,
        recommendations: followUpData.recommendations || null,
        next_appointment_note: followUpData.nextAppointmentNote || null,
        professional_name: followUpData.professionalName || null,
      })
      .eq("id", followUpId)
      .select()
      .single()

    if (error) throw error

    // Revalidar todas las páginas de clientes (no sabemos el clientId aquí)
    revalidatePath("/dashboard/facturacion/clients")

    return { data, error: null }
  } catch (error) {
    console.error("Error updating patient follow-up:", error)
    return { data: null, error: "Error al actualizar el seguimiento del paciente" }
  }
}

export async function deletePatientFollowUp(followUpId: number) {
  try {
    const supabase = createServerComponentClient<Database>({ cookies })

    // Soft delete - marcar como inactivo
    const { data, error } = await supabase
      .from("patient_follow_ups")
      .update({ is_active: false })
      .eq("id", followUpId)
      .select()
      .single()

    if (error) throw error

    // Revalidar todas las páginas de clientes
    revalidatePath("/dashboard/facturacion/clients")

    return { data, error: null }
  } catch (error) {
    console.error("Error deleting patient follow-up:", error)
    return { data: null, error: "Error al eliminar el seguimiento del paciente" }
  }
}

export async function getFollowUpStats(clientId: string) {
  try {
    const supabase = createServerComponentClient<Database>({ cookies })

    // Obtener estadísticas de seguimientos
    const { data: followUps } = await supabase
      .from("patient_follow_ups")
      .select("follow_up_date, follow_up_type")
      .eq("client_id", clientId)
      .eq("is_active", true)
      .order("follow_up_date", { ascending: false })

    if (!followUps) {
      return {
        data: {
          totalFollowUps: 0,
          lastFollowUp: null,
          mostCommonType: null,
          followUpsByMonth: [],
        },
        error: null,
      }
    }

    const totalFollowUps = followUps.length
    const lastFollowUp = followUps[0]?.follow_up_date || null

    // Tipo más común
    const typeCounts = followUps.reduce(
      (acc, fu) => {
        acc[fu.follow_up_type] = (acc[fu.follow_up_type] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const mostCommonType = Object.entries(typeCounts).reduce((a, b) => (typeCounts[a[0]] > typeCounts[b[0]] ? a : b))[0]

    // Seguimientos por mes (últimos 6 meses)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const recentFollowUps = followUps.filter((fu) => new Date(fu.follow_up_date) >= sixMonthsAgo)

    const followUpsByMonth = recentFollowUps.reduce(
      (acc, fu) => {
        const month = new Date(fu.follow_up_date).toISOString().slice(0, 7) // YYYY-MM
        acc[month] = (acc[month] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return {
      data: {
        totalFollowUps,
        lastFollowUp,
        mostCommonType: totalFollowUps > 0 ? mostCommonType : null,
        followUpsByMonth: Object.entries(followUpsByMonth).map(([month, count]) => ({
          month,
          count,
        })),
      },
      error: null,
    }
  } catch (error) {
    console.error("Error fetching follow-up stats:", error)
    return { data: null, error: "Error al obtener estadísticas de seguimiento" }
  }
}
