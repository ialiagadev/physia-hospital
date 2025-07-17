"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  FileText,
  X,
  CheckCircle,
  Users,
  Euro,
  Clock,
  AlertTriangle,
  Download,
  Zap,
  Package,
  Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/app/contexts/auth-context"
import JSZip from "jszip"
import type { GroupActivity } from "@/app/contexts/group-activities-context"

interface GroupActivityBillingModalProps {
  isOpen: boolean
  onClose: () => void
  activity: GroupActivity
  service: any
  organizationId: number
  onBillingComplete?: () => void
}

interface ParticipantBillingData {
  participant_id: string
  client_id: number
  client_name: string
  client_tax_id: string | null
  client_address: string | null
  client_postal_code: string | null
  client_city: string | null
  client_province: string | null
  client_email: string | null
  client_phone: string | null
  status: string
  has_complete_data: boolean
  missing_fields: string[]
}

interface BillingProgress {
  phase: "validating" | "generating" | "creating_pdfs" | "creating_zip" | "completed" | "error"
  current: number
  total: number
  message: string
  errors: string[]
  currentClient?: string
  zipProgress?: number
}

interface GeneratedInvoice {
  invoiceNumber: string
  clientName: string
  amount: number
  pdfBlob: Blob
  invoiceId: string
}

// Componente de progreso mejorado
function EnhancedProgressBar({ progress }: { progress: BillingProgress }) {
  const getPhaseIcon = () => {
    switch (progress.phase) {
      case "validating":
        return <CheckCircle className="h-5 w-5 text-blue-500 animate-pulse" />
      case "generating":
        return <Zap className="h-5 w-5 text-yellow-500 animate-bounce" />
      case "creating_pdfs":
        return <FileText className="h-5 w-5 text-green-500 animate-pulse" />
      case "creating_zip":
        return <Package className="h-5 w-5 text-purple-500 animate-spin" />
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "error":
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getPhaseColor = () => {
    switch (progress.phase) {
      case "validating":
        return "bg-blue-500"
      case "generating":
        return "bg-yellow-500"
      case "creating_pdfs":
        return "bg-green-500"
      case "creating_zip":
        return "bg-purple-500"
      case "completed":
        return "bg-green-600"
      case "error":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getPhaseLabel = () => {
    switch (progress.phase) {
      case "validating":
        return "Validando datos"
      case "generating":
        return "Generando facturas"
      case "creating_pdfs":
        return "Creando PDFs"
      case "creating_zip":
        return "Empaquetando ZIP"
      case "completed":
        return "¡Completado!"
      case "error":
        return "Error"
      default:
        return "Procesando"
    }
  }

  const progressPercentage =
    progress.phase === "creating_zip" && progress.zipProgress
      ? progress.zipProgress
      : (progress.current / progress.total) * 100

  return (
    <Card className="mb-6 border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          {getPhaseIcon()}
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900">{getPhaseLabel()}</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {progress.currentClient ? `Procesando: ${progress.currentClient}` : progress.message}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{Math.round(progressPercentage)}%</div>
            <div className="text-xs text-gray-500">
              {progress.current} de {progress.total}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative">
            <Progress value={progressPercentage} className="h-3 bg-gray-200" />
            <div
              className={`absolute top-0 left-0 h-3 rounded-full transition-all duration-500 ${getPhaseColor()}`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs">
            {["validating", "generating", "creating_pdfs", "creating_zip", "completed"].map((phase, index) => {
              const isActive = progress.phase === phase
              const isCompleted =
                ["validating", "generating", "creating_pdfs", "creating_zip", "completed"].indexOf(progress.phase) >
                index
              return (
                <div
                  key={phase}
                  className={`flex flex-col items-center gap-1 ${
                    isActive ? "text-blue-600 font-medium" : isCompleted ? "text-green-600" : "text-gray-400"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isActive ? "bg-blue-500 animate-pulse" : isCompleted ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                  <span className="capitalize">
                    {phase === "creating_pdfs" ? "PDFs" : phase === "creating_zip" ? "ZIP" : phase.replace("_", " ")}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="bg-white/70 rounded-lg p-3 border border-blue-100">
            <p className="text-sm text-gray-700 font-medium">{progress.message}</p>
            {progress.phase === "creating_zip" && (
              <div className="mt-2 flex items-center gap-2 text-xs text-purple-600">
                <Package className="h-3 w-3 animate-spin" />
                <span>Comprimiendo archivos PDF...</span>
              </div>
            )}
          </div>
          {progress.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-red-800 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Errores encontrados ({progress.errors.length})
              </h4>
              <div className="max-h-24 overflow-y-auto">
                <ul className="text-sm text-red-700 space-y-1">
                  {progress.errors.map((error, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">•</span>
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function GroupActivityBillingModal({
  isOpen,
  onClose,
  activity,
  service,
  organizationId,
  onBillingComplete,
}: GroupActivityBillingModalProps) {
  const { userProfile } = useAuth()
  const { toast } = useToast()
  const [participantsData, setParticipantsData] = useState<ParticipantBillingData[]>([])
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState<BillingProgress | null>(null)
  const [generatedInvoices, setGeneratedInvoices] = useState<GeneratedInvoice[]>([])
  const [existingInvoices, setExistingInvoices] = useState<
    Map<
      number,
      {
        invoice_number: string
        created_at: string
        id: string
      }
    >
  >(new Map())

  // Cargar y procesar datos de participantes
  useEffect(() => {
    if (isOpen) {
      loadParticipantsData()
    }
  }, [isOpen])

  const loadParticipantsData = async () => {
    setLoading(true)
    try {
      // Obtener participantes válidos (attended + registered)
      const validParticipants =
        activity.participants?.filter((p) => p.status === "attended" || p.status === "registered") || []

      const participantsWithData: ParticipantBillingData[] = validParticipants.map((participant) => {
        const client = participant.client

        // Validar datos requeridos
        const missingFields: string[] = []
        if (!client?.name?.trim()) missingFields.push("Nombre")
        if (!(client as any)?.tax_id?.trim()) missingFields.push("CIF/NIF")
        if (!(client as any)?.address?.trim()) missingFields.push("Dirección")
        if (!(client as any)?.postal_code?.trim()) missingFields.push("Código Postal")
        if (!(client as any)?.city?.trim()) missingFields.push("Ciudad")

        const hasCompleteData = missingFields.length === 0

        return {
          participant_id: participant.id,
          client_id: client?.id || 0,
          client_name: client?.name || "Sin nombre",
          client_tax_id: (client as any)?.tax_id || null,
          client_address: (client as any)?.address || null,
          client_postal_code: (client as any)?.postal_code || null,
          client_city: (client as any)?.city || null,
          client_province: (client as any)?.province || null,
          client_email: (client as any)?.email || null,
          client_phone: (client as any)?.phone || null,
          status: participant.status,
          has_complete_data: hasCompleteData,
          missing_fields: missingFields,
        }
      })

      setParticipantsData(participantsWithData)

      // Verificar facturas existentes ANTES de seleccionar
      const clientIds = participantsWithData.map((p) => p.client_id)
      await checkExistingInvoices(clientIds, format(new Date(activity.date), "yyyy-MM-dd"))
    } catch (error) {
      console.error("Error loading participants data:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de los participantes",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // ✅ AÑADIR useEffect para selección automática después de que ambos estados estén listos
  useEffect(() => {
    if (participantsData.length > 0 && !loading) {
      // Seleccionar automáticamente participantes con datos completos Y que NO estén ya facturados
      const participantsToSelect = participantsData
        .filter((participant) => participant.has_complete_data && !existingInvoices.has(participant.client_id))
        .map((participant) => participant.participant_id)

      console.log("Auto-seleccionando participantes:", participantsToSelect.length)
      setSelectedParticipants(new Set(participantsToSelect))
    }
  }, [participantsData, existingInvoices, loading])

  // ✅ MODIFICAR checkExistingInvoices para NO hacer la selección automática aquí
  const checkExistingInvoices = async (clientIds: number[], dateStr: string) => {
    if (!userProfile?.organization_id || clientIds.length === 0) return

    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, created_at, client_id")
        .eq("organization_id", userProfile.organization_id)
        .eq("group_activity_id", activity.id) // ✅ CAMBIO: usar group_activity_id específico
        .in("client_id", clientIds)
        .order("created_at", { ascending: true })

      if (error) throw error

      const invoicesMap = new Map()
      data?.forEach((invoice) => {
        // Solo guardar la primera factura de cada cliente para esta actividad específica
        if (!invoicesMap.has(invoice.client_id)) {
          invoicesMap.set(invoice.client_id, {
            invoice_number: invoice.invoice_number,
            created_at: invoice.created_at,
            id: invoice.id,
          })
        }
      })

      setExistingInvoices(invoicesMap)
      // ✅ REMOVER la selección automática de aquí - se hace en el useEffect
    } catch (error) {
      console.error("Error checking existing invoices:", error)
    }
  }

  const handleParticipantToggle = (participantId: string, checked: boolean) => {
    const participant = participantsData.find((p) => p.participant_id === participantId)
    if (participant && existingInvoices.has(participant.client_id)) {
      return // No permitir seleccionar participantes ya facturados
    }

    const newSelected = new Set(selectedParticipants)
    if (checked) {
      newSelected.add(participantId)
    } else {
      newSelected.delete(participantId)
    }
    setSelectedParticipants(newSelected)
  }

  const handleSelectAll = () => {
    const validParticipantIds = participantsData
      .filter((p) => p.has_complete_data && !existingInvoices.has(p.client_id))
      .map((p) => p.participant_id)
    setSelectedParticipants(new Set(validParticipantIds))
  }

  const handleDeselectAll = () => {
    setSelectedParticipants(new Set())
  }

  const generateInvoices = async () => {
    if (selectedParticipants.size === 0) return

    setGenerating(true)
    setGeneratedInvoices([])
    const selectedParticipantsArray = Array.from(selectedParticipants)

    setProgress({
      phase: "validating",
      current: 0,
      total: selectedParticipantsArray.length,
      message: "🔍 Validando datos de participantes y preparando el proceso...",
      errors: [],
    })

    try {
      // Importar funciones necesarias
      const { generateUniqueInvoiceNumber } = await import("@/lib/invoice-utils")
      const { generatePdf } = await import("@/lib/pdf-generator")
      const { savePdfToStorage } = await import("@/lib/storage-utils")

      // Obtener datos de la organización
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", organizationId)
        .single()

      if (orgError || !orgData) {
        throw new Error("No se pudieron obtener los datos de la organización")
      }

      // Fase de generación
      setProgress((prev) => ({
        ...prev!,
        phase: "generating",
        message: "⚡ Iniciando generación de facturas para actividad grupal...",
      }))

      const errors: string[] = []
      let successCount = 0
      const invoicesForZip: GeneratedInvoice[] = []

      for (let i = 0; i < selectedParticipantsArray.length; i++) {
        const participantId = selectedParticipantsArray[i]
        const participantData = participantsData.find((p) => p.participant_id === participantId)!

        setProgress((prev) => ({
          ...prev!,
          current: i + 1,
          message: `📄 Generando factura ${i + 1} de ${selectedParticipantsArray.length}`,
          currentClient: participantData.client_name,
        }))

        try {
          // Generar número de factura único
          const { invoiceNumberFormatted, newInvoiceNumber } = await generateUniqueInvoiceNumber(
            organizationId,
            "normal",
          )

          // ✅ CORREGIR: Usar valores por defecto para los impuestos con ??
          const serviceVatRate = service.vat_rate ?? 0
          const serviceIrpfRate = service.irpf_rate ?? 0
          const serviceRetentionRate = service.retention_rate ?? 0

          // Preparar línea de factura para la actividad grupal
          const invoiceLines = [
            {
              id: crypto.randomUUID(),
              description: `Actividad Grupal: ${activity.name} - ${format(new Date(activity.date), "dd/MM/yyyy", { locale: es })} (${activity.start_time}-${activity.end_time}) - ${activity.professional?.name || "Sin profesional"}`,
              quantity: 1,
              unit_price: service.price,
              discount_percentage: 0,
              vat_rate: serviceVatRate, // ✅ USAR CON VALOR POR DEFECTO
              irpf_rate: serviceIrpfRate, // ✅ USAR CON VALOR POR DEFECTO
              retention_rate: serviceRetentionRate, // ✅ USAR CON VALOR POR DEFECTO
              line_amount: service.price,
              professional_id: null,
            },
          ]

          // Calcular totales
          const subtotalAmount = service.price
          const totalDiscountAmount = 0
          const baseAmount = subtotalAmount - totalDiscountAmount
          const vatAmount = (baseAmount * serviceVatRate) / 100 // ✅ USAR CON VALOR POR DEFECTO
          const irpfAmount = (baseAmount * serviceIrpfRate) / 100 // ✅ USAR CON VALOR POR DEFECTO
          const retentionAmount = (baseAmount * serviceRetentionRate) / 100 // ✅ USAR CON VALOR POR DEFECTO
          const totalAmount = baseAmount + vatAmount - irpfAmount - retentionAmount

          // Preparar notas de la factura
          const clientInfoText = `Cliente: ${participantData.client_name}, CIF/NIF: ${participantData.client_tax_id}, Dirección: ${participantData.client_address}, ${participantData.client_postal_code} ${participantData.client_city}, ${participantData.client_province}`
          const additionalNotes = `Factura generada para actividad grupal "${activity.name}" del ${format(new Date(activity.date), "dd/MM/yyyy", { locale: es })}\nServicio: ${service.name} - ${service.price}€\nEstado del participante: ${participantData.status === "attended" ? "Asistió" : "Registrado"}`
          const fullNotes = clientInfoText + "\n\n" + additionalNotes

          // Crear factura en la base de datos
          const { data: invoiceData, error: invoiceError } = await supabase
            .from("invoices")
            .insert({
              organization_id: organizationId,
              invoice_number: invoiceNumberFormatted,
              client_id: participantData.client_id,
              group_activity_id: activity.id, // ✅ NUEVO CAMPO
              issue_date: format(new Date(activity.date), "yyyy-MM-dd"),
              invoice_type: "normal",
              status: "sent",
              base_amount: baseAmount,
              vat_amount: vatAmount,
              irpf_amount: irpfAmount,
              retention_amount: retentionAmount,
              total_amount: totalAmount,
              discount_amount: totalDiscountAmount,
              notes: fullNotes,
              created_by: userProfile!.id,
            })
            .select()
            .single()

          if (invoiceError) throw invoiceError

          // ✅ ACTUALIZACIÓN OPTIMISTA INMEDIATA
          setExistingInvoices((prev) =>
            new Map(prev).set(participantData.client_id, {
              invoice_number: invoiceNumberFormatted,
              created_at: invoiceData.created_at,
              id: invoiceData.id,
            }),
          )

          // ✅ REMOVER DE SELECCIONADOS
          setSelectedParticipants((prev) => {
            const newSet = new Set(prev)
            newSet.delete(participantId)
            return newSet
          })

          // Crear líneas de factura
          const invoiceLines_db = invoiceLines.map((line) => ({
            invoice_id: invoiceData.id,
            description: line.description,
            quantity: line.quantity,
            unit_price: line.unit_price,
            discount_percentage: line.discount_percentage,
            vat_rate: line.vat_rate,
            irpf_rate: line.irpf_rate,
            retention_rate: line.retention_rate,
            line_amount: line.line_amount,
            professional_id: line.professional_id ? Number.parseInt(line.professional_id) : null,
          }))

          const { error: linesError } = await supabase.from("invoice_lines").insert(invoiceLines_db)
          if (linesError) {
            console.error("Error saving invoice lines:", linesError)
          }

          // Actualizar número de factura en la organización
          const { error: updateOrgError } = await supabase
            .from("organizations")
            .update({ last_invoice_number: newInvoiceNumber })
            .eq("id", organizationId)

          if (updateOrgError) {
            console.error("Error updating organization:", updateOrgError)
          }

          // Fase de creación de PDFs
          setProgress((prev) => ({
            ...prev!,
            phase: "creating_pdfs",
            message: `📄 Generando PDF para ${participantData.client_name}...`,
            currentClient: participantData.client_name,
          }))

          // Generar PDF
          try {
            const newInvoice = {
              id: invoiceData.id,
              invoice_number: invoiceNumberFormatted,
              issue_date: format(new Date(activity.date), "yyyy-MM-dd"),
              invoice_type: "normal" as const,
              status: "sent",
              base_amount: baseAmount,
              vat_amount: vatAmount,
              irpf_amount: irpfAmount,
              retention_amount: retentionAmount,
              total_amount: totalAmount,
              discount_amount: totalDiscountAmount,
              notes: fullNotes,
              signature: null,
              organization: {
                name: orgData.name,
                tax_id: orgData.tax_id,
                address: orgData.address,
                postal_code: orgData.postal_code,
                city: orgData.city,
                province: orgData.province,
                country: orgData.country,
                email: orgData.email,
                phone: orgData.phone,
                invoice_prefix: orgData.invoice_prefix,
                logo_url: orgData.logo_url,
                logo_path: orgData.logo_path,
              },
              client_data: {
                name: participantData.client_name,
                tax_id: participantData.client_tax_id || "",
                address: participantData.client_address || "",
                postal_code: participantData.client_postal_code || "",
                city: participantData.client_city || "",
                province: participantData.client_province || "",
                country: "España",
                email: participantData.client_email || "",
                phone: participantData.client_phone || "",
                client_type: "private",
              },
            }

            const pdfBlob = await generatePdf(newInvoice, invoiceLines, `factura-${invoiceNumberFormatted}.pdf`, false)

            if (pdfBlob && pdfBlob instanceof Blob) {
              // Guardar para el ZIP
              invoicesForZip.push({
                invoiceNumber: invoiceNumberFormatted,
                clientName: participantData.client_name,
                amount: totalAmount,
                pdfBlob: pdfBlob,
                invoiceId: invoiceData.id,
              })

              // Guardar PDF en storage
              try {
                const pdfUrl = await savePdfToStorage(pdfBlob, `factura-${invoiceNumberFormatted}.pdf`, organizationId)
                await supabase.from("invoices").update({ pdf_url: pdfUrl }).eq("id", invoiceData.id)
              } catch (pdfError) {
                console.error("Error saving PDF:", pdfError)
              }
            }
          } catch (pdfError) {
            console.error("Error generating PDF:", pdfError)
          }

          successCount++
        } catch (error) {
          console.error(`Error generating invoice for participant ${participantData.client_name}:`, error)
          errors.push(`${participantData.client_name}: ${error instanceof Error ? error.message : "Error desconocido"}`)
        }

        // Pequeña pausa para no saturar
        await new Promise((resolve) => setTimeout(resolve, 300))
      }

      // Crear ZIP con todas las facturas
      if (invoicesForZip.length > 0) {
        setProgress((prev) => ({
          ...prev!,
          phase: "creating_zip",
          message: "📦 Empaquetando facturas en archivo ZIP...",
          zipProgress: 0,
        }))

        const zip = new JSZip()

        for (let i = 0; i < invoicesForZip.length; i++) {
          const invoice = invoicesForZip[i]
          setProgress((prev) => ({
            ...prev!,
            zipProgress: ((i + 1) / invoicesForZip.length) * 100,
            message: `📦 Añadiendo ${invoice.invoiceNumber} al ZIP... (${i + 1}/${invoicesForZip.length})`,
          }))

          const cleanClientName = invoice.clientName
            .replace(/[^a-zA-Z0-9\s]/g, "")
            .replace(/\s+/g, "_")
            .substring(0, 30)
          const fileName = `${invoice.invoiceNumber}_${cleanClientName}.pdf`
          zip.file(fileName, invoice.pdfBlob)

          await new Promise((resolve) => setTimeout(resolve, 100))
        }

        setProgress((prev) => ({
          ...prev!,
          message: "🗜️ Comprimiendo archivo ZIP...",
          zipProgress: 95,
        }))

        const zipBlob = await zip.generateAsync({
          type: "blob",
          compression: "DEFLATE",
          compressionOptions: { level: 6 },
        })

        setProgress((prev) => ({
          ...prev!,
          message: "💾 ZIP listo para descarga...",
          zipProgress: 100,
        }))

        setGeneratedInvoices(invoicesForZip)
      }

      // ✅ RE-CONSULTA FINAL PARA CONFIRMAR
      await checkExistingInvoices(
        participantsData.map((p) => p.client_id),
        format(new Date(activity.date), "yyyy-MM-dd"),
      )

      // Completado
      setProgress({
        phase: "completed",
        current: selectedParticipantsArray.length,
        total: selectedParticipantsArray.length,
        message: `🎉 ¡Proceso completado exitosamente! ${successCount} facturas generadas para la actividad "${activity.name}". Usa el botón "Descargar ZIP" para obtener el archivo.`,
        errors,
      })

      if (successCount > 0) {
        toast({
          title: "🎉 Facturas generadas",
          description: `Se generaron ${successCount} facturas para la actividad grupal. Usa el botón para descargar el ZIP`,
        })
      }

      if (errors.length > 0) {
        toast({
          title: "⚠️ Algunos errores encontrados",
          description: `${errors.length} facturas no se pudieron generar`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error in group billing process:", error)
      setProgress({
        phase: "error",
        current: 0,
        total: selectedParticipantsArray.length,
        message: "❌ Error en el proceso de facturación grupal",
        errors: [error instanceof Error ? error.message : "Error desconocido"],
      })
    } finally {
      setGenerating(false)
    }
  }

  const downloadZipAgain = async () => {
    if (generatedInvoices.length === 0) return

    try {
      const zip = new JSZip()

      generatedInvoices.forEach((invoice) => {
        const cleanClientName = invoice.clientName
          .replace(/[^a-zA-Z0-9\s]/g, "")
          .replace(/\s+/g, "_")
          .substring(0, 30)
        const fileName = `${invoice.invoiceNumber}_${cleanClientName}.pdf`
        zip.file(fileName, invoice.pdfBlob)
      })

      const zipBlob = await zip.generateAsync({ type: "blob" })
      const dateStr = format(new Date(activity.date), "yyyy-MM-dd")
      const zipFileName = `facturas_actividad_${activity.name.replace(/[^a-zA-Z0-9]/g, "_")}_${dateStr}_${generatedInvoices.length}_facturas.zip`

      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = zipFileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "📦 ZIP descargado",
        description: `Se descargó el archivo con ${generatedInvoices.length} facturas de la actividad`,
      })
    } catch (error) {
      console.error("Error downloading ZIP:", error)
      toast({
        title: "❌ Error",
        description: "No se pudo descargar el archivo ZIP",
        variant: "destructive",
      })
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  const getTotalSelected = () => {
    return selectedParticipants.size * service.price
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "attended":
        return <Badge className="bg-green-100 text-green-800">Asistió</Badge>
      case "registered":
        return <Badge className="bg-blue-100 text-blue-800">Registrado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="bg-purple-50 px-6 py-4 border-b border-purple-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Facturación de Actividad Grupal</h2>
                <p className="text-sm text-gray-600">
                  {activity.name} - {format(new Date(activity.date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2 animate-spin" />
                <p className="text-gray-600">Cargando datos de participantes...</p>
              </div>
            </div>
          ) : participantsData.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay participantes</h3>
              <p className="text-gray-600">No se encontraron participantes válidos para facturar.</p>
            </div>
          ) : (
            <>
              {/* Barra de progreso */}
              {progress && <EnhancedProgressBar progress={progress} />}

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-600" />
                      <div>
                        <p className="text-sm text-gray-600">Total Participantes</p>
                        <p className="text-lg font-semibold">{participantsData.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-600">Seleccionados</p>
                        <p className="text-lg font-semibold">{selectedParticipants.size}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Euro className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-600">Total Seleccionado</p>
                        <p className="text-lg font-semibold">{formatCurrency(getTotalSelected())}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-600">Precio por Factura</p>
                        <p className="text-lg font-semibold">{formatCurrency(service.price)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Activity Info */}
              <Card className="mb-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Información de la Actividad
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Servicio:</span>
                      <p>{service.name}</p>
                    </div>
                    <div>
                      <span className="font-medium">Precio:</span>
                      <p>{formatCurrency(service.price)}</p>
                    </div>
                    <div>
                      <span className="font-medium">Horario:</span>
                      <p>
                        {activity.start_time} - {activity.end_time}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">Profesional:</span>
                      <p>{activity.professional?.name || "Sin asignar"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Controls */}
              <div className="flex gap-2 mb-4">
                <Button variant="outline" size="sm" onClick={handleSelectAll} disabled={generating}>
                  Seleccionar Válidos ({participantsData.filter((p) => p.has_complete_data).length})
                </Button>
                <Button variant="outline" size="sm" onClick={handleDeselectAll} disabled={generating}>
                  Deseleccionar Todos
                </Button>
              </div>

              {/* Participants List */}
              <div className="space-y-3">
                {participantsData.map((participant) => (
                  <Card
                    key={participant.participant_id}
                    className={`${
                      !participant.has_complete_data
                        ? "border-red-200 bg-red-50"
                        : selectedParticipants.has(participant.participant_id)
                          ? "border-purple-200 bg-purple-50"
                          : ""
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedParticipants.has(participant.participant_id)}
                          onCheckedChange={(checked) =>
                            handleParticipantToggle(participant.participant_id, checked as boolean)
                          }
                          disabled={
                            !participant.has_complete_data || generating || existingInvoices.has(participant.client_id)
                          }
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium text-gray-900">{participant.client_name}</h3>
                            {getStatusBadge(participant.status)}
                            {existingInvoices.has(participant.client_id) ? (
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Ya facturado
                              </Badge>
                            ) : participant.has_complete_data ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Datos completos
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Datos incompletos
                              </Badge>
                            )}
                          </div>

                          {!participant.has_complete_data && (
                            <div className="mb-3 p-2 bg-red-100 rounded text-sm text-red-800">
                              <strong>Faltan datos:</strong> {participant.missing_fields.join(", ")}
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                            <div>
                              <p>
                                <strong>CIF/NIF:</strong> {participant.client_tax_id || "No especificado"}
                              </p>
                              <p>
                                <strong>Email:</strong> {participant.client_email || "No especificado"}
                              </p>
                            </div>
                            <div>
                              <p>
                                <strong>Teléfono:</strong> {participant.client_phone || "No especificado"}
                              </p>
                              <p>
                                <strong>Ciudad:</strong> {participant.client_city || "No especificado"}
                              </p>
                            </div>
                          </div>

                          <div className="flex justify-between items-center">
                            <div className="text-sm text-gray-600">
                              Participante {participant.status === "attended" ? "que asistió" : "registrado"}
                            </div>
                            <div className="text-lg font-semibold text-green-600">{formatCurrency(service.price)}</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && participantsData.length > 0 && (
          <div className="border-t bg-gray-50 px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {selectedParticipants.size} participantes seleccionados • {formatCurrency(getTotalSelected())} total
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} disabled={generating}>
                  Cancelar
                </Button>
                <Button
                  onClick={generateInvoices}
                  disabled={selectedParticipants.size === 0 || generating}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  {generating ? "Generando..." : `Generar ${selectedParticipants.size} Facturas`}
                </Button>
                {progress?.phase === "completed" && generatedInvoices.length > 0 && (
                  <Button onClick={downloadZipAgain} variant="outline" className="gap-2 bg-transparent">
                    <Download className="h-4 w-4" />
                    Descargar ZIP ({generatedInvoices.length})
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
