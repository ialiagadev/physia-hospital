import { createClient } from "@supabase/supabase-js"
import { google } from "googleapis"

interface GoogleCalendarTokens {
  access_token: string
  refresh_token: string
  expires_at: string
}

export class GoogleTokenManager {
  private supabase

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }

  async getValidTokens(userId: string): Promise<GoogleCalendarTokens | null> {
    try {
      console.log("🔍 Obteniendo tokens para usuario:", userId)
      
      const { data: tokenData, error } = await this.supabase
        .from("user_google_tokens")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle()

      if (error || !tokenData) {
        console.log("❌ No se encontraron tokens para el usuario:", userId)
        return null
      }

      // Verificar si el token ha expirado
      const now = new Date()
      const expiresAt = new Date(tokenData.expires_at)

      if (expiresAt <= now) {
        console.log("🔄 Token expirado, intentando renovar...")
        
        // Intentar renovar el token
        const refreshedTokens = await this.refreshAccessToken(tokenData.refresh_token, userId)
        if (refreshedTokens) {
          return refreshedTokens
        } else {
          console.log("❌ No se pudo renovar el token")
          return null
        }
      }

      console.log("✅ Tokens válidos obtenidos")
      return {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_at,
      }
    } catch (error) {
      console.error("❌ Error obteniendo tokens:", error)
      return null
    }
  }

  private async refreshAccessToken(refreshToken: string, userId: string): Promise<GoogleCalendarTokens | null> {
    try {
      console.log("🔄 Renovando access token...")

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      )

      oauth2Client.setCredentials({
        refresh_token: refreshToken,
      })

      const { credentials } = await oauth2Client.refreshAccessToken()

      if (!credentials.access_token) {
        throw new Error("No se pudo obtener nuevo access token")
      }

      // Calcular nueva fecha de expiración
      const expiresAt = new Date()
      expiresAt.setSeconds(expiresAt.getSeconds() + (credentials.expiry_date ? (credentials.expiry_date - Date.now()) / 1000 : 3600))

      // Actualizar tokens en la base de datos
      const { error: updateError } = await this.supabase
        .from("user_google_tokens")
        .update({
          access_token: credentials.access_token,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)

      if (updateError) {
        throw updateError
      }

      console.log("✅ Token renovado exitosamente")
      return {
        access_token: credentials.access_token,
        refresh_token: refreshToken,
        expires_at: expiresAt.toISOString(),
      }
    } catch (error) {
      console.error("❌ Error renovando token:", error)
      return null
    }
  }

  // 🆕 NUEVO: Función para obtener tokens de cualquier usuario (para eliminar eventos)
  async getValidTokensForUser(userId: string): Promise<GoogleCalendarTokens | null> {
    try {
      console.log("🔍 Obteniendo tokens para usuario específico:", userId)
      
      const { data: tokenData, error } = await this.supabase
        .from("user_google_tokens")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle()

      if (error || !tokenData) {
        console.log("❌ No se encontraron tokens para el usuario:", userId)
        return null
      }

      // Verificar si el token ha expirado
      const now = new Date()
      const expiresAt = new Date(tokenData.expires_at)

      if (expiresAt <= now) {
        console.log("🔄 Token expirado, intentando renovar...")
        
        // Intentar renovar el token
        const refreshedTokens = await this.refreshAccessToken(tokenData.refresh_token, userId)
        if (refreshedTokens) {
          return refreshedTokens
        } else {
          console.log("❌ No se pudo renovar el token para el usuario:", userId)
          return null
        }
      }

      console.log("✅ Tokens válidos obtenidos para usuario:", userId)
      return {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_at,
      }
    } catch (error) {
      console.error("❌ Error obteniendo tokens para usuario:", error)
      return null
    }
  }
}

export const googleTokenManager = new GoogleTokenManager()
