import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ⚠️ Service Key (no la anon)
)

export async function POST(req: Request) {
  try {
    const { id, email, newPassword } = await req.json()

    if ((!id && !email) || !newPassword) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    let userId = id

    // Si no se pasa id, buscar por email (usando admin.listUsers)
    if (!userId && email) {
      const { data, error: findError } = await supabase.auth.admin.listUsers()
      if (findError) throw findError

      const user = data.users.find((u) => u.email === email)
      if (!user) {
        return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
      }
      userId = user.id
    }

    // Actualizar contraseña y marcar email confirmado
    const { data, error } = await supabase.auth.admin.updateUserById(userId!, {
      password: newPassword,
      email_confirm: true
    })

    if (error) throw error

    return NextResponse.json({ success: true, user: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
