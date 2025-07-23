import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { XCircle } from "lucide-react"
import Link from "next/link"

export default function AuthCodeError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            Enlace inválido
          </CardTitle>
          <CardDescription>El enlace que has usado es inválido o ha expirado</CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-gray-600">Por favor, solicita un nuevo enlace o intenta nuevamente.</p>
          <div className="space-y-2">
            <Button asChild className="w-full bg-purple-600 hover:bg-purple-700">
              <Link href="/forgot-password">Solicitar nuevo enlace</Link>
            </Button>
            <Button asChild variant="outline" className="w-full bg-transparent">
              <Link href="/login">Volver al login</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
