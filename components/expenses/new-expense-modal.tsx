"use client"

import type React from "react"
import { useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Save } from "lucide-react"
import { useAuth } from "@/app/contexts/auth-context"
import { useUsers } from "@/hooks/use-users"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const paymentMethodOptions = [
  { value: "cash", label: "Efectivo" },
  { value: "card", label: "Tarjeta" },
  { value: "transfer", label: "Transferencia" },
  { value: "check", label: "Cheque" },
  { value: "other", label: "Otro" },
]

interface NewExpenseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExpenseCreated: () => void
}

export function NewExpenseModal({ open, onOpenChange, onExpenseCreated }: NewExpenseModalProps) {
  const { toast } = useToast()
  const { userProfile } = useAuth()
  const { users, loading: usersLoading } = useUsers(userProfile?.organization_id)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    expense_date: new Date().toISOString().split("T")[0],
    user_id: "default_user_id", // Updated default value
    supplier_name: "",
    payment_method: "default_payment_method", // Updated default value
    notes: "",
  })

  // Filtrar usuarios con type=1 (profesionales)
  const professionalUsers = users.filter((user) => user.type === 1)

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
      expense_date: new Date().toISOString().split("T")[0],
      user_id: "default_user_id", // Updated default value
      supplier_name: "",
      payment_method: "default_payment_method", // Updated default value
      notes: "",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userProfile?.organization_id) {
      toast({
        title: "Error",
        description: "No se pudo obtener la información de la organización",
        variant: "destructive",
      })
      return
    }

    // Solo validar campos obligatorios: descripción, importe y fecha
    if (!formData.description || !formData.amount || !formData.expense_date) {
      toast({
        title: "Error",
        description: "Por favor, completa todos los campos obligatorios (descripción, importe y fecha)",
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
      const expenseData: any = {
        organization_id: userProfile.organization_id,
        description: formData.description,
        amount: amount,
        expense_date: formData.expense_date,
        status: "pending",
        is_deductible: false,
        vat_rate: 0,
        vat_amount: 0,
        created_by: userProfile.id,
      }

      // Solo agregar campos opcionales si tienen valor
      if (formData.user_id !== "default_user_id") {
        expenseData.user_id = formData.user_id
      }

      if (formData.supplier_name) {
        expenseData.supplier_name = formData.supplier_name
      }

      if (formData.payment_method !== "default_payment_method") {
        expenseData.payment_method = formData.payment_method
      }

      if (formData.notes) {
        expenseData.notes = formData.notes
      }

      const { error } = await supabase.from("expenses").insert(expenseData)

      if (error) throw error

      toast({
        title: "Gasto creado",
        description: "El gasto se ha registrado correctamente",
      })

      resetForm()
      onExpenseCreated()
      onOpenChange(false)
    } catch (error) {
      console.error("Error al crear gasto:", error)
      toast({
        title: "Error",
        description: "No se pudo crear el gasto",
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
          <DialogTitle>Nuevo Gasto</DialogTitle>
          <DialogDescription>
            Registra un nuevo gasto. Solo son obligatorios la descripción, importe y fecha.
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
                <Label htmlFor="user">Usuario (opcional)</Label>
                <Select value={formData.user_id} onValueChange={(value) => handleInputChange("user_id", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar usuario" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default_user_id">Sin asignar</SelectItem>
                    {professionalUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email || "Sin nombre"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier_name">Proveedor (opcional)</Label>
                <Input
                  id="supplier_name"
                  value={formData.supplier_name}
                  onChange={(e) => handleInputChange("supplier_name", e.target.value)}
                  placeholder="Nombre del proveedor"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_method">Método de Pago (opcional)</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => handleInputChange("payment_method", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar método de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default_payment_method">Sin especificar</SelectItem>
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
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Notas adicionales"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || usersLoading}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? "Guardando..." : "Guardar Gasto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
