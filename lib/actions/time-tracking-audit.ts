"use server"

import { createServerSupabaseClient } from "@/lib/supabase"
import { headers } from "next/headers"

interface AuditContext {
  reason?: string
  isAdminAction?: boolean
  details?: Record<string, any>
}

/**
 * Establece el contexto de auditoría para las operaciones de base de datos
 * Debe llamarse antes de realizar operaciones que disparen los triggers de auditoría
 */
export async function setAuditContext(userId: string, context: AuditContext = {}) {
  try {
    const supabase = createServerSupabaseClient()
    const headersList = headers()

    // Obtener información del request
    const ip = headersList.get("x-forwarded-for") || "unknown"
    const userAgent = headersList.get("user-agent") || "unknown"

    // Crear el contexto completo
    const fullContext = {
      ip_address: ip,
      user_agent: userAgent,
      timestamp: new Date().toISOString(),
      ...context,
    }

    // Llamar a la función RPC para establecer el contexto
    await supabase.rpc("set_request_context", {
      user_id: userId,
      context: fullContext,
    })

    return { success: true }
  } catch (error) {
    console.error("Error setting audit context:", error)
    return { success: false, error: "Failed to set audit context" }
  }
}

/**
 * Obtiene los registros de auditoría para time tracking
 */
export async function getTimeTrackingAuditLogs({
  page = 1,
  pageSize = 20,
  userId,
  tableName,
  startDate,
  endDate,
  action,
}: {
  page?: number
  pageSize?: number
  userId?: string
  tableName?: string
  startDate?: string
  endDate?: string
  action?: "INSERT" | "UPDATE" | "DELETE"
}) {
  try {
    const supabase = createServerSupabaseClient()
    const offset = (page - 1) * pageSize

    let query = supabase
      .from("time_tracking_audit_view")
      .select("*", { count: "exact" })
      .order("changed_at", { ascending: false })

    // Aplicar filtros si se proporcionan
    if (userId) {
      query = query.eq("changed_by", userId)
    }

    if (tableName) {
      query = query.eq("table_name", tableName)
    }

    if (action) {
      query = query.eq("action", action)
    }

    if (startDate) {
      query = query.gte("changed_at", startDate)
    }

    if (endDate) {
      query = query.lte("changed_at", endDate)
    }

    // Ejecutar la consulta con paginación
    const { data: logs, error, count } = await query.range(offset, offset + pageSize - 1)

    if (error) throw error

    return {
      logs: logs || [],
      totalRecords: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
      currentPage: page,
    }
  } catch (error) {
    console.error("Error fetching audit logs:", error)
    return {
      logs: [],
      totalRecords: 0,
      totalPages: 0,
      currentPage: 1,
      error: "Failed to fetch audit logs",
    }
  }
}

/**
 * Limpia los registros de auditoría expirados
 * Esta función debería ejecutarse periódicamente mediante un cron job
 */
export async function cleanupExpiredAuditRecords() {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase.rpc("cleanup_expired_audit_records")

    if (error) throw error

    return { success: true, deletedCount: data }
  } catch (error) {
    console.error("Error cleaning up expired audit records:", error)
    return { success: false, error: "Failed to clean up expired audit records" }
  }
}
