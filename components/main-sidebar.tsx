"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useVacationRequests } from "@/hooks/use-vacation-requests"
import { useAuth } from "@/app/contexts/auth-context"
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  BarChart2,
  User,
  PanelLeft,
  CheckSquare,
  Bot,
  Radio,
  Clock,
  Users,
  Package,
  UserCog,
  Brain,
  LogOut,
  HelpCircle,
  BookTemplate as FileTemplate,
  CreditCard,
  FileCheck,
  Megaphone,
  Warehouse,
  Calendar,
  Tag,
} from "lucide-react"

interface MenuItem {
  id: string
  label: string
  href: string
  icon: any
  isActive: boolean
  badge?: number | string | null
  hidden?: boolean
}

export function MainSidebar() {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false)
  const pathname = usePathname()
  const { userProfile } = useAuth()

  // Hook para obtener solicitudes de vacaciones
  const { requests, loading } = useVacationRequests(
    userProfile?.organization_id ? Number(userProfile.organization_id) : undefined,
  )

  // Calcular solicitudes pendientes
  const pendingRequestsCount = requests.filter((request) => request.status === "pending").length

  // Cargar el estado de colapso guardado al iniciar
  useEffect(() => {
    const savedCollapsedState = localStorage.getItem("mainSidebarCollapsed")
    if (savedCollapsedState) {
      setIsCollapsed(savedCollapsedState === "true")
    }
  }, [])

  // Guardar el estado de colapso cuando cambie
  useEffect(() => {
    localStorage.setItem("mainSidebarCollapsed", String(isCollapsed))
    const event = new Event("mainSidebarCollapsedChange")
    window.dispatchEvent(event)
  }, [isCollapsed])

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  const isInSection = (section: string) => {
    return pathname.startsWith(`/dashboard/${section}`)
  }

  // Sección Principal
  const principalItems: MenuItem[] = [
    {
      id: "dashboard",
      label: "Panel",
      href: "/dashboard",
      icon: LayoutDashboard,
      isActive: pathname === "/dashboard",
    },
    {
      id: "clientes",
      label: "Pacientes",
      href: "/dashboard/clients",
      icon: Users,
      isActive: isInSection("clients"),
    },
    {
      id: "facturacion",
      label: "Facturación",
      href: "/dashboard/facturacion",
      icon: FileText,
      isActive: isInSection("facturacion"),
      // Solo mostrar si NO es user
      hidden: userProfile?.role === "user",
    },
    {
      id: "fichaje",
      label: "Fichaje",
      href: "/dashboard/fichaje",
      icon: Clock,
      isActive: isInSection("fichaje"),
      // Agregar badge para solicitudes pendientes
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : null,
    },
    {
      id: "tareas",
      label: "Tareas",
      href: "/dashboard/tareas",
      icon: CheckSquare,
      isActive: isInSection("tareas"),
    },
  ]

  // Sección AI
  const aiItems: MenuItem[] = [
    {
      id: "chat",
      label: "Chat",
      href: "/dashboard/chat",
      icon: MessageSquare,
      isActive: isInSection("chat"),
    },
    {
      id: "agents",
      label: "Agentes IA",
      href: "/dashboard/agents",
      icon: Bot,
      isActive: isInSection("agents"),
    },
    {
      id: "physia-ai",
      label: "PHYSIA AI",
      href: "/dashboard/physia-ai",
      icon: Brain,
      isActive: isInSection("physia-ai"),
    },
    {
      id: "marketing",
      label: "Marketing",
      href: "#", // Disabled marketing link
      icon: Megaphone,
      isActive: false, // Always inactive since it's disabled
      badge: "Pronto", // Added "Pronto" badge
      hidden: false, // Keep visible but disabled
    },
  ]

  // Sección Configuración
  const configItems: MenuItem[] = [
    {
      id: "equipo",
      label: "Equipos",
      href: "/dashboard/professionals",
      icon: UserCog,
      isActive: isInSection("professionals"),
    },
    {
      id: "servicios",
      label: "Servicios",
      href: "/dashboard/services",
      icon: Package,
      isActive: isInSection("services"),
    },
    {
      id: "templates",
      label: "Plantillas",
      href: "/dashboard/templates",
      icon: FileTemplate,
      isActive: isInSection("templates"),
    },
    {
      id: "consent-forms",
      label: "Consentimientos",
      href: "/dashboard/consent-forms",
      icon: FileCheck,
      isActive: isInSection("consent-forms"),
    },
    {
      id: "loyalty-cards",
      label: "Bonos", // Cambié el nombre de "Tarjetas de Fidelización" a "Bonos"
      href: "/dashboard/loyalty-cards",
      icon: CreditCard,
      isActive: isInSection("loyalty-cards"),
    },
    {
      id: "canales",
      label: "Canales",
      href: "/dashboard/canales",
      icon: Radio,
      isActive: isInSection("canales"),
    },
    {
      id: "public-booking",
      label: "Reservas Públicas",
      href: "/dashboard/public-calendar",
      icon: Calendar,
      isActive: isInSection("public-calendar"),
    },
   
  ]

  // Sección General
  const generalItems: MenuItem[] = [
    {
      id: "organizations",
      label: "Mi Negocio",
      href: "/dashboard/organizations",
      icon: BarChart2,
      isActive: isInSection("organizations"),
    },
    {
      id: "stock",
      label: "Stock",
      href: "/dashboard/stock",
      icon: Warehouse,
      isActive: isInSection("stock"),
    },
    {
      id: "profile",
      label: "Perfil",
      href: "/dashboard/profile",
      icon: User,
      isActive: isInSection("profile"),
    },
    {
      id: "help",
      label: "Ayuda",
      href: "/dashboard/help",
      icon: HelpCircle,
      isActive: isInSection("help"),
    },
    {
      id: "logout",
      label: "Cerrar Sesión",
      href: "/login",
      icon: LogOut,
      isActive: false,
    },
  ]

  const renderMenuSection = (title: string, items: MenuItem[]) => {
    // Filtrar solo items visibles
    const visibleItems = items.filter((item) => !item.hidden)

    return (
      <div className="mb-6">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-3">{title}</h2>
        <nav className="space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group",
                  item.isActive ? "text-purple-600 bg-purple-50" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
                  item.id === "marketing"
                    ? "opacity-60 cursor-not-allowed hover:bg-transparent hover:text-gray-600"
                    : "",
                )}
                onClick={item.id === "marketing" ? (e) => e.preventDefault() : undefined}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={cn("h-5 w-5", item.isActive ? "text-purple-600" : "text-gray-400")} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <Badge
                    variant={typeof item.badge === "string" ? "secondary" : "destructive"}
                    className={cn(
                      "h-5 min-w-[20px] text-xs px-1.5",
                      typeof item.badge === "string"
                        ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        : "bg-red-500 hover:bg-red-600",
                    )}
                  >
                    {typeof item.badge === "string" ? item.badge : item.badge > 99 ? "99+" : item.badge}
                  </Badge>
                )}
              </Link>
            )
          })}
        </nav>
      </div>
    )
  }

  const renderAISection = (title: string, items: MenuItem[]) => {
    const visibleItems = items.filter((item) => !item.hidden)

    return (
      <div className="mb-6">
        <div className="bg-blue-50/50 rounded-lg p-3 border-l-2 border-blue-500">
          <h2 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-4 px-3 flex items-center gap-2">
            <Brain className="h-3 w-3" />
            AI
          </h2>
          <nav className="space-y-1">
            {visibleItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group",
                    item.isActive
                      ? "text-blue-600 bg-blue-100"
                      : "text-gray-600 hover:text-gray-900 hover:bg-blue-100/50",
                    item.id === "marketing"
                      ? "opacity-60 cursor-not-allowed hover:bg-transparent hover:text-gray-600"
                      : "",
                  )}
                  onClick={item.id === "marketing" ? (e) => e.preventDefault() : undefined}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={cn("h-5 w-5", item.isActive ? "text-blue-600" : "text-gray-400")} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <Badge
                      variant="secondary"
                      className="h-5 min-w-[20px] text-xs px-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    )
  }

  if (isCollapsed) {
    return (
      <div className="w-16 h-screen bg-white border-r border-gray-200 flex flex-col items-center py-4">
        <Button variant="ghost" size="icon" onClick={toggleCollapse} className="h-8 w-8 mb-4">
          <PanelLeft className="h-4 w-4" />
        </Button>

        <div className="w-12 h-12 flex items-center justify-center mb-6">
          <img src="/images/healthmate.jpeg" alt="Healthmate Logo" className="w-10 h-10 object-contain" />
        </div>

        {/* Iconos colapsados */}
        <div className="flex flex-col space-y-2">
          {[...principalItems, ...aiItems, ...configItems, ...generalItems]
            .filter((item) => !item.hidden)
            .map((item) => {
              const Icon = item.icon
              return (
                <div key={item.id} className="relative">
                  <Link
                    href={item.href}
                    className={cn(
                      "p-2 rounded-lg transition-colors block",
                      item.isActive
                        ? "text-purple-600 bg-purple-50"
                        : "text-gray-400 hover:text-gray-600 hover:bg-gray-50",
                      item.id === "marketing"
                        ? "opacity-60 cursor-not-allowed hover:bg-transparent hover:text-gray-400"
                        : "",
                    )}
                    title={item.label}
                    onClick={item.id === "marketing" ? (e) => e.preventDefault() : undefined}
                  >
                    <Icon className="h-5 w-5" />
                  </Link>
                  {item.badge && (
                    <Badge
                      variant={typeof item.badge === "string" ? "secondary" : "destructive"}
                      className={cn(
                        "absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center",
                        typeof item.badge === "string"
                          ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          : "bg-red-500 hover:bg-red-600",
                      )}
                    >
                      {typeof item.badge === "string" ? "P" : item.badge > 9 ? "9+" : item.badge}
                    </Badge>
                  )}
                </div>
              )
            })}
        </div>
      </div>
    )
  }

  return (
    <div className="w-64 h-screen bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 flex items-center justify-center">
              <img src="/images/healthmate.jpeg" alt="Healthmate Logo" className="w-16 h-16 object-contain" />
            </div>

            <div>
              <h1 className="text-xl font-bold text-gray-900">HEALTHMATE</h1>
              <p className="text-sm text-gray-500">Sistema Médico</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapse}
            className="h-8 w-8 text-gray-400 hover:text-gray-600"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-6 py-6 overflow-y-auto">
        {renderMenuSection("PRINCIPAL", principalItems)}
        {renderAISection("AI", aiItems)}
        {renderMenuSection("CONFIGURACIÓN", configItems)}
        {renderMenuSection("GENERAL", generalItems)}
      </div>
    </div>
  )
}
