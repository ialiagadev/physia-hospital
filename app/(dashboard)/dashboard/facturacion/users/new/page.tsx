// app/add-user/page.tsx
"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"

export default function AddUserPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState<"user" | "admin">("user")
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState("")

  // Datos del usuario actual
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)

  // Cargar datos del usuario actual
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        // Obtener usuario actual - igual que en OrganizationsPage
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          setError("Usuario no autenticado")
          setInitialLoading(false)
          return
        }

        setCurrentUser(user)

        // Obtener perfil del usuario - igual que en OrganizationsPage
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("*, organizations(*)")
          .eq("id", user.id)
          .single()

        if (profileError || !profile) {
          setError("Error al cargar perfil de usuario")
          setInitialLoading(false)
          return
        }

        setUserProfile(profile)
      } catch (err: any) {
        setError(err.message || "Error inesperado")
      } finally {
        setInitialLoading(false)
      }
    }

    loadCurrentUser()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setResult(null)

    try {
      const response = await fetch("/api/create-user-simple", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          name,
          role: isCurrentUserAdmin ? role : "user", // Solo admins pueden asignar roles
          organizationId: userProfile.organization_id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error creando usuario")
      }

      setResult(data)
      setEmail("")
      setPassword("")
      setName("")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*"
    let password = ""
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setPassword(password)
  }

  // Mostrar carga inicial
  if (initialLoading) {
    return (
      <div style={{ maxWidth: "500px", margin: "50px auto", padding: "20px", textAlign: "center" }}>
        <h1>Crear Usuario</h1>
        <p>Cargando información del usuario...</p>
      </div>
    )
  }

  // Mostrar error si no se pudo cargar el perfil
  if (!userProfile) {
    return (
      <div style={{ maxWidth: "500px", margin: "50px auto", padding: "20px", textAlign: "center" }}>
        <h1>Error</h1>
        <p style={{ color: "red" }}>{error || "No se pudo cargar el perfil del usuario"}</p>
      </div>
    )
  }

  // Verificar si el usuario actual es admin
  const isCurrentUserAdmin = userProfile.role === "admin"

  // Obtener el nombre de la organización
  const organizationName = userProfile.organizations?.name || `Organización ${userProfile.organization_id}`

  return (
    <div style={{ maxWidth: "500px", margin: "50px auto", padding: "20px" }}>
      <h1>Crear Usuario</h1>
      <p style={{ color: "#666", marginBottom: "20px" }}>
        Creando usuario para: <strong>{organizationName}</strong> (ID: {userProfile.organization_id})
      </p>

      {!isCurrentUserAdmin && (
        <div
          style={{
            backgroundColor: "#fff3cd",
            color: "#856404",
            padding: "10px",
            borderRadius: "4px",
            marginBottom: "20px",
            border: "1px solid #ffeaa7",
          }}
        >
          <strong>Nota:</strong> Solo los administradores pueden crear otros usuarios y asignar roles.
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ marginBottom: "20px" }}>
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>Nombre:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
          />
        </div>

        {isCurrentUserAdmin && (
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>Rol:</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "user" | "admin")}
              style={{
                width: "100%",
                padding: "8px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                backgroundColor: "white",
              }}
            >
              <option value="user">Usuario</option>
              <option value="admin">Administrador</option>
            </select>
            <small style={{ color: "#666", fontSize: "12px" }}>
              Los usuarios normales solo pueden ver sus propios datos. Los administradores pueden gestionar toda la
              organización.
            </small>
          </div>
        )}

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>Contraseña:</label>
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
            />
            <button
              type="button"
              onClick={generatePassword}
              style={{
                backgroundColor: "#f0f0f0",
                border: "1px solid #ccc",
                padding: "0 15px",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Generar
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            backgroundColor: "#0070f3",
            color: "white",
            padding: "12px 24px",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            fontSize: "16px",
          }}
        >
          {loading ? "Creando..." : "Crear Usuario"}
        </button>
      </form>

      {error && (
        <div
          style={{
            color: "#d32f2f",
            backgroundColor: "#ffebee",
            padding: "12px",
            borderRadius: "4px",
            marginBottom: "20px",
            border: "1px solid #ffcdd2",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div
          style={{
            backgroundColor: "#e8f5e9",
            padding: "15px",
            borderRadius: "4px",
            border: "1px solid #c8e6c9",
          }}
        >
          <h3 style={{ color: "#2e7d32", marginTop: 0 }}>Usuario creado exitosamente:</h3>
          <div style={{ backgroundColor: "white", padding: "10px", borderRadius: "4px", marginTop: "10px" }}>
            <p>
              <strong>ID:</strong> {result.user.id}
            </p>
            <p>
              <strong>Email:</strong> {result.user.email}
            </p>
            <p>
              <strong>Nombre:</strong> {result.user.name}
            </p>
            <p>
              <strong>Rol:</strong> {role === "admin" ? "Administrador" : "Usuario"}
            </p>
            <p>
              <strong>Organización:</strong> {organizationName}
            </p>
            <p>
              <strong>Contraseña:</strong> {password}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
