"use client"

import React, { useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Save, Upload, X, Download, RefreshCw } from "lucide-react"
import { useAuth } from "@/app/contexts/auth-context"
import { useUsers } from "@/hooks/use-users"
import { StorageService } from "@/lib/storage-service"
import { calculateExpenseAmounts } from "@/types/expenses"
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
  const [uploadingFile, setUploadingFile] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [tempFilePath, setTempFilePath] = useState<string | null>(null)
  const [tempFileUrl, setTempFileUrl] = useState<string | null>(null)
  const [refreshingUrl, setRefreshingUrl] = useState(false)

  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    expense_date: new Date().toISOString().split("T")[0],
    user_id: "default_user_id",
    supplier_name: "",
    supplier_tax_id: "",
    payment_method: "default_payment_method",
    notes: "",
    vat_rate: "21",
    retention_rate: "0",
  })

  // Filtrar usuarios con type=1 (profesionales)
  const professionalUsers = users.filter((user) => user.type === 1)

  // Calcular importes automáticamente
  const calculations = React.useMemo(() => {
    const amount = Number.parseFloat(formData.amount) || 0
    const vatRate = Number.parseFloat(formData.vat_rate) || 0
    const retentionRate = Number.parseFloat(formData.retention_rate) || 0
    return calculateExpenseAmounts(amount, vatRate, retentionRate)
  }, [formData.amount, formData.vat_rate, formData.retention_rate])

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !userProfile?.organization_id) return

    setUploadingFile(true)
    try {
      const result = await StorageService.uploadExpenseReceipt(file, userProfile.organization_id)

      if (result.success && result.path) {
        setSelectedFile(file)
        setTempFilePath(result.path)
        setTempFileUrl(result.url || null)
        toast({
          title: "Archivo subido",
          description: "El documento se ha subido correctamente",
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Error al subir el archivo",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error inesperado al subir el archivo",
        variant: "destructive",
      })
    } finally {
      setUploadingFile(false)
    }
  }

  const handleRemoveFile = async () => {
    if (tempFilePath) {
      await StorageService.deleteExpenseReceipt(tempFilePath)
    }
    setSelectedFile(null)
    setTempFilePath(null)
    setTempFileUrl(null)
  }

  const handleDownloadFile = async () => {
    if (!tempFilePath) return

    setRefreshingUrl(true)
    try {
      const downloadUrl = await StorageService.getDownloadUrl(tempFilePath)
      if (downloadUrl) {
        window.open(downloadUrl, "_blank")
      } else {
        toast({
          title: "Error",
          description: "No se pudo generar la URL de descarga",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al descargar el archivo",
        variant: "destructive",
      })
    } finally {
      setRefreshingUrl(false)
    }
  }

  const handleRefreshUrl = async () => {
    if (!tempFilePath) return

    setRefreshingUrl(true)
    try {
      const newUrl = await StorageService.refreshSignedUrl(tempFilePath)
      if (newUrl) {
        setTempFileUrl(newUrl)
        toast({
          title: "URL actualizada",
          description: "La URL del archivo se ha actualizado",
        })
      } else {
        toast({
          title: "Error",
          description: "No se pudo actualizar la URL",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al actualizar la URL",
        variant: "destructive",
      })
    } finally {
      setRefreshingUrl(false)
    }
  }

  const resetForm = () => {
    setFormData({
      description: "",
      amount: "",
      expense_date: new Date().toISOString().split("T")[0],
      user_id: "default_user_id",
      supplier_name: "",
      supplier_tax_id: "",
      payment_method: "default_payment_method",
      notes: "",
      vat_rate: "21",
      retention_rate: "0",
    })
    setSelectedFile(null)
    setTempFilePath(null)
    setTempFileUrl(null)
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

    if (!formData.description || !formData.amount || !formData.expense_date) {
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
      const expenseData: any = {
        organization_id: userProfile.organization_id,
        description: formData.description,
        amount: calculations.baseAmount,
        expense_date: formData.expense_date,
        status: "pending",
        is_deductible: true,
        vat_rate: calculations.vatAmount > 0 ? Number.parseFloat(formData.vat_rate) : 0,
        vat_amount: calculations.vatAmount,
        retention_rate: calculations.retentionAmount > 0 ? Number.parseFloat(formData.retention_rate) : 0,
        retention_amount: calculations.retentionAmount,
        created_by: userProfile.id,
      }

      // Campos opcionales
      if (formData.user_id !== "default_user_id") {
        expenseData.user_id = formData.user_id
      }
      if (formData.supplier_name) {
        expenseData.supplier_name = formData.supplier_name
      }
      if (formData.supplier_tax_id) {
        expenseData.supplier_tax_id = formData.supplier_tax_id
      }
      if (formData.payment_method !== "default_payment_method") {
        expenseData.payment_method = formData.payment_method
      }
      if (formData.notes) {
        expenseData.notes = formData.notes
      }

      // Insertar gasto
      const { data: expense, error } = await supabase.from("expenses").insert(expenseData).select().single()

      if (error) throw error

      // Mover archivo temporal si existe
      if (tempFilePath && expense.id) {
        const moveResult = await StorageService.moveExpenseReceipt(
          tempFilePath,
          userProfile.organization_id,
          expense.id,
        )

        if (moveResult.success) {
          // Actualizar gasto con la nueva ruta del archivo
          await supabase
            .from("expenses")
            .update({
              receipt_path: moveResult.path,
              receipt_url: moveResult.url,
            })
            .eq("id", expense.id)
        }
      }

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
      if (tempFilePath) {
        StorageService.deleteExpenseReceipt(tempFilePath)
      }
      resetForm()
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Gasto</DialogTitle>
          <DialogDescription>Registra un nuevo gasto. Los campos marcados con * son obligatorios.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Información básica */}
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
                <Label htmlFor="amount">Importe Base *</Label>
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
                <Label htmlFor="user">Usuario</Label>
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
            </div>

            {/* Información del proveedor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier_name">Proveedor</Label>
                <Input
                  id="supplier_name"
                  value={formData.supplier_name}
                  onChange={(e) => handleInputChange("supplier_name", e.target.value)}
                  placeholder="Nombre del proveedor"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier_tax_id">NIF/CIF Proveedor</Label>
                <Input
                  id="supplier_tax_id"
                  value={formData.supplier_tax_id}
                  onChange={(e) => handleInputChange("supplier_tax_id", e.target.value)}
                  placeholder="12345678A"
                />
              </div>
            </div>

            {/* Cálculos fiscales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vat_rate">IVA (%)</Label>
                <Input
                  id="vat_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.vat_rate}
                  onChange={(e) => handleInputChange("vat_rate", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="retention_rate">Retención (%)</Label>
                <Input
                  id="retention_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.retention_rate}
                  onChange={(e) => handleInputChange("retention_rate", e.target.value)}
                />
              </div>
            </div>

            {/* Resumen de cálculos */}
            {formData.amount && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Resumen del Gasto</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Importe Base:</div>
                  <div className="font-medium">{calculations.baseAmount.toFixed(2)} €</div>
                  <div>IVA ({formData.vat_rate}%):</div>
                  <div className="font-medium">{calculations.vatAmount.toFixed(2)} €</div>
                  <div>Retención ({formData.retention_rate}%):</div>
                  <div className="font-medium text-red-600">-{calculations.retentionAmount.toFixed(2)} €</div>
                  <div className="border-t pt-1 font-semibold">Total:</div>
                  <div className="border-t pt-1 font-semibold">{calculations.totalAmount.toFixed(2)} €</div>
                </div>
              </div>
            )}

            {/* Método de pago */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_method">Método de Pago</Label>
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

            {/* Subida de archivo */}
            <div className="space-y-2">
              <Label>Documento/Factura</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                {selectedFile ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="text-sm">
                        <div className="font-medium">{selectedFile.name}</div>
                        <div className="text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleDownloadFile}
                        disabled={refreshingUrl}
                      >
                        {refreshingUrl ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRefreshUrl}
                        disabled={refreshingUrl}
                        title="Actualizar URL"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={handleRemoveFile}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="mx-auto h-8 w-8 text-gray-400" />
                    <div className="mt-2">
                      <label htmlFor="receipt-upload" className="cursor-pointer">
                        <span className="text-blue-600 hover:text-blue-500">Seleccionar archivo</span>
                        <input
                          id="receipt-upload"
                          type="file"
                          className="hidden"
                          accept=".jpg,.jpeg,.png,.pdf"
                          onChange={handleFileSelect}
                          disabled={uploadingFile}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">JPG, PNG o PDF </p>
                  </div>
                )}
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
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
            <Button type="submit" disabled={loading || usersLoading || uploadingFile}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? "Guardando..." : "Guardar Gasto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
