"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, Search, Filter } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { OrganizationSelector } from "@/components/organization-selector"
import { useToast } from "@/hooks/use-toast"
import { PhysiaCard } from "@/components/loyalty-card/physia-card"
import { LoyaltyCardService } from "@/lib/loyalty-card-service"
import type { LoyaltyCard } from "@/types/loyalty-cards"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function LoyaltyCardsPage() {
  const [cards, setCards] = useState<LoyaltyCard[]>([])
  const [filteredCards, setFilteredCards] = useState<LoyaltyCard[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrgId, setSelectedOrgId] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
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
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">Activas</SelectItem>
              <SelectItem value="completed">Completadas</SelectItem>
              <SelectItem value="redeemed">Canjeadas</SelectItem>
              <SelectItem value="expired">Expiradas</SelectItem>
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
            <Link key={card.id} href={`/dashboard/loyalty-cards/${card.id}`} className="block">
              <PhysiaCard
                card={card}
                customerName={card.clients?.name || "Cliente"}
                customerID={card.clients?.tax_id || ""}
                onAddSession={handleAddSession}
                onRedeemReward={handleRedeemReward}
                readOnly={card.status === "redeemed" || card.status === "expired" || card.status === "cancelled"}
              />
            </Link>
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
    </div>
  )
}
