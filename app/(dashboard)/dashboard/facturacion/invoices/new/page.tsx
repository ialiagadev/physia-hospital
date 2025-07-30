"use client"

import type React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { generateUniqueInvoiceNumber } from "@/lib/invoice-utils"
import { InvoiceNumberConfigModal } from "@/components/invoices/invoice-number-config-modal"
import type { InvoiceType } from "@/lib/invoice-types"
import { saveBase64ImageToStorage } from "@/lib/storage-utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Trash2, Settings, Percent, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SignaturePad } from "@/components/signature-pad"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/app/contexts/auth-context"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

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

interface InvoiceLine {
  id: string
  description: string
  quantity: number
  unit_price: number
  discount_percentage: number
  vat_rate: number
  irpf_rate: number
  retention_rate: number
  line_amount: number
  professional_id: string | null
}

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

interface Professional {
  id: number
  name: string
  type: number
  organization_id: number
}

interface OriginalInvoice {
  id: number
  invoice_number: string
  issue_date: string
  total_amount: number
  client_name: string
  client_data: any
  invoice_lines: any[]
}

// Constantes fuera del componente
const VAT_EXEMPT_NOTE =
  "Operación exenta de IVA conforme al artículo 20. Uno. 3º de la Ley 37/1992 del Impuesto sobre el Valor Añadido, por tratarse de un servicio de asistencia sanitaria prestado por profesional titulado"

const INITIAL_FORM_DATA = {
  organization_id: "",
  issue_date: new Date().toISOString().split("T")[0],
  notes: "",
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
  payment_method: "tarjeta" as "tarjeta" | "efectivo" | "transferencia" | "paypal" | "bizum" | "otro",
  payment_method_other: "",
}

const INITIAL_INVOICE_LINE = {
  id: crypto.randomUUID(),
  description: "",
  quantity: 1,
  unit_price: 0,
  discount_percentage: 0,
  vat_rate: 21,
  irpf_rate: 0,
  retention_rate: 0,
  line_amount: 0,
  professional_id: null,
}

const INITIAL_RECTIFICATIVE_DATA = {
  original_invoice_number: "",
  rectification_reason: "",
  rectification_type: "cancellation" as "cancellation" | "amount_correction",
}

