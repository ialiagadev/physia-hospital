"use client"

import { useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useExpenses } from "@/hooks/use-expenses"
import { useUsers } from "@/hooks/use-users"
import { useAuth } from "@/app/contexts/auth-context"
import { EditExpenseModal } from "./edit-expense-modal"
import { NewExpenseModal } from "./new-expense-modal"
import { Edit, Trash2, Plus, Search, Filter, FileText, Download, ExternalLink } from "lucide-react"
import { calculateExpenseAmounts, type ExpenseWithDetails, type ExpenseFilters } from "@/types/expenses"
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
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const paymentMethodOptions = [
  { value: "cash", label: "Efectivo" },
  { value: "card", label: "Tarjeta" },
  { value: "transfer", label: "Transferencia" },
  { value: "check", label: "Cheque" },
  { value: "other", label: "Otro" },
]

export function ExpensesTable() {
  const { toast } = useToast()
  const { userProfile } = useAuth()
  const { users } = useUsers(userProfile?.organization_id)
  const [filters, setFilters] = useState<ExpenseFilters>({})
  const { expenses, loading, deleteExpense, refetch } = useExpenses(filters)
  const [editingExpense, setEditingExpense] = useState<ExpenseWithDetails | null>(null)
  const [showNewExpenseModal, setShowNewExpenseModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<number | null>(null)

  // Filtrar usuarios con type=1
  const professionalUsers = users.filter((user) => user.type === 1)

  const handleDeleteClick = (expenseId: number) => {
    setExpenseToDelete(expenseId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!expenseToDelete) return

    try {
      await deleteExpense(expenseToDelete)
      toast({
        title: "Gasto eliminado",
        description: "El gasto se ha eliminado correctamente",
      })
      await refetch()
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el gasto",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setExpenseToDelete(null)
    }
  }

  const handleExpenseUpdated = async () => {
    await refetch()
    setEditingExpense(null)
  }

  const handleExpenseCreated = async () => {
    await refetch()
    setShowNewExpenseModal(false)
  }

  const getPaymentMethodLabel = (method: string | null | undefined) => {
    if (!method) return "-"
    const option = paymentMethodOptions.find((opt) => opt.value === method)
    return option?.label || method
  }

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return "-"
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  const handleFilterChange = (key: keyof ExpenseFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === "all" || value === "" ? undefined : value,
    }))
  }

  const clearFilters = () => {
    setFilters({})
  }

  const calculateTotal = (expense: ExpenseWithDetails) => {
    const { totalAmount } = calculateExpenseAmounts(expense.amount, expense.vat_rate, expense.retention_rate || 0)
    return totalAmount
  }

  // Función para descargar archivo usando fetch
  const handleDownloadReceipt = async (expense: ExpenseWithDetails) => {
    if (!expense.receipt_url) {
      toast({
        title: "Error",
        description: "No hay archivo adjunto para descargar",
        variant: "destructive",
      })
      return
    }

    try {
      // Usar fetch para obtener el archivo
      const response = await fetch(expense.receipt_url)
      if (!response.ok) {
        throw new Error("Error al obtener el archivo")
      }

      const blob = await response.blob()
      // Obtener la extensión del archivo desde la URL o usar un nombre genérico
      const urlParts = expense.receipt_url.split("/")
      const fileName = urlParts[urlParts.length - 1] || `archivo_gasto_${expense.id}`

      // Crear URL temporal y descargar
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast({
        title: "Descarga completada",
        description: "El archivo se ha descargado correctamente",
      })
    } catch (error) {
      console.error("Error downloading file:", error)
      toast({
        title: "Error",
        description: "No se pudo descargar el archivo. Intenta abrirlo en una nueva pestaña.",
        variant: "destructive",
      })
    }
  }

  // Función para abrir archivo en nueva pestaña
  const handleViewReceipt = (expense: ExpenseWithDetails) => {
    if (!expense.receipt_url) {
      toast({
        title: "Error",
        description: "No hay archivo adjunto para visualizar",
        variant: "destructive",
      })
      return
    }
    window.open(expense.receipt_url, "_blank")
  }

  if (loading) {
    return <div className="flex justify-center p-8">Cargando gastos...</div>
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Gastos</h2>
          <p className="text-muted-foreground">Administra los gastos de la organización</p>
        </div>
        <Button onClick={() => setShowNewExpenseModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Gasto
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por descripción o proveedor..."
              className="pl-8"
              value={filters.search || ""}
              onChange={(e) => handleFilterChange("search", e.target.value)}
            />
          </div>
        </div>
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="mr-2 h-4 w-4" />
          Filtros {showFilters ? "▲" : "▼"}
        </Button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="text-sm font-medium mb-2 block">Usuario</label>
            <Select value={filters.user_id || "all"} onValueChange={(value) => handleFilterChange("user_id", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los usuarios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los usuarios</SelectItem>
                {professionalUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Fecha desde</label>
            <Input
              type="date"
              value={filters.date_from || ""}
              onChange={(e) => handleFilterChange("date_from", e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Fecha hasta</label>
            <Input
              type="date"
              value={filters.date_to || ""}
              onChange={(e) => handleFilterChange("date_to", e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <Button variant="outline" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Base</TableHead>
              <TableHead>IVA</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Método de Pago</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No se encontraron gastos
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((expense) => {
                const vatAmount = expense.vat_amount || (expense.amount * expense.vat_rate) / 100
                const totalAmount = calculateTotal(expense)

                return (
                  <TableRow key={expense.id}>
                    <TableCell>{format(new Date(expense.expense_date), "dd/MM/yyyy", { locale: es })}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{expense.description}</div>
                        {expense.supplier_name && (
                          <div className="text-sm text-muted-foreground">Proveedor: {expense.supplier_name}</div>
                        )}
                        {expense.supplier_tax_id && (
                          <div className="text-sm text-muted-foreground">NIF/CIF: {expense.supplier_tax_id}</div>
                        )}
                        {expense.receipt_url && (
                          <div className="mt-1">
                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                              <FileText className="h-3 w-3" />
                              Archivo adjunto
                            </Badge>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{expense.user?.name || "Sin asignar"}</TableCell>
                    <TableCell>{formatCurrency(expense.amount)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{formatCurrency(vatAmount)}</span>
                        <span className="text-xs text-muted-foreground">({expense.vat_rate}%)</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(totalAmount)}</TableCell>
                    <TableCell>{getPaymentMethodLabel(expense.payment_method)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        {expense.receipt_url && (
                          <>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" onClick={() => handleViewReceipt(expense)}>
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Ver archivo</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" onClick={() => handleDownloadReceipt(expense)}>
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Descargar archivo</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </>
                        )}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => setEditingExpense(expense)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Editar gasto</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(expense.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Eliminar gasto</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
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
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modals */}
      <NewExpenseModal
        open={showNewExpenseModal}
        onOpenChange={setShowNewExpenseModal}
        onExpenseCreated={handleExpenseCreated}
      />

      {editingExpense && (
        <EditExpenseModal
          open={!!editingExpense}
          onOpenChange={(open) => !open && setEditingExpense(null)}
          expense={editingExpense}
          onExpenseUpdated={handleExpenseUpdated}
        />
      )}
    </div>
  )
}
