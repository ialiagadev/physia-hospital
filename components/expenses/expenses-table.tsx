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
import { Edit, Trash2, Plus, Search, Filter } from "lucide-react"
import type { ExpenseWithDetails, ExpenseFilters } from "@/types/expenses"
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
      // Refrescar la lista después de eliminar
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
    // Refrescar la lista después de actualizar
    await refetch()
    setEditingExpense(null)
  }

  const handleExpenseCreated = async () => {
    // Refrescar la lista después de crear
    await refetch()
    setShowNewExpenseModal(false)
  }

  const getPaymentMethodLabel = (method: string | null | undefined) => {
    if (!method) return "-"
    const option = paymentMethodOptions.find((opt) => opt.value === method)
    return option?.label || method
  }

  const formatCurrency = (amount: number) => {
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar en descripción, proveedor o notas..."
              value={filters.search || ""}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="mr-2 h-4 w-4" />
          Filtros
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
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Importe</TableHead>
              <TableHead>Método de Pago</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No se encontraron gastos
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{format(new Date(expense.expense_date), "dd/MM/yyyy", { locale: es })}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{expense.description}</div>
                      {expense.supplier_name && (
                        <div className="text-sm text-muted-foreground">Proveedor: {expense.supplier_name}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{expense.user?.name || "Sin asignar"}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(expense.amount)}</TableCell>
                  <TableCell>{getPaymentMethodLabel(expense.payment_method)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setEditingExpense(expense)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(expense.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
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
