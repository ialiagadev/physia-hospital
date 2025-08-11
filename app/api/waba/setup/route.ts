import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    console.log("🔧 WABA Setup API called")

    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Verificar autenticación
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession()

    if (authError || !session) {
      console.log("❌ No authenticated session")
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Obtener la organización del usuario
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", session.user.id)
      .single()

    if (userError || !userData?.organization_id) {
      return NextResponse.json({ error: "User has no organization assigned" }, { status: 400 })
    }

    const { token, nombre, descripcion, organizationId } = await request.json()

    // Si se pasa organizationId en el body, verificar que coincida
    if (organizationId && organizationId !== userData.organization_id) {
      return NextResponse.json({ error: "Organization mismatch" }, { status: 403 })
    }

    if (!token || !token.trim()) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 })
    }

    console.log("✅ Setting up WABA for organization:", userData.organization_id)

    // Verificar si existe canal para esta organización
    let { data: canalOrg, error: canalError } = await supabase
      .from("canales_organizations")
      .select("id")
      .eq("id_organization", userData.organization_id)
      .eq("estado", true)
      .single()

    // Si no existe canal, crear uno (asumiendo que canal WhatsApp tiene id=1)
    if (canalError || !canalOrg) {
      console.log("🆕 Creating channel organization relationship...")
      const { data: newCanalOrg, error: createCanalError } = await supabase
        .from("canales_organizations")
        .insert({
          id_canal: 1, // Asumiendo que WhatsApp es canal 1
          id_organization: userData.organization_id,
          estado: true,
        })
        .select()
        .single()

      if (createCanalError || !newCanalOrg) {
        console.error("❌ Error creating channel organization:", createCanalError)
        return NextResponse.json({ error: "Failed to create channel organization" }, { status: 500 })
      }
      canalOrg = newCanalOrg
    }

    // Verificar que canalOrg no sea null antes de continuar
    if (!canalOrg) {
      console.error("❌ Canal organization is null")
      return NextResponse.json({ error: "Failed to get or create channel organization" }, { status: 500 })
    }

    // Verificar si ya existe WABA para esta organización
    const { data: existingWaba } = await supabase
      .from("waba")
      .select("*")
      .eq("id_canales_organization", canalOrg.id)
      .single()

    if (existingWaba) {
      console.log("⚠️ WABA already exists, updating...")
      // Actualizar el WABA existente
      const { data, error } = await supabase
        .from("waba")
        .update({
          token_proyecto: token.trim(),
          nombre: nombre || "Proyecto Actualizado",
          descripcion: descripcion || "Proyecto actualizado automáticamente",
          estado: 1,
        })
        .eq("id", existingWaba.id)
        .select()
        .single()

      if (error) {
        console.error("❌ Error updating WABA project:", error)
        return NextResponse.json({ error: "Failed to update WABA project" }, { status: 500 })
      }

      return NextResponse.json({ message: "WABA project updated successfully", data })
    } else {
      console.log("🆕 Creating new WABA project...")
      // Crear nuevo WABA
      const { data, error } = await supabase
        .from("waba")
        .insert({
          id_canales_organization: canalOrg.id,
          waba_id: Math.floor(Math.random() * 1000000000),
          numero: "+1234567890",
          nombre: nombre || `Proyecto ${userData.organization_id}`,
          descripcion: descripcion || "Proyecto de WhatsApp Business API",
          estado: 1,
          id_proyecto: `org_${userData.organization_id}_${Date.now()}`,
          token_proyecto: token.trim(),
          webhook: "https://webhook-example.com/waba",
        })
        .select()
        .single()

      if (error) {
        console.error("❌ Error creating WABA project:", error)
        return NextResponse.json({ error: "Failed to create WABA project" }, { status: 500 })
      }

      return NextResponse.json({ message: "WABA project created successfully", data })
    }
  } catch (error) {
    console.error("💥 Error in WABA setup:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
