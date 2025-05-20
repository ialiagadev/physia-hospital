"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"

interface BreadcrumbsProps {
  className?: string
  homeHref?: string
  homeLabel?: string
  items?: Array<{
    href?: string
    label: string
  }>
}

export function Breadcrumbs({
  className,
  homeHref = "/dashboard",
  homeLabel = "Dashboard",
  items = [],
}: BreadcrumbsProps) {
  const pathname = usePathname()

  // Si no hay items proporcionados, generamos automáticamente basados en la ruta
  const autoItems = !items.length ? generateBreadcrumbs(pathname) : []
  const breadcrumbItems = items.length ? items : autoItems

  return (
    <nav aria-label="Breadcrumbs" className={cn("flex items-center text-sm text-muted-foreground", className)}>
      <ol className="flex flex-wrap items-center gap-1.5">
        <li className="flex items-center">
          <Link href={homeHref} className="flex items-center gap-1 hover:text-foreground transition-colors">
            <Home className="h-3.5 w-3.5" />
            <span>{homeLabel}</span>
          </Link>
        </li>

        {breadcrumbItems.map((item, index) => (
          <li key={index} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5" />
            {item.href ? (
              <Link href={item.href} className="hover:text-foreground transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-foreground">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

// Función para generar breadcrumbs automáticamente basados en la ruta
function generateBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean)

  // Mapa de traducciones para las rutas
  const pathMap: Record<string, string> = {
    dashboard: "Dashboard",
    clients: "Clientes",
    organizations: "Organizaciones",
    services: "Servicios",
    professionals: "Profesionales",
    invoices: "Facturas",
    statistics: "Estadísticas",
    settings: "Configuración",
    new: "Nuevo",
    "new-professional": "Nuevo Profesional",
  }

  return segments.slice(1).map((segment, index) => {
    // Construir la ruta acumulativa
    const href = `/${segments.slice(0, index + 2).join("/")}`

    // Si es un ID (UUID), no lo hacemos clickeable y mostramos un formato abreviado
    if (segment.length > 20 && segment.includes("-")) {
      return {
        label: `ID: ${segment.substring(0, 8)}...`,
      }
    }

    // Usar el nombre del mapa o capitalizar el segmento
    const label = pathMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)

    // Si es el último segmento, no lo hacemos clickeable
    return index === segments.length - 2 ? { label } : { href, label }
  })
}
