import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

// Interfaces para las respuestas de Aisensy
interface AisensyBusinessResponse {
  success: boolean
  data?: {
    business_id: string
    name: string
    email: string
    password: string
  }
  error?: string
}

interface AisensyProjectResponse {
  success: boolean
  data?: {
    project_id: string
    name: string
  }
  error?: string
}

interface AisensyTokenResponse {
  success: boolean
  data?: {
    token: string
    expires_at: string
  }
  error?: string
}

interface AisensyWabaLinkResponse {
  success: boolean
  data?: {
    facebook_url: string
    waba_id: string
  }
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 Iniciando registro de número en Aisensy")

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

    const { wabaId } = await request.json()

    if (!wabaId) {
      return NextResponse.json(
        {
          error: "wabaId es requerido",
        },
        { status: 400 },
      )
    }

    // Obtener datos del número desde la tabla waba
    const { data: wabaRecord, error: wabaError } = await supabase
      .from("waba")
      .select("numero, nombre, descripcion, id_canales_organization")
      .eq("id", wabaId)
      .single()

    if (wabaError || !wabaRecord) {
      return NextResponse.json(
        {
          error: "Registro WABA no encontrado",
        },
        { status: 404 },
      )
    }

    const { numero, nombre, descripcion } = wabaRecord

    // Obtener la organización del usuario
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", session.user.id)
      .single()

    if (userError || !userData?.organization_id) {
      return NextResponse.json(
        {
          error: "Usuario sin organización asignada",
        },
        { status: 400 },
      )
    }

    // Obtener datos de la organización
    const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select("id, name, email, id_aisensy, email_aisensy, password_aisensy") // 👈 añadido email
    .eq("id", userData.organization_id)
    .single()
  

    if (orgError || !organization) {
      return NextResponse.json(
        {
          error: "Organización no encontrada",
        },
        { status: 404 },
      )
    }

    console.log("✅ Organización encontrada:", organization.name)

    // PASO 1: Verificar si tiene business_id en Aisensy
    // 🔄 Copiar email → email_aisensy si aún no está definido
if (!organization.email_aisensy && organization.email) {
    console.log("✉️ Copiando email en email_aisensy...");
    const { error: copyEmailError } = await supabase
      .from("organizations")
      .update({ email_aisensy: organization.email })
      .eq("id", organization.id);
  
    if (copyEmailError) {
      console.error("❌ Error copiando email en email_aisensy:", copyEmailError);
      return NextResponse.json(
        { error: "No se pudo copiar el email en email_aisensy" },
        { status: 500 },
      );
    }
  
    // ⚡ Importante: actualizar el objeto en memoria
    organization.email_aisensy = organization.email;
  }
  
    let businessId = organization.id_aisensy

    if (!businessId) {
      console.log("🏢 Creando business en Aisensy...")

      const businessResult = await createAisensyBusiness(organization, wabaRecord)

      if (!businessResult.success) {
        return NextResponse.json(
          {
            error: `Error creando business: ${businessResult.error}`,
          },
          { status: 500 },
        )
      }

      businessId = businessResult.data!.business_id

      const { error: updateError } = await supabase
        .from("organizations")
        .update({
          id_aisensy: businessId,
          email_aisensy: businessResult.data!.email,
          password_aisensy: businessResult.data!.password,
        })
        .eq("id", organization.id)

      if (updateError) {
        console.error("❌ Error actualizando datos de Aisensy:", updateError)
        return NextResponse.json(
          {
            error: "Error guardando datos de Aisensy",
          },
          { status: 500 },
        )
      }

      console.log("✅ Business creado y datos guardados:", businessId)
    }

    // PASO 2: Verificar canal de la organización
    let { data: canalOrg, error: canalError } = await supabase
      .from("canales_organizations")
      .select("id")
      .eq("id_organization", userData.organization_id)
      .eq("estado", true)
      .single()

