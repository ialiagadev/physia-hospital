import type { NextRequest } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import * as chrono from "chrono-node"
import { DateTime } from "luxon"

export const maxDuration = 60 // segundos (runtime)

type ChatMessage = { role: "user" | "assistant" | "system"; content: string }
type CustomKpi = { title: string; description: string }

const GEN_TIMEOUT_MS = Number(process.env.SQL_GEN_TIMEOUT_MS ?? 150000)
const SCHEMA_TIMEOUT_MS = Number(process.env.SQL_SCHEMA_TIMEOUT_MS ?? 80000)
const EXEC_TIMEOUT_MS = Number(process.env.SQL_EXEC_TIMEOUT_MS ?? 150000)
const TZ = "Europe/Madrid"

interface TimeWindow {
  start: string
  end: string
  label?: string
}

interface SupabaseResponse<T = any> {
  data: T | null
  error: {
    message: string
    details?: string
    hint?: string
    code?: string
  } | null
}

interface SchemaColumn {
  table_name: string
  column_name: string
  data_type: string
  ordinal_position: number
}

/* -------------------- Supabase admin -------------------- */
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error("Supabase env vars missing (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)")
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "public" },
  })
}

/* -------------------- Misc helpers -------------------- */
function lastUserMessage(messages: ChatMessage[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i].content
  }
  return ""
}

function hasRecentKpiContext(messages: ChatMessage[]): boolean {
  const lookback = 6
  for (let i = messages.length - 1; i >= 0 && i >= messages.length - lookback; i--) {
    const m = messages[i]
    if (m.role !== "assistant" || typeof m.content !== "string") continue
    const s = m.content.toLowerCase()
    if (
      s.includes("facturación del período") ||
      s.includes("ltv") ||
      s.includes("lifetime value") ||
      s.includes("valor de vida") ||
      s.includes("ingresos totales") ||
      s.includes("clientes facturados") ||
      s.includes("datos detallados")
    ) {
      return true
    }
  }
  return false
}

function shouldReasonWithoutSQL(messages: ChatMessage[], userQuery: string): boolean {
  const q = (userQuery || "").toLowerCase()
  const explainLike =
    /\b(explica|explícame|como has|cómo has|cómo lo|como lo|cómo calculaste|como calculaste|por qué|porque|qué significa|que significa|define|definición|interpreta|interpretación|metodolog)/i
  const asksForSql = /\b(ver consulta sql|muestra.*sql|enséñame.*sql|muéstrame.*sql)\b/i
  const referencesLtv = /\b(ltv|lifetime value|valor\s+de\s+vida)\b/i

  if (explainLike.test(q) || asksForSql.test(q)) return true
  if (referencesLtv.test(q) && hasRecentKpiContext(messages)) return true

  // short answers like "ok, ¿cuál sería el LTV?" right after we just computed it:
  if (referencesLtv.test(q) && /\b(ok|vale|bien)\b/.test(q) && hasRecentKpiContext(messages)) return true

  return false
}

function askedClarificationAlready(messages: ChatMessage[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role === "assistant" && typeof m.content === "string") {
      if (m.content.includes("CLARIFY_ONCE")) return true
    }
  }
  return false
}

