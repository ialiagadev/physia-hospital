"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { PhysiaCard } from "@/components/loyalty-card/physia-card"
import { LoyaltyCardService } from "@/lib/loyalty-card-service"
import type { LoyaltyCard, CardSession } from "@/types/loyalty-cards"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"

export default function LoyaltyCardDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [card, setCard] = useState<LoyaltyCard | null>(null)
  const [sessions, setSessions] = useState<CardSession[]>([])
  const [client, setClient] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Cargar datos de la tarjeta
  useEffect(() => {
    async function loadCardData() {
      setLoading(true)
      setError(null)

      try {
        // Validar que el ID sea un número válido
        if (!params.id || params.id === "undefined" || params.id === "null") {
          throw new Error("ID de tarjeta no proporcionado")
        }

        const cardId = Number.parseInt(params.id, 10)

        if (isNaN(cardId) || cardId <= 0) {
          throw new Error("ID de tarjeta inválido")
        }

        console.log("Cargando tarjeta con ID:", cardId)

        // Cargar la tarjeta directamente desde Supabase para depuración
        const { data: cardData, error: cardError } = await supabase
          .from("loyalty_cards")
          .select(`
            *,
            clients (name, tax_id),
            professionals (name)
          `)
          .eq("id", cardId)
          .single()

        if (cardError) {
          console.error("Error Supabase al cargar tarjeta:", cardError)
          throw new Error(`Error al cargar tarjeta: ${cardError.message}`)
        }

        if (!cardData) {
          throw new Error(`No se encontró ninguna tarjeta con ID ${cardId}`)
        }

        console.log("Tarjeta cargada:", cardData)
        setCard(cardData)

        // Cargar el cliente
        if (cardData.client_id) {
          const { data: clientData } = await supabase.from("clients").select("*").eq("id", cardData.client_id).single()
          setClient(clientData)
        }

        // Cargar las sesiones
        const { data: sessionsData } = await supabase
          .from("card_sessions")
          .select(`
            *,
            professionals (name)
          `)
          .eq("card_id", cardId)
          .order("session_date", { ascending: false })

        setSessions(sessionsData || [])
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error desconocido al cargar la tarjeta"
        console.error("Error loading card data:", err)
        setError(errorMessage)
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })

        // Esperar un momento antes de redirigir para que el usuario pueda ver el mensaje
        setTimeout(() => {
          router.push("/dashboard/loyalty-cards")
        }, 2000)
      } finally {
        setLoading(false)
      }
    }

    loadCardData()
  }, [params.id, router, toast])

  // Función para registrar una sesión
  const handleAddSession = async (cardId: number) => {
    try {
      await LoyaltyCardService.addSession(cardId)

      // Recargar los datos
      const updatedCard = await LoyaltyCardService.getCard(cardId)
      setCard(updatedCard)

      const updatedSessions = await LoyaltyCardService.getCardSessions(cardId)
      setSessions(updatedSessions)

      toast({
        title: "Sesión registrada",
        description: "La sesión ha sido registrada correctamente",
      })
    } catch (error) {
      console.error("Error al registrar sesión:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo registrar la sesión",
        variant: "destructive",
      })
    }
  }

  // Función para canjear una recompensa
  const handleRedeemReward = async (cardId: number) => {
    try {
      await LoyaltyCardService.redeemReward(cardId)

      // Recargar los datos
      const updatedCard = await LoyaltyCardService.getCard(cardId)
      setCard(updatedCard)

      toast({
        title: "Recompensa canjeada",
        description: "La recompensa ha sido canjeada correctamente",
      })
    } catch (error) {
      console.error("Error al canjear recompensa:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo canjear la recompensa",
        variant: "destructive",
      })
    }
  }

  // Función para cancelar una tarjeta
  const handleCancelCard = async () => {
    if (!card) return

    try {
      await LoyaltyCardService.updateCard(card.id, { status: "cancelled" })

      // Actualizar el estado local
      setCard({ ...card, status: "cancelled" })

      toast({
        title: "Tarjeta cancelada",
        description: "La tarjeta ha sido cancelada correctamente",
      })
    } catch (error) {
      console.error("Error al cancelar tarjeta:", error)
      toast({
        title: "Error",
        description: "No se pudo cancelar la tarjeta",
        variant: "destructive",
      })
    }
  }

  // Obtener el color de la insignia según el estado
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default"
      case "completed":
        return "success"
      case "redeemed":
        return "purple"
      case "expired":
        return "destructive"
      case "cancelled":
        return "outline"
      default:
        return "secondary"
    }
  }

  // Obtener el texto del estado
  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Activa"
      case "completed":
        return "Completada"
      case "redeemed":
        return "Canjeada"
      case "expired":
        return "Expirada"
      case "cancelled":
        return "Cancelada"
      default:
        return status
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard/" },
            { label: "Tarjetas de Fidelización", href: "/dashboard/loyalty-cards" },
            { label: "Error", href: "#" },
          ]}
        />
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error al cargar la tarjeta</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button className="mt-4" onClick={() => router.push("/dashboard/loyalty-cards")}>
              Volver a la lista de tarjetas
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading || !card) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded"></div>
        <div className="h-[280px] bg-muted animate-pulse rounded"></div>
      </div>
    )
  }

  const breadcrumbItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Tarjetas de Fidelización", href: "/dashboard/loyalty-cards" },
    { label: `Tarjeta #${card.id}`, href: `/dashboard/loyalty-cards/${card.id}` },
  ]

  const isCardActive = card.status === "active"
  const isCardCompleted = card.status === "completed"
  const isCardUsable = isCardActive || isCardCompleted

  return (
    <div className="space-y-6">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Tarjeta de Fidelización</h1>
          <Badge variant={getStatusBadgeVariant(card.status)}>{getStatusText(card.status)}</Badge>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button variant="outline" onClick={() => router.push("/dashboard/loyalty-cards")}>
            Volver a Tarjetas
          </Button>
          {card.client_id && (
            <Button variant="outline" onClick={() => router.push(`/dashboard/clients/${card.client_id}`)}>
              Ver Cliente
            </Button>
          )}
          {/* Mostrar botón de cancelar solo si la tarjeta NO está cancelada ni canjeada */}
          {card.status !== "cancelled" && card.status !== "redeemed" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Cancelar Tarjeta</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. La tarjeta quedará marcada como cancelada y no se podrán registrar
                    más sesiones.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancelCard}>Continuar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <Tabs defaultValue="card">
        <TabsList>
          <TabsTrigger value="card">Tarjeta</TabsTrigger>
          <TabsTrigger value="sessions">Historial de Sesiones</TabsTrigger>
          <TabsTrigger value="details">Detalles</TabsTrigger>
        </TabsList>

        <TabsContent value="card" className="mt-6">
          <div className="max-w-md mx-auto">
            <PhysiaCard
              card={card}
              customerName={client?.name || card.clients?.name || "Cliente"}
              customerID={client?.tax_id || card.clients?.tax_id || ""}
              onAddSession={isCardActive ? handleAddSession : undefined}
              onRedeemReward={isCardCompleted ? handleRedeemReward : undefined}
              readOnly={!isCardUsable}
            />
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Sesiones</CardTitle>
              <CardDescription>Registro de todas las sesiones de esta tarjeta</CardDescription>
            </CardHeader>
            <CardContent>
              {sessions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>{new Date(session.session_date).toLocaleDateString()}</TableCell>
                        <TableCell>{session.notes || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-4 text-muted-foreground">No hay sesiones registradas</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Detalles de la Tarjeta</CardTitle>
              <CardDescription>Información detallada sobre esta tarjeta de fidelización</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Fecha de Creación</h3>
                  <p>{new Date(card.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Negocio</h3>
                  <p>{card.business_name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Cliente</h3>
                  <p>{client?.name || card.clients?.name || "-"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Estado</h3>
                  <Badge variant={getStatusBadgeVariant(card.status)}>{getStatusText(card.status)}</Badge>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Sesiones</h3>
                  <p>
                    {card.completed_sessions} de {card.total_sessions}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Última Visita</h3>
                  <p>{card.last_visit_date ? new Date(card.last_visit_date).toLocaleDateString() : "-"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Fecha de Expiración</h3>
                  <p>{card.expiry_date ? new Date(card.expiry_date).toLocaleDateString() : "No expira"}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Recompensa</h3>
                <p className="p-3 bg-muted rounded-md">{card.reward}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
