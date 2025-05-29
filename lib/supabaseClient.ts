// lib/supabaseClient.ts
// Asegúrate de que tu `package.json` tenga `@supabase/auth-helpers-nextjs` instalado.
// Si no lo tienes, usa: npm install @supabase/auth-helpers-nextjs

import {
    createClientComponentClient, // <--- ESTE ES EL CORRECTO PARA CLIENT COMPONENTS
    createServerComponentClient,  // <--- ESTE ES EL CORRECTO PARA SERVER COMPONENTS
  } from '@supabase/auth-helpers-nextjs';
  import { cookies } from 'next/headers'; // Para crear el cliente de Server Components
  import type { Database } from '@/types/supabase'; // Asegúrate de que esta ruta sea correcta
  
  // Asegúrate de que estas variables de entorno están definidas en tu .env.local
  // NEXT_PUBLIC_SUPABASE_URL=tu_url_supabase
  // NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  // ===============================================
  // CLIENTE PARA COMPONENTES DEL CLIENTE ("use client")
  // ===============================================
  // Exportamos una instancia del cliente que se usa en el navegador.
  // Este cliente gestiona automáticamente las cookies y la sesión del usuario.
  // Usamos createClientComponentClient.
  export const supabase = createClientComponentClient<Database>({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  });
  
  
  // ===============================================
  // CLIENTE PARA SERVER COMPONENTS O ROUTE HANDLERS
  // ===============================================
  // Esta función crea un cliente Supabase específico para el entorno del servidor.
  // Es crucial usar `cookies()` de Next.js aquí para acceder a las cookies de la solicitud.
  // Cada llamada a esta función crea una nueva instancia, lo que es seguro para el servidor.
  export const createServerSupabaseClient = () => {
    // `createServerComponentClient` es la forma recomendada para Server Components
    // y Route Handlers ya que lee las cookies directamente de la solicitud HTTP.
    return createServerComponentClient<Database>({ cookies });
  };