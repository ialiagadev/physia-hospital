// lib/supabase/server.ts
// Este archivo SÍ importa 'next/headers'

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers'; // Solo se puede usar en el servidor
import type { Database } from '@/types/supabase'; // Asegúrate de que esta ruta sea correcta

// CLIENTE PARA SERVER COMPONENTS O ROUTE HANDLERS
// Esta función crea un cliente Supabase específico para el entorno del servidor.
// Es crucial usar `cookies()` de Next.js aquí para acceder a las cookies de la solicitud.
// Cada llamada a esta función crea una nueva instancia, lo que es seguro para el servidor.
export const createServerSupabaseClient = () => {
  return createServerComponentClient<Database>({ cookies });
};