function withTimeout<T>(promise: Promise<T>, ms: number, label = "operation"): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout: ${label} exceeded ${ms}ms`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer)
  })
}

// Guard: solo SELECT/WITH y sin múltiples statements
function isReadOnlySql(sql: string) {
  const s = sql.trim().replace(/;+\s*$/g, "")
  return /^\s*(select|with)\b/i.test(s) && !s.includes(";")
}

function asLower(o: any) {
  return Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k.toLowerCase(), v]))
}

function toNumberLike(v: any): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v)) return Number(v)
  return null
}

function eur(n: number): string {
  try {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n)
  } catch {
    return `${n.toFixed(2)} €`
  }
}

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "-"
  try {
    const date = new Date(d)
    if (isNaN(date.getTime())) return String(d)
    return date.toLocaleString("es-ES", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric" })
  } catch {
    return String(d)
  }
}

function fmtTime(t: any): string {
  if (!t) return "-"
  const s = typeof t === "string" ? t : ""
  const m = s.match(/^(\d{2}):(\d{2})(?::\d{2})?$/)
  if (m) return `${m[1]}:${m[2]}`
  try {
    const date = new Date(t)
    if (isNaN(date.getTime())) return String(t)
    return date.toLocaleTimeString("es-ES", { timeZone: TZ, hour: "2-digit", minute: "2-digit" })
  } catch {
    return String(t)
  }
}

function pickAny(o: any, keys: string[], def: any = null) {
  const low = asLower(o)
  for (const k of keys) if (low[k] !== undefined) return low[k]
  return def
}

function prettyList(vals: (string | null | undefined)[], max = 5) {
  const clean = vals
    .filter(Boolean)
    .map((v) => String(v))
    .slice(0, max)
  if (!clean.length) return "-"
  if (clean.length === 1) return clean[0]
  return clean.slice(0, -1).join(", ") + " y " + clean.slice(-1)
}

function findKey(obj: Record<string, any>, patterns: RegExp[]): string | null {
  const keys = Object.keys(obj)
  for (const p of patterns) {
    const k = keys.find((k) => p.test(k))
    if (k) return k
  }
  return null
}

// === INTENT CLASSIFIER ===
async function classifyIntent(userQuery: string) {
  const system = `
      Eres un router de intención. Devuelve SOLO JSON: {"action":"sql"|"reason"|"clarify","questions":["...","..."]}
      Elige:
      - "sql": si la respuesta requiere leer datos de la BBDD del usuario (citas, pacientes, facturas, KPIs, disponibilidad, etc.)
      - "reason": si basta con explicar, recomendar, definir, dar pasos o buenas prácticas sin consultar su BBDD.
      - "clarify": si faltan datos críticos (periodo, filtros clave, entidad concreta) para poder proceder.
      
      Si "clarify", incluye hasta 3 preguntas en "questions".
      `.trim()

  const prompt = `Consulta del usuario: "${userQuery}"\nResponde solo el JSON pedido.`

  const { text } = await generateText({
    model: openai(process.env.NEXT_PUBLIC_SQL_MODEL || "gpt-4o-mini"),
    system,
    prompt,
    temperature: 0.0,
    maxTokens: 200,
  })

  let s = text.trim()
  if (s.startsWith("```"))
    s = s
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```$/i, "")
      .trim()
  try {
    const obj = JSON.parse(s)
    if (obj?.action === "sql" || obj?.action === "reason" || obj?.action === "clarify") {
      obj.questions = Array.isArray(obj.questions) ? obj.questions.slice(0, 3) : []
      return obj
    }
  } catch {}

  // Fallback conservador: si menciona tablas/consultas, SQL; si no, razonamiento.
  return /\b(cita|calendario|paciente|cliente|factur|invoice|gasto|expense|ingreso|kpi|reporte|estad|cuántas|cuanto|listar|dime.*de la base)\b/i.test(
    userQuery,
  )
    ? { action: "sql", questions: [] }
    : { action: "reason", questions: [] }
}

// Detecta dominio por texto (para sugerencias en modo razonamiento)
function domainFromQuery(
  q: string,
): "appointments" | "finance" | "invoices" | "expenses" | "clients" | "professionals" | "generic" {
  const s = q.toLowerCase()
  if (/\b(ltv|lifetime value|valor\s+de\s+vida)\b/i.test(s)) return "finance"
  if (/(cita|agenda|calendario|hueco|disponibil)/.test(s)) return "appointments"
  if (/(kpi|ingreso|beneficio|margen|rentabil|financ)/.test(s)) return "finance"
  if (/(factur|invoice)/.test(s)) return "invoices"
  if (/(gasto|expense)/.test(s)) return "expenses"
  if (/(paciente|cliente|patients?)/.test(s)) return "clients"
  if (/(profesional|fisioterapeuta|doctor|terapeuta)/.test(s)) return "professionals"
  return "generic"
}

// === REASONING-ONLY ANSWER ===
async function generateReasoningAnswer(userQuery: string, domainHint: string) {
  const system = `
      Eres un asistente experto del sector salud. Responde de forma clara y accionable SIN acceder a la base de datos.
      Estructura:
      - 1- Contexto sobre lo pedido (breve).
      - 2- Respuesta/explicación concreta (pasos, recomendaciones, ejemplos).
      - 3- Consejos o próximos pasos (2-4 bullets).
      Escribe en español, directo y profesional.
      `.trim()

  const prompt = `
      Tema/dominio: ${domainHint}
      Pregunta del usuario: "${userQuery}"
      
      Da una respuesta útil sin inventar datos específicos de su base. Si pide métricas, explica cómo obtenerlas o qué mirar.
      `.trim()

  const { text } = await generateText({
    model: openai(process.env.NEXT_PUBLIC_SQL_MODEL || "gpt-4o-mini"),
    system,
    prompt,
    temperature: 0.3,
    maxTokens: 500,
  })

  // Sugerencias genéricas por dominio (reutilizamos las de SQL)
  const sugg = buildSuggestions(domainHint, "")
  return { text: text.trim(), suggestions: sugg }
}

/* -------------------- Detectores por dominio -------------------- */
function deriveAppointmentRows(rows: any[]): any[] {
  if (!Array.isArray(rows)) return []
  return rows.map((r) => {
    const o = asLower(r)
    // Try common name fields for the patient.
    const first = o["first_name"] || o["nombre"] || ""
    const last = o["last_name"] || o["apellidos"] || o["surname"] || o["apellido"] || ""
    const combined = [first, last].filter(Boolean).join(" ").trim()
    const patientName =
      o["client_full_name"] ||
      o["patient_full_name"] ||
      o["client_name"] ||
      o["patient_name"] ||
      combined ||
      o["name"] ||
      "-"

    // Also carry through possible service/location fields if present
    const service = o["service_name"] || o["service"] || o["servicio"] || undefined
    const location = o["location"] || o["ubicacion"] || o["room"] || undefined

    // Normalize keys for date/time where possible
    const date = o["date"] || o["start_date"] || o["fecha"] || o["day"]
    const start_time = o["start_time"] || o["start_at"]
    const end_time = o["end_time"] || o["end_at"]
    const status = o["status"] || o["estado"]

    return {
      ...r,
      // Add a presentation-friendly patient name field.
      patient_full_name: patientName,
      service_name: service ?? r["service_name"],
      location: location ?? r["location"],
      // Mirror normalized fields if source keys differ
      date: r["date"] ?? date,
      start_time: r["start_time"] ?? start_time,
      end_time: r["end_time"] ?? end_time,
      status: r["status"] ?? status,
    }
  })
}

function hasKey(o: any, keys: string[]) {
  const low = asLower(o || {})
  return keys.some((k) => low[k] !== undefined)
}

function looksLikeAppointments(sql: string, rows: any[]): boolean {
  if (/from\s+(v_appointments_enriched|appointments)\b/i.test(sql)) return true
  const r = rows?.[0]
  if (!r) return false
  const keys = Object.keys(r).map((k) => k.toLowerCase())
  return (
    keys.includes("date") ||
    keys.includes("start_time") ||
    keys.includes("end_time") ||
    keys.includes("professional_name")
  )
}

function looksLikeInvoices(sql: string, rows: any[]) {
  if (/from\s+invoices\b/i.test(sql)) return true
  const r = rows?.[0]
  if (!r) return false
  return hasKey(r, ["invoice_id", "invoice_number", "total_amount", "issue_date", "invoices_total_amount"])
}

function looksLikeExpenses(sql: string, rows: any[]) {
  if (/from\s+expenses\b/i.test(sql)) return true
  const r = rows?.[0]
  if (!r) return false
  return hasKey(r, ["expense_id", "amount", "expense_date", "expenses_total_amount"])
}

function looksLikeClients(sql: string, rows: any[]) {
  if (/from\s+clients\b/i.test(sql)) return true
  const r = rows?.[0]
  if (!r) return false
  return hasKey(r, ["client_id", "name", "email", "phone"]) && !looksLikeAppointments(sql, rows)
}

function looksLikeFollowUps(sql: string, rows: any[]) {
  if (/from\s+(patient_)?follow_ups\b/i.test(sql)) return true
  const r = rows?.[0]
  if (!r) return false
  return hasKey(r, ["follow_up_date", "follow_up_type", "recommendations", "next_appointment_note"])
}

function looksLikeAvailability(sql: string, rows: any[]) {
  if (/from\s+virtual_calendar_availability\b/i.test(sql)) return true
  const r = rows?.[0]
  if (!r) return false
  return hasKey(r, ["is_booked", "start_time", "end_time"]) || hasKey(r, ["start_at", "end_at"])
}

function looksLikeWaitlist(sql: string, rows: any[]) {
  if (/from\s+waiting_list\b/i.test(sql)) return true
  const r = rows?.[0]
  if (!r) return false
  return hasKey(r, ["preferred_date_start", "preferred_date_end", "client_id"])
}

function looksLikeProfessionals(sql: string, rows: any[]) {
  if (/from\s+professionals\b/i.test(sql)) return true
  const r = rows?.[0]
  if (!r) return false
  return hasKey(r, ["professional_name", "specialty", "appointments_count"])
}

function looksLikeFinance(sql: string, rows: any[]): boolean {
  // Si ya es invoices/expenses, lo tratamos como específicos
  if (/from\s+(invoices|expenses)\b/i.test(sql)) return false
  const r = rows?.[0]
  if (!r) return false
  const lowerObj: Record<string, any> = asLower(r)
  const kIngresos = findKey(lowerObj, [/^total_ingresos$/, /ingreso/, /revenue/])
  const kGastos = findKey(lowerObj, [/^total_gastos$/, /gasto/, /expense/])
  const kBenef = findKey(lowerObj, [/^beneficio(_neto)?$/, /profit/])
  return !!(kIngresos || kGastos || kBenef)
}

/* -------------------- NLG por dominio -------------------- */
function periodFromTimeWindow(timeWindow: TimeWindow | null): string | null {
  if (!timeWindow) return null
  return timeWindow.label || `${timeWindow.start} a ${timeWindow.end}`
}

function earliest(rows: any[], key: string): string | null {
  if (!Array.isArray(rows) || !key) return null

  const validDates = rows
  .map((r) => {
    const value = asLower(r)[key] as string | number | Date | null | undefined
    if (!value) return null
    const date = new Date(value)
    return isNaN(date.getTime()) ? null : date
  })
  .filter((d): d is Date => d !== null)
  .sort((a, b) => a.getTime() - b.getTime())


  const firstDate = validDates[0]
  return firstDate
    ? firstDate.toLocaleString("es-ES", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric" })
    : null
}

function earliestDateTime(rows: any[], kDate: string, kTime?: string): string | null {
  if (!Array.isArray(rows) || !kDate) return null

  const items = rows
  .map((r) => {
    const low = asLower(r)
    const d = low[kDate] as string | number | Date | null | undefined
    const t = kTime ? (low[kTime] as string | number | Date | null | undefined) : null

    if (!d) return null

    const iso = t ? `${d}T${String(t).slice(0, 8)}` : d
    const dt = new Date(iso)

    return isNaN(dt.getTime()) ? null : dt
  })

    .filter((dt): dt is Date => dt !== null)

  items.sort((a, b) => a.getTime() - b.getTime())
  const first = items[0]
  return first
    ? first.toLocaleString("es-ES", {
        timeZone: TZ,
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null
}

function buildCalendarAnswer(rows: any[]): string {
  if (!rows?.length) return "No hay citas para el período solicitado."
  const list = rows.map((r) => {
    const o: any = asLower(r)
    const paciente = o.name || o.patient_name || o.client_name || "-"
    const pro = o.professional_name || o.profesional || o.pro || null
    const dia = o.date || o.start_date || o.start_time || o.start_at || o.fecha
    const horaIni = o.start_time || o.start_at || null
    const horaFin = o.end_time || o.end_at || null
    const estado = o.status || o.estado || null
    const when =
      horaIni && horaFin
        ? `${fmtDate(dia)} ${fmtTime(horaIni)}–${fmtTime(horaFin)}`
        : horaIni
          ? `${fmtDate(dia)} ${fmtTime(horaIni)}`
          : fmtDate(dia)
    return `• ${when} — ${paciente}${pro ? ` (con ${pro})` : ""}${estado ? ` [${estado}]` : ""}`
  })
  return `Próximas citas:\n${list.slice(0, 20).join("\n")}${rows.length > 20 ? `\n…y ${rows.length - 20} más` : ""}`
}

function buildFinanceAnswer(rows: any[]): string {
  if (!rows || rows.length === 0) return "No hay datos financieros para el período solicitado."
  const r = rows[0] || {}
  const lowerObj = asLower(r)
  const kIngresos = findKey(lowerObj, [/^total_ingresos$/, /ingreso/, /revenue/])
  const kGastos = findKey(lowerObj, [/^total_gastos$/, /gasto/, /expense/])
  const kBenef = findKey(lowerObj, [/^beneficio(_neto)?$/, /profit/])
  const ingresos = kIngresos ? toNumberLike(lowerObj[kIngresos]) : null
  const gastos = kGastos ? toNumberLike(lowerObj[kGastos]) : null
  const benef = kBenef ? toNumberLike(lowerObj[kBenef]) : ingresos != null && gastos != null ? ingresos - gastos : null
  if (ingresos != null || gastos != null || benef != null) {
    const m = ingresos && benef != null && ingresos !== 0 ? (benef / ingresos) * 100 : null
    const partes = [
      ingresos != null ? `ingresos: ${eur(ingresos)}` : null,
      gastos != null ? `gastos: ${eur(gastos)}` : null,
      benef != null ? `beneficio neto: ${eur(benef)}${m != null ? ` (${m.toFixed(1)}% margen)` : ""}` : null,
    ].filter(Boolean)
    return `KPIs financieros del período:\n- ${partes.join("\n- ")}`
  }
  const lines = Object.entries(r)
    .slice(0, 12)
    .map(([k, v]) => {
      const num = toNumberLike(v)
      if (num != null && /(importe|amount|total|ingreso|gasto|beneficio|revenue|expense|net|gross|margen)/i.test(k))
        return `- ${k}: ${eur(num)}`
      return `- ${k}: ${String(v)}`
    })
  return `Resultados (primer registro):\n${lines.join("\n")}`
}

function buildInvoicesAnswer(rows: any[], timeWindow: TimeWindow | null): string {
  if (!rows?.length) return "No hay facturas en el período solicitado."
  const r0 = asLower(rows[0])
  const aggregated = "invoices_total_amount" in r0 || "invoices_count" in r0
  let total = 0,
    n = 0,
    base = 0,
    vat = 0,
    irpf = 0,
    disc = 0
  if (aggregated) {
    total = Number(pickAny(r0, ["invoices_total_amount", "total_amount"], 0)) || 0
    base = Number(pickAny(r0, ["invoices_base_amount"], 0)) || 0
    vat = Number(pickAny(r0, ["invoices_vat_amount"], 0)) || 0
    irpf = Number(pickAny(r0, ["invoices_irpf_amount"], 0)) || 0
    disc = Number(pickAny(r0, ["invoices_discount_amount"], 0)) || 0
    n = Number(pickAny(r0, ["invoices_count", "count"], rows.length))
  } else {
    for (const r of rows) {
      const low = asLower(r)
      total += Number(low["total_amount"] ?? 0)
      base += Number(low["base_amount"] ?? 0)
      vat += Number(low["vat_amount"] ?? 0)
      irpf += Number(low["irpf_amount"] ?? 0)
      disc += Number(low["discount_amount"] ?? 0)
      n++
    }
  }
  const periodo = periodFromTimeWindow(timeWindow)
  return `${periodo ? `Facturación del período ${periodo}` : "Facturación del período"}: ${eur(total)} en ${n} factura${
    n === 1 ? "" : "s"
  }${base || vat || irpf || disc ? `. Desglose: base ${eur(base)}, IVA ${eur(vat)}${irpf ? `, IRPF ${eur(irpf)}` : ""}${disc ? `, descuentos ${eur(disc)}` : "."}` : "."}`
}

function buildExpensesAnswer(rows: any[], timeWindow: TimeWindow | null): string {
  if (!rows?.length) return "No hay gastos en el período solicitado."
  const r0 = asLower(rows[0])
  const aggregated = "expenses_total_amount" in r0 || "expenses_count" in r0
  let total = 0,
    n = 0
  if (aggregated) {
    total = Number(pickAny(r0, ["expenses_total_amount", "total_amount"], 0)) || 0
    n = Number(pickAny(r0, ["expenses_count", "count"], rows.length))
  } else {
    for (const r of rows) {
      total += Number(asLower(r)["amount"] ?? 0)
      n++
    }
  }
  const periodo = periodFromTimeWindow(timeWindow)
  return `${periodo ? `Gasto del período ${periodo}` : "Gasto del período"}: ${eur(total)} en ${n} partida${n === 1 ? "" : "s"}.`
}

function buildClientsAnswer(rows: any[], timeWindow: TimeWindow | null): string {
  if (!rows?.length) return "No se encontraron pacientes en el período solicitado."
  const names = rows.map((r) => pickAny(r, ["client_name", "name"])).filter(Boolean) as string[]
  const n = new Set(names.map((n) => n?.toLowerCase())).size || rows.length
  const muestra = prettyList(names, 5)
  const periodo = periodFromTimeWindow(timeWindow)
  return `${periodo ? `Pacientes del período ${periodo}` : "Pacientes del período"}: ${n} en total. Ejemplos: ${muestra}.`
}

function buildFollowUpsAnswer(rows: any[], timeWindow: TimeWindow | null): string {
  if (!rows?.length) return "No hay seguimientos en el período solicitado."
  const tipos = rows.map((r) => pickAny(r, ["follow_up_type", "type"])).filter(Boolean) as string[]
  const n = rows.length
  const ultimo = earliest(rows, "follow_up_date")
  const periodo = periodFromTimeWindow(timeWindow)
  const tiposTxt = tipos.length ? ` Tipos frecuentes: ${prettyList(Array.from(new Set(tipos)), 4)}.` : ""
  return `${periodo ? `Seguimientos del período ${periodo}` : "Seguimientos del período"}: ${n} registro${
    n === 1 ? "" : "s"
  }.${tiposTxt}${ultimo ? ` Último registro: ${ultimo}.` : ""}`
}

function buildAvailabilityAnswer(rows: any[], timeWindow: TimeWindow | null): string {
  if (!rows?.length) return "No hay huecos libres en el período solicitado."
  const libres = rows.filter((r) => String(asLower(r)["is_booked"]) !== "true")
  const n = libres.length
  const first = earliestDateTime(libres, "start_time") || earliestDateTime(libres, "start_at")
  const periodo = periodFromTimeWindow(timeWindow)
  return `${periodo ? `Disponibilidad ${periodo}` : "Disponibilidad"}: ${n} hueco${n === 1 ? "" : "s"} libre${
    n === 1 ? "" : "s"
  }${first ? `, el primero: ${first}` : ""}.`
}

function buildWaitlistAnswer(rows: any[], timeWindow: TimeWindow | null): string {
  if (!rows?.length) return "No hay solicitudes en la lista de espera para el período solicitado."
  const n = rows.length
  const first = earliest(rows, "preferred_date_start")
  const names = rows.map((r) => pickAny(r, ["client_name", "name"])).filter(Boolean) as string[]
  return `Lista de espera: ${n} persona${n === 1 ? "" : "s"}${first ? `, primera fecha solicitada: ${first}` : ""}. Ejemplos: ${prettyList(names, 5)}.`
}

function buildProfessionalsAnswer(rows: any[], timeWindow: TimeWindow | null): string {
  if (!rows?.length) return "No hay profesionales en el resultado."
  const names = rows.map((r) => pickAny(r, ["professional_name", "name"])).filter(Boolean) as string[]
  const counts = rows.map((r) => Number(pickAny(r, ["appointments_count", "count"], 0)) || 0)
  const top = names.slice(0, 5).map((n, i) => (counts[i] ? `${n} (${counts[i]})` : n))
  return `Profesionales: ${new Set(names.map((n) => n?.toLowerCase())).size || names.length} en total. Top: ${prettyList(top, 5)}.`
}

function buildGenericNarrative(rows: any[], timeWindow: TimeWindow | null): string {
  if (!rows?.length) return "No hay datos para el período solicitado."
  const n = rows.length
  const keys = Object.keys(rows[0])
  const periodo = periodFromTimeWindow(timeWindow)
  const nums = keys.filter((k) => typeof rows[0][k] === "number")
  const texts = keys.filter((k) => typeof rows[0][k] !== "number")
  const examples = texts.length
    ? rows
        .slice(0, 5)
        .map((r) => String(r[texts[0]] ?? "")) // muestra 1ª columna de texto
        .filter(Boolean)
    : []
  const parts: string[] = []
  parts.push(`${periodo ? `Período ${periodo}` : "Período consultado"}: ${n} registro${n === 1 ? "" : "s"}.`)
  if (examples.length) parts.push(`Ejemplos (${texts[0]}): ${prettyList(examples, 5)}.`)
  if (nums.length) {
    const sums = nums.slice(0, 4).map((k) => {
      const s = rows.reduce((acc, r) => acc + (Number(r[k]) || 0), 0)
      return `${k}: ${Number.isFinite(s) ? eur(s) : String(s)}`
    })
    parts.push(`Totales aproximados → ${sums.join(", ")}.`)
  }
  return parts.join(" ")
}

/* -------------------- Time parsing -------------------- */
function startOfDay(d: DateTime) {
  return d.startOf("day")
}
function nextDay(d: DateTime) {
  return d.plus({ days: 1 }).startOf("day")
}
function parseTimeWindow(text: string): TimeWindow | null {
  const q = text.toLowerCase().normalize("NFKD")
  const now = DateTime.now().setZone(TZ)

  const mUltimos = q.match(/ultim(?:o|ó)s?\s+(\d+)\s+d[ií]as?/i)
  if (mUltimos) {
    const n = Math.max(1, Number.parseInt(mUltimos[1], 10))
    const end = startOfDay(now)
    const start = end.minus({ days: n })
    return { start: start.toISODate()!, end: end.toISODate()!, label: `últimos ${n} días` }
  }
  if (/\bhoy\b/.test(q)) {
    const start = startOfDay(now)
    const end = nextDay(start)
    return { start: start.toISODate()!, end: end.toISODate()!, label: "hoy" }
  }
  if (/\bayer\b/.test(q)) {
    const end = startOfDay(now)
    const start = end.minus({ days: 1 })
    return { start: start.toISODate()!, end: end.toISODate()!, label: "ayer" }
  }
  if (/\b(última semana|semana pasada)\b/i.test(q)) {
    const start = now.minus({ weeks: 1 }).startOf("week")
    const end = now.startOf("week")
    return { start: start.toISODate()!, end: end.toISODate()!, label: "semana pasada" }
  }
  if (/\b(últimos?\s*7\s*d[ií]as|ultima semana|última semana)\b/i.test(q)) {
    const end = startOfDay(now)
    const start = end.minus({ days: 7 })
    return { start: start.toISODate()!, end: end.toISODate()!, label: "últimos 7 días" }
  }
  if (/\beste mes\b/i.test(q)) {
    const start = now.startOf("month")
    const end = start.plus({ months: 1 })
    return { start: start.toISODate()!, end: end.toISODate()!, label: "este mes" }
  }
  if (/\b(último mes|ultimo mes|mes pasado)\b/i.test(q)) {
    const end = now.startOf("month")
    const start = end.minus({ months: 1 })
    return { start: start.toISODate()!, end: end.toISODate()!, label: "mes pasado" }
  }
  if (/\btrimestre actual\b/i.test(q)) {
    const qStartMonth = Math.floor((now.month - 1) / 3) * 3 + 1
    const start = DateTime.fromObject({ year: now.year, month: qStartMonth, day: 1 }, { zone: TZ })
    const end = start.plus({ months: 3 })
    return { start: start.toISODate()!, end: end.toISODate()!, label: "trimestre actual" }
  }
  if (/\btrimestre pasado\b/i.test(q)) {
    const qStartMonth = Math.floor((now.month - 1) / 3) * 3 + 1
    const curStart = DateTime.fromObject({ year: now.year, month: qStartMonth, day: 1 }, { zone: TZ })
    const start = curStart.minus({ months: 3 })
    const end = curStart
    return { start: start.toISODate()!, end: end.toISODate()!, label: "trimestre pasado" }
  }
  if (/\b(año en curso|este año)\b/i.test(q)) {
    const start = now.startOf("year")
    const end = start.plus({ years: 1 })
    return { start: start.toISODate()!, end: end.toISODate()!, label: "año en curso" }
  }
  if (/\baño pasado\b/i.test(q)) {
    const end = DateTime.fromObject({ year: now.year, month: 1, day: 1 }, { zone: TZ })
    const start = end.minus({ years: 1 })
    return { start: start.toISODate()!, end: end.toISODate()!, label: "año pasado" }
  }
  const res = chrono.es.parse(text, now.toJSDate())
  if (res?.length) {
    const r = res[0]
    const s = r.start ? DateTime.fromJSDate(r.start.date()).setZone(TZ).startOf("day") : null
    const e = r.end ? DateTime.fromJSDate(r.end.date()).setZone(TZ).startOf("day") : null
    if (s && e) return { start: s.toISODate()!, end: e.toISODate()!, label: "intervalo detectado" }
    if (s) return { start: s.toISODate()!, end: nextDay(s).toISODate()!, label: "día detectado" }
  }

  // Mes explícito en español: "mes de julio (de 2025)" o "julio 2025"
  const monthMap: Record<string, number> = {
    enero: 1,
    febrero: 2,
    marzo: 3,
    abril: 4,
    mayo: 5,
    junio: 6,
    julio: 7,
    agosto: 8,
    septiembre: 9,
    setiembre: 9,
    octubre: 10,
    noviembre: 11,
    diciembre: 12,
  }
  const m1 = q.match(/\bmes\s+de\s+([a-záéíóú]+)(?:\s+de\s+(\d{4}))?\b/i) || q.match(/\b([a-záéíóú]+)\s+(\d{4})\b/i)
  if (m1) {
    const nameRaw = m1[1] || ""
    const name = nameRaw.normalize("NFKD").replace(/[^\w]/g, "").toLowerCase()
    const yy = m1[2] ? Number.parseInt(m1[2], 10) : DateTime.now().setZone(TZ).year
    const mm = monthMap[name]
    if (mm) {
      const start = DateTime.fromObject({ year: yy, month: mm, day: 1 }, { zone: TZ })
      const end = start.plus({ months: 1 })
      return { start: start.toISODate()!, end: end.toISODate()!, label: `${nameRaw} ${yy}` }
    }
  }

  return null
}

/* -------------------- Finanzas: pistas para el LLM -------------------- */
const FINANCE_DOMAIN_HINT = `
  Guía financiera:
  - invoices: total_amount (no 'amount'), base_amount, vat_amount, irpf_amount, discount_amount; fecha: issue_date.
  - expenses: amount; fecha: expense_date.
  - Si unes ingresos y gastos, calcula por separado en CTEs y combina después.
  - Siempre filtra por organization_id.
  - LTV (Lifetime Value) en un periodo: usa invoices filtradas por issue_date dentro del periodo y organization_id.
    - Fórmula pragmática: ltv_eur = SUM(total_amount) / COUNT(DISTINCT client_id).
    - Excluye facturas 'void'/'draft'. Opcional: limita a 'paid' si hay estado disponible.
    - Devuelve también métricas de apoyo: total_clients (COUNT DISTINCT), total_net_revenue (SUM total_amount).
  `.trim()

function formatCustomKpisForPrompt(kpis?: CustomKpi[]): string {
  if (!kpis || kpis.length === 0) return ""
  const kpiStrings = kpis.map((kpi) => `- Título: ${kpi.title}\n  Descripción: ${kpi.description}`).join("\n")

  return `\nKPIs Personalizados del Usuario (contexto adicional):\n${kpiStrings}\nUsa estas definiciones para responder a preguntas sobre estos KPIs.`
}

/* -------------------- Model I/O helpers -------------------- */
async function generateSqlJSON({
  modelName,
  system,
  prompt,
}: {
  modelName: string
  system: string
  prompt: string
}) {
  const { text } = await withTimeout(
    generateText({
      model: openai(modelName),
      system,
      prompt,
      temperature: 0.1,
      maxTokens: 1024,
    }),
    GEN_TIMEOUT_MS,
    "AI SQL generation",
  )
  return text
}

function parseModelJson(text: string): { sql: string; shortSummary?: string; displayColumns?: string[] } | null {
  let s = text.trim()
  if (s.startsWith("```")) {
    s = s
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```$/i, "")
      .trim()
  }
  try {
    const obj = JSON.parse(s)
    return obj
  } catch {
    const start = s.indexOf("{")
    if (start === -1) return null
    let depth = 0
    for (let i = start; i < s.length; i++) {
      if (s[i] === "{") depth++
      else if (s[i] === "}") {
        depth--
        if (depth === 0) {
          try {
            return JSON.parse(s.slice(start, i + 1))
          } catch {}
        }
      }
    }
    return null
  }
}

/* -------- Reintento cuando hay error de SQL con feedback -------- */
async function regenerateAfterError({
  modelName,
  userQuery,
  organizationId,
  schemaInfo,
  dateColsHint,
  timeWindow,
  failedSql,
  errorMessage,
}: {
  modelName: string
  userQuery: string
  organizationId: string
  schemaInfo: string
  dateColsHint: string
  timeWindow: TimeWindow | null
  failedSql: string
  errorMessage: string
}): Promise<{ sql: string; shortSummary?: string; displayColumns?: string[] } | null> {
  const timeWindowHint = timeWindow
    ? `