    // Si no existe canal, crear uno (WhatsApp = id 1)
    if (canalError || !canalOrg) {
      console.log("📱 Creando canal de WhatsApp...")

      const { data: newCanalOrg, error: createCanalError } = await supabase
        .from("canales_organizations")
        .insert({
          id_canal: 1, // WhatsApp
          id_organization: userData.organization_id,
          estado: true,
        })
        .select()
        .single()

      if (createCanalError || !newCanalOrg) {
        console.error("❌ Error creando canal:", createCanalError)
        return NextResponse.json(
          {
            error: "Error creando canal de WhatsApp",
          },
          { status: 500 },
        )
      }

      canalOrg = newCanalOrg
      console.log("✅ Canal de WhatsApp creado")
    }

    if (!canalOrg) {
      return NextResponse.json(
        {
          error: "Error obteniendo canal de la organización",
        },
        { status: 500 },
      )
    }

    // PASO 3: Crear proyecto en Aisensy
    console.log("📋 Creando proyecto en Aisensy...")

    const projectResult = await createAisensyProject(businessId, {
      name: `Proyecto ${nombre}`,
      description: descripcion || `Proyecto para número ${numero}`,
    })

    if (!projectResult.success) {
      return NextResponse.json(
        {
          error: `Error creando proyecto: ${projectResult.error}`,
        },
        { status: 500 },
      )
    }

    const projectId = projectResult.data!.project_id
    console.log("✅ Proyecto creado:", projectId)

    console.log("💾 Guardando project_id inmediatamente en la base de datos...")

    const { error: saveProjectError } = await supabase
      .from("waba")
      .update({
        id_proyecto: projectId,
        webhook: `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/whatsapp`,
        estado: 0, // No validado
      })
      .eq("id", wabaId)

    if (saveProjectError) {
      console.error("❌ Error guardando project_id:", saveProjectError)
      return NextResponse.json(
        {
          error: "Error guardando ID del proyecto",
        },
        { status: 500 },
      )
    }

    console.log("✅ Project_id guardado exitosamente")

    console.log("🔍 Recuperando project_id de la base de datos...")

    const { data: wabaWithProject, error: getProjectError } = await supabase
      .from("waba")
      .select("id_proyecto")
      .eq("id", wabaId)
      .single()

    if (getProjectError || !wabaWithProject?.id_proyecto) {
      console.error("❌ Error obteniendo project_id guardado:", getProjectError)
      return NextResponse.json(
        {
          error: "Error obteniendo ID del proyecto guardado",
        },
        { status: 500 },
      )
    }

    const savedProjectId = wabaWithProject.id_proyecto
    console.log("✅ Project_id recuperado de la base de datos:", savedProjectId)

  // PASO 4: Generar token usando el project_id recuperado de la base de datos
console.log("🔑 Generando token con project_id recuperado...")

// Recargar organización actualizada desde la BD
const { data: updatedOrg, error: reloadError } = await supabase
  .from("organizations")
  .select("email_aisensy, password_aisensy")
  .eq("id", organization.id)
  .single()

if (reloadError || !updatedOrg) {
  console.error("❌ Error recargando organización:", reloadError)
  return NextResponse.json(
    { error: "Error recargando organización con credenciales Aisensy" },
    { status: 500 },
  )
}

const tokenResult = await generateAisensyToken(
  updatedOrg.email_aisensy,
  updatedOrg.password_aisensy,
  savedProjectId, // Usar el project_id recuperado de la base de datos
)

if (!tokenResult.success) {
  return NextResponse.json(
    {
      error: `Error generando token: ${tokenResult.error}`,
    },
    { status: 500 },
  )
}

const token = tokenResult.data!.token
console.log("✅ Token generado con project_id recuperado")

// PASO 5: Actualizar solo el token en la base de datos
console.log("🔄 Actualizando token en la base de datos...")

const { error: updateTokenError } = await supabase
  .from("waba")
  .update({
    token_proyecto: token,
  })
  .eq("id", wabaId)

if (updateTokenError) {
  console.error("❌ Error actualizando token:", updateTokenError)
  return NextResponse.json(
    {
      error: "Error actualizando token del proyecto",
    },
    { status: 500 },
  )
}

console.log("✅ Token actualizado exitosamente")
// PASO 6: Obtener URL de Facebook
console.log("🔗 Obteniendo URL de Facebook...")

const facebookUrlResult = await generateWabaLink(businessId, savedProjectId)

if (!facebookUrlResult.success) {
  return NextResponse.json(
    {
      error: `Error obteniendo URL de Facebook: ${facebookUrlResult.error}`,
    },
    { status: 500 },
  )
}

const facebookUrl = facebookUrlResult.data!.facebook_url
console.log("✅ URL de Facebook obtenida:", facebookUrl)

// Guardar URL en la base de datos (tabla waba)
const { error: updateFacebookUrlError } = await supabase
  .from("waba")
  .update({
    url_register_facebook: facebookUrl,
  })
  .eq("id", wabaId)

if (updateFacebookUrlError) {
  console.error("❌ Error guardando URL de Facebook:", updateFacebookUrlError)
  return NextResponse.json(
    {
      error: "Error guardando URL de Facebook en la base de datos",
    },
    { status: 500 },
  )
}

console.log("✅ URL de Facebook guardada en la base de datos")



