"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertTriangle,
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  History,
  Warehouse,
  DollarSign,
  Activity,
  MapPin,
  User,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  Filter,
  Download,
} from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { toast } from "@/hooks/use-toast"
import { useAuth } from "@/app/contexts/auth-context"

interface StockItem {
  id: string
  name: string
  description?: string
  category: string
  current_stock: number
  min_stock: number
  max_stock: number
  unit_price: number
  supplier?: string
  location?: string
  expiry_date?: string
  created_at: string
  updated_at: string
}

interface StockMovement {
  id: string
  stock_item_id: string
  movement_type: "in" | "out" | "adjustment"
  quantity: number
  reason: string
  created_at: string
  created_by?: string
  stock_items?: {
    name: string
  }
}

const CATEGORIES = [
  { value: "Medicamentos", icon: "💊", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "Material quirúrgico", icon: "🔪", color: "bg-red-50 text-red-700 border-red-200" },
  { value: "Consumibles", icon: "🧤", color: "bg-green-50 text-green-700 border-green-200" },
  { value: "Equipamiento", icon: "🏥", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "Limpieza", icon: "🧽", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  { value: "Otros", icon: "📦", color: "bg-gray-50 text-gray-700 border-gray-200" },
]

export default function StockPage() {
  const { userProfile } = useAuth()
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [showLowStock, setShowLowStock] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null)
  const [movementErrors, setMovementErrors] = useState<string[]>([])
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    current_stock: 0,
    min_stock: 0,
    max_stock: 0,
    unit_price: 0,
    supplier: "",
    location: "",
    expiry_date: "",
  })
  const [movementData, setMovementData] = useState({
    movement_type: "in" as "in" | "out" | "adjustment",
    quantity: 0,
    reason: "",
  })

  useEffect(() => {
    if (userProfile?.organization_id) {
      fetchStockItems()
      fetchStockMovements()
    }
  }, [userProfile?.organization_id])

  const fetchStockItems = async () => {
    if (!userProfile?.organization_id) return

    try {
      const { data, error } = await supabase
        .from("stock_items")
        .select("*")
        .eq("organization_id", userProfile.organization_id)
        .order("name")

      if (error) throw error
      setStockItems(data || [])
    } catch (error) {
      console.error("Error fetching stock items:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los elementos del stock",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchStockMovements = async () => {
    if (!userProfile?.organization_id) return

    try {
      const { data, error } = await supabase
        .from("stock_movements")
        .select(`
          *,
          stock_items!inner (
            name,
            organization_id
          )
        `)
        .eq("stock_items.organization_id", userProfile.organization_id)
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) throw error
      setStockMovements(data || [])
    } catch (error) {
      console.error("Error fetching stock movements:", error)
    }
  }

  const handleAddItem = async () => {
    if (!userProfile?.organization_id) return

    const errors = []
    if (!formData.name.trim()) {
      errors.push("El nombre del artículo es obligatorio")
    }
    if (!formData.category.trim()) {
      errors.push("La categoría es obligatoria")
    }
    if (formData.current_stock < 0) {
      errors.push("El stock inicial no puede ser negativo")
    }
    if (formData.min_stock < 0) {
      errors.push("El stock mínimo no puede ser negativo")
    }
    if (formData.unit_price < 0) {
      errors.push("El precio unitario no puede ser negativo")
    }

    if (errors.length > 0) {
      toast({
        title: "❌ Errores en el formulario",
        description: errors.join(". "),
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase.from("stock_items").insert([
        {
          ...formData,
          organization_id: userProfile.organization_id,
        },
      ])

      if (error) throw error

      toast({
        title: "✅ Artículo agregado",
        description: "El artículo se ha agregado correctamente al inventario",
      })

      setIsAddModalOpen(false)
      resetForm()
      fetchStockItems()
    } catch (error) {
      console.error("Error adding stock item:", error)
      const errorMessage = (error as any)?.message || "No se pudo agregar el artículo"
      toast({
        title: "❌ Error al agregar artículo",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handleEditItem = async () => {
    if (!selectedItem) {
      toast({
        title: "⚠️ Error",
        description: "No hay elemento seleccionado para editar",
        variant: "destructive",
      })
      return
    }

    const errors = []
    if (!formData.name?.trim()) errors.push("El nombre es obligatorio")
    if (!formData.category?.trim()) errors.push("La categoría es obligatoria")
    if (formData.current_stock < 0) errors.push("El stock actual no puede ser negativo")
    if (formData.min_stock < 0) errors.push("El stock mínimo no puede ser negativo")

    if (errors.length > 0) {
      toast({
        title: "⚠️ Errores de validación",
        description: errors.join(". "),
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase.from("stock_items").update(formData).eq("id", selectedItem.id)

      if (error) throw error

      toast({
        title: "✅ Elemento actualizado",
        description: "Los cambios se han guardado correctamente",
      })

      setIsEditModalOpen(false)
      resetForm()
      fetchStockItems()
    } catch (error) {
      console.error("Error updating stock item:", error)
      const errorMessage = (error as any)?.message || "No se pudo actualizar el elemento"
      toast({
        title: "❌ Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handleDeleteItem = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este elemento?")) return

    try {
      const { error } = await supabase.from("stock_items").delete().eq("id", id)

      if (error) throw error

      toast({
        title: "🗑️ Elemento eliminado",
        description: "El elemento se ha eliminado del inventario",
      })

      fetchStockItems()
    } catch (error) {
      console.error("Error deleting stock item:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el elemento",
        variant: "destructive",
      })
    }
  }

  const handleStockMovement = async () => {
    if (!selectedItem) {
      toast({
        title: "⚠️ Error",
        description: "No hay elemento seleccionado para el movimiento",
        variant: "destructive",
      })
      return
    }

    const errors = []
    if (!movementData.quantity || movementData.quantity <= 0) {
      errors.push("La cantidad debe ser mayor a 0")
    }
    if (!movementData.reason?.trim()) {
      errors.push("El motivo es obligatorio")
    }

    if (errors.length > 0) {
      setMovementErrors(errors)
      return
    }

    setMovementErrors([])

    try {
      console.log("[v0] Iniciando registro de movimiento...")

      let newStock = selectedItem.current_stock

      if (movementData.movement_type === "in") {
        newStock += movementData.quantity
      } else if (movementData.movement_type === "out") {
        newStock -= movementData.quantity
      } else {
        newStock = movementData.quantity
      }

      console.log("[v0] Nuevo stock calculado:", { currentStock: selectedItem.current_stock, newStock })

      if (newStock < 0) {
        toast({
          title: "⚠️ Stock insuficiente",
          description: "No hay suficiente stock disponible para esta operación",
          variant: "destructive",
        })
        return
      }

      console.log("[v0] Actualizando stock del item...")
      const { error: updateError } = await supabase
        .from("stock_items")
        .update({ current_stock: newStock })
        .eq("id", selectedItem.id)

      if (updateError) {
        console.log("[v0] Error actualizando stock:", updateError)
        throw updateError
      }

      console.log("[v0] Insertando movimiento...")
      const { error: movementError } = await supabase.from("stock_movements").insert([
        {
          stock_item_id: selectedItem.id,
          movement_type: movementData.movement_type,
          quantity: movementData.quantity,
          reason: movementData.reason,
          organization_id: userProfile?.organization_id,
        },
      ])

      if (movementError) {
        console.log("[v0] Error insertando movimiento:", movementError)
        throw movementError
      }

      console.log("[v0] Movimiento registrado exitosamente")

      toast({
        title: "📊 Movimiento registrado",
        description: "El movimiento de stock se ha registrado correctamente",
      })

      setIsMovementModalOpen(false)
      setMovementData({ movement_type: "in", quantity: 0, reason: "" })
      fetchStockItems()
      fetchStockMovements()
    } catch (error) {
      console.error("[v0] Error recording stock movement:", error)
      const errorMessage = (error as any)?.message || "No se pudo registrar el movimiento"
      toast({
        title: "❌ Error al registrar movimiento",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category: "",
      current_stock: 0,
      min_stock: 0,
      max_stock: 0,
      unit_price: 0,
      supplier: "",
      location: "",
      expiry_date: "",
    })
    setSelectedItem(null)
  }

  const openEditModal = (item: StockItem) => {
    setSelectedItem(item)
    setFormData({
      name: item.name,
      description: item.description || "",
      category: item.category,
      current_stock: item.current_stock,
      min_stock: item.min_stock,
      max_stock: item.max_stock,
      unit_price: item.unit_price,
      supplier: item.supplier || "",
      location: item.location || "",
      expiry_date: item.expiry_date || "",
    })
    setIsEditModalOpen(true)
  }

  const openMovementModal = (item: StockItem) => {
    setSelectedItem(item)
    setIsMovementModalOpen(true)
  }

  const filteredItems = stockItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory
    const matchesLowStock = !showLowStock || item.current_stock <= item.min_stock

    return matchesSearch && matchesCategory && matchesLowStock
  })

  const lowStockItems = stockItems.filter((item) => item.current_stock <= item.min_stock)
  const outOfStockItems = stockItems.filter((item) => item.current_stock === 0)
  const totalValue = stockItems.reduce((sum, item) => sum + item.current_stock * item.unit_price, 0)
  const todayMovements = stockMovements.filter(
    (m) => new Date(m.created_at).toDateString() === new Date().toDateString(),
  ).length

  const getCategoryInfo = (category: string) => {
    return CATEGORIES.find((cat) => cat.value === category) || CATEGORIES[CATEGORIES.length - 1]
  }

  const getStockStatusColor = (item: StockItem) => {
    if (item.current_stock === 0) return "bg-red-100 text-red-800 border-red-200"
    if (item.current_stock <= item.min_stock) return "bg-orange-100 text-orange-800 border-orange-200"
    if (item.current_stock >= item.max_stock) return "bg-blue-100 text-blue-800 border-blue-200"
    return "bg-green-100 text-green-800 border-green-200"
  }

  const getStockStatusText = (item: StockItem) => {
    if (item.current_stock === 0) return "Sin stock"
    if (item.current_stock <= item.min_stock) return "Stock bajo"
    if (item.current_stock >= item.max_stock) return "Stock alto"
    return "Normal"
  }

  if (!userProfile?.organization_id) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando información de la organización...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-6 min-h-screen">
      {/* Header sin fondo */}
      <div className="relative overflow-hidden rounded-2xl p-8 text-black">
        {/* Eliminado el div con bg-black/10 */}
        <div className="relative flex justify-between items-center">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">Gestión de Stock</h1>
            <p className="text-gray-600 text-lg">Controla y optimiza el inventario de tu clínica</p>
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2 bg-gray-100 text-gray-700 rounded-full px-3 py-1">
                <Package className="h-4 w-4" />
                <span className="text-sm font-medium">{stockItems.length} elementos</span>
              </div>
              <div className="flex items-center gap-2 bg-gray-100 text-gray-700 rounded-full px-3 py-1">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">{lowStockItems.length} alertas</span>
              </div>
            </div>
          </div>
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-blue-600 text-white hover:bg-blue-700 shadow-lg">
                <Plus className="h-5 w-5 mr-2" />
                Agregar Elemento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-gray-900">Agregar Nuevo Elemento</DialogTitle>
                <DialogDescription className="text-gray-600">
                  Completa la información del nuevo elemento de stock
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-6 py-4">
                <div className="space-y-3">
                  <Label htmlFor="name" className="text-sm font-semibold text-gray-700">
                    Nombre del elemento *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Guantes de látex"
                    className="h-11"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="category" className="text-sm font-semibold text-gray-700">
                    Categoría *
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          <div className="flex items-center gap-2">
                            <span>{category.icon}</span>
                            <span>{category.value}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-3">
                  <Label htmlFor="description" className="text-sm font-semibold text-gray-700">
                    Descripción
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción detallada del elemento"
                    className="min-h-[80px]"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="current_stock" className="text-sm font-semibold text-gray-700">
                    Stock Actual
                  </Label>
                  <Input
                    id="current_stock"
                    type="number"
                    value={formData.current_stock}
                    onChange={(e) => setFormData({ ...formData, current_stock: Number.parseInt(e.target.value) || 0 })}
                    className="h-11"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="min_stock" className="text-sm font-semibold text-gray-700">
                    Stock Mínimo
                  </Label>
                  <Input
                    id="min_stock"
                    type="number"
                    value={formData.min_stock}
                    onChange={(e) => setFormData({ ...formData, min_stock: Number.parseInt(e.target.value) || 0 })}
                    className="h-11"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="max_stock" className="text-sm font-semibold text-gray-700">
                    Stock Máximo
                  </Label>
                  <Input
                    id="max_stock"
                    type="number"
                    value={formData.max_stock}
                    onChange={(e) => setFormData({ ...formData, max_stock: Number.parseInt(e.target.value) || 0 })}
                    className="h-11"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="unit_price" className="text-sm font-semibold text-gray-700">
                    Precio Unitario (€)
                  </Label>
                  <Input
                    id="unit_price"
                    type="number"
                    step="0.01"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({ ...formData, unit_price: Number.parseFloat(e.target.value) || 0 })}
                    className="h-11"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="supplier" className="text-sm font-semibold text-gray-700">
                    Proveedor
                  </Label>
                  <Input
                    id="supplier"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="Nombre del proveedor"
                    className="h-11"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="location" className="text-sm font-semibold text-gray-700">
                    Ubicación
                  </Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Ej: Almacén A, Estante 3"
                    className="h-11"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="expiry_date" className="text-sm font-semibold text-gray-700">
                    Fecha de Caducidad
                  </Label>
                  <Input
                    id="expiry_date"
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="h-11"
                  />
                </div>
              </div>
              <DialogFooter className="gap-3">
                <Button variant="outline" onClick={() => setIsAddModalOpen(false)} className="px-6">
                  Cancelar
                </Button>
                <Button
                  onClick={handleAddItem}
                  disabled={!formData.name || !formData.category}
                  className="px-6 bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Elemento
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {/* Stats Cards mejoradas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Warehouse className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-blue-600">Total Elementos</p>
                <p className="text-3xl font-bold text-blue-900">{stockItems.length}</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-orange-500 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-orange-600">Stock Bajo</p>
                <p className="text-3xl font-bold text-orange-900">{lowStockItems.length}</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-green-500 rounded-lg">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-green-600">Valor Total</p>
                <p className="text-3xl font-bold text-green-900">€{totalValue.toFixed(0)}</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-purple-500 rounded-lg">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-purple-600">Movimientos Hoy</p>
                <p className="text-3xl font-bold text-purple-900">{todayMovements}</p>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
      {/* Filtros mejorados */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-600" />
            <CardTitle className="text-lg">Filtros de Búsqueda</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre, descripción o proveedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full lg:w-64 h-11">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <span>📋</span>
                    <span>Todas las categorías</span>
                  </div>
                </SelectItem>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    <div className="flex items-center gap-2">
                      <span>{category.icon}</span>
                      <span>{category.value}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={showLowStock ? "default" : "outline"}
              onClick={() => setShowLowStock(!showLowStock)}
              className="h-11 px-6"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Solo Stock Bajo
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Contenido principal con tabs mejoradas */}
      <Tabs defaultValue="inventory" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 h-12 bg-gray-100 rounded-xl p-1">
          <TabsTrigger value="inventory" className="rounded-lg font-medium">
            <Package className="h-4 w-4 mr-2" />
            Inventario
          </TabsTrigger>
          <TabsTrigger value="movements" className="rounded-lg font-medium">
            <History className="h-4 w-4 mr-2" />
            Movimientos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-6">
          {filteredItems.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="p-4 bg-gray-100 rounded-full mb-4">
                  <Package className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay elementos</h3>
                <p className="text-gray-500 text-center max-w-md">
                  {searchTerm || selectedCategory !== "all" || showLowStock
                    ? "No se encontraron elementos que coincidan con los filtros aplicados."
                    : "Comienza agregando elementos a tu inventario para gestionar el stock."}
                </p>
                {!searchTerm && selectedCategory === "all" && !showLowStock && (
                  <Button onClick={() => setIsAddModalOpen(true)} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Primer Elemento
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Elementos de Stock</CardTitle>
                    <CardDescription className="text-base">
                      {filteredItems.length} elementos encontrados
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-200">
                        <TableHead className="font-semibold text-gray-700">Elemento</TableHead>
                        <TableHead className="font-semibold text-gray-700">Categoría</TableHead>
                        <TableHead className="font-semibold text-gray-700">Stock</TableHead>
                        <TableHead className="font-semibold text-gray-700">Precio</TableHead>
                        <TableHead className="font-semibold text-gray-700">Ubicación</TableHead>
                        <TableHead className="font-semibold text-gray-700">Estado</TableHead>
                        <TableHead className="font-semibold text-gray-700">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => {
                        const categoryInfo = getCategoryInfo(item.category)
                        return (
                          <TableRow key={item.id} className="hover:bg-gray-50 transition-colors">
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-semibold text-gray-900">{item.name}</div>
                                {item.description && (
                                  <div className="text-sm text-gray-500 line-clamp-2">{item.description}</div>
                                )}
                                {item.supplier && (
                                  <div className="flex items-center gap-1 text-xs text-gray-400">
                                    <User className="h-3 w-3" />
                                    {item.supplier}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${categoryInfo.color} border font-medium`}>
                                <span className="mr-1">{categoryInfo.icon}</span>
                                {item.category}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div
                                  className={`text-lg font-bold ${
                                    item.current_stock <= item.min_stock ? "text-orange-600" : "text-gray-900"
                                  }`}
                                >
                                  {item.current_stock}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Min: {item.min_stock} | Max: {item.max_stock}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold text-gray-900">€{item.unit_price.toFixed(2)}</div>
                              <div className="text-xs text-gray-500">
                                Total: €{(item.current_stock * item.unit_price).toFixed(2)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <MapPin className="h-3 w-3" />
                                {item.location || "No especificada"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${getStockStatusColor(item)} border font-medium`}>
                                {getStockStatusText(item)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openMovementModal(item)}
                                  className="h-8 w-8 p-0"
                                >
                                  <ArrowUpRight className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditModal(item)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="movements" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Historial de Movimientos</CardTitle>
                  <CardDescription className="text-base">Últimos 50 movimientos registrados</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Historial
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {stockMovements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="p-4 bg-gray-100 rounded-full mb-4">
                    <History className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Sin movimientos</h3>
                  <p className="text-gray-500 text-center max-w-md">
                    Los movimientos de stock aparecerán aquí cuando realices entradas, salidas o ajustes.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-200">
                        <TableHead className="font-semibold text-gray-700">Fecha y Hora</TableHead>
                        <TableHead className="font-semibold text-gray-700">Elemento</TableHead>
                        <TableHead className="font-semibold text-gray-700">Tipo</TableHead>
                        <TableHead className="font-semibold text-gray-700">Cantidad</TableHead>
                        <TableHead className="font-semibold text-gray-700">Motivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockMovements.map((movement) => (
                        <TableRow key={movement.id} className="hover:bg-gray-50 transition-colors">
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium text-gray-900">
                                {new Date(movement.created_at).toLocaleDateString("es-ES", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })}
                              </div>
                              <div className="text-sm text-gray-500">
                                {new Date(movement.created_at).toLocaleTimeString("es-ES", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-gray-900">{movement.stock_items?.name}</div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`font-medium border ${
                                movement.movement_type === "in"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : movement.movement_type === "out"
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : "bg-blue-50 text-blue-700 border-blue-200"
                              }`}
                            >
                              {movement.movement_type === "in" && <ArrowUpRight className="h-3 w-3 mr-1" />}
                              {movement.movement_type === "out" && <ArrowDownRight className="h-3 w-3 mr-1" />}
                              {movement.movement_type === "adjustment" && <RotateCcw className="h-3 w-3 mr-1" />}
                              {movement.movement_type === "in"
                                ? "Entrada"
                                : movement.movement_type === "out"
                                  ? "Salida"
                                  : "Ajuste"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div
                              className={`text-lg font-bold ${
                                movement.movement_type === "in"
                                  ? "text-green-600"
                                  : movement.movement_type === "out"
                                    ? "text-red-600"
                                    : "text-blue-600"
                              }`}
                            >
                              {movement.movement_type === "in" ? "+" : movement.movement_type === "out" ? "-" : "="}
                              {movement.quantity}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-600 max-w-xs truncate" title={movement.reason}>
                              {movement.reason}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {/* Modal de edición mejorado */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">Editar Elemento</DialogTitle>
            <DialogDescription className="text-gray-600">
              Modifica la información del elemento: {selectedItem?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-6 py-4">
            <div className="space-y-3">
              <Label htmlFor="edit-name" className="text-sm font-semibold text-gray-700">
                Nombre del elemento *
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="edit-category" className="text-sm font-semibold text-gray-700">
                Categoría *
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      <div className="flex items-center gap-2">
                        <span>{category.icon}</span>
                        <span>{category.value}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-3">
              <Label htmlFor="edit-description" className="text-sm font-semibold text-gray-700">
                Descripción
              </Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="edit-min_stock" className="text-sm font-semibold text-gray-700">
                Stock Mínimo
              </Label>
              <Input
                id="edit-min_stock"
                type="number"
                value={formData.min_stock}
                onChange={(e) => setFormData({ ...formData, min_stock: Number.parseInt(e.target.value) || 0 })}
                className="h-11"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="edit-max_stock" className="text-sm font-semibold text-gray-700">
                Stock Máximo
              </Label>
              <Input
                id="edit-max_stock"
                type="number"
                value={formData.max_stock}
                onChange={(e) => setFormData({ ...formData, max_stock: Number.parseInt(e.target.value) || 0 })}
                className="h-11"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="edit-unit_price" className="text-sm font-semibold text-gray-700">
                Precio Unitario (€)
              </Label>
              <Input
                id="edit-unit_price"
                type="number"
                step="0.01"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: Number.parseFloat(e.target.value) || 0 })}
                className="h-11"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="edit-supplier" className="text-sm font-semibold text-gray-700">
                Proveedor
              </Label>
              <Input
                id="edit-supplier"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="edit-location" className="text-sm font-semibold text-gray-700">
                Ubicación
              </Label>
              <Input
                id="edit-location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="edit-expiry_date" className="text-sm font-semibold text-gray-700">
                Fecha de Caducidad
              </Label>
              <Input
                id="edit-expiry_date"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="h-11"
              />
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="px-6">
              Cancelar
            </Button>
            <Button onClick={handleEditItem} className="px-6 bg-blue-600 hover:bg-blue-700">
              <Edit className="h-4 w-4 mr-2" />
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Modal de movimiento mejorado */}
      <Dialog open={isMovementModalOpen} onOpenChange={setIsMovementModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">Registrar Movimiento</DialogTitle>
            <DialogDescription className="text-gray-600">
              {selectedItem && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium text-gray-900">{selectedItem.name}</div>
                  <div className="text-sm text-gray-600">Stock actual: {selectedItem.current_stock} unidades</div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700">Tipo de Movimiento</Label>
              <Select
                value={movementData.movement_type}
                onValueChange={(value: "in" | "out" | "adjustment") =>
                  setMovementData({ ...movementData, movement_type: value })
                }
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4 text-green-600" />
                      <span>Entrada - Agregar stock</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="out">
                    <div className="flex items-center gap-2">
                      <ArrowDownRight className="h-4 w-4 text-red-600" />
                      <span>Salida - Reducir stock</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="adjustment">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="h-4 w-4 text-blue-600" />
                      <span>Ajuste - Cambiar stock</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label htmlFor="movement-quantity" className="text-sm font-semibold text-gray-700">
                Cantidad *
              </Label>
              <Input
                id="movement-quantity"
                type="number"
                value={movementData.quantity}
                onChange={(e) => setMovementData({ ...movementData, quantity: Number.parseInt(e.target.value) || 0 })}
                className="h-11"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="movement-reason" className="text-sm font-semibold text-gray-700">
                Motivo *
              </Label>
              <Textarea
                id="movement-reason"
                value={movementData.reason}
                onChange={(e) => setMovementData({ ...movementData, reason: e.target.value })}
                placeholder="Ej: Pedido de proveedor"
                className={`min-h-[80px] ${
                  movementErrors.some((error) => error.includes("motivo")) ? "border-red-500 focus:border-red-500" : ""
                }`}
              />
              {movementErrors.some((error) => error.includes("motivo")) && (
                <p className="text-sm text-red-600 mt-1">⚠️ El motivo del movimiento es obligatorio</p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setIsMovementModalOpen(false)} className="px-6">
              Cancelar
            </Button>
            <Button onClick={handleStockMovement} className="px-6 bg-blue-600 hover:bg-blue-700">
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Registrar Movimiento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
