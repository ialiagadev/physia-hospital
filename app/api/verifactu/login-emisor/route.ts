// app/api/verifactu/login-emisor/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // asegúrate de usar la service role aquí
)

export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get('orgId')

  if (!orgId) {
    return Response.json({ error: 'Falta el orgId' }, { status: 400 })
  }

  // Obtener datos del emisor desde Supabase
  const { data: org, error } = await supabase
    .from('organizations')
    .select('verifactu_username, verifactu_api_key_encrypted')
    .eq('id', orgId)
    .single()

  if (error || !org?.verifactu_username || !org?.verifactu_api_key_encrypted) {
    return Response.json({ error: 'Credenciales Verifactu no encontradas' }, { status: 400 })
  }

  try {
    const loginRes = await fetch('https://app.verifactuapi.es/api/loginEmisor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: org.verifactu_username,
        api_key: org.verifactu_api_key_encrypted,
      }),
    })

    const loginData = await loginRes.json()

    if (!loginRes.ok || !loginData.token) {
      return Response.json({ error: 'Login fallido en Verifactu', detalle: loginData }, { status: 401 })
    }

    return Response.json({ token: loginData.token, expires_at: loginData.expires_at })
  } catch (err) {
    return Response.json({ error: 'Error interno al hacer login como emisor' }, { status: 500 })
  }
}
