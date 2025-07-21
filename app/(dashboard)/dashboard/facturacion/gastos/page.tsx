"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Plus, Calendar, Filter, X, Download, Trash2, Edit } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useAuth } from "@/app/contexts/auth-context"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { NewExpenseModal } from "@/components/expenses/new-expense-modal"
import { EditExpenseModal } from "@/components/expenses/edit-expense-modal"

interface DateFilters {
  startDate?: Date
  endDate?: Date
  year?: string
  month?: string
}

interface Expense {
  id: number
  description: string
  amount: number
  expense_date: string
  category: string
  supplier?: string
  payment_method: string
  notes?: string
  created_at: string
  organization_id: number
}

const categoryOptions = [
  { value: "office", label: "Oficina", color: "bg-blue-100 text-blue-800" },
  { value: "supplies", label: "Material", color: "bg-green-100 text-green-800" },
  { value: "equipment", label: "Equipamiento", color: "bg-purple-100 text-purple-800" },
  { value: "services", label: "Servicios", color: "bg-orange-100 text-orange-800" },
  { value: "marketing", label: "Marketing", color: "bg-pink-100 text-pink-800" },
  { value: "travel", label: "Viajes", color: "bg-indigo-100 text-indigo-800" },
  { value: "training", label: "Formación", color: "bg-yellow-100 text-yellow-800" },
  { value: "other", label: "Otros", color: "bg-gray-100 text-gray-800" },
]

