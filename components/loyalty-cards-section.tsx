"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, CreditCard, Eye } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { PhysiaCard } from "@/components/loyalty-card/physia-card"
import { LoyaltyCardService } from "@/lib/loyalty-card-service"
import type { LoyaltyCard } from "@/types/loyalty-cards"

interface LoyaltyCardsSectionProps {
  clientId: string
  clientName: string
}

export function LoyaltyCardsSection({ clientId, clientName }: LoyaltyCardsSectionProps) {
  const [cards, setCards] = useState<LoyaltyCard[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Cargar tarjetas del cliente
  useEffect(() => {
    async function loadClientCards() {
      setLoading(true)
      try {
        const clientCards = await LoyaltyCardService.getCardsByClient(parseInt(clientId))
        setCards(clientCards)
      } catch (error) {
        console.error("Error al cargar tarjetas:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar las tarjetas de fidelización",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadClientCards()
  }, [clientId, toast])

  // Función para registrar una sesión
  const handleAddSession = async (cardId: number) => {
    try {
      await LoyaltyCardService.addSession(cardId)

      // Actualizar la tarjeta en el estado local
      setCards((prevCards) =>
        prevCards.map((card) => {
          if (card.id === cardId) {
            const newCompletedSessions = card.completed_sessions + 1
            const newStatus = newCompletedSessions >= card.total_sessions ? "completed" : ("active" as const)
            return {
              ...card,
              completed_sessions: newCompletedSessions,
              last_visit_date: new Date().toISOString().split("T")[0],
              status: newStatus,
            }
          }
          return card
        }),
      )

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

      // Actualizar la tarjeta en el estado local
      setCards((prevCards) =>
        prevCards.map((card) => {
          if (card.id === cardId) {
            return {
              ...card,
              status: "redeemed",
            }
          }
          return card
        }),
      )

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Tarjetas de Fidelización</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-[280px] animate-pulse bg-muted/40"></Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Tarjetas de Fidelización</h2>
          <p className="text-gray-500">Tarjetas de fidelización de {clientName}</p>
        </div>
        <Button asChild>
          <Link href={`/dashboard/loyalty-cards/new?client_id=${clientId}`}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Tarjeta
          </Link>
        </Button>
      </div>

      {cards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <div key={card.id} className="relative">
              <PhysiaCard
                card={card}
                customerName={clientName}
                customerID={card.clients?.tax_id || ""}
                onAddSession={card.status === "active" ? handleAddSession : undefined}
                onRedeemReward={card.status === "completed" ? handleRedeemReward : undefined}
                readOnly={card.status === "redeemed" || card.status === "expired" || card.status === "cancelled"}
              />
              {/* Botón para ver detalles */}
              <div className="absolute top-2 right-2">
                <Button size="sm" variant="outline" asChild className="bg-white/90 backdrop-blur-sm">
                  <Link href={`/dashboard/loyalty-cards/${card.id}`}>
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium">No hay tarjetas de fidelización</h3>
            <p className="text-gray-500 mt-2 mb-4">Este cliente no tiene tarjetas de fidelización activas</p>
            <Button asChild>
              <Link href={`/dashboard/loyalty-cards/new?client_id=${clientId}`}>
                <Plus className="mr-2 h-4 w-4" />
                Crear primera tarjeta
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}