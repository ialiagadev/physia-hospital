"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { supabase } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Upload, AlertCircle, CheckCircle, Download, FileSpreadsheet } from "lucide-react"
import type { ClientImportData } from "@/utils/file-parser"
import { useToast } from "@/hooks/use-toast"

interface ImportClientsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: number
  onImportComplete: () => void
}

interface ImportResult {
  success: boolean
  imported: number
  errors: string[]
  duplicates: string[]
}

interface AIAnalysisResult {
  mapping: Record<string, string | null>
  data: ClientImportData[]
  invalidCount: number
  totalRows: number
  errors?: string[]
  duplicateCount?: number
  errorCSV?: string
}

type Step = "upload" | "preview" | "importing" | "results" | "analyzing"

export function ImportClientsDialog({
  open,
  onOpenChange,
  organizationId,
  onImportComplete,
}: ImportClientsDialogProps) {
  const [step, setStep] = useState<Step>("upload")
  const [aiAnalysisResult, setAiAnalysisResult] = useState<AIAnalysisResult | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [progress, setProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const { toast } = useToast()

  const processWithAI = async (file: File) => {
    try {
      setStep("analyzing")
      setProgress(10)

      // Crear FormData para enviar el archivo
      const formData = new FormData()
      formData.append("file", file)

      // Simular progreso durante el análisis
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 70) return prev + 5
          return prev
        })
      }, 500)

      // Enviar archivo a la API
      const response = await fetch("/api/ai-import", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      setProgress(80)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al procesar el archivo")
      }

      const result = await response.json()
      setAiAnalysisResult(result)
      setProgress(100)
      setStep("preview")

      // Mostrar toast de éxito
      toast({
        title: "Análisis completado",
        description: `Se han mapeado ${Object.values(result.mapping).filter(Boolean).length} columnas y encontrado ${result.data.length} clientes válidos.`,
      })

      // Mostrar advertencias si hay errores
      if (result.errors && result.errors.length > 0) {
        toast({
          title: "Advertencias encontradas",
          description: `Se encontraron ${result.errors.length} registros con problemas. Revisa los detalles.`,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error en el análisis",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      })
      setStep("upload")
    }
  }

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      setSelectedFile(file)
      await processWithAI(file)
    },
    [toast],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
  })

  // Función de importación usando cliente directo
  const importClients = async (clientsData: ClientImportData[], organizationId: number): Promise<ImportResult> => {
    const errors: string[] = []
    const duplicates: string[] = []
    let imported = 0

    try {
      console.log("Iniciando importación con organizationId:", organizationId)

      // Verificar duplicados en la base de datos por Tax ID
      const taxIds = clientsData.map((client) => client.tax_id)
      const { data: existingClientsByTaxId } = await supabase
        .from("clients")
        .select("tax_id, name")
        .in("tax_id", taxIds)

      const existingTaxIds = new Set(existingClientsByTaxId?.map((c) => c.tax_id) || [])

      // Verificar duplicados por teléfono (solo para teléfonos válidos)
      const validPhones = clientsData.map((client) => client.phone).filter((phone) => phone && phone.length > 6)
      let existingPhones = new Set<string>()

      if (validPhones.length > 0) {
        const { data: existingClientsByPhone } = await supabase
          .from("clients")
          .select("phone, name")
          .in("phone", validPhones)

        existingPhones = new Set(existingClientsByPhone?.map((c) => c.phone).filter(Boolean) || [])
      }

      // Filtrar clientes que no existen
      const newClients = clientsData.filter((client) => {
        // Verificar duplicado por Tax ID
        if (existingTaxIds.has(client.tax_id)) {
          duplicates.push(`${client.name} (${client.tax_id}) ya existe en la base de datos`)
          return false
        }

        // Verificar duplicado por teléfono
        if (client.phone && existingPhones.has(client.phone)) {
          duplicates.push(`${client.name} (teléfono: ${client.phone}) ya existe en la base de datos`)
          return false
        }

        return true
      })

      // Verificar duplicados dentro del mismo archivo (ya se hace en la API, pero por seguridad)
      const seenTaxIds = new Set<string>()
      const seenPhones = new Set<string>()
      const uniqueClients = newClients.filter((client) => {
        if (seenTaxIds.has(client.tax_id)) {
          duplicates.push(`${client.name} (${client.tax_id}) está duplicado en el archivo`)
          return false
        }
        seenTaxIds.add(client.tax_id)

        if (client.phone && seenPhones.has(client.phone)) {
          duplicates.push(`${client.name} (teléfono: ${client.phone}) está duplicado en el archivo`)
          return false
        }
        if (client.phone) {
          seenPhones.add(client.phone)
        }

        return true
      })

      console.log("Clientes únicos a importar:", uniqueClients.length)

      // Procesar en lotes de 50
      const batchSize = 50
      for (let i = 0; i < uniqueClients.length; i += batchSize) {
        const batch = uniqueClients.slice(i, i + batchSize)
        const clientsToInsert = batch.map((client) => ({
          organization_id: organizationId,
          name: client.name,
          tax_id: client.tax_id,
          address: client.address || null,
          postal_code: client.postal_code || null,
          city: client.city || null,
          province: client.province || null,
          country: client.country || "España",
          email: client.email || null,
          phone: client.phone || null,
          client_type: client.client_type || "private",
          birth_date: client.birth_date || null,
          gender: client.gender || null,
          dir3_codes: null,
        }))

        console.log(`Insertando lote ${Math.floor(i / batchSize) + 1}:`, clientsToInsert)

        const { data, error } = await supabase.from("clients").insert(clientsToInsert).select("id")

        if (error) {
          console.error("Error en inserción:", error)
          errors.push(`Error en lote ${Math.floor(i / batchSize) + 1}: ${error.message}`)
        } else {
          console.log("Lote insertado correctamente:", data?.length)
          imported += data?.length || 0
        }
      }
    } catch (error) {
      console.error("Error general en importación:", error)
      errors.push(`Error general: ${error instanceof Error ? error.message : "Error desconocido"}`)
    }

    return {
      success: errors.length === 0,
      imported,
      errors,
      duplicates,
    }
  }

  const handleImport = async () => {
    if (!aiAnalysisResult?.data.length) return

    setStep("importing")
    setProgress(0)

    try {
      console.log("Iniciando importación con organizationId:", organizationId)
      console.log("Datos a importar:", aiAnalysisResult.data.length, "clientes")

      // Simular progreso
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      const result = await importClients(aiAnalysisResult.data, organizationId)
      console.log("Resultado de importación:", result)

      clearInterval(progressInterval)
      setProgress(100)
      setImportResult(result)
      setStep("results")

      if (result.success) {
        toast({
          title: "Importación completada",
          description: `Se importaron ${result.imported} clientes correctamente.`,
        })
        onImportComplete()
      }
    } catch (error) {
      console.error("Error en handleImport:", error)
      toast({
        title: "Error en la importación",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      })
      setStep("preview")
    }
  }

  const downloadTemplate = () => {
    const csvContent = `Nombre,Apellidos,CIF/NIF,Direccion,Codigo Postal,Ciudad,Provincia,Pais,Email,Telefono,Tipo Cliente,Fecha Nacimiento,Genero
Empresa Ejemplo,,B12345678,Calle Mayor 123,28001,Madrid,Madrid,España,info@ejemplo.com,912345678,private,1980-05-15,male
Juan,Perez,12345678Z,Avenida Sol 45,08001,Barcelona,Barcelona,España,juan@email.com,666123456,private,1975-12-20,male
Maria,Garcia,87654321Y,Plaza Central 10,41001,Sevilla,Sevilla,España,maria@email.com,655987654,private,1990-03-08,female
Ayuntamiento Demo,,P1234567A,Plaza Mayor 1,28002,Madrid,Madrid,España,contacto@ayto.es,913456789,public,,
John,Smith,US123456789,123 Main Street,10001,New York,NY,Estados Unidos,john@email.com,+1234567890,private,1985-01-10,male
Marie,Dubois,FR987654321,Rue de la Paix 45,75001,Paris,Ile-de-France,Francia,marie@email.com,+33123456789,private,1992-06-25,female`

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "plantilla_clientes.csv"
    link.click()
  }

  const downloadErrorCSV = () => {
    if (!aiAnalysisResult?.errorCSV) return

    const blob = new Blob([aiAnalysisResult.errorCSV], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "errores_importacion.csv"
    link.click()

    toast({
      title: "CSV descargado",
      description: "Se ha descargado el archivo con los registros que presentaron errores.",
    })
  }

  const resetDialog = () => {
    setStep("upload")
    setAiAnalysisResult(null)
    setImportResult(null)
    setProgress(0)
    setSelectedFile(null)
  }

  const handleClose = () => {
    resetDialog()
    onOpenChange(false)
  }

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-"
    try {
      return new Date(dateStr).toLocaleDateString("es-ES")
    } catch {
      return dateStr
    }
  }

  const formatGender = (gender: string | null | undefined) => {
    if (!gender) return "-"
    switch (gender) {
      case "male":
        return "Masculino"
      case "female":
        return "Femenino"
      case "other":
        return "Otro"
      default:
        return gender
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Clientes</DialogTitle>
          <DialogDescription>
            Sube cualquier archivo Excel o CSV. El sistema analizará automáticamente las columnas y adaptará los datos
            al formato requerido, incluyendo clientes internacionales.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Descargar Plantilla
              </Button>
            </div>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-gray-400"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              {isDragActive ? (
                <p className="text-lg">Suelta el archivo aquí...</p>
              ) : (
                <div>
                  <p className="text-lg mb-2">Arrastra un archivo aquí o haz clic para seleccionar</p>
                  <p className="text-sm text-gray-500">Formatos soportados: CSV, Excel (.xlsx, .xls)</p>
                </div>
              )}
            </div>

            <Alert>
              <FileSpreadsheet className="h-4 w-4" />
              <AlertDescription>
                <strong>Importación inteligente:</strong> El sistema detectará automáticamente las columnas, normalizará
                las identificaciones fiscales (NIF/CIF/Tax ID) y detectará duplicados. Compatible con clientes
                nacionales e internacionales. ID fiscal y teléfono obligatorios.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {step === "analyzing" && (
          <div className="space-y-4 text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h3 className="text-lg font-semibold">Analizando archivo...</h3>
            <Progress value={progress} className="w-full max-w-md mx-auto" />
            <p className="text-sm text-gray-500">Identificando columnas, normalizando datos y detectando duplicados</p>
          </div>
        )}

        {step === "preview" && aiAnalysisResult && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Vista Previa</h3>
              <div className="text-sm text-gray-500">
                {aiAnalysisResult.data.length} clientes válidos de {aiAnalysisResult.totalRows} filas
              </div>
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <FileSpreadsheet className="h-4 w-4 text-blue-500" />
              <AlertDescription>
                <div className="font-semibold mb-2">Mapeo de columnas detectado:</div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {Object.entries(aiAnalysisResult.mapping).map(([standardField, originalField]) => (
                    <div key={standardField} className="flex items-center justify-between">
                      <span className="font-medium">{standardField}:</span>
                      <span className="text-blue-700">
                        {originalField ? originalField : <em className="text-gray-500">No detectado</em>}
                      </span>
                    </div>
                  ))}
                </div>
                {aiAnalysisResult.duplicateCount && aiAnalysisResult.duplicateCount > 0 && (
                  <div className="mt-2 text-sm text-orange-700">
                    <strong>Nota:</strong> Se detectaron y eliminaron {aiAnalysisResult.duplicateCount} duplicados
                    automáticamente.
                  </div>
                )}
              </AlertDescription>
            </Alert>

            {aiAnalysisResult.errors && aiAnalysisResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">Registros con problemas:</div>
                    {aiAnalysisResult.errorCSV && (
                      <Button variant="outline" size="sm" onClick={downloadErrorCSV}>
                        <Download className="w-4 h-4 mr-2" />
                        Descargar Errores CSV
                      </Button>
                    )}
                  </div>
                  <ul className="list-disc list-inside space-y-1 max-h-32 overflow-y-auto text-sm">
                    {aiAnalysisResult.errors.slice(0, 10).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                    {aiAnalysisResult.errors.length > 10 && (
                      <li className="text-gray-600">... y {aiAnalysisResult.errors.length - 10} errores más</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {aiAnalysisResult.data.length > 0 && (
              <div className="border rounded-lg max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>ID Fiscal</TableHead>
                      <TableHead>Dirección</TableHead>
                      <TableHead>CP</TableHead>
                      <TableHead>Ciudad</TableHead>
                      <TableHead>Provincia</TableHead>
                      <TableHead>País</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Fecha Nac.</TableHead>
                      <TableHead>Género</TableHead>
                      <TableHead>Tipo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aiAnalysisResult.data.slice(0, 10).map((client, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell className="font-mono text-sm">{client.tax_id}</TableCell>
                        <TableCell className="max-w-32 truncate" title={client.address || ""}>
                          {client.address || "-"}
                        </TableCell>
                        <TableCell>{client.postal_code || "-"}</TableCell>
                        <TableCell>{client.city || "-"}</TableCell>
                        <TableCell>{client.province || "-"}</TableCell>
                        <TableCell>{client.country || "-"}</TableCell>
                        <TableCell className="max-w-32 truncate" title={client.email || ""}>
                          {client.email || "-"}
                        </TableCell>
                        <TableCell>{client.phone || "-"}</TableCell>
                        <TableCell>{formatDate(client.birth_date)}</TableCell>
                        <TableCell>{formatGender(client.gender)}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              client.client_type === "public"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {client.client_type === "public" ? "Público" : "Privado"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {aiAnalysisResult.data.length > 10 && (
                  <div className="p-2 text-center text-sm text-gray-500 border-t">
                    ... y {aiAnalysisResult.data.length - 10} clientes más
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === "importing" && (
          <div className="space-y-4 text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h3 className="text-lg font-semibold">Importando clientes...</h3>
            <Progress value={progress} className="w-full max-w-md mx-auto" />
            <p className="text-sm text-gray-500">Procesando {aiAnalysisResult?.data.length || 0} clientes</p>
          </div>
        )}

        {step === "results" && importResult && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <h3 className="text-lg font-semibold">Importación Completada</h3>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{importResult.imported}</div>
                <div className="text-sm text-green-700">Importados</div>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{importResult.duplicates.length}</div>
                <div className="text-sm text-yellow-700">Duplicados</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{importResult.errors.length}</div>
                <div className="text-sm text-red-700">Errores</div>
              </div>
            </div>

            {importResult.duplicates.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-2">Clientes duplicados (no importados):</div>
                  <ul className="list-disc list-inside space-y-1 max-h-32 overflow-y-auto text-sm">
                    {importResult.duplicates.map((duplicate, index) => (
                      <li key={index}>{duplicate}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {importResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-2">Errores durante la importación:</div>
                  <ul className="list-disc list-inside space-y-1 max-h-32 overflow-y-auto text-sm">
                    {importResult.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          )}

          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                Volver
              </Button>
              <Button onClick={handleImport} disabled={!aiAnalysisResult?.data.length}>
                Importar {aiAnalysisResult?.data.length || 0} Clientes
              </Button>
            </>
          )}

          {step === "results" && <Button onClick={handleClose}>Cerrar</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
