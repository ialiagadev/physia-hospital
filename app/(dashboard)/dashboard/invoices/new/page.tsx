"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { generatePdf } from "@/lib/pdf-generator"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
// En la parte superior del archivo, importar las funciones necesarias
import { generateUniqueInvoiceNumber } from "@/lib/invoice-utils"
import { saveBase64ImageToStorage, savePdfToStorage } from "@/lib/storage-utils" // Añadido savePdfToStorage
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Trash2, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SignaturePad } from "@/components/signature-pad"
import { useToast } from "@/hooks/use-toast"
// Reemplaza esta línea:
// import type { InvoiceWithClientData } from "@/types/supabase-joins"

// Por esta línea más simple:
// No necesitamos importar el tipo específico, usaremos any para esta consulta
import { Loader2 } from "lucide-react"

// Interfaces
interface Organization {
  id: number
  name: string
  last_invoice_number: number
  invoice_prefix: string
  invoice_number_format?: string
  invoice_padding_length?: number
  simplified_invoice_format?: string
  rectificative_invoice_format?: string
  logo_url?: string | null
  logo_path?: string | null
}

// Actualizar la interfaz InvoiceLine para incluir el campo de profesional
interface InvoiceLine {
  id: string
  description: string
  quantity: number
  unit_price: number
  vat_rate: number
  irpf_rate: number
  retention_rate: number
  line_amount: number
  professional_id: string | null
}

// Añadir interfaces para los clientes
interface Client {
  id: number
  name: string
  tax_id: string
  address: string
  postal_code: string
  city: string
  province: string
  country: string
  email: string | null
  phone: string | null
  client_type: string
  dir3_codes: any | null
}

// Interfaz para los servicios
interface Service {
  id: number
  name: string
  description: string | null
  price: number
  vat_rate: number
  irpf_rate: number
  retention_rate: number
  category: string | null
}

// Interfaz para los profesionales
interface Professional {
  id: number
  name: string
  active: boolean
}