    // Respuesta exitosa con todos los datos
    return NextResponse.json({
      success: true,
      message: "Número registrado exitosamente en Aisensy",
      data: {
        waba_id: wabaId,
        business_id: businessId,
        project_id: savedProjectId, // Usar el project_id recuperado
        facebook_url: facebookUrl,
        numero: numero,
        nombre: nombre,
        estado: 0, // Pendiente de validación
        next_step: "Configurar URL en Facebook y activar webhook",
      },
    })
  } catch (error) {
    console.error("💥 Error en registro de Aisensy:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
      },
      { status: 500 },
    )
  }
}

// Función para crear business en Aisensy
async function createAisensyBusiness(organization: any, wabaData: any): Promise<AisensyBusinessResponse> {
  try {
    const partnerId = process.env.AISENSY_PARTNER_ID
    const apiKey = process.env.AISENSY_API_KEY

    console.log("🔍 Verificando variables de entorno:")
    console.log("AISENSY_PARTNER_ID:", partnerId ? "✅ Configurado" : "❌ No configurado")
    console.log("AISENSY_API_KEY:", apiKey ? "✅ Configurado" : "❌ No configurado")

    if (!partnerId) {
      console.error("❌ AISENSY_PARTNER_ID no está configurado")
      return { success: false, error: "AISENSY_PARTNER_ID no configurado" }
    }

    if (!apiKey) {
      console.error("❌ AISENSY_API_KEY no está configurado")
      return { success: false, error: "AISENSY_API_KEY no configurado" }
    }

    const generatePassword = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
      let password = ""
      for (let i = 0; i < 7; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return password
    }

    const generatedPassword = generatePassword()
    console.log("🔐 Contraseña generada para Aisensy")

    const businessPayload = {
        display_name: wabaData.nombre || organization.name,
        email: organization.email_aisensy, // 👈 usar SIEMPRE el email_aisensy
        company: organization.name,
        contact: wabaData.numero || "000000000",
        timezone: "Asia/Calcutta GMT+05:30",
        currency: "USD",
        companySize: "10 - 20",
        password: generatedPassword,
      }
          

    console.log("🏢 Creando business con datos:", {
      display_name: businessPayload.display_name,
      email: businessPayload.email,
      company: businessPayload.company,
      contact: businessPayload.contact,
      currency: businessPayload.currency,
    })

    const response = await fetch(`https://apis.aisensy.com/partner-apis/v1/partner/${partnerId}/business`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-AiSensy-Partner-API-Key": apiKey,
      },
      body: JSON.stringify(businessPayload),
    })

    console.log("📡 Respuesta de Aisensy:", response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Error de Aisensy:", errorText)
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }

    const result = await response.json()
    console.log("✅ Business creado exitosamente:", result)

    return {
      success: true,
      data: {
        business_id: result.business_id || result.id,
        name: result.name,
        email: businessPayload.email,
        password: generatedPassword,
      },
    }
  } catch (error) {
    console.error("💥 Error en createAisensyBusiness:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

// Función para crear proyecto en Aisensy
async function createAisensyProject(businessId: string, projectData: any): Promise<AisensyProjectResponse> {
  try {
    const partnerId = process.env.AISENSY_PARTNER_ID
    const apiKey = process.env.AISENSY_API_KEY

    if (!partnerId || !apiKey) {
      console.error("❌ Variables de entorno no configuradas para crear proyecto")
      return { success: false, error: "Variables de entorno no configuradas" }
    }

    console.log("📋 Creando proyecto con business_id:", businessId)
    console.log("📋 Datos del proyecto:", projectData)

    const response = await fetch(
      `https://apis.aisensy.com/partner-apis/v1/partner/${partnerId}/business/${businessId}/project`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-AiSensy-Partner-API-Key": apiKey,
        },
        body: JSON.stringify({
          name: projectData.name,
        }),
      },
    )

    console.log("📡 Respuesta del proyecto:", response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Error creando proyecto:", errorText)
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }

    const result = await response.json()
    console.log("✅ Proyecto creado exitosamente:", result)

    return {
      success: true,
      data: {
        project_id: result.project_id || result.id,
        name: result.name,
      },
    }
  } catch (error) {
    console.error("💥 Error en createAisensyProject:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

//token
async function generateAisensyToken(email: string, password: string, projectId: string): Promise<AisensyTokenResponse> {
  try {
    console.log("🔎 generateAisensyToken inputs:", { email, password, projectId })

    const credentials = `${email}:${password}:${projectId}`
    const base64Token = Buffer.from(credentials).toString("base64")

    const response = await fetch("https://backend.aisensy.com/direct-apis/t1/users/regenrate-token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${base64Token}`,
      },
      body: JSON.stringify({ direct_api: true }),
    })

    console.log("📡 Token response status:", response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Error response from Aisensy:", errorText)
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }

    const result = await response.json()
    console.log("✅ Token response body:", result)

    // 👇 Extraer correctamente el token
    const token = result.token || result.data?.token || result.users?.[0]?.token

    if (!token) {
      return { success: false, error: "Token no encontrado en la respuesta de Aisensy" }
    }

    return {
      success: true,
      data: {
        token,
        expires_at: result.expires_at || result.data?.expires_at || null,
      },
    }
  } catch (error) {
    console.error("💥 Error en generateAisensyToken:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

// Función para obtener URL de Facebook
// Función para obtener URL de Facebook en Aisensy
async function generateWabaLink(businessId: string, projectId: string, setupData?: any): Promise<AisensyWabaLinkResponse> {
    try {
      const partnerId = process.env.AISENSY_PARTNER_ID
      const apiKey = process.env.AISENSY_API_KEY
  
      if (!partnerId || !apiKey) {
        console.error("❌ Variables de entorno no configuradas para generateWabaLink")
        return { success: false, error: "Variables de entorno no configuradas" }
      }
  
      // Construimos el body igual que en el PHP
      const payload = {
        businessId: businessId,
        assistantId: projectId, // 👈 el projectId es el assistantId
        setup: setupData || {
          business: {
            name: "Empresa Demo",
            email: "demo@empresa.com",
            phone: { code: 34, number: "600000000" },
            website: "https://example.com",
            address: {
              streetAddress1: "C. del Corretger, 63, 46980 Paterna, Valencia",
              city: "Paterna",
              state: "Valencia",
              zipPostal: "46980",
              country: "ES",
            },
            timezone: "UTC-08:00",
          },
          phone: {
            displayName: "Empresa Demo",
            category: "ENTERTAIN",
            description: "",
          },
        },
      }
  
      console.log("📤 Payload generateWabaLink:", payload)
  
      const response = await fetch(
        `https://apis.aisensy.com/partner-apis/v1/partner/${partnerId}/generate-waba-link`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-AiSensy-Partner-API-Key": apiKey,
          },
          body: JSON.stringify(payload),
        }
      )
  
      console.log("📡 generateWabaLink status:", response.status, response.statusText)
  
      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Error generateWabaLink:", errorText)
        return { success: false, error: `HTTP ${response.status}: ${errorText}` }
      }
  
      const result = await response.json()
      console.log("✅ generateWabaLink result:", result)
  
      return {
        success: true,
        data: {
          facebook_url: result.embeddedSignupURL || result.facebook_url || result.url,
          waba_id: result.waba_id,
        },
      }
    } catch (error) {
      console.error("💥 Error en generateWabaLink:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      }
    }
  }
  