// Hook personalizado para debounce
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export default function OptimizedNewInvoicePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { userProfile } = useAuth()

  // Estados principales
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true)

  // Estados de datos
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [existingInvoices, setExistingInvoices] = useState<OriginalInvoice[]>([])

  // Estados de selección
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isNewClient, setIsNewClient] = useState(false)

  // Estados de UI
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false)
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null)
  const [invoiceNumberConfigOpen, setInvoiceNumberConfigOpen] = useState(false)
  const [signature, setSignature] = useState<string | null>(null)

  // Estados de búsqueda de clientes
  const [clientSearchOpen, setClientSearchOpen] = useState(false)
  const [clientSearchQuery, setClientSearchQuery] = useState("")
  const [clientSearchResults, setClientSearchResults] = useState<Client[]>([])
  const [isSearchingClients, setIsSearchingClients] = useState(false)

  // Estados de factura
  const [invoiceType, setInvoiceType] = useState<InvoiceType>("normal")
  const [rectificativeData, setRectificativeData] = useState(INITIAL_RECTIFICATIVE_DATA)
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLine[]>([{ ...INITIAL_INVOICE_LINE }])
  const [formData, setFormData] = useState(INITIAL_FORM_DATA)
  const [suggestedInvoiceNumber, setSuggestedInvoiceNumber] = useState("")

  // Debounce para búsqueda de clientes
  const debouncedSearchQuery = useDebounce(clientSearchQuery, 300)

  // Funciones de cálculo memoizadas
  const calculatedAmounts = useMemo(() => {
    const subtotalAmount = invoiceLines.reduce((sum, line) => {
      return sum + line.quantity * line.unit_price
    }, 0)

    const totalDiscountAmount = invoiceLines.reduce((sum, line) => {
      const lineSubtotal = line.quantity * line.unit_price
      return sum + (lineSubtotal * line.discount_percentage) / 100
    }, 0)

    const baseAmount = subtotalAmount - totalDiscountAmount

    const vatAmount = invoiceLines.reduce((sum, line) => {
      const lineSubtotal = line.quantity * line.unit_price
      const lineDiscount = (lineSubtotal * line.discount_percentage) / 100
      const lineBase = lineSubtotal - lineDiscount
      return sum + (lineBase * line.vat_rate) / 100
    }, 0)

    const irpfAmount = invoiceLines.reduce((sum, line) => {
      const lineSubtotal = line.quantity * line.unit_price
      const lineDiscount = (lineSubtotal * line.discount_percentage) / 100
      const lineBase = lineSubtotal - lineDiscount
      return sum + (lineBase * line.irpf_rate) / 100
    }, 0)

    const retentionAmount = invoiceLines.reduce((sum, line) => {
      const lineSubtotal = line.quantity * line.unit_price
      const lineDiscount = (lineSubtotal * line.discount_percentage) / 100
      const lineBase = lineSubtotal - lineDiscount
      return sum + (lineBase * line.retention_rate) / 100
    }, 0)

    const totalAmount = baseAmount + vatAmount - irpfAmount - retentionAmount

    return {
      subtotalAmount,
      totalDiscountAmount,
      baseAmount,
      vatAmount,
      irpfAmount,
      retentionAmount,
      totalAmount,
    }
  }, [invoiceLines])

  // Funciones memoizadas
  const calculateLineAmount = useCallback((line: InvoiceLine) => {
    const subtotal = line.quantity * line.unit_price
    const discount = (subtotal * line.discount_percentage) / 100
    return subtotal - discount
  }, [])

  const fetchClients = useCallback(async (organizationId: number) => {
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
      console.error("Error fetching clients:", err)
    }
  }, [])

  const fetchServices = useCallback(async (organizationId: number) => {
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
      console.error("Error fetching services:", err)
    }
  }, [])

  const fetchProfessionals = useCallback(async (organizationId: number) => {
    try {
      const { data: professionalsData, error: professionalsError } = await supabase
        .from("users")
        .select("id, name, organization_id, type")
        .eq("organization_id", organizationId)
        .eq("type", 1)
        .in("role", ["admin", "user", "coordinador"])
        .order("name")

      if (professionalsError) {
        throw new Error("Error al obtener los profesionales")
      }
      setProfessionals(professionalsData || [])
    } catch (err) {
      console.error("Error fetching professionals:", err)
    }
  }, [])

  const fetchExistingInvoices = useCallback(
    async (organizationId: number) => {
      try {
        const { data: invoicesData, error: invoicesError } = await supabase
          .from("invoices")
          .select(`
          id,
          invoice_number,
          issue_date,
          total_amount,
          client_id,
          clients!inner (
            id,
            name,
            tax_id,
            address,
            postal_code,
            city,
            province,
            country,
            email,
            phone,
            client_type,
            dir3_codes
          )
        `)
          .eq("organization_id", organizationId)
          .eq("invoice_type", "normal")
          .order("created_at", { ascending: false })
          .limit(100) // Limitar para mejorar rendimiento

        if (invoicesError) {
          console.error("Error fetching invoices:", invoicesError)
          throw new Error(`Error al obtener las facturas: ${invoicesError.message}`)
        }

        if (!invoicesData || invoicesData.length === 0) {
          setExistingInvoices([])
          return
        }

        // Obtener líneas de factura en una sola consulta
        const invoiceIds = invoicesData.map((inv) => inv.id)
        const { data: allLinesData, error: linesError } = await supabase
          .from("invoice_lines")
          .select("*")
          .in("invoice_id", invoiceIds)

        if (linesError) {
          console.error("Error fetching invoice lines:", linesError)
        }

        // Agrupar líneas por factura
        const linesByInvoice = (allLinesData || []).reduce(
          (acc, line) => {
            if (!acc[line.invoice_id]) {
              acc[line.invoice_id] = []
            }
            acc[line.invoice_id].push(line)
            return acc
          },
          {} as Record<number, any[]>,
        )

        const formattedInvoices = invoicesData.map((invoice: any) => {
          let clientName = "Cliente no encontrado"
          let clientData = null

          if (invoice.clients) {
            const client = Array.isArray(invoice.clients) ? invoice.clients[0] : invoice.clients
            if (client) {
              clientName = client.name || "Cliente no encontrado"
              clientData = client
            }
          }

          return {
            id: invoice.id,
            invoice_number: invoice.invoice_number,
            issue_date: invoice.issue_date,
            total_amount: invoice.total_amount,
            client_name: clientName,
            client_data: clientData,
            invoice_lines: linesByInvoice[invoice.id] || [],
          }
        })

        setExistingInvoices(formattedInvoices)
      } catch (err) {
        console.error("Error in fetchExistingInvoices:", err)
        toast({
          title: "Error al cargar facturas",
          description: err instanceof Error ? err.message : "Error al cargar las facturas",
          variant: "destructive",
        })
      }
    },
    [toast],
  )

  const searchClients = useCallback(
    async (query: string) => {
      if (!query.trim() || !selectedOrganization) {
        setClientSearchResults([])
        return
      }

      setIsSearchingClients(true)
      try {
        const searchTerm = `%${query.trim()}%`
        const { data, error } = await supabase
          .from("clients")
          .select("*")
          .eq("organization_id", selectedOrganization.id)
          .or(`name.ilike.${searchTerm},tax_id.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm}`)
          .order("name", { ascending: true })
          .limit(10)

        if (error) {
          console.error("Error searching clients:", error)
          return
        }

        setClientSearchResults(data || [])
      } catch (error) {
        console.error("Error in client search:", error)
      } finally {
        setIsSearchingClients(false)
      }
    },
    [selectedOrganization],
  )

  const updateSuggestedNumber = useCallback(async () => {
    if (!selectedOrganization) return

    try {
      setError(null)
      const { invoiceNumberFormatted } = await generateUniqueInvoiceNumber(selectedOrganization.id, invoiceType)
      setSuggestedInvoiceNumber(invoiceNumberFormatted)
    } catch (error) {
      setSuggestedInvoiceNumber(`ERROR-${Date.now()}`)
      setError(`Error al generar número de factura: ${error instanceof Error ? error.message : String(error)}`)
    }
  }, [selectedOrganization, invoiceType])

  // Handlers memoizados
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }, [])

  const handleSelectChange = useCallback((name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }, [])

  const handleDir3Change = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      dir3_codes: { ...prev.dir3_codes, [name]: value },
    }))
  }, [])

  const handleLineChange = useCallback(
    (id: string, field: string, value: string | number) => {
      setInvoiceLines((prev) =>
        prev.map((line) => {
          if (line.id === id) {
            const updatedLine = { ...line, [field]: value }
            if (field === "quantity" || field === "unit_price" || field === "discount_percentage") {
              updatedLine.line_amount = calculateLineAmount(updatedLine)
            }
            return updatedLine
          }
          return line
        }),
      )
    },
    [calculateLineAmount],
  )

  const addLine = useCallback(() => {
    setInvoiceLines((prev) => [...prev, { ...INITIAL_INVOICE_LINE, id: crypto.randomUUID() }])
  }, [])

  const removeLine = useCallback((id: string) => {
    setInvoiceLines((prev) => {
      if (prev.length > 1) {
        return prev.filter((line) => line.id !== id)
      }
      return prev
    })
  }, [])

  const selectClient = useCallback((client: Client) => {
    setSelectedClient(client)
    setIsNewClient(false)
    setClientSearchOpen(false)
    setClientSearchQuery(client.name)

    setFormData((prev) => ({
      ...prev,
      client_name: client.name,
      client_tax_id: client.tax_id,
      client_address: client.address,
      client_postal_code: client.postal_code,
      client_city: client.city,
      client_province: client.province,
      client_country: client.country || "España",
      client_email: client.email || "",
      client_phone: client.phone || "",
      client_type: client.client_type,
      dir3_codes: client.dir3_codes || {
        CentroGestor: "",
        UnidadTramitadora: "",
        OficinaContable: "",
      },
    }))
  }, [])

  const clearClientSelection = useCallback(() => {
    setSelectedClient(null)
    setClientSearchQuery("")
    setIsNewClient(true)
    setFormData((prev) => ({
      ...prev,
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
    }))
  }, [])

  const applyServiceToLine = useCallback(
    (service: Service) => {
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
              }
              updatedLine.line_amount = calculateLineAmount(updatedLine)
              return updatedLine
            }
            return line
          }),
        )
        setServiceDialogOpen(false)
        setSelectedLineId(null)
      }
    },
    [selectedLineId, calculateLineAmount],
  )

  const handleProfessionalSelect = useCallback((lineId: string, professionalId: string | null) => {
    setInvoiceLines((prev) =>
      prev.map((line) => {
        if (line.id === lineId) {
          return { ...line, professional_id: professionalId === "none" ? null : professionalId }
        }
        return line
      }),
    )
  }, [])

  const handleSignatureChange = useCallback((signatureDataUrl: string | null) => {
    setSignature(signatureDataUrl)
  }, [])

  const handleConfigSaved = useCallback(async () => {
    await updateSuggestedNumber()
  }, [updateSuggestedNumber])

  const loadOriginalInvoiceData = useCallback(
    async (invoiceNumber: string) => {
      const originalInvoice = existingInvoices.find((inv) => inv.invoice_number === invoiceNumber)
      if (!originalInvoice) {
        toast({
          title: "Error",
          description: "No se pudo encontrar la factura original",
          variant: "destructive",
        })
        return
      }

      try {
        const { data: fullInvoiceData, error: invoiceError } = await supabase
          .from("invoices")
          .select(`
          *,
          clients (
            id,
            name,
            tax_id,
            address,
            postal_code,
            city,
            province,
            country,
            email,
            phone,
            client_type,
            dir3_codes
          )
        `)
          .eq("invoice_number", invoiceNumber)
          .eq("organization_id", selectedOrganization?.id)
          .single()

        if (invoiceError) {
          throw new Error(`Error al obtener la factura original: ${invoiceError.message}`)
        }

        if (!fullInvoiceData) {
          throw new Error("No se encontró la factura original")
        }

        if (fullInvoiceData.clients) {
          const clientData = Array.isArray(fullInvoiceData.clients)
            ? fullInvoiceData.clients[0]
            : fullInvoiceData.clients
          if (clientData) {
            selectClient(clientData)
          }
        }

        if (originalInvoice.invoice_lines && originalInvoice.invoice_lines.length > 0) {
          const originalLines = originalInvoice.invoice_lines.map((line: any) => ({
            id: crypto.randomUUID(),
            description: line.description || "",
            quantity: line.quantity || 1,
            unit_price: line.unit_price || 0,
            discount_percentage: line.discount_percentage || 0,
            vat_rate: line.vat_rate || 21,
            irpf_rate: line.irpf_rate || 0,
            retention_rate: line.retention_rate || 0,
            line_amount: line.line_amount || 0,
            professional_id: line.professional_id ? line.professional_id.toString() : null,
          }))
          setInvoiceLines(originalLines)
        }

        toast({
          title: "Datos cargados",
          description: "Se han cargado los datos del cliente y las líneas de la factura original",
        })
      } catch (error) {
        console.error("Error loading original invoice data:", error)
        toast({
          title: "Error al cargar datos",
          description: error instanceof Error ? error.message : "Error al cargar los datos de la factura original",
          variant: "destructive",
        })
      }
    },
    [existingInvoices, selectedOrganization, selectClient, toast],
  )

  // Effects optimizados
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoadingInitialData(true)
        setError(null)

        const { data: orgsData, error: orgsError } = await supabase.from("organizations").select("*").order("name")

        if (orgsError) {
          throw new Error(`Error al obtener las organizaciones: ${orgsError.message}`)
        }

        if (!orgsData || orgsData.length === 0) {
          throw new Error("No se encontraron organizaciones")
        }

        setOrganizations(orgsData)

        let firstOrg = orgsData[0]
        if (userProfile?.organization_id) {
          const userOrg = orgsData.find((org) => org.id === userProfile.organization_id)
          if (userOrg) {
            firstOrg = userOrg
          }
        }

        setFormData((prev) => ({ ...prev, organization_id: firstOrg.id.toString() }))
        setSelectedOrganization(firstOrg)

        // Cargar datos en paralelo
        await Promise.all([
          fetchClients(firstOrg.id),
          fetchServices(firstOrg.id),
          fetchProfessionals(firstOrg.id),
          fetchExistingInvoices(firstOrg.id),
        ])

        try {
          const { invoiceNumberFormatted } = await generateUniqueInvoiceNumber(firstOrg.id, invoiceType)
          setSuggestedInvoiceNumber(invoiceNumberFormatted)
        } catch (error) {
          setSuggestedInvoiceNumber(`ERROR-${Date.now()}`)
          setError(`Error al generar número de factura: ${error instanceof Error ? error.message : String(error)}`)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar los datos")
      } finally {
        setIsLoadingInitialData(false)
      }
    }

    if (userProfile) {
      fetchInitialData()
    }
  }, [userProfile, invoiceType, fetchClients, fetchServices, fetchProfessionals, fetchExistingInvoices])

  // Effect para nota automática de IVA
  useEffect(() => {
    const { vatAmount, baseAmount } = calculatedAmounts

    if (vatAmount === 0 && baseAmount > 0) {
      if (!formData.notes.includes(VAT_EXEMPT_NOTE)) {
        setFormData((prev) => ({
          ...prev,
          notes: prev.notes ? `${prev.notes}\n\n${VAT_EXEMPT_NOTE}` : VAT_EXEMPT_NOTE,
        }))
      }
    } else if (vatAmount > 0) {
      if (formData.notes.includes(VAT_EXEMPT_NOTE)) {
        setFormData((prev) => ({
          ...prev,
          notes: prev.notes
            .replace(VAT_EXEMPT_NOTE, "")
            .replace(/\n\n\n/g, "\n\n")
            .trim(),
        }))
      }
    }
  }, [calculatedAmounts, formData.notes])

  // Effect para búsqueda de clientes con debounce
  useEffect(() => {
    if (debouncedSearchQuery) {
      searchClients(debouncedSearchQuery)
    }
  }, [debouncedSearchQuery, searchClients])

  // Effect para cambio de organización
  useEffect(() => {
    if (formData.organization_id) {
      const org = organizations.find((o) => o.id.toString() === formData.organization_id) || null
      setSelectedOrganization(org)
      if (org) {
        Promise.all([
          fetchClients(org.id),
          fetchServices(org.id),
          fetchProfessionals(org.id),
          fetchExistingInvoices(org.id),
        ])
      }
    }
  }, [formData.organization_id, organizations, fetchClients, fetchServices, fetchProfessionals, fetchExistingInvoices])

  // Effect para actualizar número sugerido
  useEffect(() => {
    updateSuggestedNumber()
  }, [updateSuggestedNumber])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setIsLoading(true)
      setError(null)

      try {
        if (!selectedOrganization) {
          throw new Error("No se pudo obtener la información de la organización")
        }

        if (!formData.client_name || !formData.client_tax_id) {
          throw new Error("Debes introducir al menos el nombre y CIF/NIF del cliente")
        }

        if (!userProfile?.id) {
          throw new Error("No se pudo obtener la información del usuario actual")
        }

        // Reservar número de factura
        const { invoiceNumberFormatted, newInvoiceNumber } = await generateUniqueInvoiceNumber(
          Number.parseInt(formData.organization_id),
          invoiceType,
        )

        // Actualizar contador
        const getFieldNameForUpdate = (type: InvoiceType): string => {
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

        const fieldName = getFieldNameForUpdate(invoiceType)
        const { error: updateOrgError } = await supabase
          .from("organizations")
          .update({ [fieldName]: newInvoiceNumber })
          .eq("id", selectedOrganization.id)

        if (updateOrgError) {
          console.error("Error updating organization:", updateOrgError)
          throw new Error("Error al reservar el número de factura")
        }

        let clientId: number | null = null

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
            console.error("Error creating client:", clientError)
          } else if (newClient) {
            clientId = newClient.id
          }
        } else if (selectedClient) {
          clientId = selectedClient.id
        }

        const clientInfoText = `Cliente: ${formData.client_name}, CIF/NIF: ${formData.client_tax_id}, Dirección: ${formData.client_address}, ${formData.client_postal_code} ${formData.client_city}, ${formData.client_province}`
        const additionalNotes = formData.notes ? `\n\nNotas adicionales: ${formData.notes}` : ""
        const fullNotes = clientInfoText + additionalNotes

        let signatureUrl: string | null = null
        if (signature) {
          try {
            const timestamp = Date.now()
            const path = `signatures/${invoiceNumberFormatted}_${timestamp}.png`
            signatureUrl = await saveBase64ImageToStorage(signature, path, Number.parseInt(formData.organization_id))
          } catch (error) {
            console.error("Error saving signature:", error)
          }
        }

        const { baseAmount, vatAmount, irpfAmount, retentionAmount, totalAmount, totalDiscountAmount } =
          calculatedAmounts

        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          throw new Error("Usuario no autenticado")
        }

        let originalInvoiceId: number | null = null
        if (invoiceType === "rectificativa") {
          const originalInvoice = existingInvoices.find(
            (inv) => inv.invoice_number === rectificativeData.original_invoice_number,
          )
          if (originalInvoice) {
            originalInvoiceId = originalInvoice.id
          } else {
            throw new Error("No se pudo encontrar el ID de la factura original")
          }
        }

        const { data: invoiceData, error: invoiceError } = await supabase
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
            discount_amount: totalDiscountAmount,
            notes: fullNotes,
            signature: signature,
            signature_url: signatureUrl,
            created_by: user.id,
            payment_method: formData.payment_method,
            payment_method_other: formData.payment_method === "otro" ? formData.payment_method_other : null,
            ...(invoiceType === "rectificativa" && {
              original_invoice_id: originalInvoiceId,
              rectification_reason: rectificativeData.rectification_reason,
              rectification_type: rectificativeData.rectification_type,
            }),
          })
          .select()
          .single()

        if (invoiceError) {
          throw new Error(`Error al guardar la factura: ${invoiceError.message}`)
        }

        if (!invoiceData) {
          throw new Error("No se pudo guardar la factura")
        }

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
          toast({
            title: "Error al guardar las líneas de factura",
            description: "Se ha creado el borrador pero no se pudieron guardar todas las líneas de la factura.",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Borrador creado correctamente",
            description: `Borrador creado con número ${invoiceNumberFormatted}. Podrás generar el PDF cuando valides la factura.`,
          })
        }

        router.push("/dashboard/facturacion/invoices")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al crear el borrador")
      } finally {
        setIsLoading(false)
      }
    },
    [
      selectedOrganization,
      formData,
      userProfile,
      invoiceType,
      isNewClient,
      selectedClient,
      signature,
      calculatedAmounts,
      rectificativeData,
      invoiceLines,
      existingInvoices,
      toast,
      router,
    ],
  )

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
                  El número de factura se reserva automáticamente al crear el borrador
                </p>
              </div>

              {invoiceType === "rectificativa" && (
                <div className="space-y-4 border p-4 rounded-md bg-yellow-50">
                  <h3 className="font-medium text-yellow-800">Datos de Rectificación</h3>
                  <div className="space-y-2">
                    <Label htmlFor="original_invoice_number">Factura Original a Rectificar *</Label>
                    <Select
                      value={rectificativeData.original_invoice_number}
                      onValueChange={(value) => {
                        setRectificativeData((prev) => ({
                          ...prev,
                          original_invoice_number: value,
                        }))
                        loadOriginalInvoiceData(value)
                      }}
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
                                {new Date(invoice.issue_date).toLocaleDateString()} - {invoice.total_amount.toFixed(2)}€
                                - {invoice.client_name}
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
              <CardTitle>Método de Pago</CardTitle>
              <CardDescription>Selecciona el método de pago utilizado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payment_method">Método de Pago</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value: "tarjeta" | "efectivo" | "transferencia" | "paypal" | "bizum" | "otro") =>
                    setFormData((prev) => ({
                      ...prev,
                      payment_method: value,
                      payment_method_other: value !== "otro" ? "" : prev.payment_method_other,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona método de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tarjeta">Tarjeta</SelectItem>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                    <SelectItem value="bizum">Bizum</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.payment_method === "otro" && (
                <div className="space-y-2">
                  <Label htmlFor="payment_method_other">Especificar método de pago</Label>
                  <Input
                    id="payment_method_other"
                    value={formData.payment_method_other}
                    onChange={(e) => setFormData((prev) => ({ ...prev, payment_method_other: e.target.value }))}
                    placeholder="Especifica el método de pago..."
                    required
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Datos del Cliente</CardTitle>
              <CardDescription>Busca un cliente existente o crea uno nuevo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="client-type-switch"
                  checked={!isNewClient}
                  onCheckedChange={(checked) => setIsNewClient(!checked)}
                />
                <Label htmlFor="client-type-switch">{isNewClient ? "Cliente nuevo" : "Cliente existente"}</Label>
              </div>

              {!isNewClient && (
                <div className="space-y-2">
                  <Label>Buscar Cliente</Label>
                  <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={clientSearchOpen}
                        className="w-full justify-between bg-transparent"
                      >
                        {selectedClient ? selectedClient.name : "Buscar cliente..."}
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput
                          placeholder="Buscar por nombre, CIF, email o teléfono..."
                          value={clientSearchQuery}
                          onValueChange={setClientSearchQuery}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {isSearchingClients ? "Buscando..." : "No se encontraron clientes"}
                          </CommandEmpty>
                          <CommandGroup>
                            {clientSearchResults.map((client) => (
                              <CommandItem key={client.id} value={client.name} onSelect={() => selectClient(client)}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{client.name}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {client.tax_id} - {client.email || client.phone || "Sin contacto"}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {selectedClient && (
                    <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <span className="text-sm">Cliente seleccionado: {selectedClient.name}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={clearClientSelection}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
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
                  readOnly={!isNewClient && selectedClient !== null}
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
                  readOnly={!isNewClient && selectedClient !== null}
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
                  readOnly={!isNewClient && selectedClient !== null}
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
                    readOnly={!isNewClient && selectedClient !== null}
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
                    readOnly={!isNewClient && selectedClient !== null}
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
                    readOnly={!isNewClient && selectedClient !== null}
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
                    readOnly={!isNewClient && selectedClient !== null}
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
                    readOnly={!isNewClient && selectedClient !== null}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client_phone">Teléfono</Label>
                  <Input
                    id="client_phone"
                    name="client_phone"
                    value={formData.client_phone}
                    onChange={handleChange}
                    readOnly={!isNewClient && selectedClient !== null}
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
                            className="w-full justify-start bg-transparent"
                            onClick={() => {
                              setSelectedLineId(line.id)
                              setServiceDialogOpen(true)
                            }}
                          >
                            {line.description ? line.description : "Seleccionar servicio"}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`professional-${line.id}`}>Profesional (opcional)</Label>
                        <Select
                          value={line.professional_id || "none"}
                          onValueChange={(value) => handleProfessionalSelect(line.id, value)}
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

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`description-${line.id}`} className="block h-5">
                          Descripción
                        </Label>
                        <Input
                          id={`description-${line.id}`}
                          value={line.description}
                          onChange={(e) => handleLineChange(line.id, "description", e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`quantity-${line.id}`} className="block h-5">
                          Cantidad
                        </Label>
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
                        <Label htmlFor={`unit_price-${line.id}`} className="block h-5">
                          Precio Unitario (€)
                        </Label>
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
                      <div className="space-y-2">
                        <Label htmlFor={`discount_percentage-${line.id}`} className="flex items-center gap-1 h-5">
                          <Percent className="h-3 w-3" />
                          Descuento (%)
                        </Label>
                        <Input
                          id={`discount_percentage-${line.id}`}
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={line.discount_percentage}
                          onChange={(e) =>
                            handleLineChange(line.id, "discount_percentage", Number.parseFloat(e.target.value) || 0)
                          }
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

                    <div className="mt-4 text-right space-y-1">
                      <div className="text-sm text-muted-foreground">
                        Subtotal: {(line.quantity * line.unit_price).toFixed(2)} €
                      </div>
                      {line.discount_percentage > 0 && (
                        <div className="text-sm text-red-600">
                          Descuento ({line.discount_percentage}%): -
                          {((line.quantity * line.unit_price * line.discount_percentage) / 100).toFixed(2)} €
                        </div>
                      )}
                      <div className="font-medium">Importe: {line.line_amount.toFixed(2)} €</div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addLine} className="w-full bg-transparent">
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
                  <span>Subtotal:</span>
                  <span>{calculatedAmounts.subtotalAmount.toFixed(2)} €</span>
                </div>
                {calculatedAmounts.totalDiscountAmount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Descuentos totales:</span>
                    <span>-{calculatedAmounts.totalDiscountAmount.toFixed(2)} €</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Base imponible:</span>
                  <span>{calculatedAmounts.baseAmount.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA:</span>
                  <span>{calculatedAmounts.vatAmount.toFixed(2)} €</span>
                </div>
                {calculatedAmounts.irpfAmount > 0 && (
                  <div className="flex justify-between">
                    <span>IRPF:</span>
                    <span>-{calculatedAmounts.irpfAmount.toFixed(2)} €</span>
                  </div>
                )}
                {calculatedAmounts.retentionAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Retención:</span>
                    <span>-{calculatedAmounts.retentionAmount.toFixed(2)} €</span>
                  </div>
                )}
                <hr />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>{calculatedAmounts.totalAmount.toFixed(2)} €</span>
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
                          <h4 className="font-medium">{service.name}</h4>
                          {service.description && (
                            <p className="text-sm text-muted-foreground">{service.description}</p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            IVA: {service.vat_rate}% | IRPF: {service.irpf_rate}% | Retención: {service.retention_rate}%
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{service.price.toFixed(2)} €</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-4">No hay servicios disponibles</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setServiceDialogOpen(false)}>
                  Cancelar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <InvoiceNumberConfigModal
            open={invoiceNumberConfigOpen}
            onOpenChange={setInvoiceNumberConfigOpen}
            organizationId={selectedOrganization?.id || 0}
            invoiceType={invoiceType}
            onConfigSaved={handleConfigSaved}
          />

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creando borrador..." : "Crear Borrador"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