Contexto temporal (interpretado por backend):
- timeWindow.start (inclusive): ${timeWindow.start}
- timeWindow.end   (exclusivo): ${timeWindow.end}
Instrucciones:
- Aplica timeWindow en la columna de fecha adecuada (issue_date, expense_date, date/start_time).
- Si DATE: col >= DATE '${timeWindow.start}' AND col < DATE '${timeWindow.end}'.
- Si TIMESTAMP, compara por día local Europe/Madrid (AT TIME ZONE).
`.trim()
    : ""

  const systemRetry = `
Eres un experto PostgreSQL. Repara la consulta fallida usando el esquema real y las pistas.
Reglas:
- SOLO SELECT/WITH (lectura), sin ';'.
- Incluye SIEMPRE organization_id = '${organizationId}'.
- Responde JSON válido: {"sql":"...","shortSummary":"...","displayColumns":[...]}.
- Evita palabras reservadas en CTE/alias.
- Ordena por fecha/hora asc y usa LIMIT 200 si no hay límites explícitos.
- ${FINANCE_DOMAIN_HINT}
${timeWindowHint}
${dateColsHint ? `\n${dateColsHint}\n` : ""}
Esquema (public):
${schemaInfo}
  `.trim()

  const promptRetry = `
La consulta generada falló y debes corregirla.

