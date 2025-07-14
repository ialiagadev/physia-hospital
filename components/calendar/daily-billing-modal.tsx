"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { FileText, X, CheckCircle, Users, Euro, Clock, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/app/contexts/auth-context"

interface DailyBillingModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date
}

interface ClientAppointmentData {
  client_id: number
  client_name: string
  client_tax_id: string | null
  client_address: string | null
  client_postal_code: string | null
  client_city: string | null
  client_province: string | null
  client_email: string | null
  client_phone: string | null
  appointments: Array<{
    id: string
    start_time: string
    end_time: string
    professional_name: string
    consultation_name: string
    notes: string | null
    service_price?: number
    status: string
  }>
  total_amount: number
  has_complete_data: boolean
  missing_fields: string[]
}

interface BillingProgress {
  phase: "validating" | "generating" | "creating_pdfs" | "completed" | "error"
  current: number
  total: number
  message: string
  errors: string[]
}

export function DailyBillingModal({ isOpen, onClose, selectedDate }: DailyBillingModalProps) {
  const { userProfile } = useAuth()
  const { toast } = useToast()
  const [clientsData, setClientsData] = useState<ClientAppointmentData[]>([])
  const [selectedClients, setSelectedClients] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState<BillingProgress | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>("")

  // Cargar datos de citas del día
  useEffect(() => {
    if (isOpen && userProfile?.organization_id) {
      loadDayAppointments()
    }
  }, [isOpen, selectedDate, userProfile])

  const loadDayAppointments = async () => {
    setLoading(true)
    setDebugInfo("")

    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd")
      console.log(`🔍 Buscando TODAS las citas para la fecha: ${dateStr}`)

      // Obtener TODAS las citas del día (sin filtrar por status)
      const { data: appointments, error } = await supabase
        .from("appointments")
        .select(`
          id,
          start_time,
          end_time,
          notes,
          status,
          client_id,
          clients (
            id,
            name,
            tax_id,
            address,
            postal_code,
            city,
            province,
            email,
            phone
          ),
          professional:users!appointments_professional_id_fkey (
            name
          ),
          consultation:consultations (
            name
          ),
          services (
            price
          )
        `)
        .eq("organization_id", userProfile!.organization_id)
        .eq("date", dateStr)
        .order("client_id")

      if (error) {
        console.error("❌ Error en la consulta:", error)
        throw error
      }

      console.log(`📊 Total de citas encontradas:`, appointments?.length || 0)

      // Log de todos los estados encontrados
      const statusCounts: Record<string, number> = {}
      appointments?.forEach((apt: any) => {
        const status = apt.status || "sin_estado"
        statusCounts[status] = (statusCounts[status] || 0) + 1
      })

      console.log("📈 Estados de citas encontrados:", statusCounts)

      // Usar TODAS las citas (sin filtrar por estado)
      const allAppointments = appointments || []

      console.log(`✅ Procesando todas las citas: ${allAppointments.length}`)

      // Crear información de debug
      let debugText = `Fecha: ${dateStr}\n`
      debugText += `Total citas encontradas: ${appointments?.length || 0}\n`
      debugText += `Citas a procesar: ${allAppointments.length}\n`
      debugText += `Estados encontrados: ${Object.entries(statusCounts)
        .map(([status, count]) => `${status}(${count})`)
        .join(", ")}\n`

      if (allAppointments.length === 0) {
        debugText += `\n⚠️ No se encontraron citas para esta fecha.`
      } else {
        debugText += `\n✅ Se procesarán todas las citas independientemente de su estado.`
      }

      setDebugInfo(debugText)

      // Agrupar por cliente y validar datos
      const clientsMap = new Map<number, ClientAppointmentData>()

      allAppointments.forEach((apt: any) => {
        const client = apt.clients
        const clientId = client.id

        if (!clientsMap.has(clientId)) {
          // Validar datos requeridos para facturación
          const missingFields: string[] = []
          if (!client.name?.trim()) missingFields.push("Nombre")
          if (!client.tax_id?.trim()) missingFields.push("CIF/NIF")
          if (!client.address?.trim()) missingFields.push("Dirección")
          if (!client.postal_code?.trim()) missingFields.push("Código Postal")
          if (!client.city?.trim()) missingFields.push("Ciudad")

          clientsMap.set(clientId, {
            client_id: clientId,
            client_name: client.name || "Sin nombre",
            client_tax_id: client.tax_id,
            client_address: client.address,
            client_postal_code: client.postal_code,
            client_city: client.city,
            client_province: client.province,
            client_email: client.email,
            client_phone: client.phone,
            appointments: [],
            total_amount: 0,
            has_complete_data: missingFields.length === 0,
            missing_fields: missingFields,
          })
        }

        const clientData = clientsMap.get(clientId)!
        const servicePrice = apt.services?.price || 50 // Precio por defecto si no hay servicio

        clientData.appointments.push({
          id: apt.id,
          start_time: apt.start_time,
          end_time: apt.end_time,
          professional_name: apt.professional?.name || "Sin asignar",
          consultation_name: apt.consultation?.name || "Consulta general",
          notes: apt.notes,
          service_price: servicePrice,
          status: apt.status,
        })
        clientData.total_amount += servicePrice
      })

      const clientsArray = Array.from(clientsMap.values())
      setClientsData(clientsArray)

      // Seleccionar automáticamente clientes con datos completos
      const validClientIds = clientsArray.filter((client) => client.has_complete_data).map((client) => client.client_id)
      setSelectedClients(new Set(validClientIds))

      console.log(`🎯 Procesados ${clientsArray.length} clientes con citas del día`)
    } catch (error) {
      console.error("❌ Error loading day appointments:", error)
      setDebugInfo(`Error: ${error instanceof Error ? error.message : "Error desconocido"}`)
      toast({
        title: "Error",
        description: "No se pudieron cargar las citas del día",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClientToggle = (clientId: number, checked: boolean) => {
    const newSelected = new Set(selectedClients)
    if (checked) {
      newSelected.add(clientId)
    } else {
      newSelected.delete(clientId)
    }
    setSelectedClients(newSelected)
  }

  const handleSelectAll = () => {
    const validClientIds = clientsData.filter((client) => client.has_complete_data).map((client) => client.client_id)
    setSelectedClients(new Set(validClientIds))
  }

  const handleDeselectAll = () => {
    setSelectedClients(new Set())
  }

  const generateInvoices = async () => {
    if (selectedClients.size === 0) return

    setGenerating(true)
    const selectedClientsArray = Array.from(selectedClients)

    setProgress({
      phase: "validating",
      current: 0,
      total: selectedClientsArray.length,
      message: "Validando datos de clientes...",
      errors: [],
    })

    try {
      // Importar las funciones necesarias de la página de nueva factura
      const { generateUniqueInvoiceNumber } = await import("@/lib/invoice-utils")
      const { generatePdf } = await import("@/lib/pdf-generator")
      const { savePdfToStorage } = await import("@/lib/storage-utils")

      // Obtener datos de la organización (igual que en new invoice)
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", userProfile!.organization_id)
        .single()

      if (orgError || !orgData) {
        throw new Error("No se pudieron obtener los datos de la organización")
      }

      // Fase 1: Validación
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setProgress((prev) => ({
        ...prev!,
        phase: "generating",
        message: "Generando facturas...",
      }))

      // Fase 2: Generar facturas usando la misma lógica que new invoice
      const errors: string[] = []
      let successCount = 0

      for (let i = 0; i < selectedClientsArray.length; i++) {
        const clientId = selectedClientsArray[i]
        const clientData = clientsData.find((c) => c.client_id === clientId)!

        setProgress((prev) => ({
          ...prev!,
          current: i + 1,
          message: `Generando factura para ${clientData.client_name}...`,
        }))

        try {
          // Usar la misma función de generación de número que new invoice
          const { invoiceNumberFormatted, newInvoiceNumber } = await generateUniqueInvoiceNumber(
            userProfile!.organization_id,
            "normal",
          )

          // Preparar líneas de factura con la misma estructura que new invoice
          const invoiceLines = clientData.appointments.map((apt, index) => ({
            id: crypto.randomUUID(),
            description: `${apt.consultation_name} - ${apt.professional_name} (${apt.start_time}-${apt.end_time}) [${apt.status}]`,
            quantity: 1,
            unit_price: apt.service_price || 50,
            discount_percentage: 0,
            vat_rate: 21,
            irpf_rate: 0,
            retention_rate: 0,
            line_amount: apt.service_price || 50,
            professional_id: null,
          }))

          // Calcular totales usando la misma lógica que new invoice
          const subtotalAmount = invoiceLines.reduce((sum, line) => {
            return sum + line.quantity * line.unit_price
          }, 0)

          const totalDiscountAmount = invoiceLines.reduce((sum, line) => {
            const lineSubtotal = line.quantity * line.unit_price
            const lineDiscount = (lineSubtotal * line.discount_percentage) / 100
            return sum + lineDiscount
          }, 0)

          const baseAmount = subtotalAmount - totalDiscountAmount

          const vatAmount = invoiceLines.reduce((sum, line) => {
            const lineSubtotal = line.quantity * line.unit_price
            const lineDiscount = (lineSubtotal * line.discount_percentage) / 100
            const lineBase = lineSubtotal - lineDiscount
            const lineVat = (lineBase * line.vat_rate) / 100
            return sum + lineVat
          }, 0)

          const irpfAmount = invoiceLines.reduce((sum, line) => {
            const lineSubtotal = line.quantity * line.unit_price
            const lineDiscount = (lineSubtotal * line.discount_percentage) / 100
            const lineBase = lineSubtotal - lineDiscount
            const lineIrpf = (lineBase * line.irpf_rate) / 100
            return sum + lineIrpf
          }, 0)

          const retentionAmount = invoiceLines.reduce((sum, line) => {
            const lineSubtotal = line.quantity * line.unit_price
            const lineDiscount = (lineSubtotal * line.discount_percentage) / 100
            const lineBase = lineSubtotal - lineDiscount
            const lineRetention = (lineBase * line.retention_rate) / 100
            return sum + lineRetention
          }, 0)

          const totalAmount = baseAmount + vatAmount - irpfAmount - retentionAmount

          // Preparar datos de la factura con la misma estructura que new invoice
          const clientInfoText = `Cliente: ${clientData.client_name}, CIF/NIF: ${clientData.client_tax_id}, Dirección: ${clientData.client_address}, ${clientData.client_postal_code} ${clientData.client_city}, ${clientData.client_province}`
          const additionalNotes = `Factura generada automáticamente para citas del ${format(selectedDate, "dd/MM/yyyy", { locale: es })} (incluye todas las citas independientemente del estado)`
          const fullNotes = clientInfoText + "\n\n" + additionalNotes

          // Crear factura en la base de datos
          const { data: invoiceData, error: invoiceError } = await supabase
            .from("invoices")
            .insert({
              organization_id: userProfile!.organization_id,
              invoice_number: invoiceNumberFormatted,
              client_id: clientId,
              issue_date: format(selectedDate, "yyyy-MM-dd"),
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

          // Crear líneas de factura con la misma estructura que new invoice
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

          // Actualizar número de factura en la organización (igual que new invoice)
          const { error: updateOrgError } = await supabase
            .from("organizations")
            .update({ last_invoice_number: newInvoiceNumber })
            .eq("id", userProfile!.organization_id)

          if (updateOrgError) {
            console.error("Error updating organization:", updateOrgError)
          }

          // Generar PDF usando la misma función que new invoice
          try {
            const newInvoice = {
              id: invoiceData.id,
              invoice_number: invoiceNumberFormatted,
              issue_date: format(selectedDate, "yyyy-MM-dd"),
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
                name: clientData.client_name,
                tax_id: clientData.client_tax_id || "",
                address: clientData.client_address || "",
                postal_code: clientData.client_postal_code || "",
                city: clientData.client_city || "",
                province: clientData.client_province || "",
                country: "España",
                email: clientData.client_email || "",
                phone: clientData.client_phone || "",
                client_type: "private",
              },
            }

            // Generar PDF pero no descargarlo automáticamente
            const pdfBlob = await generatePdf(newInvoice, invoiceLines, `factura-${invoiceNumberFormatted}.pdf`, false)

            // Guardar PDF en storage si se generó correctamente
            if (pdfBlob && pdfBlob instanceof Blob) {
              try {
                const pdfUrl = await savePdfToStorage(
                  pdfBlob,
                  `factura-${invoiceNumberFormatted}.pdf`,
                  userProfile!.organization_id,
                )

                // Actualizar la factura con la URL del PDF
                await supabase.from("invoices").update({ pdf_url: pdfUrl }).eq("id", invoiceData.id)
              } catch (pdfError) {
                console.error("Error saving PDF:", pdfError)
                // No fallar por error de PDF
              }
            }
          } catch (pdfError) {
            console.error("Error generating PDF:", pdfError)
            // No fallar por error de PDF
          }

          successCount++
        } catch (error) {
          console.error(`Error generating invoice for client ${clientData.client_name}:`, error)
          errors.push(`${clientData.client_name}: ${error instanceof Error ? error.message : "Error desconocido"}`)
        }

        // Pequeña pausa para no saturar
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      // Fase 3: Completado
      setProgress({
        phase: "completed",
        current: selectedClientsArray.length,
        total: selectedClientsArray.length,
        message: `Proceso completado. ${successCount} facturas generadas correctamente.`,
        errors,
      })

      if (successCount > 0) {
        toast({
          title: "Facturas generadas",
          description: `Se generaron ${successCount} facturas correctamente`,
        })
      }

      if (errors.length > 0) {
        toast({
          title: "Algunos errores encontrados",
          description: `${errors.length} facturas no se pudieron generar`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error in billing process:", error)
      setProgress({
        phase: "error",
        current: 0,
        total: selectedClientsArray.length,
        message: "Error en el proceso de facturación",
        errors: [error instanceof Error ? error.message : "Error desconocido"],
      })
    } finally {
      setGenerating(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  const getTotalSelected = () => {
    return clientsData
      .filter((client) => selectedClients.has(client.client_id))
      .reduce((sum, client) => sum + client.total_amount, 0)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Facturación del Día</h2>
                <p className="text-sm text-gray-600">
                  {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                </p>
                <p className="text-xs text-blue-600">Incluye todas las citas independientemente del estado</p>
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
                <p className="text-gray-600">Cargando citas del día...</p>
              </div>
            </div>
          ) : clientsData.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay citas</h3>
              <p className="text-gray-600">No se encontraron citas para este día.</p>

              {/* Debug Info */}
              {debugInfo && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-left">
                  <h4 className="font-medium text-yellow-800 mb-2">🔍 Información de Debug:</h4>
                  <pre className="text-xs text-yellow-700 whitespace-pre-wrap font-mono">{debugInfo}</pre>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Progress Bar */}
              {progress && (
                <Card className="mb-6">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">
                      {progress.phase === "completed" ? "Proceso Completado" : "Generando Facturas..."}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Progress value={(progress.current / progress.total) * 100} className="h-2" />
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>{progress.message}</span>
                        <span>
                          {progress.current} de {progress.total}
                        </span>
                      </div>
                      {progress.errors.length > 0 && (
                        <div className="mt-3 p-3 bg-red-50 rounded-lg">
                          <h4 className="text-sm font-medium text-red-800 mb-2">Errores encontrados:</h4>
                          <ul className="text-sm text-red-700 space-y-1">
                            {progress.errors.map((error, index) => (
                              <li key={index}>• {error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-600">Total Clientes</p>
                        <p className="text-lg font-semibold">{clientsData.length}</p>
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
                        <p className="text-lg font-semibold">{selectedClients.size}</p>
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
              </div>

              {/* Controls */}
              <div className="flex gap-2 mb-4">
                <Button variant="outline" size="sm" onClick={handleSelectAll} disabled={generating}>
                  Seleccionar Válidos
                </Button>
                <Button variant="outline" size="sm" onClick={handleDeselectAll} disabled={generating}>
                  Deseleccionar Todos
                </Button>
              </div>

              {/* Clients List */}
              <div className="space-y-3">
                {clientsData.map((client) => (
                  <Card
                    key={client.client_id}
                    className={`${
                      !client.has_complete_data
                        ? "border-red-200 bg-red-50"
                        : selectedClients.has(client.client_id)
                          ? "border-blue-200 bg-blue-50"
                          : ""
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedClients.has(client.client_id)}
                          onCheckedChange={(checked) => handleClientToggle(client.client_id, checked as boolean)}
                          disabled={!client.has_complete_data || generating}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium text-gray-900">{client.client_name}</h3>
                            {client.has_complete_data ? (
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

                          {!client.has_complete_data && (
                            <div className="mb-3 p-2 bg-red-100 rounded text-sm text-red-800">
                              <strong>Faltan datos:</strong> {client.missing_fields.join(", ")}
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                            <div>
                              <p>
                                <strong>CIF/NIF:</strong> {client.client_tax_id || "No especificado"}
                              </p>
                              <p>
                                <strong>Email:</strong> {client.client_email || "No especificado"}
                              </p>
                            </div>
                            <div>
                              <p>
                                <strong>Teléfono:</strong> {client.client_phone || "No especificado"}
                              </p>
                              <p>
                                <strong>Citas:</strong> {client.appointments.length}
                              </p>
                            </div>
                          </div>

                          <div className="flex justify-between items-center">
                            <div className="text-sm text-gray-600">
                              {client.appointments.map((apt, index) => (
                                <span key={apt.id} className="block">
                                  {apt.start_time}-{apt.end_time} ({apt.professional_name})
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {apt.status}
                                  </Badge>
                                </span>
                              ))}
                            </div>
                            <div className="text-lg font-semibold text-green-600">
                              {formatCurrency(client.total_amount)}
                            </div>
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
        {!loading && clientsData.length > 0 && (
          <div className="border-t bg-gray-50 px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {selectedClients.size} clientes seleccionados • {formatCurrency(getTotalSelected())} total
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} disabled={generating}>
                  Cancelar
                </Button>
                <Button
                  onClick={generateInvoices}
                  disabled={selectedClients.size === 0 || generating}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  {generating ? "Generando..." : `Generar ${selectedClients.size} Facturas`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
