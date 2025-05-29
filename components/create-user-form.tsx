"use client"

import { useState, useEffect } from "react"
import { createUser } from "@/app/actions/create-users"
import { getOrganizations } from "@/app/actions/get-organizations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle } from "lucide-react"

type Organization = {
  id: string
  name: string
}

export function CreateUserForm() {
  const [isPending, setIsPending] = useState(false)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loadingOrgs, setLoadingOrgs] = useState(true)
  const [result, setResult] = useState<{
    success?: boolean
    error?: string
    user?: any
    message?: string
  } | null>(null)

  // Cargar organizaciones usando Server Action
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setLoadingOrgs(true)
        const result = await getOrganizations()

        if (result.success) {
          console.log("Organizaciones cargadas:", result.organizations)
          setOrganizations(result.organizations)
        } else {
          console.error("Error al cargar organizaciones:", result.error)
          setResult({
            success: false,
            error: `Error al cargar organizaciones: ${result.error}`,
          })
        }
      } catch (error) {
        console.error("Error inesperado al cargar organizaciones:", error)
        setResult({
          success: false,
          error: "Error inesperado al cargar organizaciones",
        })
      } finally {
        setLoadingOrgs(false)
      }
    }

    fetchOrganizations()
  }, [])

  async function handleSubmit(formData: FormData) {
    setIsPending(true)
    setResult(null)

    try {
      const result = await createUser(formData)
      setResult(result)
    } catch (error) {
      setResult({
        success: false,
        error: "Ocurrió un error al procesar la solicitud",
      })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Crear nuevo usuario</CardTitle>
        <CardDescription>Añade un nuevo usuario a tu organización</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" placeholder="Nombre completo" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="usuario@ejemplo.com" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" name="password" type="password" placeholder="••••••••" required />
          </div>

          {/* Selector de organización - siempre visible */}
          <div className="space-y-2">
            <Label htmlFor="organization_id">Organización</Label>
            <select id="organization_id" name="organization_id" className="w-full p-2 border rounded-md bg-white">
              <option value="">Usar mi organización actual</option>
              {loadingOrgs ? (
                <option disabled>Cargando organizaciones...</option>
              ) : organizations.length > 0 ? (
                organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))
              ) : (
                <option disabled>No hay organizaciones disponibles</option>
              )}
            </select>
            {!loadingOrgs && organizations.length === 0 && (
              <p className="text-sm text-gray-500">
                No se encontraron organizaciones. Ve a /admin/setup para configurar la base de datos.
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Creando usuario..." : "Crear usuario"}
          </Button>
        </form>
      </CardContent>

      {result && (
        <CardFooter>
          {result.success ? (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle>Usuario creado</AlertTitle>
              <AlertDescription>
                {result.message || `El usuario ${result.user?.email} ha sido creado exitosamente.`}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{result.error}</AlertDescription>
            </Alert>
          )}
        </CardFooter>
      )}
    </Card>
  )
}