Petición del usuario:
"${userQuery}"

Consulta fallida:
${failedSql}

Error de la BD:
${errorMessage}

Devuelve SOLO JSON con la consulta corregida ("sql"), "shortSummary" y "displayColumns" (hasta 6).
  `.trim()

  try {
    const retryText = await generateSqlJSON({ modelName, system: systemRetry, prompt: promptRetry })
    return parseModelJson(retryText)
  } catch (e) {
    console.error("[AI] Retry generation failed:", e)
    return null
  }
}

/* -------------------- Clarificación previa (hasta 3 preguntas) -------------------- */
async function askForClarification(userQuery: string, timeWindow: TimeWindow | null, schemaInfo: string) {
  // Si ya hay periodo o la petición es muy específica, no preguntamos
  const hasPeriod = !!timeWindow
  const looksSpecific = /\b(hoy|mañana|ayer|mes|semana|trimestre|año|entre\s+\d{1,2}\/\d{1,2})\b/i.test(userQuery)
  if (hasPeriod || looksSpecific) return null

  const system = `
Eres un analista de datos. Si falta periodo, filtros o agrupaciones, formula HASTA 3 preguntas cortas y concretas.
Responde SOLO JSON: {"needClarification": true|false, "questions": ["...", "...", "..."]}.
`.trim()

  const prompt = `
