import { type NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { createClient } from "@supabase/supabase-js"

console.log("🔍 DEBUG - Callback route.ts cargado correctamente")

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
)

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  console.log("🔍 DEBUG - Callback GET function called")

  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    console.log("🔍 DEBUG - Callback params:", {
      code: code ? "✅ Existe" : "❌ No existe",
      state,
      error,
    })

    if (error) {
      console.log("🔍 DEBUG - OAuth error:", error)
      return NextResponse.redirect(new URL("/?error=auth_cancelled", request.url))
    }

    if (!code || !state) {
      console.log("🔍 DEBUG - Missing code or state")
      return NextResponse.redirect(new URL("/?error=missing_params", request.url))
    }

    // Decodificar el state para obtener userId y organizationId
    let userId, organizationId
    try {
      const parsedState = JSON.parse(state)
      userId = parsedState.userId
      organizationId = parsedState.organizationId
      console.log("🔍 DEBUG - Parsed state:", { userId, organizationId })
    } catch (parseError) {
      console.error("🔍 DEBUG - Error parsing state:", parseError)
      return NextResponse.redirect(new URL("/?error=invalid_state", request.url))
    }

    // PRIMERO ELIMINAR TOKEN EXISTENTE PARA EVITAR DUPLICADOS
    console.log("🔍 DEBUG - Deleting existing tokens...")
    const { error: deleteError } = await supabase.from("user_google_tokens").delete().eq("user_id", userId)

    if (deleteError) {
      console.log("🔍 DEBUG - Error deleting existing tokens (might not exist):", deleteError.message)
    } else {
      console.log("🔍 DEBUG - Existing tokens deleted successfully")
    }

    // Intercambiar código por tokens
    console.log("🔍 DEBUG - Exchanging code for tokens...")
    const { tokens } = await oauth2Client.getToken(code)

    // 🆕 ARREGLADO: Solo usar propiedades que existen en Credentials
    console.log("🔍 DEBUG - Raw tokens received:", {
      access_token: tokens.access_token ? "✅ Existe" : "❌ No existe",
      refresh_token: tokens.refresh_token ? "✅ Existe" : "❌ No existe",
      expiry_date: tokens.expiry_date, // Esta SÍ existe
      token_type: tokens.token_type,
      scope: tokens.scope,
    })

    if (!tokens.access_token) {
      throw new Error("No se recibió access_token")
    }

    // 🆕 CALCULAR FECHA DE EXPIRACIÓN USANDO SOLO expiry_date
    let expiresAt = null
    const now = new Date()

    if (tokens.expiry_date) {
      // expiry_date viene en milisegundos desde epoch
      expiresAt = new Date(tokens.expiry_date)
      console.log("🔍 DEBUG - Using expiry_date:", {
        expiry_date_ms: tokens.expiry_date,
        converted_date: expiresAt.toISOString(),
        minutes_from_now: Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60)),
      })
    } else {
      // Si no hay expiry_date, usar 1 hora por defecto
      expiresAt = new Date(now.getTime() + 60 * 60 * 1000)
      console.log("🔍 DEBUG - No expiry_date, using default 1 hour:", expiresAt.toISOString())
    }

    // 🆕 VERIFICAR QUE LA FECHA SEA RAZONABLE (al menos 10 minutos en el futuro)
    const minExpiry = new Date(now.getTime() + 10 * 60 * 1000) // 10 minutos
    if (expiresAt <= minExpiry) {
      console.log("🔍 DEBUG - Token expiry too short, extending to 1 hour")
      expiresAt = new Date(now.getTime() + 60 * 60 * 1000)
    }

    console.log("🔍 DEBUG - Final expiry calculation:", {
      now: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      minutes_from_now: Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60)),
      is_future: expiresAt > now,
    })

    // INSERTAR NUEVO TOKEN
    console.log("🔍 DEBUG - Inserting new tokens...")
    const tokenData = {
      user_id: userId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      token_type: tokens.token_type || "Bearer",
      expires_at: expiresAt.toISOString(),
      scope: tokens.scope || "https://www.googleapis.com/auth/calendar",
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    }

    console.log("🔍 DEBUG - Token data to save:", {
      user_id: tokenData.user_id,
      has_access_token: !!tokenData.access_token,
      has_refresh_token: !!tokenData.refresh_token,
      token_type: tokenData.token_type,
      expires_at: tokenData.expires_at,
      scope: tokenData.scope,
    })

    const { error: insertError, data: savedData } = await supabase.from("user_google_tokens").insert(tokenData).select()

    if (insertError) {
      console.error("🔍 DEBUG - Error saving tokens:", insertError)
      return NextResponse.redirect(new URL("/?error=save_failed", request.url))
    }

    console.log("🔍 DEBUG - Tokens saved successfully:", {
      id: savedData[0]?.id,
      expires_at: savedData[0]?.expires_at,
      has_refresh_token: !!savedData[0]?.refresh_token,
    })

    // VERIFICAR QUE SE GUARDÓ CORRECTAMENTE
    const { data: verifyData, error: verifyError } = await supabase
      .from("user_google_tokens")
      .select("*")
      .eq("user_id", userId)
      .single()

    console.log("🔍 DEBUG - Verification query result:", {
      found: verifyData ? "✅ Found" : "❌ Not found",
      expires_at: verifyData?.expires_at,
      is_future: verifyData?.expires_at ? new Date(verifyData.expires_at) > new Date() : false,
      minutes_until_expiry: verifyData?.expires_at
        ? Math.round((new Date(verifyData.expires_at).getTime() - new Date().getTime()) / (1000 * 60))
        : 0,
      error: verifyError?.message,
    })

    // Redirigir de vuelta a la aplicación con éxito
    return NextResponse.redirect(new URL("/?connected=true", request.url))
  } catch (error) {
    console.error("🔍 DEBUG - Error in OAuth callback:", error)
    return NextResponse.redirect(
      new URL(
        `/?error=auth_failed&details=${encodeURIComponent(error instanceof Error ? error.message : "Unknown error")}`,
        request.url,
      ),
    )
  }
}
