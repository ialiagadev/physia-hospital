"use server"

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import type { Database } from "@/types/supabase"

export async function clockInOut(formData: FormData) {
  const supabase = createServerComponentClient<Database>({ cookies })

  // Verificar autenticación
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "No autenticado" }
  }

  // Obtener datos del usuario
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("organization_id, name, role")
    .eq("id", user.id)
    .single()

  if (userError || !userData) {
    return { error: "Usuario no encontrado" }
  }

  const entryType = formData.get("entry_type") as string
  const targetUserId = (formData.get("target_user_id") as string) || user.id

  // Validar tipo de fichaje
  if (!entryType || !["entrada", "salida"].includes(entryType)) {
    return { error: "Tipo de fichaje inválido" }
  }

  // Verificar permisos: solo admins pueden fichar por otros usuarios
  if (targetUserId !== user.id && userData.role !== "admin") {
    return { error: "Sin permisos para fichar por otro usuario" }
  }

  // Si es admin fichando por otro usuario, verificar que esté en la misma organización
  if (targetUserId !== user.id) {
    const { data: targetUser, error: targetUserError } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", targetUserId)
      .single()

    if (targetUserError || !targetUser || targetUser.organization_id !== userData.organization_id) {
      return { error: "Usuario objetivo no válido" }
    }
  }

  // Obtener último fichaje para validación
  const { data: lastEntry } = await supabase
    .from("time_entries")
    .select("entry_type, timestamp")
    .eq("user_id", targetUserId)
    .order("timestamp", { ascending: false })
    .limit(1)
    .single()

  // Validar secuencia lógica (no fichar entrada tras entrada, etc.)
  if (lastEntry) {
    const lastEntryDate = new Date(lastEntry.timestamp).toDateString()
    const todayDate = new Date().toDateString()

    if (lastEntryDate === todayDate && lastEntry.entry_type === entryType) {
      const action = entryType === "entrada" ? "entrada" : "salida"
      return { error: `Ya se ha fichado ${action} hoy` }
    }
  }

  // Insertar fichaje
  const { data: newEntry, error: insertError } = await supabase
    .from("time_entries")
    .insert({
      user_id: targetUserId,
      organization_id: userData.organization_id,
      entry_type: entryType,
      timestamp: new Date().toISOString(),
      notes: targetUserId !== user.id ? `Fichado por admin: ${userData.name}` : null,
    })
    .select()
    .single()

  if (insertError) {
    console.error("Error inserting time entry:", insertError)
    return { error: "Error al registrar fichaje" }
  }

  revalidatePath("/fichaje")

  const actionText = entryType === "entrada" ? "Entrada" : "Salida"
  return {
    success: true,
    message: `${actionText} registrada correctamente`,
    data: newEntry,
  }
}

export async function getLastTimeEntry(userId?: string) {
  const supabase = createServerComponentClient<Database>({ cookies })

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "No autenticado" }
  }

  // Si no se especifica userId, usar el del usuario actual
  const targetUserId = userId || user.id

  // Verificar permisos si es diferente al usuario actual
  if (targetUserId !== user.id) {
    const { data: userData } = await supabase.from("users").select("role, organization_id").eq("id", user.id).single()

    if (!userData || userData.role !== "admin") {
      return { error: "Sin permisos" }
    }
  }

  const { data: lastEntry, error } = await supabase
    .from("time_entries_with_user")
    .select("*")
    .eq("user_id", targetUserId)
    .order("timestamp", { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== "PGRST116") {
    return { error: "Error al obtener último fichaje" }
  }

  return { lastEntry }
}

export async function getWorkSessions({
  userId,
  page = 1,
  pageSize = 20,
  startDate,
  endDate,
}: {
  userId?: string
  page?: number
  pageSize?: number
  startDate?: string
  endDate?: string
}) {
  const supabase = createServerComponentClient<Database>({ cookies })

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect("/login")
  }

  // Obtener datos del usuario actual
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("organization_id, role")
    .eq("id", user.id)
    .single()

  if (userError || !userData) {
    return { error: "Usuario no encontrado" }
  }

  const targetUserId = userId || user.id

  // Verificar permisos
  if (targetUserId !== user.id && userData.role !== "admin") {
    return { error: "Sin permisos" }
  }

  const offset = (page - 1) * pageSize

  // Construir consulta base
  let query = supabase
    .from("work_sessions_with_user")
    .select("*", { count: "exact" })
    .eq("organization_id", userData.organization_id)
    .order("work_date", { ascending: false })

  // Filtrar por usuario si se especifica
  if (targetUserId) {
    query = query.eq("user_id", targetUserId)
  }

  // Filtrar por fechas si se especifican
  if (startDate) {
    query = query.gte("work_date", startDate)
  }

  if (endDate) {
    query = query.lte("work_date", endDate)
  }

  // Aplicar paginación
  const { data: sessions, error, count } = await query.range(offset, offset + pageSize - 1)

  if (error) {
    return { error: "Error al cargar sesiones" }
  }

  return {
    sessions: sessions || [],
    totalRecords: count || 0,
    totalPages: Math.ceil((count || 0) / pageSize),
    currentPage: page,
  }
}

export async function getOrganizationUsers() {
  const supabase = createServerComponentClient<Database>({ cookies })

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "No autenticado" }
  }

  // Verificar que el usuario es admin
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("organization_id, role")
    .eq("id", user.id)
    .single()

  if (userError || !userData || userData.role !== "admin") {
    return { error: "Sin permisos de administrador" }
  }

  // Obtener usuarios de la organización
  const { data: users, error } = await supabase
    .from("users")
    .select("id, name, email, role, created_at")
    .eq("organization_id", userData.organization_id)
    .order("name")

  if (error) {
    return { error: "Error al cargar usuarios" }
  }

  return { users: users || [] }
}

export async function exportWorkSessionsCSV({
  userId,
  startDate,
  endDate,
}: {
  userId?: string
  startDate?: string
  endDate?: string
}) {
  const supabase = createServerComponentClient<Database>({ cookies })

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "No autenticado" }
  }

  // Obtener datos del usuario actual
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("organization_id, role")
    .eq("id", user.id)
    .single()

  if (userError || !userData) {
    return { error: "Usuario no encontrado" }
  }

  const targetUserId = userId || user.id

  // Verificar permisos
  if (targetUserId !== user.id && userData.role !== "admin") {
    return { error: "Sin permisos" }
  }

  // Construir consulta sin paginación
  let query = supabase
    .from("work_sessions_with_user")
    .select("*")
    .eq("organization_id", userData.organization_id)
    .order("work_date", { ascending: false })

  if (targetUserId) {
    query = query.eq("user_id", targetUserId)
  }

  if (startDate) {
    query = query.gte("work_date", startDate)
  }

  if (endDate) {
    query = query.lte("work_date", endDate)
  }

  const { data: sessions, error } = await query

  if (error) {
    return { error: "Error al exportar datos" }
  }

  // Generar CSV
  const headers = ["Fecha", "Usuario", "Email", "Entrada", "Salida", "Horas", "Estado"]

  const csvRows = [
    headers.join(","),
    ...(sessions || []).map((session) =>
      [
        session.work_date,
        `"${session.user_name}"`,
        session.user_email,
        session.local_clock_in ? new Date(session.local_clock_in).toLocaleTimeString("es-ES") : "",
        session.local_clock_out ? new Date(session.local_clock_out).toLocaleTimeString("es-ES") : "",
        session.total_hours?.toFixed(2) || "0",
        session.status,
      ].join(","),
    ),
  ]

  return { csvData: csvRows.join("\n") }
}
