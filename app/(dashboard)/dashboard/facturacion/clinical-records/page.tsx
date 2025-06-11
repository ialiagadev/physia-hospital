"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Clock, Eye, FileText, Loader2, Phone, PlusCircle, RefreshCw, Search, User } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

// Función para formatear fechas
const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString)
    return format(date, "dd/MM/yyyy", { locale: es })
  } catch (error) {
    return "Fecha no válida"
  }
}

// Función para formatear fechas con hora
const formatDateTime = (dateString: string) => {
  try {
    const date = new Date(dateString)
    return format(date, "dd/MM/yyyy HH:mm", { locale: es })
  } catch (error) {
    return "Fecha no válida"
  }
}

// Función para formatear número de teléfono
const formatPhone = (phone: string | null) => {
  if (!phone) return "No disponible"

  // Eliminar caracteres no numéricos
  const cleaned = phone.replace(/\D/g, "")

  // Formatear según el patrón español (ej: 612 34 56 78)
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7, 9)}`
  }

  return phone
}

export default function ClinicalRecordsListPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [records, setRecords] = useState<any[]>([])
  const [filteredRecords, setFilteredRecords] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [patientFilter, setPatientFilter] = useState<string>("all")
  const [professionalFilter, setProfessionalFilter] = useState<string>("all")
  const [organizationFilter, setOrganizationFilter] = useState<string>("all")

  const [patients, setPatients] = useState<any[]>([])
  const [professionals, setProfessionals] = useState<any[]>([])
  const [organizations, setOrganizations] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  // Cargar datos iniciales
  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Obtener historias clínicas con relaciones
      const { data: recordsData, error: recordsError } = await supabase
        .from("clinical_records")
        .select(`
          *,
          patient:clients(*),
          professional:professionals(*),
          organization:organizations(*)
        `)
        .order("updated_at", { ascending: false })

      if (recordsError) throw new Error(`Error al obtener las historias clínicas: ${recordsError.message}`)

      setRecords(recordsData || [])
      setFilteredRecords(recordsData || [])

      // Obtener pacientes únicos
      const uniquePatients = Array.from(new Set((recordsData || []).map((record) => record.patient_id)))
        .map((patientId) => {
          const record = recordsData?.find((r) => r.patient_id === patientId)
          return record?.patient
        })
        .filter(Boolean)

      setPatients(uniquePatients)

      // Obtener profesionales únicos
      const uniqueProfessionals = Array.from(
        new Set((recordsData || []).filter((record) => record.professional_id).map((record) => record.professional_id)),
      )
        .map((professionalId) => {
          const record = recordsData?.find((r) => r.professional_id === professionalId)
          return record?.professional
        })
        .filter(Boolean)

      setProfessionals(uniqueProfessionals)

      // Obtener organizaciones únicas
      const uniqueOrganizations = Array.from(new Set((recordsData || []).map((record) => record.organization_id)))
        .map((orgId) => {
          const record = recordsData?.find((r) => r.organization_id === orgId)
          return record?.organization
        })
        .filter(Boolean)

      setOrganizations(uniqueOrganizations)
    } catch (err) {
      console.error("Error al cargar los datos:", err)
      setError(err instanceof Error ? err.message : "Error al cargar los datos")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Aplicar filtros cuando cambien
  useEffect(() => {
    let filtered = [...records]

    // Filtro por texto de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (record) =>
          record.title.toLowerCase().includes(term) ||
          (record.description && record.description.toLowerCase().includes(term)) ||
          (record.patient?.name && record.patient.name.toLowerCase().includes(term)) ||
          (record.patient?.tax_id && record.patient.tax_id.toLowerCase().includes(term)) ||
          (record.patient?.phone && record.patient.phone.toLowerCase().includes(term)),
      )
    }

    // Filtro por paciente
    if (patientFilter !== "all") {
      filtered = filtered.filter((record) => record.patient_id.toString() === patientFilter)
    }

    // Filtro por profesional
    if (professionalFilter !== "all") {
      if (professionalFilter === "none") {
        filtered = filtered.filter((record) => !record.professional_id)
      } else {
        filtered = filtered.filter((record) => record.professional_id?.toString() === professionalFilter)
      }
    }

    // Filtro por organización
    if (organizationFilter !== "all") {
      filtered = filtered.filter((record) => record.organization_id.toString() === organizationFilter)
    }

    setFilteredRecords(filtered)
  }, [records, searchTerm, patientFilter, professionalFilter, organizationFilter])

  const handleCreateNew = () => {
    router.push("/dashboard/clinical-records/new")
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const handleRowClick = (id: string) => {
    router.push(`/dashboard/clinical-records/${id}`)
  }

  if (loading && !refreshing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <p className="text-red-500">{error}</p>
        <Button className="mt-4" onClick={() => router.push("/dashboard")}>
          Volver al dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Historias Clínicas</h1>
          <p className="text-muted-foreground mt-1">Gestiona las historias clínicas de tus pacientes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Actualizar
          </Button>
          <Button onClick={handleCreateNew}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nueva Historia Clínica
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Filtra las historias clínicas por diferentes criterios</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Buscar por título, paciente o descripción"
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Paciente</label>
              <Select value={patientFilter} onValueChange={setPatientFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los pacientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los pacientes</SelectItem>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id.toString()}>
                      {patient.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Profesional</label>
              <Select value={professionalFilter} onValueChange={setProfessionalFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los profesionales" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los profesionales</SelectItem>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {professionals.map((professional) => (
                    <SelectItem key={professional.id} value={professional.id.toString()}>
                      {professional.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Organización</label>
              <Select value={organizationFilter} onValueChange={setOrganizationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las organizaciones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las organizaciones</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id.toString()}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historias Clínicas ({filteredRecords.length})</CardTitle>
          <CardDescription>Lista de historias clínicas ordenadas por fecha de actualización</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRecords.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron historias clínicas con los filtros seleccionados</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchTerm("")
                  setPatientFilter("all")
                  setProfessionalFilter("all")
                  setOrganizationFilter("all")
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Profesional</TableHead>
                    <TableHead>Organización</TableHead>
                    <TableHead>Fecha inicio</TableHead>
                    <TableHead>Última actualización</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow
                      key={record.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleRowClick(record.id)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 text-gray-400 mr-2" />
                          {record.title}
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.patient ? (
                          <div className="flex items-center">
                            <User className="h-4 w-4 text-gray-400 mr-2" />
                            <Link
                              href={`/dashboard/clients/${record.patient.id}`}
                              className="text-green-600 hover:underline hover:text-green-800"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {record.patient.name}
                            </Link>
                          </div>
                        ) : (
                          "Desconocido"
                        )}
                      </TableCell>
                      <TableCell>
                        {record.patient?.phone ? (
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 text-gray-400 mr-2" />
                            <span>{formatPhone(record.patient.phone)}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">No disponible</span>
                        )}
                      </TableCell>
                      <TableCell>{record.professional ? record.professional.name : "No asignado"}</TableCell>
                      <TableCell>{record.organization ? record.organization.name : "Desconocida"}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          {formatDate(record.start_date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-gray-400 mr-2" />
                          {formatDateTime(record.updated_at)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/dashboard/clinical-records/${record.id}`)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Ver</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
