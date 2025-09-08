import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ⚠️ Service Key (no la anon)
)

export async function POST(req: Request) {
  try {
    const { email, newPassword } = await req.json()

    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    // Buscar usuario por email en auth.users
    const { data: { users }, error: findError } = await supabase.auth.admin.listUsers()
    if (findError) throw findError

    const user = users.find((u) => u.email === email)
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Actualizar contraseña
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
    })

    if (error) throw error

    return NextResponse.json({ success: true, user: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
