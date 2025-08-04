import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

interface GoogleTokens {
  access_token: string
  refresh_token: string
  expires_at: string
}

class GoogleTokenManager {
  async getValidTokens(userId: string): Promise<GoogleTokens | null> {
    try {
      console.log("🔍 Obteniendo tokens para usuario:", userId)

      // Obtener tokens actuales
      const { data: tokenData, error: tokenError } = await supabase
        .from("user_google_tokens")
        .select("access_token, refresh_token, expires_at")
        .eq("user_id", userId)
        .single()

      if (tokenError || !tokenData) {
        console.log("❌ No se encontraron tokens para el usuario:", userId)
        return null
      }

      console.log("✅ Tokens encontrados, verificando expiración...")

      // Verificar si el token está próximo a expirar (5 minutos de margen)
      const expiresAt = new Date(tokenData.expires_at)
      const now = new Date()
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)

      console.log("🕐 Token válido hasta:", expiresAt.toISOString())
      console.log("🕐 Hora actual:", now.toISOString())

      if (expiresAt > fiveMinutesFromNow) {
        console.log("✅ Token válido, no necesita renovación")
        return tokenData
      }

      console.log("🔄 Token próximo a expirar, renovando...")

      // Renovar token
      const newTokens = await this.refreshTokens(tokenData.refresh_token, userId)
      return newTokens
    } catch (error) {
      console.error("❌ Error obteniendo tokens:", error)
      return null
    }
  }

  private async refreshTokens(refreshToken: string, userId: string): Promise<GoogleTokens | null> {
    try {
      console.log("🔄 Renovando tokens para usuario:", userId)

      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      })

      if (!response.ok) {
        console.error("❌ Error renovando token:", response.status, await response.text())
        // Si el refresh token es inválido, eliminar los tokens
        await supabase.from("user_google_tokens").delete().eq("user_id", userId)
        return null
      }

      const tokenResponse = await response.json()
      console.log("✅ Tokens renovados exitosamente")

      // Calcular nueva fecha de expiración
      const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000)

      // Actualizar tokens en la base de datos
      const { data: updatedTokens, error: updateError } = await supabase
        .from("user_google_tokens")
        .update({
          access_token: tokenResponse.access_token,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .select("access_token, refresh_token, expires_at")
        .single()

      if (updateError) {
        console.error("❌ Error actualizando tokens:", updateError)
        return null
      }

      console.log("✅ Tokens actualizados en base de datos")
      return updatedTokens
    } catch (error) {
      console.error("❌ Error renovando tokens:", error)
      return null
    }
  }
}

export const googleTokenManager = new GoogleTokenManager()
