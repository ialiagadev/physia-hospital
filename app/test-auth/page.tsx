"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function TestAuthPage() {
  const [user, setUser] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      try {
        // Método 1: getUser
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        console.log('getUser result:', { user, userError })

        // Método 2: getSession
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        console.log('getSession result:', { session, sessionError })

        setUser(user)
        setSession(session)
      } catch (err) {
        console.error('Error checking auth:', err)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }

  if (loading) {
    return <div>Verificando autenticación...</div>
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Test de Autenticación</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Estado del Usuario:</h2>
        {user ? (
          <div>
            <p>✅ Usuario autenticado</p>
            <p>Email: {user.email}</p>
            <p>ID: {user.id}</p>
            <button onClick={handleLogout}>Cerrar Sesión</button>
          </div>
        ) : (
          <div>
            <p>❌ Usuario NO autenticado</p>
            <a href="/login">Ir al Login</a>
          </div>
        )}
      </div>

      <div>
        <h2>Datos completos:</h2>
        <pre>{JSON.stringify({ user, session }, null, 2)}</pre>
      </div>
    </div>
  )
}