// Modificar el componente para incluir la selección de clientes
export default function NewInvoicePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Estados principales
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [existingInvoices, setExistingInvoices] = useState<
    Array<{ id: number; invoice_number: string; issue_date: string; total_amount: number; client_name: string }>
  >([])

  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null)
  const [isNewClient, setIsNewClient] = useState(true)
  const [selectedClientId, setSelectedClientId] = useState<string>("")
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false)
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null)
  const [suggestedInvoiceNumber, setSuggestedInvoiceNumber] = useState("")
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true)
  const [invoiceNumberConfigOpen, setInvoiceNumberConfigOpen] = useState(false)
  const [isSavingConfig, setIsSavingConfig] = useState(false)
  const [signature, setSignature] = useState<string | null>(null)

  // Estado para el tipo de factura - IMPORTANTE: Solo valores válidos de BD
  const [invoiceType, setInvoiceType] = useState<"normal" | "rectificativa" | "simplificada">("normal")

  // Campos específicos para facturas rectificativas
  const [rectificativeData, setRectificativeData] = useState({
    original_invoice_number: "",
    rectification_reason: "",
    rectification_type: "cancellation" as "cancellation" | "amount_correction",
  })

  // Estado para la configuración de numeración de facturas
  const [invoiceConfig, setInvoiceConfig] = useState({
    prefix: "",
    format: "simple",
    paddingLength: 4,
    lastInvoiceNumber: 0,
  })

  // Modificar el estado inicial de las líneas de factura para incluir el profesional
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLine[]>([
    {
      id: crypto.randomUUID(),
      description: "",
      quantity: 1,
      unit_price: 0,
      vat_rate: 21,
      irpf_rate: 0,
      retention_rate: 0,
      line_amount: 0,
      professional_id: null,
    },
  ])
  const [debugInfo, setDebugInfo] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    organization_id: "",
    issue_date: new Date().toISOString().split("T")[0],
    notes: "",
    // Datos del cliente
    client_name: "",
    client_tax_id: "",
    client_address: "",
    client_postal_code: "",
    client_city: "",
    client_province: "",
    client_country: "España",
    client_email: "",
    client_phone: "",
    client_type: "private",
    dir3_codes: {
      CentroGestor: "",
      UnidadTramitadora: "",
      OficinaContable: "",
    },
  })

  // Calcular totales
  const baseAmount = invoiceLines.reduce((sum, line) => {
    const lineAmount = line.line_amount || 0
    return sum + lineAmount
  }, 0)

  const vatAmount = invoiceLines.reduce((sum, line) => {
    const lineAmount = line.line_amount || 0
    const vatRate = line.vat_rate || 0
    return sum + (lineAmount * vatRate) / 100
  }, 0)

  // Actualizar el cálculo de totales para incluir la retención
  const irpfAmount = invoiceLines.reduce((sum, line) => {
    const lineAmount = line.line_amount || 0
    const irpfRate = line.irpf_rate || 0
    return sum + (lineAmount * irpfRate) / 100
  }, 0)

  // Añadir cálculo para la retención
  const retentionAmount = invoiceLines.reduce((sum, line) => {
    const lineAmount = line.line_amount || 0
    const retentionRate = line.retention_rate || 0
    return sum + (lineAmount * retentionRate) / 100
  }, 0)

  // Actualizar el cálculo del total para incluir la retención
  const totalAmount = baseAmount + vatAmount - irpfAmount - retentionAmount

  // Reemplazar todo el useEffect inicial con:
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingInitialData(true)
        setError(null)

        // Obtener organizaciones
        const { data: orgsData, error: orgsError } = await supabase.from("organizations").select("*").order("name")

        if (orgsError) {
          throw new Error(`Error al obtener las organizaciones: ${orgsError.message}`)
        }

        if (!orgsData || orgsData.length === 0) {
          throw new Error("No se encontraron organizaciones")
        }

        setOrganizations(orgsData)

        // Seleccionar la primera organización por defecto
        const firstOrg = orgsData[0]
        setFormData((prev) => ({ ...prev, organization_id: firstOrg.id.toString() }))
        setSelectedOrganization(firstOrg)

        // Después de setSelectedOrganization(firstOrg), añade:
        setInvoiceConfig({
          prefix: firstOrg.invoice_prefix || "FACT",
          format: "simple",
          paddingLength: firstOrg.invoice_padding_length || 4,
          lastInvoiceNumber: firstOrg.last_invoice_number || 0,
        })

        // Cargar datos para esta organización
        await fetchClients(firstOrg.id)
        await fetchServices(firstOrg.id)
        await fetchProfessionals(firstOrg.id)
        await fetchExistingInvoices(firstOrg.id)

        // Generar número sugerido
        try {
          const { invoiceNumberFormatted } = await generateUniqueInvoiceNumber(firstOrg.id, invoiceType)
          setSuggestedInvoiceNumber(invoiceNumberFormatted)
        } catch (error) {
          console.error("Error al generar número de factura sugerido:", error)
          setSuggestedInvoiceNumber(`ERROR-${Date.now()}`)
          setError(`Error al generar número de factura: ${error instanceof Error ? error.message : String(error)}`)
        }
      } catch (err) {
        console.error("Error al cargar datos iniciales:", err)
        setError(err instanceof Error ? err.message : "Error al cargar los datos")
      } finally {
        setIsLoadingInitialData(false)
      }
    }

    fetchData()
  }, [])

  // Función para cargar los clientes de una organización
  const fetchClients = async (organizationId: number) => {
    try {
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("*")
        .eq("organization_id", organizationId)
        .order("name")

      if (clientsError) {
        throw new Error("Error al obtener los clientes")
      }

      setClients(clientsData || [])
    } catch (err) {
      console.error("Error al cargar clientes:", err)
    }
  }

  // Función para cargar los servicios de una organización
  const fetchServices = async (organizationId: number) => {
    try {
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("active", true)
        .order("name")

      if (servicesError) {
        throw new Error("Error al obtener los servicios")
      }

      setServices(servicesData || [])
    } catch (err) {
      console.error("Error al cargar servicios:", err)
    }
  }

  // Función para cargar los profesionales de una organización
  const fetchProfessionals = async (organizationId: number) => {
    try {
      const { data: professionalsData, error: professionalsError } = await supabase
        .from("professionals")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("active", true)
        .order("name")

      if (professionalsError) {
        throw new Error("Error al obtener los profesionales")
      }

      setProfessionals(professionalsData || [])
    } catch (err) {
      console.error("Error al cargar profesionales:", err)
    }
  }

  const fetchExistingInvoices = async (organizationId: number) => {
    try {
      console.log(`Cargando facturas existentes para organización ${organizationId}...`)
      const { data: invoicesData, error: invoicesError } = await supabase
        .from("invoices")
        .select(`
        id,
        invoice_number,
        issue_date,
        total_amount,
        clients(name)
      `)
        .eq("organization_id", organizationId)
        .eq("invoice_type", "normal")
        .order("issue_date", { ascending: false })

      if (invoicesError) {
        console.error("Error al obtener facturas:", invoicesError)
        throw new Error(`Error al obtener las facturas: ${invoicesError.message}`)
      }

      const formattedInvoices = ((invoicesData as any[]) || []).map((invoice) => {
        let clientName = "Cliente no encontrado"

        if (invoice.clients) {
          if (Array.isArray(invoice.clients)) {
            // Si clients es un array, tomar el primer elemento
            clientName =
              invoice.clients.length > 0 ? invoice.clients[0]?.name || "Cliente no encontrado" : "Cliente no encontrado"
          } else if (typeof invoice.clients === "object" && invoice.clients.name) {
            // Si clients es un objeto, acceder directamente a name
            clientName = invoice.clients.name
          }
        }

        return {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          issue_date: invoice.issue_date,
          total_amount: invoice.total_amount,
          client_name: clientName,
        }
      })

      console.log(`Se encontraron ${formattedInvoices.length} facturas`)
      setExistingInvoices(formattedInvoices)
    } catch (err) {
      console.error("Error completo al cargar facturas:", err)
      toast({
        title: "Error al cargar facturas",
        description: err instanceof Error ? err.message : "Error al cargar las facturas",
        variant: "destructive",
      })
    }
  }

  // Efectos para actualizar datos cuando cambia la organización o tipo de factura
  useEffect(() => {
    if (formData.organization_id) {
      const org = organizations.find((o) => o.id.toString() === formData.organization_id) || null
      setSelectedOrganization(org)

      if (org) {
        fetchClients(org.id)
        fetchServices(org.id)
        fetchProfessionals(org.id)
        fetchExistingInvoices(org.id)
      }
    }
  }, [formData.organization_id, organizations])

  // Actualizar el número de factura cuando cambia el tipo o la organización
  useEffect(() => {
    const updateSuggestedNumber = async () => {
      if (!selectedOrganization) return

      try {
        setError(null)
        const { invoiceNumberFormatted } = await generateUniqueInvoiceNumber(selectedOrganization.id, invoiceType)
        setSuggestedInvoiceNumber(invoiceNumberFormatted)
      } catch (error) {
        console.error("Error al generar número de factura sugerido:", error)
        setSuggestedInvoiceNumber(`ERROR-${Date.now()}`)
        setError(`Error al generar número de factura: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    updateSuggestedNumber()
  }, [invoiceType, selectedOrganization])

  // Manejar la selección de un cliente existente
  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId)

    if (clientId) {
      const selectedClient = clients.find((c) => c.id.toString() === clientId)
      if (selectedClient) {
        // Autocompletar los datos del cliente
        setFormData((prev) => ({
          ...prev,
          client_name: selectedClient.name,
          client_tax_id: selectedClient.tax_id,
          client_address: selectedClient.address,
          client_postal_code: selectedClient.postal_code,
          client_city: selectedClient.city,
          client_province: selectedClient.province,
          client_country: selectedClient.country || "España",
          client_email: selectedClient.email || "",
          client_phone: selectedClient.phone || "",
          client_type: selectedClient.client_type,
          dir3_codes: selectedClient.dir3_codes || {
            CentroGestor: "",
            UnidadTramitadora: "",
            OficinaContable: "",
          },
        }))
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleDir3Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      dir3_codes: { ...prev.dir3_codes, [name]: value },
    }))
  }

  const handleLineChange = (id: string, field: string, value: string | number) => {
    setInvoiceLines((prev) =>
      prev.map((line) => {
        if (line.id === id) {
          const updatedLine = { ...line, [field]: value }

          // Recalcular el importe de la línea si cambia cantidad o precio
          if (field === "quantity" || field === "unit_price") {
            const quantity = Number.parseFloat(updatedLine.quantity.toString()) || 0
            const unitPrice = Number.parseFloat(updatedLine.unit_price.toString()) || 0
            updatedLine.line_amount = quantity * unitPrice
          }

          return updatedLine
        }
        return line
      }),
    )
  }

  // Modificar la función addLine para incluir el campo de profesional
  const addLine = () => {
    setInvoiceLines((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        description: "",
        quantity: 1,
        unit_price: 0,
        vat_rate: 21,
        irpf_rate: 0,
        retention_rate: 0,
        line_amount: 0,
        professional_id: null,
      },
    ])
  }

  const removeLine = (id: string) => {
    if (invoiceLines.length > 1) {
      setInvoiceLines((prev) => prev.filter((line) => line.id !== id))
    }
  }

  // Función para abrir el diálogo de selección de servicio
  const openServiceDialog = (lineId: string) => {
    setSelectedLineId(lineId)
    setServiceDialogOpen(true)
  }

  // Función para aplicar el servicio seleccionado a la línea
  const applyServiceToLine = (service: Service) => {
    if (selectedLineId) {
      setInvoiceLines((prev) =>
        prev.map((line) => {
          if (line.id === selectedLineId) {
            const updatedLine = {
              ...line,
              description: service.name + (service.description ? ` - ${service.description}` : ""),
              unit_price: service.price,
              vat_rate: service.vat_rate,
              irpf_rate: service.irpf_rate,
              retention_rate: service.retention_rate,
              line_amount: line.quantity * service.price,
            }
            return updatedLine
          }
          return line
        }),
      )
      setServiceDialogOpen(false)
      setSelectedLineId(null)
    }
  }

  const handleProfessionalSelect = (lineId: string, professionalId: string | null) => {
    setInvoiceLines((prev) =>
      prev.map((line) => {
        if (line.id === lineId) {
          return { ...line, professional_id: professionalId }
        }
        return line
      }),
    )
  }

  // Función para manejar el cambio de firma
  const handleSignatureChange = (signatureDataUrl: string | null) => {
    setSignature(signatureDataUrl)
  }

  // En la función handleSubmit, asegurémonos de que se incluyen todos los datos de la organización
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setDebugInfo(null)

    try {
      if (!selectedOrganization) {
        throw new Error("No se pudo obtener la información de la organización")
      }

      if (!formData.client_name || !formData.client_tax_id) {
        throw new Error("Debes introducir al menos el nombre y CIF/NIF del cliente")
      }

      // Obtener datos completos de la organización
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", formData.organization_id)
        .single()

      if (orgError || !orgData) {
        console.error("Error al obtener datos de la organización:", orgError)
        throw new Error("No se pudieron obtener los datos completos de la organización")
      }

      // Generar un número de factura único
      const { invoiceNumberFormatted, newInvoiceNumber } = await generateUniqueInvoiceNumber(
        Number.parseInt(formData.organization_id),
        invoiceType,
      )

      // Variable para almacenar el ID del cliente
      let clientId: number | null = null

      // Si es un cliente nuevo, guardarlo primero
      if (isNewClient) {
        const { data: newClient, error: clientError } = await supabase
          .from("clients")
          .insert({
            organization_id: Number.parseInt(formData.organization_id),
            name: formData.client_name,
            tax_id: formData.client_tax_id,
            address: formData.client_address,
            postal_code: formData.client_postal_code,
            city: formData.client_city,
            province: formData.client_province,
            country: formData.client_country,
            client_type: formData.client_type,
            email: formData.client_email || null,
            phone: formData.client_phone || null,
            dir3_codes: formData.client_type === "public" ? formData.dir3_codes : null,
          })
          .select()
          .single()

        if (clientError) {
          console.error("Error al crear el cliente:", clientError)
        } else if (newClient) {
          clientId = newClient.id
        }
      } else {
        // Si es un cliente existente, usar su ID
        clientId = selectedClientId ? Number.parseInt(selectedClientId) : null
      }

      // Preparar los datos del cliente como texto para las notas
      const clientInfoText = `Cliente: ${formData.client_name}, CIF/NIF: ${formData.client_tax_id}, Dirección: ${formData.client_address}, ${formData.client_postal_code} ${formData.client_city}, ${formData.client_province}`

      // Notas adicionales si las hay
      const additionalNotes = formData.notes ? `\n\nNotas adicionales: ${formData.notes}` : ""

      // Notas completas
      const fullNotes = clientInfoText + additionalNotes

      // Variable para almacenar la URL de la firma
      let signatureUrl: string | null = null

      // Si hay firma, intentar guardarla en Storage (sin requerir autenticación)
      if (signature) {
        try {
          const timestamp = Date.now()
          const organizationId = formData.organization_id
          // Asegurarse de que la ruta comienza con 'signatures/'
          const path = `signatures/${organizationId}/${invoiceNumberFormatted}_${timestamp}.png`

          console.log("Intentando guardar firma en Storage:", path)

          // Intentar guardar la firma, pero no fallar si no se puede
          signatureUrl = await saveBase64ImageToStorage(signature, path)

          if (!signatureUrl) {
            console.warn("No se pudo guardar la firma en Storage, se usará la firma en base64 para el PDF")
          } else {
            console.log("Firma guardada correctamente en Storage:", signatureUrl)
          }
        } catch (error) {
          console.error("Error al guardar la firma:", error)
          // Continuar con la firma en base64 para el PDF
        }
      }

      // Debug del logo antes de crear la factura
      console.log("Datos de organización para PDF:", {
        logo_url: orgData.logo_url,
        logo_path: orgData.logo_path,
        name: orgData.name,
      })

      // Crear la factura en local primero (sin esperar a Supabase)
      // Actualizar el objeto de factura para incluir la retención y la firma
      const newInvoice = {
        id: Date.now(), // ID temporal
        organization_id: Number.parseInt(formData.organization_id),
        invoice_number: invoiceNumberFormatted,
        client_id: clientId,
        issue_date: formData.issue_date,
        invoice_type: invoiceType,
        status: "draft",
        base_amount: baseAmount,
        vat_amount: vatAmount,
        irpf_amount: irpfAmount,
        retention_amount: retentionAmount,
        total_amount: totalAmount,
        notes: fullNotes,
        signature: signature, // Usar la firma base64 para el PDF
        // Añadir campos específicos para facturas rectificativas en el objeto del PDF
        ...(invoiceType === "rectificativa" && {
          original_invoice_number: rectificativeData.original_invoice_number,
          rectification_reason: rectificativeData.rectification_reason,
          rectification_type: rectificativeData.rectification_type,
        }),
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
          name: formData.client_name,
          tax_id: formData.client_tax_id,
          address: formData.client_address,
          postal_code: formData.client_postal_code,
          city: formData.client_city,
          province: formData.client_province,
          country: formData.client_country,
          email: formData.client_email,
          phone: formData.client_phone,
          client_type: formData.client_type,
        },
      }

      // En handleSubmit, reemplazar la sección de generación de PDF con:
      // Generar el PDF de forma asíncrona
      const pdfBlob = await generatePdf(newInvoice, invoiceLines, `factura-${invoiceNumberFormatted}.pdf`, false)

      // Variable para almacenar la URL del PDF
      let pdfUrl: string | null = null

      // Verificar que el Blob se generó correctamente
      if (pdfBlob && pdfBlob instanceof Blob) {
        try {
          console.log("PDF Blob generado correctamente, tamaño:", pdfBlob.size, "bytes")

          // Guardar el PDF en Supabase Storage
          pdfUrl = await savePdfToStorage(pdfBlob, `factura-${invoiceNumberFormatted}.pdf`)

          // Descargar el PDF manualmente para el usuario
          const url = URL.createObjectURL(pdfBlob)
          const a = document.createElement("a")
          a.href = url
          a.download = `factura-${invoiceNumberFormatted}.pdf`
          a.click()

          // Limpiar el objeto URL creado
          setTimeout(() => URL.revokeObjectURL(url), 100)

          if (pdfUrl) {
            console.log("PDF guardado correctamente en Storage:", pdfUrl)
          } else {
            console.warn("No se pudo guardar el PDF en Storage, pero se ha descargado localmente")
          }
        } catch (pdfError) {
          console.error("Error al guardar el PDF en Storage:", pdfError)

          // Asegurar que el usuario pueda descargar el PDF aunque falle el guardado
          const url = URL.createObjectURL(pdfBlob)
          const a = document.createElement("a")
          a.href = url
          a.download = `factura-${invoiceNumberFormatted}.pdf`
          a.click()
          setTimeout(() => URL.revokeObjectURL(url), 100)

          toast({
            title: "Error al guardar el PDF en el servidor",
            description: "El PDF se ha descargado localmente, pero no se pudo guardar en el servidor.",
            variant: "destructive",
          })
        }
      } else {
        console.error("No se pudo generar el PDF como Blob")

        // Intentar generar y descargar el PDF directamente como fallback
        generatePdf(newInvoice, invoiceLines, `factura-${invoiceNumberFormatted}.pdf`, true)

        toast({
          title: "Error al procesar el PDF",
          description: "Se ha intentado descargar el PDF, pero no se pudo guardar en el servidor.",
          variant: "destructive",
        })
      }

      // Ahora actualizamos la base de datos en segundo plano
      // Actualizar el último número de factura en la organización
      const { error: updateOrgError } = await supabase
        .from("organizations")
        .update({ last_invoice_number: newInvoiceNumber })
        .eq("id", selectedOrganization.id)

      if (updateOrgError) {
        console.error("Error al actualizar el número de factura:", updateOrgError)
        // No fallar por esto, pero loggearlo
      }

      // Variable para almacenar el ID de la factura original (para rectificativas)
      let originalInvoiceId: number | null = null

      // Si es una factura rectificativa, obtener el ID de la factura original
      if (invoiceType === "rectificativa" && rectificativeData.original_invoice_number) {
        console.log(
          `🔍 Buscando factura original: ${rectificativeData.original_invoice_number} en organización ${formData.organization_id}`,
        )

        const { data: originalInvoice, error: originalError } = await supabase
          .from("invoices")
          .select("id, invoice_number")
          .eq("invoice_number", rectificativeData.original_invoice_number)
          .eq("organization_id", Number.parseInt(formData.organization_id))
          .single()

        console.log("Resultado de búsqueda:", { originalInvoice, originalError })

        if (originalError) {
          console.error("Error al buscar factura original:", originalError)
          throw new Error(`Error al buscar la factura original: ${originalError.message}`)
        }

        if (!originalInvoice) {
          console.error("Factura original no encontrada")
          throw new Error(`No se pudo encontrar la factura original: ${rectificativeData.original_invoice_number}`)
        }

        originalInvoiceId = originalInvoice.id
        console.log(
          `✅ Factura original encontrada: ${rectificativeData.original_invoice_number} -> ID: ${originalInvoiceId}`,
        )
      } else if (invoiceType === "rectificativa") {
        throw new Error("Debes seleccionar una factura original para rectificar")
      }

      // Actualizar la inserción en Supabase para incluir la retención, la firma y la URL del PDF
      supabase
        .from("invoices")
        .insert({
          organization_id: Number.parseInt(formData.organization_id),
          invoice_number: invoiceNumberFormatted,
          client_id: clientId,
          issue_date: formData.issue_date,
          invoice_type: invoiceType,
          status: "draft",
          base_amount: baseAmount,
          vat_amount: vatAmount,
          irpf_amount: irpfAmount,
          retention_amount: retentionAmount,
          total_amount: totalAmount,
          notes: fullNotes,
          signature: signature, // Guardar también la firma base64 en la base de datos
          signature_url: signatureUrl, // Guardar la URL de la firma si se pudo subir
          pdf_url: pdfUrl, // Guardar la URL del PDF si se pudo subir
          // Añadir campos específicos para facturas rectificativas
          ...(invoiceType === "rectificativa" && {
            original_invoice_id: originalInvoiceId,
            rectification_reason: rectificativeData.rectification_reason,
            rectification_type: rectificativeData.rectification_type,
          }),
        })
        .select()
        .then(({ data: invoiceData, error: invoiceError }) => {
          if (invoiceError) {
            console.error("Error al crear la factura en la base de datos:", invoiceError)
            toast({
              title: "Error al guardar la factura",
              description: "Se ha generado el PDF pero no se pudo guardar la factura en la base de datos.",
              variant: "destructive",
            })
            return
          }

          if (!invoiceData || invoiceData.length === 0) {
            console.error("No se recibieron datos de la factura creada")
            toast({
              title: "Error al guardar la factura",
              description: "Se ha generado el PDF pero no se pudo guardar la factura en la base de datos.",
              variant: "destructive",
            })
            return
          }

          const dbInvoice = invoiceData[0]

          // Crear las líneas de factura
          const invoiceLines_db = invoiceLines.map((line) => ({
            invoice_id: dbInvoice.id,
            description: line.description,
            quantity: line.quantity,
            unit_price: line.unit_price,
            vat_rate: line.vat_rate,
            irpf_rate: line.irpf_rate,
            retention_rate: line.retention_rate,
            line_amount: line.line_amount,
            professional_id: line.professional_id ? Number.parseInt(line.professional_id) : null,
          }))

          supabase
            .from("invoice_lines")
            .insert(invoiceLines_db)
            .then(({ error: linesError }) => {
              if (linesError) {
                console.error("Error al crear las líneas de factura:", linesError)
                toast({
                  title: "Error al guardar las líneas de factura",
                  description: "Se ha generado el PDF pero no se pudieron guardar todas las líneas de la factura.",
                  variant: "destructive",
                })
              } else {
                toast({
                  title: "Factura creada correctamente",
                  description: pdfUrl
                    ? "La factura se ha creado, el PDF se ha descargado y guardado en el servidor."
                    : "La factura se ha creado y el PDF se ha descargado.",
                })
              }
            })
        })

      // Redirigir a la lista de facturas
      router.push("/dashboard/invoices")
    } catch (err) {
      console.error("Error completo:", err)
      setError(err instanceof Error ? err.message : "Error al crear la factura")
    } finally {
      setIsLoading(false)
    }
  }

  const saveInvoiceNumberConfig = async () => {
    if (!selectedOrganization) return
    setIsSavingConfig(true)

    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          invoice_prefix: invoiceConfig.prefix,
          invoice_padding_length: invoiceConfig.paddingLength,
          last_invoice_number: invoiceConfig.lastInvoiceNumber,
        })
        .eq("id", selectedOrganization.id)

      if (error) throw error

      // Actualizar el estado local
      setSelectedOrganization((prev) =>
        prev
          ? {
              ...prev,
              invoice_prefix: invoiceConfig.prefix,
              invoice_padding_length: invoiceConfig.paddingLength,
              last_invoice_number: invoiceConfig.lastInvoiceNumber,
            }
          : null,
      )

      // Regenerar el número sugerido
      try {
        const { invoiceNumberFormatted } = await generateUniqueInvoiceNumber(selectedOrganization.id, invoiceType)
        setSuggestedInvoiceNumber(invoiceNumberFormatted)
      } catch (error) {
        console.error("Error al regenerar número:", error)
      }

      toast({
        title: "Configuración guardada",
        description: "La configuración de numeración se ha actualizado correctamente.",
      })
      setInvoiceNumberConfigOpen(false)
    } catch (error) {
      console.error("Error al guardar la configuración:", error)
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración. Por favor, intenta de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsSavingConfig(false)
    }
  }

  const getInvoiceNumberExample = () => {
    const exampleNumber = invoiceConfig.lastInvoiceNumber + 1
    const paddedNumber = exampleNumber.toString().padStart(invoiceConfig.paddingLength, "0")

    switch (invoiceType) {
      case "rectificativa":
        const currentYear = new Date().getFullYear()
        return `REC${currentYear}${paddedNumber}`
      case "simplificada":
        return `SIMP${paddedNumber}`
      case "normal":
      default:
        return `${invoiceConfig.prefix}${paddedNumber}`
    }
  }

  if (isLoadingInitialData) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-6">Nueva Factura</h1>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Cargando datos...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Nueva Factura</h1>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
              <CardDescription>Datos básicos de la factura</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {debugInfo && (
                <Alert>
                  <AlertDescription>{debugInfo}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="organization_id">Organización</Label>
                <Select
                  value={formData.organization_id}
                  onValueChange={(value) => handleSelectChange("organization_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una organización" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id.toString()}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="issue_date">Fecha de Emisión</Label>
                <Input
                  id="issue_date"
                  name="issue_date"
                  type="date"
                  value={formData.issue_date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoice_type">Tipo de Factura</Label>
                <Select
                  value={invoiceType}
                  onValueChange={(value: "normal" | "rectificativa" | "simplificada") => setInvoiceType(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo de factura" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Factura Normal</SelectItem>
                    <SelectItem value="rectificativa">Factura Rectificativa</SelectItem>
                    <SelectItem value="simplificada">Factura Simplificada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="invoice_number">Número de Factura</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setInvoiceNumberConfigOpen(true)}
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Configurar
                  </Button>
                </div>
                <div className="flex items-center space-x-2">
                  <Input id="invoice_number" value={suggestedInvoiceNumber} readOnly className="bg-muted" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  El número de factura se genera automáticamente según la configuración de la organización
                </p>
              </div>

              {/* Campos específicos para factura rectificativa */}
              {invoiceType === "rectificativa" && (
                <div className="space-y-4 border p-4 rounded-md bg-yellow-50">
                  <h3 className="font-medium text-yellow-800">Datos de Rectificación</h3>

                  <div className="space-y-2">
                    <Label htmlFor="original_invoice_number">Factura Original a Rectificar *</Label>
                    <Select
                      value={rectificativeData.original_invoice_number}
                      onValueChange={(value) =>
                        setRectificativeData((prev) => ({
                          ...prev,
                          original_invoice_number: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona la factura a rectificar" />
                      </SelectTrigger>
                      <SelectContent>
                        {existingInvoices.map((invoice) => (
                          <SelectItem key={invoice.id} value={invoice.invoice_number}>
                            <div className="flex flex-col">
                              <span className="font-medium">{invoice.invoice_number}</span>
                              <span className="text-sm text-muted-foreground">
                                {invoice.client_name} - {new Date(invoice.issue_date).toLocaleDateString()} -{" "}
                                {invoice.total_amount.toFixed(2)}€
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {existingInvoices.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No hay facturas disponibles para rectificar en esta organización
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rectification_reason">Motivo de Rectificación *</Label>
                    <Textarea
                      id="rectification_reason"
                      value={rectificativeData.rectification_reason}
                      onChange={(e) =>
                        setRectificativeData((prev) => ({
                          ...prev,
                          rectification_reason: e.target.value,
                        }))
                      }
                      placeholder="Describe el motivo de la rectificación..."
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Rectificación</Label>
                    <RadioGroup
                      value={rectificativeData.rectification_type}
                      onValueChange={(value: "cancellation" | "amount_correction") =>
                        setRectificativeData((prev) => ({ ...prev, rectification_type: value }))
                      }
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cancellation" id="cancellation" />
                        <Label htmlFor="cancellation">Por sustitución (anula la factura original)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="amount_correction" id="amount_correction" />
                        <Label htmlFor="amount_correction">Por diferencias (ajusta importes)</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              )}

              {/* Información para factura simplificada */}
              {invoiceType === "simplificada" && (
                <div className="space-y-2">
                  <div className="p-4 border rounded-md bg-blue-50">
                    <h3 className="font-medium text-blue-800 mb-2">Factura Simplificada</h3>
                    <p className="text-sm text-blue-700">
                      Las facturas simplificadas están limitadas a importes inferiores a 400€ y no requieren todos los
                      datos del cliente. Solo se necesita el nombre o razón social.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Notas adicionales para la factura"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Datos del Cliente</CardTitle>
              <CardDescription>Selecciona un cliente existente o crea uno nuevo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch id="client-type-switch" checked={isNewClient} onCheckedChange={setIsNewClient} />
                <Label htmlFor="client-type-switch">{isNewClient ? "Cliente nuevo" : "Cliente existente"}</Label>
              </div>

              {!isNewClient && (
                <div className="space-y-2">
                  <Label htmlFor="client_id">Seleccionar Cliente</Label>
                  <Select value={selectedClientId} onValueChange={handleClientSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.name} - {client.tax_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="client_name">Nombre o Razón Social</Label>
                <Input
                  id="client_name"
                  name="client_name"
                  value={formData.client_name}
                  onChange={handleChange}
                  required
                  readOnly={!isNewClient && selectedClientId !== ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client_tax_id">CIF/NIF</Label>
                <Input
                  id="client_tax_id"
                  name="client_tax_id"
                  value={formData.client_tax_id}
                  onChange={handleChange}
                  required
                  readOnly={!isNewClient && selectedClientId !== ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client_address">Dirección</Label>
                <Textarea
                  id="client_address"
                  name="client_address"
                  value={formData.client_address}
                  onChange={handleChange}
                  required
                  readOnly={!isNewClient && selectedClientId !== ""}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client_postal_code">Código Postal</Label>
                  <Input
                    id="client_postal_code"
                    name="client_postal_code"
                    value={formData.client_postal_code}
                    onChange={handleChange}
                    required
                    readOnly={!isNewClient && selectedClientId !== ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client_city">Ciudad</Label>
                  <Input
                    id="client_city"
                    name="client_city"
                    value={formData.client_city}
                    onChange={handleChange}
                    required
                    readOnly={!isNewClient && selectedClientId !== ""}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client_province">Provincia</Label>
                  <Input
                    id="client_province"
                    name="client_province"
                    value={formData.client_province}
                    onChange={handleChange}
                    required
                    readOnly={!isNewClient && selectedClientId !== ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client_country">País</Label>
                  <Input
                    id="client_country"
                    name="client_country"
                    value={formData.client_country}
                    onChange={handleChange}
                    required
                    readOnly={!isNewClient && selectedClientId !== ""}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client_email">Email</Label>
                  <Input
                    id="client_email"
                    name="client_email"
                    type="email"
                    value={formData.client_email}
                    onChange={handleChange}
                    readOnly={!isNewClient && selectedClientId !== ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client_phone">Teléfono</Label>
                  <Input
                    id="client_phone"
                    name="client_phone"
                    value={formData.client_phone}
                    onChange={handleChange}
                    readOnly={!isNewClient && selectedClientId !== ""}
                  />
                </div>
              </div>

              {isNewClient && (
                <div className="space-y-2">
                  <Label>Tipo de Cliente</Label>
                  <RadioGroup
                    value={formData.client_type}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, client_type: value }))}
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="private" id="private" />
                      <Label htmlFor="private">Privado</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="public" id="public" />
                      <Label htmlFor="public">Administración Pública</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {isNewClient && formData.client_type === "public" && (
                <div className="space-y-4 border p-4 rounded-md">
                  <h3 className="font-medium">Códigos DIR3</h3>
                  <div className="space-y-2">
                    <Label htmlFor="CentroGestor">Centro Gestor</Label>
                    <Input
                      id="CentroGestor"
                      name="CentroGestor"
                      value={formData.dir3_codes.CentroGestor}
                      onChange={handleDir3Change}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="UnidadTramitadora">Unidad Tramitadora</Label>
                    <Input
                      id="UnidadTramitadora"
                      name="UnidadTramitadora"
                      value={formData.dir3_codes.UnidadTramitadora}
                      onChange={handleDir3Change}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="OficinaContable">Oficina Contable</Label>
                    <Input
                      id="OficinaContable"
                      name="OficinaContable"
                      value={formData.dir3_codes.OficinaContable}
                      onChange={handleDir3Change}
                      required
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Líneas de Factura</CardTitle>
              <CardDescription>Añade los servicios o productos a facturar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invoiceLines.map((line, index) => (
                  <div key={line.id} className="border p-4 rounded-md">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">Línea {index + 1}</h4>
                      {invoiceLines.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLine(line.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Eliminar línea</span>
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <Label htmlFor={`service-${line.id}`}>Servicio</Label>
                        <div className="flex space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => openServiceDialog(line.id)}
                          >
                            {line.description ? line.description : "Seleccionar servicio"}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`professional-${line.id}`}>Profesional (opcional)</Label>
                        <Select
                          value={line.professional_id || ""}
                          onValueChange={(value) => handleProfessionalSelect(line.id, value === "" ? null : value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar profesional" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Ninguno</SelectItem>
                            {professionals.map((professional) => (
                              <SelectItem key={professional.id} value={professional.id.toString()}>
                                {professional.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`description-${line.id}`}>Descripción</Label>
                        <Input
                          id={`description-${line.id}`}
                          value={line.description}
                          onChange={(e) => handleLineChange(line.id, "description", e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`quantity-${line.id}`}>Cantidad</Label>
                        <Input
                          id={`quantity-${line.id}`}
                          type="number"
                          min="1"
                          step="1"
                          value={line.quantity}
                          onChange={(e) =>
                            handleLineChange(line.id, "quantity", Number.parseFloat(e.target.value) || 0)
                          }
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`unit_price-${line.id}`}>Precio Unitario (€)</Label>
                        <Input
                          id={`unit_price-${line.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unit_price}
                          onChange={(e) =>
                            handleLineChange(line.id, "unit_price", Number.parseFloat(e.target.value) || 0)
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor={`vat_rate-${line.id}`}>IVA (%)</Label>
                        <Input
                          id={`vat_rate-${line.id}`}
                          type="number"
                          min="0"
                          max="100"
                          value={line.vat_rate}
                          onChange={(e) =>
                            handleLineChange(line.id, "vat_rate", Number.parseFloat(e.target.value) || 0)
                          }
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`irpf_rate-${line.id}`}>IRPF (%)</Label>
                        <Input
                          id={`irpf_rate-${line.id}`}
                          type="number"
                          min="0"
                          max="100"
                          value={line.irpf_rate}
                          onChange={(e) =>
                            handleLineChange(line.id, "irpf_rate", Number.parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`retention_rate-${line.id}`}>Retención (%)</Label>
                        <Input
                          id={`retention_rate-${line.id}`}
                          type="number"
                          min="0"
                          max="100"
                          value={line.retention_rate}
                          onChange={(e) =>
                            handleLineChange(line.id, "retention_rate", Number.parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                    </div>

                    <div className="mt-4 text-right">
                      <p className="font-medium">Importe: {line.line_amount.toFixed(2)} €</p>
                    </div>
                  </div>
                ))}

                <Button type="button" variant="outline" onClick={addLine} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Añadir Línea
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumen de Totales</CardTitle>
              <CardDescription>Resumen de los importes de la factura</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Base imponible:</span>
                  <span>{baseAmount.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA:</span>
                  <span>{vatAmount.toFixed(2)} €</span>
                </div>
                {irpfAmount > 0 && (
                  <div className="flex justify-between">
                    <span>IRPF:</span>
                    <span>-{irpfAmount.toFixed(2)} €</span>
                  </div>
                )}
                {retentionAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Retención:</span>
                    <span>-{retentionAmount.toFixed(2)} €</span>
                  </div>
                )}
                <hr />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>{totalAmount.toFixed(2)} €</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Firma Digital</CardTitle>
              <CardDescription>Firme la factura utilizando el ratón o pantalla táctil</CardDescription>
            </CardHeader>
            <CardContent>
              <SignaturePad onSignatureChange={handleSignatureChange} width={400} height={200} />
            </CardContent>
          </Card>

          {/* Diálogo de selección de servicio */}
          <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Seleccionar Servicio</DialogTitle>
                <DialogDescription>Elige un servicio para añadir a la factura</DialogDescription>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  {services.length > 0 ? (
                    services.map((service) => (
                      <div
                        key={service.id}
                        className="flex justify-between items-center p-3 border rounded-md hover:bg-muted cursor-pointer"
                        onClick={() => applyServiceToLine(service)}
                      >
                        <div>
                          <p className="font-medium">{service.name}</p>
                          {service.description && (
                            <p className="text-sm text-muted-foreground">{service.description}</p>
                          )}
                          <p className="text-sm">
                            IVA: {service.vat_rate}% | IRPF: {service.irpf_rate}% | Retención: {service.retention_rate}%
                          </p>
                        </div>
                        <p className="font-medium">{service.price.toFixed(2)} €</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-4">No hay servicios disponibles</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setServiceDialogOpen(false)}>
                  Cancelar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Diálogo de configuración de numeración */}
          <Dialog open={invoiceNumberConfigOpen} onOpenChange={setInvoiceNumberConfigOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Configuración de Numeración</DialogTitle>
                <DialogDescription>Ajusta el prefijo y número inicial para esta organización</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="config_prefix">Prefijo de Facturas</Label>
                  <Input
                    id="config_prefix"
                    value={invoiceConfig.prefix}
                    onChange={(e) => setInvoiceConfig((prev) => ({ ...prev, prefix: e.target.value }))}
                    placeholder="Ej: FACT, FAC, INV"
                    maxLength={10}
                  />
                  <p className="text-xs text-muted-foreground">
                    Prefijo que aparecerá al inicio de cada número de factura normal
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="config_last_number">Último Número Usado</Label>
                  <Input
                    id="config_last_number"
                    type="number"
                    min="0"
                    value={invoiceConfig.lastInvoiceNumber}
                    onChange={(e) =>
                      setInvoiceConfig((prev) => ({ ...prev, lastInvoiceNumber: Number.parseInt(e.target.value) || 0 }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    La próxima factura será este número + 1. Útil para migrar desde otro sistema.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="config_padding">Longitud de Dígitos</Label>
                  <Input
                    id="config_padding"
                    type="number"
                    min="1"
                    max="10"
                    value={invoiceConfig.paddingLength}
                    onChange={(e) =>
                      setInvoiceConfig((prev) => ({ ...prev, paddingLength: Number.parseInt(e.target.value) || 4 }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Número de dígitos para la parte numérica (se rellenará con ceros)
                  </p>
                </div>

                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium mb-1">Vista previa:</p>
                  <p className="text-sm text-muted-foreground">
                    Próxima factura: <span className="font-mono font-medium">{getInvoiceNumberExample()}</span>
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInvoiceNumberConfigOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={saveInvoiceNumberConfig} disabled={isSavingConfig}>
                  {isSavingConfig ? (
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
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
            {isLoading ? (
              <>
                <span className="mr-2">Guardando...</span>
                <span className="animate-spin">⏳</span>
              </>
            ) : (
              "Guardar Factura"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
