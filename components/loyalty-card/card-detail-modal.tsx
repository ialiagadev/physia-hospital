"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

interface CardDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cardId: number | null
  onCardUpdated: () => void
}

export function CardDetailModal({ open, onOpenChange, cardId, onCardUpdated }: CardDetailModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [card, setCard] = useState<LoyaltyCard | null>(null)
  const [sessions, setSessions] = useState<CardSession[]>([])
  const [client, setClient] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Cargar datos de la tarjeta cuando se abre el modal
  useEffect(() => {
    if (open && cardId) {
      loadCardData()
    }
  }, [open, cardId])

  const loadCardData = async () => {
    if (!cardId) return

    setLoading(true)
    setError(null)

    try {
      // Cargar la tarjeta
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
        throw new Error(`Error al cargar tarjeta: ${cardError.message}`)
      }

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
    } finally {
      setLoading(false)
    }
  }

  // Función para registrar una sesión
  const handleAddSession = async (cardId: number) => {
    try {
      await LoyaltyCardService.addSession(cardId)

      // Recargar los datos
      await loadCardData()
      onCardUpdated()

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
      await loadCardData()
      onCardUpdated()

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
      onCardUpdated()

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

  if (!cardId) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle>Tarjeta de Fidelización #{cardId}</DialogTitle>
            {card && <Badge variant={getStatusBadgeVariant(card.status)}>{getStatusText(card.status)}</Badge>}
          </div>
          <DialogDescription>
            Detalles y gestión de la tarjeta de fidelización
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="text-center py-8">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
          </div>
        ) : loading || !card ? (
          <div className="space-y-4">
            <div className="h-8 w-64 bg-muted animate-pulse rounded"></div>
            <div className="h-[280px] bg-muted animate-pulse rounded"></div>
          </div>
        ) : (
          <Tabs defaultValue="card" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="card">Tarjeta</TabsTrigger>
              <TabsTrigger value="sessions">Historial</TabsTrigger>
              <TabsTrigger value="details">Detalles</TabsTrigger>
            </TabsList>

            <TabsContent value="card" className="mt-6">
              <div className="flex justify-center">
                <PhysiaCard
                  card={card}
                  customerName={client?.name || card.clients?.name || "Cliente"}
                  customerID={client?.tax_id || card.clients?.tax_id || ""}
                  onAddSession={card.status === "active" ? handleAddSession : undefined}
                  onRedeemReward={card.status === "completed" ? handleRedeemReward : undefined}
                  readOnly={!(card.status === "active" || card.status === "completed")}
                />
              </div>
              
              {card.status !== "cancelled" && card.status !== "redeemed" && (
                <div className="flex justify-center mt-6">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">Cancelar Tarjeta</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. La tarjeta quedará marcada como cancelada y no se podrán registrar más sesiones.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancelCard}>Continuar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
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
                          <TableHead>Profesional</TableHead>
                          <TableHead>Notas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sessions.map((session) => (
                          <TableRow key={session.id}>
                            <TableCell>{new Date(session.session_date).toLocaleDateString()}</TableCell>
                            <TableCell>{session.professionals?.name || "-"}</TableCell>
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
                      <h3 className="text-sm font-medium text-muted-foreground">ID de Tarjeta</h3>
                      <p>{card.id}</p>
                    </div>
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
                      <h3 className="text-sm font-medium text-muted-foreground">Profesional</h3>
                      <p>{card.professionals?.name || "-"}</p>
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
        )}
      </DialogContent>
    </Dialog>
  )
}
