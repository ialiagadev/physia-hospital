"use client"

import { useState, useEffect } from "react"
import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  Settings,
  Package,
  UserRound,
  BarChart2,
  GripVertical,
  Save,
  RotateCcw,
} from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { toast } from "@/hooks/use-toast"

// Definir la estructura de un elemento de navegación
interface NavItem {
  id: string
  label: string
  href: string
  icon: React.ReactNode
  matchPattern: string
  iconColor: string
}

// Estructura simplificada para almacenamiento
interface StoredNavItem {
  id: string
  order: number
}

// Componente para un elemento sortable del sidebar
function SortableNavItem({ item, active }: { item: NavItem; active: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className={cn("flex items-center rounded-md", isDragging ? "z-50" : "")}>
      <Button asChild variant={active ? "secondary" : "ghost"} className="w-full justify-start group relative">
        <Link href={item.href}>
          {item.icon}
          {item.label}
          <div
            {...attributes}
            {...listeners}
            className="absolute right-2 opacity-0 group-hover:opacity-100 transition cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        </Link>
      </Button>
    </div>
  )
}

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
  // Lista predeterminada de elementos de navegación con colores
  const defaultNavItems: NavItem[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="mr-2 h-4 w-4 text-blue-500" />,
      matchPattern: "",
      iconColor: "text-blue-500",
    },
    {
      id: "clients",
      label: "Clientes",
      href: "/dashboard/clients",
      icon: <Users className="mr-2 h-4 w-4 text-indigo-500" />,
      matchPattern: "/dashboard/clients",
      iconColor: "text-indigo-500",
    },
    {
      id: "organizations",
      label: "Organizaciones",
      href: "/dashboard/organizations",
      icon: <Building2 className="mr-2 h-4 w-4 text-purple-500" />,
      matchPattern: "/dashboard/organizations",
      iconColor: "text-purple-500",
    },
    {
      id: "services",
      label: "Servicios",
      href: "/dashboard/services",
      icon: <Package className="mr-2 h-4 w-4 text-amber-500" />,
      matchPattern: "/dashboard/services",
      iconColor: "text-amber-500",
    },
    {
      id: "professionals",
      label: "Profesionales",
      href: "/dashboard/professionals",
      icon: <UserRound className="mr-2 h-4 w-4 text-cyan-500" />,
      matchPattern: "/dashboard/professionals",
      iconColor: "text-cyan-500",
    },
    {
      id: "invoices",
      label: "Facturas",
      href: "/dashboard/invoices",
      icon: <FileText className="mr-2 h-4 w-4 text-emerald-500" />,
      matchPattern: "/dashboard/invoices",
      iconColor: "text-emerald-500",
    },
    {
      id: "statistics",
      label: "Estadísticas",
      href: "/dashboard/statistics",
      icon: <BarChart2 className="mr-2 h-4 w-4 text-rose-500" />,
      matchPattern: "/dashboard/statistics",
      iconColor: "text-rose-500",
    },
    {
      id: "settings",
      label: "Configuración",
      href: "/dashboard/settings",
      icon: <Settings className="mr-2 h-4 w-4 text-slate-500" />,
      matchPattern: "/dashboard/settings",
      iconColor: "text-slate-500",
    },
  ]

  // Estado para los elementos de navegación
  const [navItems, setNavItems] = useState<NavItem[]>(defaultNavItems)
  const [hasChanges, setHasChanges] = useState(false)
  const pathname = usePathname()

  // Función para obtener el icono según el ID
  const getIconForItem = (id: string) => {
    switch (id) {
      case "dashboard":
        return <LayoutDashboard className="mr-2 h-4 w-4 text-blue-500" />
      case "clients":
        return <Users className="mr-2 h-4 w-4 text-indigo-500" />
      case "organizations":
        return <Building2 className="mr-2 h-4 w-4 text-purple-500" />
      case "services":
        return <Package className="mr-2 h-4 w-4 text-amber-500" />
      case "professionals":
        return <UserRound className="mr-2 h-4 w-4 text-cyan-500" />
      case "invoices":
        return <FileText className="mr-2 h-4 w-4 text-emerald-500" />
      case "statistics":
        return <BarChart2 className="mr-2 h-4 w-4 text-rose-500" />
      case "settings":
        return <Settings className="mr-2 h-4 w-4 text-slate-500" />
      default:
        return <LayoutDashboard className="mr-2 h-4 w-4 text-blue-500" />
    }
  }

  // Función para obtener el color según el ID
  const getIconColorForItem = (id: string) => {
    switch (id) {
      case "dashboard":
        return "text-blue-500"
      case "clients":
        return "text-indigo-500"
      case "organizations":
        return "text-purple-500"
      case "services":
        return "text-amber-500"
      case "professionals":
        return "text-cyan-500"
      case "invoices":
        return "text-emerald-500"
      case "statistics":
        return "text-rose-500"
      case "settings":
        return "text-slate-500"
      default:
        return "text-gray-500"
    }
  }

  // Función para obtener la URL según el ID
  const getHrefForItem = (id: string) => {
    switch (id) {
      case "dashboard":
        return "/dashboard"
      case "clients":
        return "/dashboard/clients"
      case "organizations":
        return "/dashboard/organizations"
      case "services":
        return "/dashboard/services"
      case "professionals":
        return "/dashboard/professionals"
      case "invoices":
        return "/dashboard/invoices"
      case "statistics":
        return "/dashboard/statistics"
      case "settings":
        return "/dashboard/settings"
      default:
        return "/dashboard"
    }
  }

  // Función para obtener el patrón de coincidencia según el ID
  const getMatchPatternForItem = (id: string) => {
    if (id === "dashboard") return ""
    return `/dashboard/${id}`
  }

  // Función para obtener la etiqueta según el ID
  const getLabelForItem = (id: string) => {
    switch (id) {
      case "dashboard":
        return "Dashboard"
      case "clients":
        return "Clientes"
      case "organizations":
        return "Organizaciones"
      case "services":
        return "Servicios"
      case "professionals":
        return "Profesionales"
      case "invoices":
        return "Facturas"
      case "statistics":
        return "Estadísticas"
      case "settings":
        return "Configuración"
      default:
        return id
    }
  }

  // Cargar el orden guardado al iniciar
  useEffect(() => {
    const savedOrder = localStorage.getItem("sidebarOrder")
    if (savedOrder) {
      try {
        const parsedOrder = JSON.parse(savedOrder) as StoredNavItem[]

        // Verificar que todos los elementos predeterminados estén presentes
        const allItemsPresent = defaultNavItems.every((item) =>
          parsedOrder.some((savedItem) => savedItem.id === item.id),
        )

        if (allItemsPresent && parsedOrder.length === defaultNavItems.length) {
          // Ordenar según el orden guardado
          const orderedItems = [...defaultNavItems].sort((a, b) => {
            const aOrder = parsedOrder.find((item) => item.id === a.id)?.order || 0
            const bOrder = parsedOrder.find((item) => item.id === b.id)?.order || 0
            return aOrder - bOrder
          })

          setNavItems(orderedItems)
        }
      } catch (error) {
        console.error("Error al cargar el orden del sidebar:", error)
      }
    }
  }, [])

  // Configurar sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Requiere mover 8px antes de activar el arrastre
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // Manejar el final del arrastre
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setNavItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)

        const newOrder = arrayMove(items, oldIndex, newIndex)
        setHasChanges(true)
        return newOrder
      })
    }
  }

  // Guardar el orden personalizado
  const saveOrder = () => {
    // Guardar solo los IDs y el orden, no los objetos React
    const orderToSave: StoredNavItem[] = navItems.map((item, index) => ({
      id: item.id,
      order: index,
    }))

    localStorage.setItem("sidebarOrder", JSON.stringify(orderToSave))
    setHasChanges(false)
    toast({
      title: "Orden guardado",
      description: "La configuración del menú ha sido guardada correctamente.",
      duration: 3000,
    })
  }

  // Restablecer el orden predeterminado
  const resetOrder = () => {
    setNavItems(defaultNavItems)
    localStorage.removeItem("sidebarOrder")
    setHasChanges(false)
    toast({
      title: "Orden restablecido",
      description: "Se ha restaurado el orden predeterminado del menú.",
      duration: 3000,
    })
  }

  return (
    <div className={cn("pb-12", className)}>
      <div className="space-y-4 py-4">
        <div className="px-4 py-2">
          <h2 className="mb-2 px-2 text-xl font-semibold tracking-tight">Sistema de Facturación</h2>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={navItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
                {navItems.map((item) => (
                  <SortableNavItem key={item.id} item={item} active={pathname.includes(item.matchPattern)} />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {hasChanges && (
            <div className="mt-4 space-y-2 px-2">
              <Button onClick={saveOrder} size="sm" className="w-full flex items-center justify-center">
                <Save className="mr-2 h-4 w-4" />
                Guardar orden
              </Button>
              <Button
                onClick={resetOrder}
                size="sm"
                variant="outline"
                className="w-full flex items-center justify-center"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Restablecer
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
