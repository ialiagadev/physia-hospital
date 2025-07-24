"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, Search, Filter, Edit } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { OrganizationSelector } from "@/components/organization-selector"
import { useToast } from "@/hooks/use-toast"
import { PhysiaCard } from "@/components/loyalty-card/physia-card"
import { NewCardModal } from "@/components/loyalty-card/new-card-modal"
import { LoyaltyCardService } from "@/lib/loyalty-card-service"
import type { LoyaltyCard } from "@/types/loyalty-cards"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function LoyaltyCardsPage() {
  const [cards, setCards] = useState<LoyaltyCard[]>([])
  const [filteredCards, setFilteredCards] = useState<LoyaltyCard[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrgId, setSelectedOrgId] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("active") // Por defecto solo activas
  const [editingCard, setEditingCard] = useState<LoyaltyCard | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const { toast } = useToast()

  // Cargar tarjetas
  useEffect(() => {
    async function loadCards() {
      setLoading(true)
      try {
        const orgId = selectedOrgId !== "all" ? Number.parseInt(selectedOrgId) : undefined
        const loadedCards = await LoyaltyCardService.getCards(orgId)
        setCards(loadedCards)
        setFilteredCards(loadedCards)
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

    loadCards()
  }, [selectedOrgId, toast])

  // Filtrar tarjetas cuando cambia el término de búsqueda o el filtro de estado
  useEffect(() => {
    let filtered = [...cards]

    // Filtrar por término de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (card) =>
          card.business_name.toLowerCase().includes(term) ||
          card.clients?.name.toLowerCase().includes(term) ||
          card.reward.toLowerCase().includes(term),
      )
    }

    // Filtrar por estado
    if (statusFilter !== "all") {
      filtered = filtered.filter((card) => card.status === statusFilter)
    }

    setFilteredCards(filtered)
  }, [cards, searchTerm, statusFilter])

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

  // Función para abrir el modal de edición
  const handleEditCard = (card: LoyaltyCard, e: React.MouseEvent) => {
    e.preventDefault() // Prevenir navegación del Link
    e.stopPropagation()
    setEditingCard(card)
    setShowEditModal(true)
  }

  // Función para recargar las tarjetas después de una actualización
  const handleCardUpdated = async () => {
    try {
      const orgId = selectedOrgId !== "all" ? Number.parseInt(selectedOrgId) : undefined
      const loadedCards = await LoyaltyCardService.getCards(orgId)
      setCards(loadedCards)
      setShowEditModal(false)
      setEditingCard(null)
    } catch (error) {
      console.error("Error al recargar tarjetas:", error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tarjetas de Fidelización</h1>
          <p className="text-muted-foreground">Gestiona las tarjetas de fidelización para tus clientes</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/loyalty-cards/new">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Tarjeta
          </Link>
        </Button>
      </div>

      {/* Selector de organización */}
      <OrganizationSelector selectedOrgId={selectedOrgId} onSelectOrganization={setSelectedOrgId} className="mb-6" />

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tarjetas..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <div className="flex items-center">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filtrar por estado" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="active">Activas</SelectItem>
              <SelectItem value="cancelled">Canceladas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-[280px] animate-pulse bg-muted/40"></Card>
          ))}
        </div>
      ) : filteredCards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCards.map((card) => (
            <div key={card.id} className="relative group">
              <Link href={`/dashboard/loyalty-cards/${card.id}`} className="block">
                <PhysiaCard
                  card={card}
                  customerName={card.clients?.name || "Cliente"}
                  customerID={card.clients?.tax_id || ""}
                  onAddSession={handleAddSession}
                  onRedeemReward={handleRedeemReward}
                  readOnly={card.status === "redeemed" || card.status === "expired" || card.status === "cancelled"}
                />
              </Link>

              {/* Botón de edición flotante */}
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-md"
                onClick={(e) => handleEditCard(card, e)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="text-muted-foreground mb-4">No hay tarjetas de fidelización disponibles</p>
            <Button asChild>
              <Link href="/dashboard/loyalty-cards/new">
                <Plus className="mr-2 h-4 w-4" />
                Crear nueva tarjeta
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modal de edición de tarjeta */}
      {showEditModal && editingCard && (
        <NewCardModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          clientId={editingCard.client_id.toString()}
          organizationId={editingCard.organization_id.toString()}
          onCardCreated={handleCardUpdated}
          editingCard={editingCard} // Pasamos la tarjeta a editar
        />
      )}
    </div>
  )
}
