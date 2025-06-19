// components/dashboard/sidebar.tsx
"use client"

import { useState, useEffect, useRef } from "react"
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
  ClipboardList,
  ChevronLeft,
  Gift,
  UserPlus,
  LogOut,
  Menu,
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
  bgColor: string
  hoverColor: string
  activeColor: string
}

// Estructura simplificada para almacenamiento
interface StoredNavItem {
  id: string
  order: number
}

// Componente para un elemento sortable del sidebar
function SortableNavItem({
  item,
  active,
  isCollapsed,
}: {
  item: NavItem
  active: boolean
  isCollapsed: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const [isHovered, setIsHovered] = useState(false)
  const buttonRef = useRef<HTMLDivElement>(null)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("flex items-center rounded-md mb-1 relative", isDragging ? "z-50" : "")}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        ref={buttonRef}
        className={cn(
          "w-full rounded-md relative overflow-hidden transition-all duration-300",
          active ? item.bgColor : isHovered ? item.hoverColor : "",
        )}
      >
        <Button
          asChild
          variant="ghost"
          className={cn(
            "w-full justify-start group relative border-none",
            active && "bg-transparent hover:bg-transparent",
          )}
        >
          <Link href={item.href}>
            <span className="flex items-center">
              <span className="mr-2 h-5 w-5" style={{ color: item.iconColor }}>
                {item.icon}
              </span>
              {!isCollapsed && (
                <span className={cn("truncate font-medium", active && "text-foreground")}>{item.label}</span>
              )}
            </span>
            {!isCollapsed && (
              <div
                {...attributes}
                {...listeners}
                className="absolute right-2 opacity-0 group-hover:opacity-100 transition cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </Link>
        </Button>
      </div>
    </div>
  )
}

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
  // Lista predeterminada de elementos de navegación con colores
  // components/dashboard/sidebar.tsx
  // ... (mantener todo el código anterior hasta defaultNavItems)

  const defaultNavItems: NavItem[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      href: "/dashboard/facturacion", // ✅ CORREGIDO
      icon: <LayoutDashboard />,
      matchPattern: "/dashboard/facturacion∫",
      iconColor: "#4285F4",
      bgColor: "bg-blue-50",
      hoverColor: "bg-blue-50/50",
      activeColor: "#4285F4",
    },
    
    
   
   
    {
      id: "invoices",
      label: "Facturas",
      href: "/dashboard/facturacion/invoices", // ✅ CORREGIDO
      icon: <FileText />,
      matchPattern: "/dashboard/facturacion/invoices",
      iconColor: "#10B981",
      bgColor: "bg-emerald-50",
      hoverColor: "bg-emerald-50/50",
      activeColor: "#10B981",
    },
   
  
    {
      id: "statistics",
      label: "Estadísticas",
      href: "/dashboard/facturacion/statistics", // ✅ CORREGIDO
      icon: <BarChart2 />,
      matchPattern: "/dashboard/facturacion/statistics",
      iconColor: "#F43F5E",
      bgColor: "bg-rose-50",
      hoverColor: "bg-rose-50/50",
      activeColor: "#F43F5E",
    }
   
     
  ]

  // Estado para los elementos de navegación
  const [navItems, setNavItems] = useState<NavItem[]>(defaultNavItems)
  const [hasChanges, setHasChanges] = useState(false)
  // Añadir estado para controlar si el sidebar está colapsado
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false)
  const pathname = usePathname()

  // Cargar el estado de colapso guardado al iniciar

  // Función para convertir string a boolean de forma segura
  const parseBoolean = (value: string | null): boolean => {
    return value === "true"
  }

  // Actualizar el índice activo cuando cambia la ruta

  useEffect(() => {
    const savedCollapsedState = localStorage.getItem("facturacionSidebarCollapsed")
    setIsCollapsed(parseBoolean(savedCollapsedState))
  }, [])

  // Guardar el estado de colapso cuando cambie
  useEffect(() => {
    localStorage.setItem("facturacionSidebarCollapsed", String(isCollapsed))
  }, [isCollapsed])

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

  // Función para alternar el estado de colapso
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  // Calcular la posición del indicador

  return (
    <div className={cn("pb-12 relative transition-all duration-200", isCollapsed ? "w-16" : "w-64", className)}>
      <div className="space-y-4 py-4">
        <div className="px-4 py-2">
          {/* Header con botón de colapso integrado */}
          <div className="flex items-center justify-between mb-4">
            {!isCollapsed && <h2 className="text-lg font-semibold">Sistema de Facturación</h2>}

            {/* Botón mejorado */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapse}
              className={cn(
                "h-8 w-8 rounded-md hover:bg-accent transition-all duration-200",
                isCollapsed ? "mx-auto" : "ml-auto",
              )}
            >
              {isCollapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          <div className="relative">
            {/* Indicador animado */}

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={navItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1">
                  {navItems.map((item) => {
                    // Asegurarnos de que isActive sea explícitamente un booleano
                    const isActive: boolean = Boolean(
                      pathname === item.href || (item.matchPattern && pathname.includes(item.matchPattern)),
                    )
                    return <SortableNavItem key={item.id} item={item} active={isActive} isCollapsed={isCollapsed} />
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {hasChanges && !isCollapsed && (
            <div className="mt-4 space-y-2 px-2">
              <Button
                onClick={saveOrder}
                size="sm"
                className="w-full flex items-center justify-center bg-emerald-500/90 hover:bg-emerald-500 text-white"
              >
                <Save className="mr-2 h-4 w-4" />
                Guardar orden
              </Button>
              <Button
                onClick={resetOrder}
                size="sm"
                variant="outline"
                className="w-full flex items-center justify-center border-slate-200 hover:bg-slate-50"
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
