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
  Settings,
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
} from "lucide-react"

interface MenuItem {
  id: string
  label: string
  href: string
  icon: any
  isActive: boolean
  badge?: number | null
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
      href: "/dashboard/chat",
      icon: MessageSquare,
      isActive: isInSection("chat"),
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
      id: "settings",
      label: "Configuración",
      href: "/dashboard/settings",
      icon: Settings,
      isActive: isInSection("settings"),
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

  const renderMenuSection = (title: string, items: MenuItem[]) => (
    <div className="mb-6">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-3">{title}</h2>
      <nav className="space-y-1">
        {items.map((item) => {
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
      </nav>
    </div>
  )

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
          {[...principalItems, ...configItems, ...generalItems].map((item) => {
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
