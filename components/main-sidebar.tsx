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
  FileIcon as FileTemplate,
  CreditCard,
  FileCheck,
  Megaphone,
  Warehouse,
} from "lucide-react"

interface MenuItem {
  id: string
  label: string
  href: string
  icon: any
  isActive: boolean
  badge?: number | null
  hidden?: boolean
  disabled?: boolean
  comingSoon?: boolean
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
      id: "chat",
      label: "Chat",
      href: "#",
      icon: MessageSquare,
      isActive: false,
      disabled: true,
      comingSoon: true,
    },
    {
      id: "clientes",
      label: "Pacientes",
      href: "/dashboard/clients",
      icon: Users,
      isActive: isInSection("clients"),
    },
    {
      id: "marketing",
      label: "Marketing",
      href: "#",
      icon: Megaphone,
      isActive: false,
      disabled: true,
      comingSoon: true,
    },
    {
      id: "stock",
      label: "Stock",
      href: "#",
      icon: Warehouse,
      isActive: false,
      disabled: true,
      comingSoon: true,
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
      id: "tareas",
      label: "Tareas",
      href: "/dashboard/tareas",
      icon: CheckSquare,
      isActive: isInSection("tareas"),
    },
    {
      id: "agents",
      label: "Agentes IA",
      href: "#",
      icon: Bot,
      isActive: false,
      disabled: true,
      comingSoon: true,
    },
    {
      id: "physia-ai",
      label: "PHYSIA AI",
      href: "#",
      icon: Brain,
      isActive: false,
      disabled: true,
      comingSoon: true,
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
  ]

  // Sección Configuración
  const configItems: MenuItem[] = [
    {
      id: "equipo",
      label: "Equipo",
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
      href: "#",
      icon: FileTemplate,
      isActive: false,
      disabled: true,
      comingSoon: true,
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
      label: "Tarjetas de Fidelización",
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
      id: "profile",
      label: "Perfil",
      href: "/dashboard/profile",
      icon: User,
      isActive: isInSection("profile"),
    },
    {
      id: "help",
      label: "Ayuda",
      href: "#",
      icon: HelpCircle,
      isActive: false,
      disabled: true,
      comingSoon: true,
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
    // Separar items disponibles y próximamente
    const availableItems = items.filter((item) => !item.hidden && !item.disabled)
    const comingSoonItems = items.filter((item) => !item.hidden && item.disabled)

    return (
      <div className="mb-6">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-3">{title}</h2>
        <nav className="space-y-1">
          {/* Renderizar primero los items disponibles */}
          {availableItems.map((item) => {
            const Icon = item.icon

            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group",
                  item.isActive ? "text-purple-600 bg-purple-50" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
                )}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={cn("h-5 w-5", item.isActive ? "text-purple-600" : "text-gray-400")} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <Badge variant="destructive" className="h-5 min-w-[20px] text-xs bg-red-500 hover:bg-red-600 px-1.5">
                    {item.badge > 99 ? "99+" : item.badge}
                  </Badge>
                )}
              </Link>
            )
          })}

          {/* Separador visual si hay items de ambos tipos */}
          {availableItems.length > 0 && comingSoonItems.length > 0 && (
            <div className="py-2">
              <div className="border-t border-gray-100"></div>
            </div>
          )}

          {/* Renderizar después los items de próximamente */}
          {comingSoonItems.map((item) => {
            const Icon = item.icon

            return (
              <div key={item.id} className="relative">
                <div className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium cursor-not-allowed opacity-60">
                  <div className="flex items-center space-x-3">
                    <Icon className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-500">{item.label}</span>
                  </div>
                </div>
                {item.comingSoon && (
                  <Badge
                    variant="secondary"
                    className="absolute top-1 right-1 h-4 text-xs bg-orange-100 text-orange-700 hover:bg-orange-100 px-1.5"
                  >
                    Pronto
                  </Badge>
                )}
              </div>
            )
          })}
        </nav>
      </div>
    )
  }

  if (isCollapsed) {
    return (
      <div className="w-16 h-screen bg-white border-r border-gray-200 flex flex-col items-center py-4">
        <Button variant="ghost" size="icon" onClick={toggleCollapse} className="h-8 w-8 mb-4">
          <PanelLeft className="h-4 w-4" />
        </Button>

        <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center mb-6">
          <span className="text-white font-bold text-lg">P</span>
        </div>

        {/* Iconos colapsados */}
        <div className="flex flex-col space-y-2">
          {/* Primero los disponibles de todas las secciones */}
          {[...principalItems, ...configItems, ...generalItems]
            .filter((item) => !item.hidden && !item.disabled)
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
                    )}
                    title={item.label}
                  >
                    <Icon className="h-5 w-5" />
                  </Link>
                  {item.badge && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs bg-red-500 hover:bg-red-600 flex items-center justify-center"
                    >
                      {item.badge > 9 ? "9+" : item.badge}
                    </Badge>
                  )}
                </div>
              )
            })}

          {/* Separador visual */}
          {[...principalItems, ...configItems, ...generalItems].some((item) => !item.hidden && !item.disabled) &&
            [...principalItems, ...configItems, ...generalItems].some((item) => !item.hidden && item.disabled) && (
              <div className="w-8 h-px bg-gray-200 mx-auto my-2"></div>
            )}

          {/* Después los de próximamente */}
          {[...principalItems, ...configItems, ...generalItems]
            .filter((item) => !item.hidden && item.disabled)
            .map((item) => {
              const Icon = item.icon

              return (
                <div key={item.id} className="relative">
                  <div
                    className="p-2 rounded-lg cursor-not-allowed opacity-60 text-gray-400"
                    title={`${item.label} - Pronto`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  {item.comingSoon && (
                    <div className="absolute -top-1 -right-1 h-3 w-3 bg-orange-500 rounded-full"></div>
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
            <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">P</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">PHYSIA</h1>
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
        {renderMenuSection("CONFIGURACIÓN", configItems)}
        {renderMenuSection("GENERAL", generalItems)}
      </div>
    </div>
  )
}
