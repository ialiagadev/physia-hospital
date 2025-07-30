// app/api/verifactu/token/route.ts
import { NextResponse } from 'next/server'

export async function POST() {
  const loginRes = await fetch('https://app.verifactuapi.es/api/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      email: 'mvalera37@gmail.com',
      password: 'Asddayma1!',
    }),
  })

  const data = await loginRes.json()

  if (!loginRes.ok || !data.token) {
    return NextResponse.json({ error: 'Login fallido del administrador' }, { status: 401 })
  }

  return NextResponse.json({ success: true, token: data.token, expires_at: data.expires_at })
}