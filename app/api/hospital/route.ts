// app/api/create-users/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Validamos que existan las variables de entorno
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno");
  }
  

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,       // 👈 usa la variable pública
    process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

type UserInput = {
  name: string;
  phone?: string;
  email: string;
  password?: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const users: UserInput[] = body.users;

    if (!Array.isArray(users)) {
      return NextResponse.json(
        { error: "El body debe contener un array 'users'" },
        { status: 400 }
      );
    }

    const results: any[] = [];

    for (const u of users) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        phone: u.phone,
        password: u.password || "PasswordTemporal123!", // 👈 contraseña temporal
        email_confirm: true, // 👈 marcar email como confirmado
        user_metadata: { name: u.name },
      });

      if (error) {
        results.push({ email: u.email, error: error.message });
      } else {
        results.push({ email: u.email, id: data.user?.id });
      }
    }

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