Usuario: "${userQuery}"
Periodo detectado: ${timeWindow ? JSON.stringify(timeWindow) : "NINGUNO"}
Notas de esquema (tamaño): ${schemaInfo.length}

Reglas:
- Prioriza preguntas sobre: periodo, filtros (profesional/paciente/estado), y formato (lista, resumen, KPIs, top-N).
- Máximo 3 preguntas.
`.trim()

  const { text } = await generateText({
    model: openai(process.env.NEXT_PUBLIC_SQL_MODEL || "gpt-4o"),
    system,
    prompt,
    temperature: 0.1,
    maxTokens: 300,
  })

  let s = text.trim()
  if (s.startsWith("```"))
    s = s
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```$/i, "")
      .trim()
  try {
    const obj = JSON.parse(s)
    if (obj?.needClarification && Array.isArray(obj?.questions) && obj.questions.length) return obj
  } catch {}
  return null
}

/* -------------------- Contexto y Sugerencias -------------------- */
function buildContextLine(userQuery: string, sql: string, timeWindow: TimeWindow | null, orgId: string) {
  const periodo = periodFromTimeWindow(timeWindow)
  const tables =
    Array.from(new Set(Array.from(sql.matchAll(/from\s+([a-zA-Z0-9_.]+)/gi)).map((m) => m[1]))).join(", ") || "consulta"
  return `Has pedido: "${userQuery}". He generado una consulta sobre ${tables} para la organización ${orgId}${periodo ? `, acotada a ${periodo}` : ""}.`
}

function buildSuggestions(domain: string, sql: string): string[] {
  const sug: string[] = []
  if (domain === "finance" || domain === "invoices") {
    sug.push("Compara con el período anterior para ver tendencia de ingresos, gastos y margen.")
    sug.push("Explora top 5 por profesional o por servicio para detectar palancas de crecimiento.")
    sug.push("Separa facturas pagadas vs. pendientes para revisar cobros.")
  } else if (domain === "appointments") {
    sug.push("Mira distribución por profesional o franjas horarias para optimizar la agenda.")
    sug.push("Analiza no-shows y cancelaciones respecto a la semana anterior.")
  } else if (domain === "clients") {
    sug.push("Separa pacientes nuevos vs. recurrentes y su ticket medio.")
  } else if (domain === "availability") {
    sug.push("Propón huecos alternativos cercanos cuando no haya disponibilidad exacta.")
  } else if (domain === "waitlist") {
    sug.push("Contacta automáticamente a los primeros cuando se libere un hueco.")
  } else if (domain === "followups") {
    sug.push("Prioriza seguimientos atrasados y crea recordatorios.")
  } else {
    sug.push("Profundiza con un desglose por día/semana o por categoría.")
  }
  if (/from\s+invoices\b/i.test(sql) && /\bamount\b/i.test(sql) && !/\btotal_amount\b/i.test(sql)) {
    sug.push("En facturas usa total_amount (no amount).")
  }
  return sug
}

/* ================================================================ */
/* =========================  HANDLER  ============================ */
/* ================================================================ */
export async function POST(req: NextRequest, { params }: { params: { agentId: string } }) {
  try {
    const { powerupId, messages, organizationId, customKpis } = (await req.json()) as {
      powerupId: string
      messages: ChatMessage[]
      organizationId?: string
      customKpis?: CustomKpi[]
    }

    if (!powerupId || !Array.isArray(messages) || messages.length === 0 || !organizationId) {
      return new Response(JSON.stringify({ error: "Parámetros inválidos o falta organizationId" }), { status: 400 })
    }

    const supabase = getSupabaseAdmin()

  /* -------- 1) Esquema -------- */
let schemaInfo = "";
try {
  const response = (await withTimeout(
    Promise.resolve(
      supabase.rpc("get_schema_info")
    ) as Promise<SupabaseResponse<string>>,
    SCHEMA_TIMEOUT_MS,
    "get_schema_info",
  )) as SupabaseResponse<string>;

  if (response.error) throw response.error;
  schemaInfo = response.data || "";
} catch (e) {
  console.warn("[SCHEMA] get_schema_info RPC failed, falling back to information_schema:", e);

  const response = (await withTimeout(
    Promise.resolve(
      supabase
        .from("information_schema.columns")
        .select("table_name,column_name,data_type,ordinal_position")
        .eq("table_schema", "public")
        .limit(2000)
    ) as Promise<SupabaseResponse<SchemaColumn[]>>,
    SCHEMA_TIMEOUT_MS,
    "information_schema.columns",
  )) as SupabaseResponse<SchemaColumn[]>;

  if (response.data?.length) {
    const byTable: Record<string, SchemaColumn[]> = {};
    response.data.forEach((c) => {
      (byTable[c.table_name] ||= []).push(c);
    });
    schemaInfo = Object.entries(byTable)
      .map(([t, arr]) => {
        const sorted = arr.sort((a, b) => a.ordinal_position - b.ordinal_position);
        return `${t}: ${sorted.map((c) => `${c.column_name} (${c.data_type})`).join(", ")}`;
      })
      .join("\n");
  }
}

    if (!schemaInfo) {
      return new Response(JSON.stringify({ error: "No se pudo leer el esquema de la base de datos." }), { status: 500 })
    }
// Columnas de fecha por tabla (pista extra)
let dateColsHint = "";
try {
  type DateCol = Pick<SchemaColumn, "table_name" | "column_name" | "data_type">;

  const response = (await withTimeout(
    Promise.resolve(
      supabase
        .from("information_schema.columns")
        .select("table_name,column_name,data_type")
        .eq("table_schema", "public")
        .in("data_type", [
          "date",
          "timestamp without time zone",
          "timestamp with time zone",
        ])
        .limit(2000)
        .returns<DateCol[]>()
    ) as Promise<SupabaseResponse<DateCol[]>>,
    SCHEMA_TIMEOUT_MS,
    "information_schema.date_cols",
  )) as SupabaseResponse<DateCol[]>;

  if (response.data && response.data.length) {
    const map: Record<string, string[]> = {};
    response.data.forEach((c) => {
      map[c.table_name] = map[c.table_name] || [];
      map[c.table_name].push(`${c.column_name} (${c.data_type})`);
    });
    dateColsHint =
      "Columnas de fecha por tabla:\n" +
      Object.entries(map)
        .map(([t, cols]) => `- ${t}: ${cols.join(", ")}`)
        .join("\n");
  }
} catch {}

const userQuery = lastUserMessage(messages);
const timeWindow = parseTimeWindow(userQuery);

    // 1.5) Aclaración previa (solo una vez por conversación)
    let clar: any = null
    const alreadyAsked = askedClarificationAlready(messages)

    if (!alreadyAsked) {
      clar = await askForClarification(userQuery, timeWindow, schemaInfo)
      if (clar?.needClarification) {
        const q = clar.questions.slice(0, 3)
        const text =
          `Para afinar y darte justo lo que necesitas, ¿me confirmas?\n` +
          `1) ${q[0] || ""}\n` +
          (q[1] ? `2) ${q[1]}\n` : "") +
          (q[2] ? `3) ${q[2]}\n` : "") +
          `Responde en una sola frase si quieres.` +
          `\nCLARIFY_ONCE` // marcador invisible para no repetir

        return new Response(JSON.stringify({ text, clarify: true, questions: q }), { status: 200 })
      }
    }
    // si ya preguntamos, seguimos sin volver a pedir aclaración

    // 1.6) Si la petición es de explicación/definición o un follow-up que no requiere datos nuevos, responde sin SQL
    if (shouldReasonWithoutSQL(messages, userQuery)) {
      const domain = domainFromQuery(userQuery)
      const { text, suggestions } = await generateReasoningAnswer(userQuery, domain)
      return new Response(
        JSON.stringify({
          text,
          rows: [],
          rowCount: 0,
          columns: [],
          sql: null,
          suggestions,
          clarify: false,
        }),
        { status: 200 },
      )
    }

    // 1. Clasificar la intención (¿SQL, razonamiento o aclarar?)
    const intent = await classifyIntent(userQuery)

    // Si falta contexto crítico, pide aclaración (usando el mismo formato que ya soporta el cliente)
    if (intent.action === "clarify" && intent.questions?.length && !askedClarificationAlready(messages)) {
      const q = intent.questions
      const text =
        `Para afinar y darte justo lo que necesitas, ¿me confirmas?\n` +
        `1) ${q[0] || ""}\n` +
        (q[1] ? `2) ${q[1]}\n` : "") +
        (q[2] ? `3) ${q[2]}\n` : "") +
        `Responde en una sola frase si quieres.` +
        `\nCLARIFY_ONCE`

      return new Response(JSON.stringify({ text, clarify: true, questions: q }), { status: 200 })
    }

    // 2. Si NO hace falta SQL, genera respuesta por razonamiento
    if (intent.action === "reason") {
      const domain = domainFromQuery(userQuery)
      const { text, suggestions } = await generateReasoningAnswer(userQuery, domain)
      return new Response(
        JSON.stringify({
          text,
          rows: [],
          rowCount: 0,
          columns: [],
          sql: null,
          suggestions,
          clarify: false,
        }),
        { status: 200 },
      )
    }

    // 3. Si es SQL, continúa con el flujo actual…

    /* -------- 2) Prompt del modelo (SQL) -------- */
    const timeWindowHint = timeWindow
      ? `
