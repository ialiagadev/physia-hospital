"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Users, Building2, FileText, Settings, Package, UserRound } from "lucide-react"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className={cn("pb-12", className)}>
      <div className="space-y-4 py-4">
        <div className="px-4 py-2">
          <h2 className="mb-2 px-2 text-xl font-semibold tracking-tight">Sistema de Facturación</h2>
          <div className="space-y-1">
            <Button
              asChild
              variant={pathname === "/dashboard" ? "secondary" : "ghost"}
              className="w-full justify-start"
            >
              <Link href="/dashboard">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <Button
              asChild
              variant={pathname.includes("/dashboard/clients") ? "secondary" : "ghost"}
              className="w-full justify-start"
            >
              <Link href="/dashboard/clients">
                <Users className="mr-2 h-4 w-4" />
                Clientes
              </Link>
            </Button>
            <Button
              asChild
              variant={pathname.includes("/dashboard/organizations") ? "secondary" : "ghost"}
              className="w-full justify-start"
            >
              <Link href="/dashboard/organizations">
                <Building2 className="mr-2 h-4 w-4" />
                Organizaciones
              </Link>
            </Button>
            <Button
              asChild
              variant={pathname.includes("/dashboard/services") ? "secondary" : "ghost"}
              className="w-full justify-start"
            >
              <Link href="/dashboard/services">
                <Package className="mr-2 h-4 w-4" />
                Servicios
              </Link>
            </Button>
            <Button
              asChild
              variant={pathname.includes("/dashboard/professionals") ? "secondary" : "ghost"}
              className="w-full justify-start"
            >
              <Link href="/dashboard/professionals">
                <UserRound className="mr-2 h-4 w-4" />
                Profesionales
              </Link>
            </Button>
            <Button
              asChild
              variant={pathname.includes("/dashboard/invoices") ? "secondary" : "ghost"}
              className="w-full justify-start"
            >
              <Link href="/dashboard/invoices">
                <FileText className="mr-2 h-4 w-4" />
                Facturas
              </Link>
            </Button>
            <Button
              asChild
              variant={pathname.includes("/dashboard/settings") ? "secondary" : "ghost"}
              className="w-full justify-start"
            >
              <Link href="/dashboard/settings">
                <Settings className="mr-2 h-4 w-4" />
                Configuración
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
