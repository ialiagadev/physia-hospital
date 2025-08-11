// Funciones para interactuar con la base de datos
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export interface WabaProject {
  id: number
  id_canales_organization: number
  waba_id: number
  numero: string
  nombre: string
  descripcion: string
  estado: number
  id_proyecto: string
  token_proyecto: string
  id_usuario: string
  fecha_alta: string
  webhook: string
}

export async function getWabaByUserId(userId: string): Promise<WabaProject | null> {
  try {
    // Primero obtener la organización del usuario
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", userId)
      .single()

    if (userError || !userData?.organization_id) {
      console.error("Error fetching user organization:", userError)
      return null
    }

    console.log("✅ User organization found:", userData.organization_id)

    // Buscar el canal de WhatsApp para esta organización
    const { data: canalData, error: canalError } = await supabase
      .from("canales_organizations")
      .select(`
        id,
        canales!inner(id, nombre)
      `)
      .eq("id_organization", userData.organization_id)
      .eq("estado", true)
      .single()

    if (canalError || !canalData) {
      console.error("Error fetching organization channel:", canalError)
      return null
    }

    console.log("✅ Organization channel found:", canalData.id)

    // Buscar el WABA asociado a este canal
    const { data: wabaData, error: wabaError } = await supabase
      .from("waba")
      .select("*")
      .eq("id_canales_organization", canalData.id)
      .eq("estado", 1) // Solo proyectos activos
      .single()

    if (wabaError || !wabaData) {
      console.error("Error fetching WABA project:", wabaError)
      return null
    }

    console.log("✅ WABA project found:", wabaData.nombre)
    return wabaData
  } catch (error) {
    console.error("Database error:", error)
    return null
  }
}

export async function getWabaByOrganization(organizationId: number): Promise<WabaProject[]> {
  try {
    const { data, error } = await supabase
      .from("waba")
      .select("*")
      .eq("id_canales_organization", organizationId)
      .eq("estado", 1) // Solo proyectos activos

    if (error) {
      console.error("Error fetching WABA projects:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Database error:", error)
    return []
  }
}

export async function updateWabaToken(wabaId: number, newToken: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("waba").update({ token_proyecto: newToken }).eq("id", wabaId)

    if (error) {
      console.error("Error updating WABA token:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Database error:", error)
    return false
  }
}

// Agregar nueva función para obtener WABA por organización directamente
export async function getWabaByOrganizationId(organizationId: number): Promise<WabaProject | null> {
  try {
    // Buscar el canal de WhatsApp para esta organización
    const { data: canalData, error: canalError } = await supabase
      .from("canales_organizations")
      .select("id")
      .eq("id_organization", organizationId)
      .eq("estado", true)
      .single()

    if (canalError || !canalData) {
      console.error("Error fetching organization channel:", canalError)
      return null
    }

    // Buscar el WABA asociado a este canal
    const { data: wabaData, error: wabaError } = await supabase
      .from("waba")
      .select("*")
      .eq("id_canales_organization", canalData.id)
      .eq("estado", 1)
      .single()

    if (wabaError || !wabaData) {
      console.error("Error fetching WABA project:", wabaError)
      return null
    }

    return wabaData
  } catch (error) {
    console.error("Database error:", error)
    return null
  }
}
