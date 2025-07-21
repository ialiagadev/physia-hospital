"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Save } from "lucide-react"
import { useAuth } from "@/app/contexts/auth-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const categoryOptions = [
  { value: "office", label: "Oficina" },
  { value: "supplies", label: "Material" },
  { value: "equipment", label: "Equipamiento" },
  { value: "services", label: "Servicios" },
  { value: "marketing", label: "Marketing" },
  { value: "travel", label: "Viajes" },
  { value: "training", label: "Formación" },
  { value: "other", label: "Otros" },
]

const paymentMethodOptions = [
  { value: "cash", label: "Efectivo" },
  { value: "card", label: "Tarjeta" },
  { value: "transfer", label: "Transferencia" },
  { value: "check", label: "Cheque" },
  { value: "other", label: "Otro" },
]

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

interface EditExpenseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense: Expense | null
  onExpenseUpdated: () => void
}

export function EditExpenseModal({ open, onOpenChange, expense, onExpenseUpdated }: EditExpenseModalProps) {
  const { toast } = useToast()
  const { userProfile } = useAuth()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    expense_date: "",
    category: "",
    supplier: "",
    payment_method: "",
    notes: "",
  })

  useEffect(() => {
    if (expense && open) {
      setFormData({
        description: expense.description || "",
        amount: expense.amount?.toString() || "",
        expense_date: expense.expense_date || "",
        category: expense.category || "",
        supplier: expense.supplier || "",
        payment_method: expense.payment_method || "",
        notes: expense.notes || "",
      })
    }
  }, [expense, open])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const resetForm = () => {
    setFormData({
      description: "",
      amount: "",
      expense_date: "",
      category: "",
      supplier: "",
      payment_method: "",
      notes: "",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!expense) return

    if (!userProfile?.organization_id) {
      toast({
        title: "Error",
        description: "No se pudo obtener la información de la organización",
        variant: "destructive",
      })
      return
    }

    if (!formData.description || !formData.amount || !formData.category || !formData.payment_method) {
      toast({
        title: "Error",
        description: "Por favor, completa todos los campos obligatorios",
        variant: "destructive",
      })
      return
    }

    const amount = Number.parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "El importe debe ser un número válido mayor que 0",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from("expenses")
        .update({
          description: formData.description,
          amount: amount,
          expense_date: formData.expense_date,
          category: formData.category,
          supplier: formData.supplier || null,
          payment_method: formData.payment_method,
          notes: formData.notes || null,
        })
        .eq("id", expense.id)

      if (error) throw error

      toast({
        title: "Gasto actualizado",
        description: "El gasto se ha actualizado correctamente",
      })

      onExpenseUpdated()
    } catch (error) {
      console.error("Error al actualizar gasto:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el gasto",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm()
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Gasto</DialogTitle>
          <DialogDescription>
            Modifica los datos del gasto. Los campos marcados con * son obligatorios.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="description">Descripción *</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Descripción del gasto"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Importe *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => handleInputChange("amount", e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expense_date">Fecha *</Label>
                <Input
                  id="expense_date"
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => handleInputChange("expense_date", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoría *</Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier">Proveedor</Label>
                <Input
                  id="supplier"
                  value={formData.supplier}
                  onChange={(e) => handleInputChange("supplier", e.target.value)}
                  placeholder="Nombre del proveedor (opcional)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_method">Método de Pago *</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => handleInputChange("payment_method", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar método de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethodOptions.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Notas adicionales (opcional)"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? "Guardando..." : "Actualizar Gasto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