Contexto temporal (interpretado por backend):
- timeWindow.start (inclusive): ${timeWindow.start}
- timeWindow.end   (exclusivo): ${timeWindow.end}
Instrucciones:
- Si existe timeWindow, aplícalo en las tablas relevantes usando la columna de fecha más adecuada.
- Si la columna es DATE usa: col >= DATE '${timeWindow.start}' AND col < DATE '${timeWindow.end}'.
- Si la columna es TIMESTAMP, compara por el día local Europe/Madrid (AT TIME ZONE).
`.trim()
      : ""

    const customKpiHint = formatCustomKpisForPrompt(customKpis)

    const system = `
Eres un experto analista de datos y programador de SQL (PostgreSQL).
Reglas:
- Genera una única consulta de solo lectura (SELECT/WITH), sin punto y coma.
- Filtra SIEMPRE por \`organization_id = '${organizationId}'\`.
- Puedes usar CTEs (WITH).
- Evita nombres de CTE/alias que sean palabras reservadas (update, delete, create, drop, alter, grant, revoke, comment, vacuum, analyze).
- Ordena por fecha/hora ascendente y aplica LIMIT 200 si el usuario no especifica límites.
- Para calendario usa por defecto \`appointments\` (o \`v_appointments_enriched\` si existe) y une con \`clients\`/\`professionals\` si piden nombres.
- ${FINANCE_DOMAIN_HINT}
${customKpiHint}
${timeWindowHint}
${dateColsHint ? `\n${dateColsHint}\n` : ""}
Esquema (public):
${schemaInfo}

Devuelve SOLO JSON con:
{
  "sql": "…",
  "shortSummary": "…",
  "displayColumns": ["col1","col2","col3","col4","col5","col6"] // opcional, hasta 6 columnas del resultado, prioriza las más útiles
}
`.trim()

    const prompt = `Petición del usuario: "${userQuery}"\nEntrega solo el JSON indicado.`

    let modelResponse: string
    try {
      modelResponse = await generateSqlJSON({
        modelName: process.env.NEXT_PUBLIC_SQL_MODEL || "gpt-4o",
        system,
        prompt,
      })
    } catch (e) {
      console.warn("[AI] primary model failed, falling back to gpt-4o-mini:", e)
      modelResponse = await generateSqlJSON({
        modelName: "gpt-4o-mini",
        system,
        prompt,
      })
    }

    const firstObj = parseModelJson(modelResponse)
    if (!firstObj || typeof firstObj.sql !== "string") {
      console.error("[AI] Failed to parse JSON from model:", modelResponse)
      return new Response(
        JSON.stringify({ text: "La IA no pudo generar una consulta válida. Intenta ser más específico." }),
        { status: 200 },
      )
    }

    let sqlCandidate = firstObj.sql.trim().replace(/;+\s*$/g, "")
    let explanation = (firstObj.shortSummary || "").trim()
    let displayColumns: string[] = Array.isArray(firstObj.displayColumns) ? firstObj.displayColumns.slice(0, 6) : []

    console.log("[AI->SQL] candidate:", sqlCandidate)

    if (!isReadOnlySql(sqlCandidate)) {
      return new Response(
        JSON.stringify({ text: "Error de seguridad: La consulta generada no es de solo lectura.", sql: sqlCandidate }),
        { status: 200 },
      )
    }
