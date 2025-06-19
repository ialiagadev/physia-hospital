"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getCurrentInvoiceNumbering } from "@/lib/invoice-utils"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import type { InvoiceType } from "@/lib/invoice-types"

interface InvoiceNumberConfigModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: number
  invoiceType: InvoiceType
  onConfigSaved: () => void
}

export function InvoiceNumberConfigModal({
  open,
  onOpenChange,
  organizationId,
  invoiceType,
  onConfigSaved,
}: InvoiceNumberConfigModalProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [config, setConfig] = useState({
    prefix: "",
    paddingLength: 4,
    currentNumber: 0,
    nextNumber: 1,
    userOverride: "",
  })
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Cargar la configuración actual cuando se abre el modal
  useEffect(() => {
    if (open && organizationId) {
      loadCurrentConfig()
      setHasUnsavedChanges(false) // Resetear cambios sin guardar al abrir
    }
  }, [open, organizationId, invoiceType])

  const loadCurrentConfig = async () => {
    setIsLoading(true)
    try {
      const numbering = await getCurrentInvoiceNumbering(organizationId, invoiceType)
      setConfig({
        prefix: numbering.prefix,
        paddingLength: numbering.paddingLength,
        currentNumber: numbering.currentNumber,
        nextNumber: numbering.nextNumber,
        userOverride: "",
      })
    } catch (error) {
      console.error("Error al cargar configuración:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar la configuración actual",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getFieldNameForInvoiceType = (type: InvoiceType): string => {
    switch (type) {
      case "rectificativa":
        return "last_rectificative_invoice_number"
      case "simplificada":
        return "last_simplified_invoice_number"
      case "normal":
      default:
        return "last_invoice_number"
    }
  }

  const getNextNumberPreview = (): string => {
    const numberToUse = config.userOverride
      ? Math.max(Number.parseInt(config.userOverride) || 0, config.currentNumber)
      : config.currentNumber

    const nextNum = numberToUse + 1
    const paddedNumber = nextNum.toString().padStart(config.paddingLength, "0")

    switch (invoiceType) {
      case "rectificativa":
        const currentYear = new Date().getFullYear()
        return `REC${currentYear}${paddedNumber}`
      case "simplificada":
        return `SIMP${paddedNumber}`
      case "normal":
      default:
        return `${config.prefix}${paddedNumber}`
    }
  }

  const handleUserOverrideChange = (value: string) => {
    setConfig((prev) => ({ ...prev, userOverride: value }))
    setHasUnsavedChanges(value !== "" && Number.parseInt(value) > config.currentNumber)
  }

  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (confirm("Tienes cambios sin guardar. ¿Estás seguro de que quieres cerrar sin guardar?")) {
        setHasUnsavedChanges(false)
        onOpenChange(false)
      }
    } else {
      onOpenChange(false)
    }
  }

  const saveConfig = async () => {
    setIsSaving(true)
    try {
      // Verificar que la organización existe antes de intentar actualizar
      const { data: orgCheck, error: orgCheckError } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("id", organizationId)
        .single()

      if (orgCheckError || !orgCheck) {
        throw new Error(
          `No se encontró la organización con ID ${organizationId}. Error: ${orgCheckError?.message || "Organización no existe"}`,
        )
      }

      // Validar que tenemos un organizationId válido
      if (!organizationId || organizationId === 0) {
        throw new Error("ID de organización no válido")
      }

      const updateData: any = {
        invoice_prefix: config.prefix,
        invoice_padding_length: config.paddingLength,
      }

      // Solo actualizar el número si el usuario puso un override
      if (config.userOverride && Number.parseInt(config.userOverride) > config.currentNumber) {
        const fieldName = getFieldNameForInvoiceType(invoiceType)
        updateData[fieldName] = Number.parseInt(config.userOverride)
      }

      const { data, error } = await supabase.from("organizations").update(updateData).eq("id", organizationId).select()

      if (error) {
        throw error
      }

      if (!data || data.length === 0) {
        throw new Error("No se encontró la organización para actualizar")
      }

      toast({
        title: "Configuración guardada",
        description: "La configuración de numeración se ha actualizado correctamente.",
      })

      setHasUnsavedChanges(false)
      onConfigSaved()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "Error",
        description: `No se pudo guardar la configuración: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configuración de Numeración</DialogTitle>
          <DialogDescription>
            Ajusta la numeración para facturas {invoiceType === "normal" ? "normales" : invoiceType + "s"}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Cargando configuración...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {invoiceType === "normal" && (
              <div className="space-y-2">
                <Label htmlFor="config_prefix">Prefijo de Facturas</Label>
                <Input
                  id="config_prefix"
                  value={config.prefix}
                  onChange={(e) => setConfig((prev) => ({ ...prev, prefix: e.target.value }))}
                  placeholder="Ej: FACT, FAC, INV"
                  maxLength={10}
                />
                <p className="text-xs text-muted-foreground">
                  Prefijo que aparecerá al inicio de cada número de factura normal
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="config_padding">Longitud de Dígitos</Label>
              <Input
                id="config_padding"
                type="number"
                min="1"
                max="10"
                value={config.paddingLength}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    paddingLength: Number.parseInt(e.target.value) || 4,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Número de dígitos para la parte numérica (se rellenará con ceros)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Numeración Actual</Label>
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm">
                  <span className="font-medium">Último número usado:</span> {config.currentNumber}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Próximo número será:</span>{" "}
                  <span className="font-mono font-medium">{getNextNumberPreview()}</span>
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="user_override">Cambiar Próximo Número (Opcional)</Label>
              <Input
                id="user_override"
                type="number"
                min={config.currentNumber + 1}
                value={config.userOverride}
                onChange={(e) => handleUserOverrideChange(e.target.value)}
                placeholder={`Mínimo: ${config.currentNumber + 1}`}
              />
              <p className="text-xs text-muted-foreground">
                Si quieres saltar a un número específico, introdúcelo aquí. Debe ser mayor que {config.currentNumber}.
              </p>
            </div>

            {config.userOverride && Number.parseInt(config.userOverride) > config.currentNumber && (
              <>
                <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                  <p className="text-sm font-medium text-blue-800 mb-1">Vista previa del cambio:</p>
                  <p className="text-sm text-blue-700">
                    El próximo número será: <span className="font-mono font-medium">{getNextNumberPreview()}</span>
                  </p>
                </div>

                <div className="p-4 bg-amber-50 rounded-md border border-amber-200">
                  <div className="flex items-start space-x-2">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-amber-800">Advertencia: Cambio de numeración</h4>
                      <p className="text-sm text-amber-700 mt-1">
                        Al cambiar la numeración, se saltarán números en la secuencia. Esto puede afectar la correlación
                        legal de las facturas. Asegúrate de que este cambio cumple con los requisitos fiscales de tu
                        país.
                      </p>
                      <p className="text-sm text-amber-700 mt-2 font-medium">
                        Se recomienda consultar con tu asesor fiscal antes de realizar este cambio.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={saveConfig} disabled={isSaving || isLoading}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