const paymentMethodOptions = [
  { value: "cash", label: "Efectivo" },
  { value: "card", label: "Tarjeta" },
  { value: "transfer", label: "Transferencia" },
  { value: "check", label: "Cheque" },
  { value: "other", label: "Otro" },
]

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedExpenses, setSelectedExpenses] = useState<Set<number>>(new Set())
  const [dateFilters, setDateFilters] = useState<DateFilters>({})
  const [categoryFilter, setCategoryFilter] = useState<string>("")
  const [showFilters, setShowFilters] = useState(false)
  const [isExportingCSV, setIsExportingCSV] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<number | null>(null)
  const [newExpenseModalOpen, setNewExpenseModalOpen] = useState(false)
  const [editExpenseModalOpen, setEditExpenseModalOpen] = useState(false)
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null)
  const { toast } = useToast()
  const { userProfile } = useAuth()

  const loadExpenses = async () => {
    setLoading(true)
    try {
      let query = supabase.from("expenses").select("*").order("expense_date", { ascending: false })

      if (userProfile?.organization_id) {
        query = query.eq("organization_id", userProfile.organization_id)
      }

      if (dateFilters.startDate) {
        query = query.gte("expense_date", format(dateFilters.startDate, "yyyy-MM-dd"))
      }

      if (dateFilters.endDate) {
        query = query.lte("expense_date", format(dateFilters.endDate, "yyyy-MM-dd"))
      }

      if (dateFilters.year) {
        query = query.gte("expense_date", `${dateFilters.year}-01-01`)
        query = query.lte("expense_date", `${dateFilters.year}-12-31`)
      }

      if (dateFilters.month && dateFilters.year) {
        const monthNum = dateFilters.month.padStart(2, "0")
        const daysInMonth = new Date(Number.parseInt(dateFilters.year), Number.parseInt(dateFilters.month), 0).getDate()
        query = query.gte("expense_date", `${dateFilters.year}-${monthNum}-01`)
        query = query.lte("expense_date", `${dateFilters.year}-${monthNum}-${daysInMonth}`)
      }

      if (categoryFilter && categoryFilter !== "all") {
        query = query.eq("category", categoryFilter)
      }

      const { data, error } = await query

      if (error) throw error

      setExpenses(data || [])
      setSelectedExpenses(new Set())
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los gastos",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userProfile?.organization_id) {
      loadExpenses()
    }
  }, [userProfile?.organization_id, dateFilters, categoryFilter])

  const handleDeleteExpense = async (expenseId: number) => {
    try {
      const { error } = await supabase.from("expenses").delete().eq("id", expenseId)

      if (error) throw error

      await loadExpenses()
      toast({
        title: "Gasto eliminado",
        description: "El gasto se ha eliminado correctamente",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el gasto",
        variant: "destructive",
      })
    }
  }

  const handleBulkDelete = async () => {
    if (selectedExpenses.size === 0) return

    try {
      const expenseIds = Array.from(selectedExpenses)
      const { error } = await supabase.from("expenses").delete().in("id", expenseIds)

      if (error) throw error

      await loadExpenses()
      toast({
        title: "Gastos eliminados",
        description: `Se han eliminado ${selectedExpenses.size} gasto${selectedExpenses.size !== 1 ? "s" : ""}`,
      })
      setSelectedExpenses(new Set())
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron eliminar los gastos",
        variant: "destructive",
      })
    }
  }

  const handleExportCSV = async () => {
    if (selectedExpenses.size === 0) {
      toast({
        title: "Sin selección",
        description: "Selecciona al menos un gasto para exportar",
        variant: "destructive",
      })
      return
    }

    setIsExportingCSV(true)
    try {
      const selectedExpensesData = expenses.filter((expense) => selectedExpenses.has(expense.id))
      const csvData = generateCSVData(selectedExpensesData)
      downloadCSV(csvData, `gastos_${format(new Date(), "yyyy-MM-dd")}.csv`)

      toast({
        title: "Exportación completada",
        description: `Se han exportado ${selectedExpenses.size} gastos a CSV`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo exportar el archivo CSV",
        variant: "destructive",
      })
    } finally {
      setIsExportingCSV(false)
    }
  }

  const generateCSVData = (expenses: Expense[]) => {
    const headers = [
      "Fecha",
      "Descripción",
      "Categoría",
      "Proveedor",
      "Importe",
      "Método de Pago",
      "Notas",
      "Fecha Creación",
    ]

    const rows = expenses.map((expense) => {
      const categoryLabel = categoryOptions.find((opt) => opt.value === expense.category)?.label || expense.category
      const paymentMethodLabel =
        paymentMethodOptions.find((opt) => opt.value === expense.payment_method)?.label || expense.payment_method

      return [
        format(new Date(expense.expense_date), "dd/MM/yyyy"),
        expense.description,
        categoryLabel,
        expense.supplier || "",
        expense.amount.toFixed(2),
        paymentMethodLabel,
        expense.notes || "",
        format(new Date(expense.created_at), "dd/MM/yyyy HH:mm"),
      ]
    })

    return [headers, ...rows]
  }

  const downloadCSV = (data: string[][], filename: string) => {
    const csvContent = data
      .map((row) =>
        row
          .map((cell) => {
            const cellStr = String(cell || "")
            if (cellStr.includes('"') || cellStr.includes(";") || cellStr.includes("\n")) {
              return `"${cellStr.replace(/"/g, '""')}"`
            }
            return cellStr
          })
          .join(";"),
      )
      .join("\n")

    const BOM = "\uFEFF"
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleSelectExpense = (expenseId: number, checked: boolean) => {
    const newSelected = new Set(selectedExpenses)
    if (checked) {
      newSelected.add(expenseId)
    } else {
      newSelected.delete(expenseId)
    }
    setSelectedExpenses(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedExpenses(new Set(expenses.map((expense) => expense.id)))
    } else {
      setSelectedExpenses(new Set())
    }
  }

  const isAllSelected = expenses.length > 0 && selectedExpenses.size === expenses.length
  const isIndeterminate = selectedExpenses.size > 0 && selectedExpenses.size < expenses.length

  const handleDateFilterChange = (key: keyof DateFilters, value: any) => {
    setDateFilters((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const clearFilters = () => {
    setDateFilters({})
    setCategoryFilter("")
  }

  const hasActiveFilters =
    Object.values(dateFilters).some((value) => value !== undefined && value !== "") || categoryFilter !== ""

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i)
  const months = [
    { value: "1", label: "Enero" },
    { value: "2", label: "Febrero" },
    { value: "3", label: "Marzo" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Mayo" },
    { value: "6", label: "Junio" },
    { value: "7", label: "Julio" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" },
  ]

  const getCategoryBadge = (category: string) => {
    const option = categoryOptions.find((opt) => opt.value === category)
    return (
      <Badge variant="secondary" className={option?.color}>
        {option?.label || category}
      </Badge>
    )
  }

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)

  const handleEditExpense = (expense: Expense) => {
    setExpenseToEdit(expense)
    setEditExpenseModalOpen(true)
  }

  const handleExpenseCreated = () => {
    loadExpenses()
    setNewExpenseModalOpen(false)
  }

  const handleExpenseUpdated = () => {
    loadExpenses()
    setEditExpenseModalOpen(false)
    setExpenseToEdit(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gastos</h1>
          <p className="text-muted-foreground">
            Gestiona tus gastos
            {selectedExpenses.size > 0 && (
              <span className="ml-2 text-primary font-medium">
                ({selectedExpenses.size} seleccionado{selectedExpenses.size !== 1 ? "s" : ""})
              </span>
            )}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={hasActiveFilters ? "border-primary" : ""}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filtros
            {hasActiveFilters && (
              <span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full px-1">•</span>
            )}
          </Button>

          <Button onClick={() => setNewExpenseModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Gasto
          </Button>
        </div>
      </div>

      {/* Resumen */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total gastos mostrados</p>
              <p className="text-2xl font-bold">{totalExpenses.toFixed(2)} €</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-muted-foreground">Número de gastos</p>
              <p className="text-2xl font-bold">{expenses.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      {showFilters && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Filtros</CardTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-1 h-4 w-4" />
                  Limpiar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categoryOptions.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fecha desde</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateFilters.startDate
                        ? format(dateFilters.startDate, "dd/MM/yyyy", { locale: es })
                        : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateFilters.startDate}
                      onSelect={(date) => handleDateFilterChange("startDate", date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Fecha hasta</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateFilters.endDate ? format(dateFilters.endDate, "dd/MM/yyyy", { locale: es }) : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateFilters.endDate}
                      onSelect={(date) => handleDateFilterChange("endDate", date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Año</Label>
                <Select
                  value={dateFilters.year || ""}
                  onValueChange={(value) => handleDateFilterChange("year", value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar año" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los años</SelectItem>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Mes</Label>
                <Select
                  value={dateFilters.month || ""}
                  onValueChange={(value) => handleDateFilterChange("month", value || undefined)}
                  disabled={!dateFilters.year}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar mes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los meses</SelectItem>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Acciones masivas */}
      {selectedExpenses.size > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedExpenses.size} gasto{selectedExpenses.size !== 1 ? "s" : ""} seleccionado
                {selectedExpenses.size !== 1 ? "s" : ""}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={isExportingCSV}>
                  <Download className="mr-2 h-4 w-4" />
                  {isExportingCSV ? "Exportando..." : "Exportar CSV"}
                </Button>
                <Button variant="outline" size="sm" onClick={handleBulkDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar seleccionados
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedExpenses(new Set())}>
                  Limpiar selección
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla de gastos */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  className={
                    isIndeterminate
                      ? "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                      : ""
                  }
                />
              </TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead className="text-right">Importe</TableHead>
              <TableHead>Método de Pago</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  Cargando gastos...
                </TableCell>
              </TableRow>
            ) : expenses.length > 0 ? (
              expenses.map((expense) => (
                <TableRow key={expense.id} className="transition-colors hover:bg-muted/30">
                  <TableCell>
                    <Checkbox
                      checked={selectedExpenses.has(expense.id)}
                      onCheckedChange={(checked) => handleSelectExpense(expense.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>{format(new Date(expense.expense_date), "dd/MM/yyyy")}</TableCell>
                  <TableCell className="font-medium">{expense.description}</TableCell>
                  <TableCell>{getCategoryBadge(expense.category)}</TableCell>
                  <TableCell>{expense.supplier || "-"}</TableCell>
                  <TableCell className="text-right font-medium">{expense.amount.toFixed(2)} €</TableCell>
                  <TableCell>
                    {paymentMethodOptions.find((opt) => opt.value === expense.payment_method)?.label ||
                      expense.payment_method}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditExpense(expense)}
                        className="transition-colors hover:bg-primary/10"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setExpenseToDelete(expense.id)
                          setDeleteDialogOpen(true)
                        }}
                        className="transition-colors hover:bg-destructive/10 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  {hasActiveFilters
                    ? "No se encontraron gastos con los filtros aplicados"
                    : "No hay gastos registrados"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modales */}
      <NewExpenseModal
        open={newExpenseModalOpen}
        onOpenChange={setNewExpenseModalOpen}
        onExpenseCreated={handleExpenseCreated}
      />

      <EditExpenseModal
        open={editExpenseModalOpen}
        onOpenChange={setEditExpenseModalOpen}
        expense={expenseToEdit}
        onExpenseUpdated={handleExpenseUpdated}
      />

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El gasto será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (expenseToDelete) {
                  handleDeleteExpense(expenseToDelete)
                  setExpenseToDelete(null)
                }
                setDeleteDialogOpen(false)
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
