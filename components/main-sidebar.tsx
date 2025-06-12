"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
} from "lucide-react"

export function MainSidebar() {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false)
  const pathname = usePathname()

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

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      isActive: pathname === "/dashboard",
    },
    {
      id: "facturacion",
      label: "Facturación",
      href: "/dashboard/facturacion",
      icon: FileText,
      isActive: isInSection("facturacion"),
    },
    {
      id: "canales",
      label: "Canales",
      href: "/dashboard/canales",
      icon: Radio,
      isActive: isInSection("canales"),
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      href: "/dashboard/whatsapp",
      icon: MessageSquare,
      isActive: isInSection("whatsapp"),
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
      id: "reports",
      label: "Reportes",
      href: "/dashboard/reports",
      icon: BarChart2,
      isActive: isInSection("reports"),
    },
    {
      id: "settings",
      label: "Configuración",
      href: "/dashboard/settings",
      icon: Settings,
      isActive: isInSection("settings"),
    },
  ]

  if (isCollapsed) {
    return (
      <div className="w-16 h-screen bg-white border-r border-gray-200 flex flex-col items-center py-4">
        <Button variant="ghost" size="icon" onClick={toggleCollapse} className="h-8 w-8 mb-4">
          <PanelLeft className="h-4 w-4" />
        </Button>
        <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center mb-6">
          <span className="text-white font-bold text-lg">P</span>
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
      <div className="flex-1 px-6 py-6">
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">PRINCIPAL</h2>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    item.isActive
                      ? "text-purple-600 bg-purple-50"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
                  )}
                >
                  <Icon className={cn("h-5 w-5", item.isActive ? "text-purple-600" : "text-gray-400")} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </div>
  )
}
