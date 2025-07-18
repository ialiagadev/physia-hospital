"use client"

import { useState, useEffect } from "react"
import { createUser } from "@/app/actions/create-users"
import { getOrganizations } from "@/app/actions/get-organizations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Mail } from "lucide-react"

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

      // Limpiar formulario si fue exitoso
      if (result.success) {
        const form = document.querySelector("form") as HTMLFormElement
        form?.reset()
      }
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
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Invitar nuevo usuario
        </CardTitle>
        <CardDescription>
          Se enviará un Magic Link al email para que el usuario pueda acceder y establecer su contraseña
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre completo</Label>
            <Input id="name" name="name" placeholder="Juan Pérez" required disabled={isPending} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="juan@empresa.com" required disabled={isPending} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rol</Label>
            <select id="role" name="role" className="w-full p-2 border rounded-md bg-white" disabled={isPending}>
              <option value="user">Usuario</option>
              <option value="admin">Administrador</option>
              <option value="coordinador">Coordinador</option>
            </select>
          </div>

          {/* Selector de organización */}
          <div className="space-y-2">
            <Label htmlFor="organization_id">Organización</Label>
            <select
              id="organization_id"
              name="organization_id"
              className="w-full p-2 border rounded-md bg-white"
              disabled={isPending}
            >
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

          <Button type="submit" className="w-full" disabled={isPending || loadingOrgs}>
            {isPending ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Enviando invitación...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Enviar invitación
              </div>
            )}
          </Button>
        </form>
      </CardContent>

      {result && (
        <CardFooter>
          {result.success ? (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle>¡Invitación enviada!</AlertTitle>
              <AlertDescription>
                {result.message ||
                  `Se ha enviado un Magic Link a ${result.user?.email}. El usuario recibirá un email para acceder.`}
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
