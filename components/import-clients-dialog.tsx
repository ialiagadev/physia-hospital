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
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Download } from "lucide-react"
import { parseFile, type ParseResult, type ClientImportData } from "@/utils/file-parser"
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

type Step = "upload" | "preview" | "importing" | "results"

export function ImportClientsDialog({
  open,
  onOpenChange,
  organizationId,
  onImportComplete,
}: ImportClientsDialogProps) {
  const [step, setStep] = useState<Step>("upload")
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [progress, setProgress] = useState(0)
  const { toast } = useToast()

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      try {
        setStep("preview")
        const result = await parseFile(file)
        setParseResult(result)

        if (result.errors.length > 0) {
          toast({
            title: "Errores en el archivo",
            description: `Se encontraron ${result.errors.length} errores. Revisa los detalles.`,
            variant: "destructive",
          })
        }
      } catch (error) {
        toast({
          title: "Error al procesar archivo",
          description: error instanceof Error ? error.message : "Error desconocido",
          variant: "destructive",
        })
      }
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

  // Función de importación usando cliente directo (igual que tu formulario)
  const importClients = async (clientsData: ClientImportData[], organizationId: number): Promise<ImportResult> => {
    const errors: string[] = []
    const duplicates: string[] = []
    let imported = 0

    try {
      console.log("Iniciando importación con organizationId:", organizationId)

      // Verificar duplicados en la base de datos
      const taxIds = clientsData.map((client) => client.tax_id)
      const { data: existingClients } = await supabase.from("clients").select("tax_id, name").in("tax_id", taxIds)

      const existingTaxIds = new Set(existingClients?.map((c) => c.tax_id) || [])

      // Filtrar clientes que no existen
      const newClients = clientsData.filter((client) => {
        if (existingTaxIds.has(client.tax_id)) {
          duplicates.push(`${client.name} (${client.tax_id}) ya existe en la base de datos`)
          return false
        }
        return true
      })

      // Verificar duplicados dentro del mismo archivo
      const seenTaxIds = new Set<string>()
      const uniqueClients = newClients.filter((client) => {
        if (seenTaxIds.has(client.tax_id)) {
          duplicates.push(`${client.name} (${client.tax_id}) está duplicado en el archivo`)
          return false
        }
        seenTaxIds.add(client.tax_id)
        return true
      })

      console.log("Clientes únicos a importar:", uniqueClients.length)

      // Procesar en lotes de 50 (igual que tu formulario individual)
      const batchSize = 50
      for (let i = 0; i < uniqueClients.length; i += batchSize) {
        const batch = uniqueClients.slice(i, i + batchSize)

        const clientsToInsert = batch.map((client) => ({
          organization_id: organizationId, // Usar el organizationId pasado
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
          dir3_codes: null,
        }))

        console.log(`Insertando lote ${Math.floor(i / batchSize) + 1}:`, clientsToInsert)

        // Usar el mismo patrón que tu formulario
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
    if (!parseResult?.data.length) return

    setStep("importing")
    setProgress(0)

    try {
      console.log("Iniciando importación con organizationId:", organizationId)
      console.log("Datos a importar:", parseResult.data.length, "clientes")

      // Simular progreso
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      // Usar la función local en lugar del Server Action
      const result = await importClients(parseResult.data, organizationId)

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
    const csvContent = `Nombre,CIF/NIF,Direccion,Codigo Postal,Ciudad,Provincia,Pais,Email,Telefono,Tipo Cliente
Empresa Ejemplo,B12345678,Calle Mayor 123,28001,Madrid,Madrid,España,info@ejemplo.com,912345678,private
Juan Perez,12345678Z,Avenida Sol 45,08001,Barcelona,Barcelona,España,juan@email.com,666123456,private
Ayuntamiento Demo,P1234567A,Plaza Mayor 1,28002,Madrid,Madrid,España,contacto@ayto.es,913456789,public`

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "plantilla_clientes.csv"
    link.click()
  }

  const resetDialog = () => {
    setStep("upload")
    setParseResult(null)
    setImportResult(null)
    setProgress(0)
  }

  const handleClose = () => {
    resetDialog()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Clientes</DialogTitle>
          <DialogDescription>Importa múltiples clientes desde un archivo Excel o CSV</DialogDescription>
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
                <strong>Campos obligatorios:</strong> Nombre y CIF/NIF. El resto de campos son opcionales. Descarga la
                plantilla para ver el formato correcto.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {step === "preview" && parseResult && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Vista Previa</h3>
              <div className="text-sm text-gray-500">
                {parseResult.data.length} clientes válidos de {parseResult.totalRows} filas
              </div>
            </div>

            {parseResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-2">Errores encontrados:</div>
                  <ul className="list-disc list-inside space-y-1 max-h-32 overflow-y-auto">
                    {parseResult.errors.map((error, index) => (
                      <li key={index} className="text-sm">
                        {error}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {parseResult.data.length > 0 && (
              <div className="border rounded-lg max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>CIF/NIF</TableHead>
                      <TableHead>Ciudad</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Tipo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parseResult.data.slice(0, 10).map((client, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell>{client.tax_id}</TableCell>
                        <TableCell>{client.city || "-"}</TableCell>
                        <TableCell>{client.email || "-"}</TableCell>
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
                {parseResult.data.length > 10 && (
                  <div className="p-2 text-center text-sm text-gray-500 border-t">
                    ... y {parseResult.data.length - 10} clientes más
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
            <p className="text-sm text-gray-500">Procesando {parseResult?.data.length || 0} clientes</p>
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
              <Button onClick={handleImport} disabled={!parseResult?.data.length}>
                Importar {parseResult?.data.length || 0} Clientes
              </Button>
            </>
          )}

          {step === "results" && <Button onClick={handleClose}>Cerrar</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
