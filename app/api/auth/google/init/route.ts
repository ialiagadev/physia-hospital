import { type NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
)

export async function POST(request: NextRequest) {
  console.log("🔍 DEBUG - POST function called")

  try {
    const body = await request.json()
    const { userId, organizationId } = body

    if (!userId || !organizationId) {
      console.log("🔍 DEBUG - Missing userId or organizationId")
      return NextResponse.json({ error: "userId y organizationId son requeridos" }, { status: 400 })
    }

    // 🆕 SCOPES MÁS ESPECÍFICOS Y COMPLETOS
    const scopes = [
      "https://www.googleapis.com/auth/calendar.events",
    ]

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline", // 🆕 IMPORTANTE: Para obtener refresh token
      scope: scopes,
      prompt: "consent", // 🆕 IMPORTANTE: Fuerza a mostrar pantalla de consentimiento
      include_granted_scopes: true, // 🆕 Incluir permisos ya otorgados
      state: JSON.stringify({ userId, organizationId }),
    })

    console.log("🔍 DEBUG - Generated authUrl with offline access")

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error("🔍 DEBUG - Error in POST:", error)
    return NextResponse.json({ error: "Error al generar URL de autenticación" }, { status: 500 })
  }
}

// Mantener GET para debugging
export async function GET() {
  return NextResponse.json({ message: "Google Init route is working", timestamp: new Date().toISOString() })
}