/* -------- 3) Ejecutar SQL -------- */
const execOnce = async (sql: string): Promise<SupabaseResponse<any[]>> => {
    try {
      const result = (await withTimeout(
        Promise.resolve(
          supabase
            .rpc("execute_sql", { query: sql })
            .returns<any[]>() // tipa el array de filas
        ) as Promise<SupabaseResponse<any[]>>,
        EXEC_TIMEOUT_MS,
        "execute_sql",
      )) as SupabaseResponse<any[]>;
  
      return result;
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : String(error),
          details: "SQL execution failed",
        },
      };
    }
  };
  
  let response = await execOnce(sqlCandidate);
  let rows = response.data;
  let execError = response.error;
  
    // Reintento inteligente en errores comunes
    if (
      execError &&
      /does not exist|operator does not exist|column .* does not exist|type .* does not exist/i.test(
        execError.message || "",
      )
    ) {
      const retryObj = await regenerateAfterError({
        modelName: process.env.NEXT_PUBLIC_SQL_MODEL || "gpt-4o",
        userQuery,
        organizationId,
        schemaInfo,
        dateColsHint,
        timeWindow,
        failedSql: sqlCandidate,
        errorMessage: String(execError?.message || execError),
      })
      if (retryObj?.sql) {
        const fixed = retryObj.sql.trim().replace(/;+\s*$/g, "")
        if (isReadOnlySql(fixed)) {
          sqlCandidate = fixed
          explanation = (retryObj.shortSummary || explanation).trim()
          displayColumns = Array.isArray(retryObj.displayColumns) ? retryObj.displayColumns.slice(0, 6) : displayColumns
          response = await execOnce(sqlCandidate)
          rows = response.data
          execError = response.error
        }
      }
    }

    if (execError) {
      console.error("[SQL] Execution error:", execError)
      return new Response(
        JSON.stringify({ text: `Error al ejecutar la consulta: ${execError.message}`, sql: sqlCandidate }),
        { status: 200 },
      )
    }

    const arr = (rows as any[]) || []
    const rowCount = Array.isArray(arr) ? arr.length : 0

    /* -------- 4) Humanización por dominio -------- */
    let domain = "generic"
    let summary = ""
    if (looksLikeFinance(sqlCandidate, arr)) {
      domain = "finance"
      summary = buildFinanceAnswer(arr)
    } else if (looksLikeInvoices(sqlCandidate, arr)) {
      domain = "invoices"
      summary = buildInvoicesAnswer(arr, timeWindow)
    } else if (looksLikeExpenses(sqlCandidate, arr)) {
      domain = "expenses"
      summary = buildExpensesAnswer(arr, timeWindow)
    } else if (looksLikeAppointments(sqlCandidate, arr)) {
      domain = "appointments"
      summary = buildCalendarAnswer(arr)
    } else if (looksLikeAvailability(sqlCandidate, arr)) {
      domain = "availability"
      summary = buildAvailabilityAnswer(arr, timeWindow)
    } else if (looksLikeWaitlist(sqlCandidate, arr)) {
      domain = "waitlist"
      summary = buildWaitlistAnswer(arr, timeWindow)
    } else if (looksLikeFollowUps(sqlCandidate, arr)) {
      domain = "followups"
      summary = buildFollowUpsAnswer(arr, timeWindow)
    } else if (looksLikeClients(sqlCandidate, arr)) {
      domain = "clients"
      summary = buildClientsAnswer(arr, timeWindow)
    } else if (looksLikeProfessionals(sqlCandidate, arr)) {
      domain = "professionals"
      summary = buildProfessionalsAnswer(arr, timeWindow)
    } else {
      summary = buildGenericNarrative(arr, timeWindow)
      domain = "generic"
    }

    /* -------- 5) Elegir ≤6 columnas para la tabla -------- */
    function inferCols(rows: any[], domain: string): string[] {
      if (!rows?.length) return []
      const keys = Object.keys(rows[0])
      if (displayColumns?.length) return keys.filter((k) => displayColumns.includes(k)).slice(0, 6)
      const preferByDomain: Record<string, string[]> = {
        finance: [
          "period_start",
          "period_end",
          "invoices_count",
          "invoices_total_amount",
          "expenses_total_amount",
          "net_result",
          "unique_clients_billed",
          "avg_invoice_total_amount",
        ],
        invoices: ["issue_date", "invoice_number", "client_name", "total_amount", "base_amount", "vat_amount"],
        expenses: ["expense_date", "category", "amount", "description", "status", "professional_name"],
        appointments: [
          "date",
          "start_time",
          "end_time",
          "patient_full_name",
          "client_full_name",
          "client_name",
          "patient_name",
          "name",
          "service_name",
          "status",
          "location",
          "professional_name",
        ],
        clients: ["id", "name", "email", "phone", "last_interaction_at", "status"],
      }
      const pref = preferByDomain[domain] || []
      const cols = pref.filter((c) => keys.includes(c))
      if (cols.length) return cols.slice(0, 6)
      return keys.slice(0, Math.min(6, keys.length))
    }
    let chosenCols = inferCols(arr, domain)
    if (domain === "appointments") {
      // Drop ID-like columns for calendar context
      chosenCols = chosenCols.filter((c) => !/^(.+_)?id$/i.test(c) && !/(^|_)id(_|$)/i.test(c)).slice(0, 6)
    }

    /* -------- 6) Construir salida: Contexto → Resumen → Sugerencias -------- */
    // If appointments, derive patient-focused rows
    let finalRows = arr
    if (domain === "appointments") {
      finalRows = deriveAppointmentRows(arr)
    }

    // Re-infer columns from finalRows and apply appointment-specific filtering
    chosenCols = inferCols(finalRows, domain)
    if (domain === "appointments") {
      chosenCols = chosenCols.filter((c) => !/^(.+_)?id$/i.test(c) && !/(^|_)id(_|$)/i.test(c)).slice(0, 6)
    }

    const contextLine = buildContextLine(userQuery, sqlCandidate, timeWindow, String(organizationId))
    const advices = buildSuggestions(domain, sqlCandidate)
    const textOut = `${contextLine}\n\n${summary}`

    return new Response(
      JSON.stringify({
        text: textOut,
        rows: finalRows,
        rowCount: Array.isArray(finalRows) ? finalRows.length : 0,
        columns: chosenCols,
        sql: sqlCandidate,
        suggestions: advices,
        clarify: false,
      }),
      { status: 200 },
    )
  } catch (err: any) {
    console.error("Powerups chat route error:", err)
    const message = err.message?.includes("Timeout")
      ? "La petición tardó demasiado. Intenta ser más específico."
      : "Ocurrió un error inesperado en el servidor."
    return new Response(JSON.stringify({ error: message }), { status: 500 })
  }
}
