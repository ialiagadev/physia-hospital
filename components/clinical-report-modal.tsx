"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  FileText,
  Download,
  Copy,
  Loader2,
  User,
  Calendar,
  Phone,
  Mail,
  AlertTriangle,
  FileDown,
  AlertCircle,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { ClinicalReportData } from "@/lib/actions/clinical-report-data"

interface ClinicalReportModalProps {
  isOpen: boolean
  onClose: () => void
  reportData: ClinicalReportData | null
  isLoading: boolean
  error: string | null
}

export function ClinicalReportModal({ isOpen, onClose, reportData, isLoading, error }: ClinicalReportModalProps) {
  const [observaciones, setObservaciones] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedReport, setGeneratedReport] = useState("")
  const { toast } = useToast()

  const calcularEdad = (fechaNacimiento: string | null) => {
    if (!fechaNacimiento) return "N/A"
    try {
      const hoy = new Date()
      const nacimiento = new Date(fechaNacimiento)
      if (isNaN(nacimiento.getTime())) return "N/A"
      let edad = hoy.getFullYear() - nacimiento.getFullYear()
      const mes = hoy.getMonth() - nacimiento.getMonth()
      if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--
      }
      return edad
    } catch {
      return "N/A"
    }
  }

  const formatearFecha = (fechaISO: string | null) => {
    if (!fechaISO) return "Fecha no válida"
    try {
      const fecha = new Date(fechaISO)
      if (isNaN(fecha.getTime())) return "Fecha no válida"
      return fecha.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    } catch {
      return "Fecha no válida"
    }
  }

  // Función para extraer alergias del historial médico
  const getAlergias = () => {
    if (!reportData?.historialMedico) return []

    const alergias = []
    if (reportData.historialMedico.alergiasMedicamentosas) {
      alergias.push(reportData.historialMedico.alergiasMedicamentosas)
    }
    if (reportData.historialMedico.alergiasAlimentarias) {
      alergias.push(reportData.historialMedico.alergiasAlimentarias)
    }
    if (reportData.historialMedico.alergiasAmbientales) {
      alergias.push(reportData.historialMedico.alergiasAmbientales)
    }
    return alergias.filter(Boolean)
  }

  // Función para extraer diagnósticos
  const getDiagnosticos = () => {
    if (!reportData?.historialMedico?.diagnostico) return []
    return [reportData.historialMedico.diagnostico].filter(Boolean)
  }

  // Función para extraer medicación
  const getMedicacion = () => {
    const medicacion = []
    if (reportData?.historialMedico?.medicacionHabitual) {
      medicacion.push(reportData.historialMedico.medicacionHabitual)
    }
    if (reportData?.historialMedico?.medicacion) {
      medicacion.push(reportData.historialMedico.medicacion)
    }
    return medicacion.filter(Boolean)
  }

  const generateReport = async () => {
    if (!reportData) {
      toast({
        title: "Error",
        description: "No hay datos disponibles para generar el informe",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    setGeneratedReport("")

    try {
      const pacienteData = {
        ...reportData.pacienteInfo,
        edad: calcularEdad(reportData.pacienteInfo.fechaNacimiento),
        ultimaVisita: reportData.metadatos.ultimaVisita,
        proximaCita: "",
        notas: reportData.historialMedico?.observacionesAdicionales || "",
        alergias: getAlergias(),
        diagnosticos: getDiagnosticos(),
        medicacion: getMedicacion(),
      }

      const requestData = {
        paciente: pacienteData,
        historialMedico: reportData.historialMedico,
        seguimientos: reportData.seguimientos,
        citas: [],
        documentos: [],
        observaciones: observaciones.trim(),
        historialCompleto: reportData.historialMedico,
      }

      const response = await fetch("/api/generate-clinical-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Error ${response.status}: ${response.statusText}`)
      }

      if (data.success && data.report) {
        setGeneratedReport(data.report)
        toast({
          title: "Informe generado",
          description: "El informe clínico se ha generado correctamente",
        })
      } else {
        throw new Error("No se recibió el informe en la respuesta")
      }
    } catch (error) {
      console.error("Error completo:", error)
      const errorMessage = error instanceof Error ? error.message : "Error desconocido"
      toast({
        title: "Error",
        description: `No se pudo generar el informe clínico: ${errorMessage}`,
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyReport = () => {
    navigator.clipboard.writeText(generatedReport)
    toast({
      title: "Copiado",
      description: "Informe copiado al portapapeles",
    })
  }

  const handleDownloadTXT = () => {
    if (!reportData) return

    const element = document.createElement("a")
    const file = new Blob([generatedReport], { type: "text/plain;charset=utf-8" })
    element.href = URL.createObjectURL(file)
    element.download = `Informe_Clinico_${reportData.pacienteInfo.nombre.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)

    toast({
      title: "Descarga iniciada",
      description: "El informe se ha descargado como archivo de texto",
    })
  }

  const handleDownloadWord = () => {
    if (!reportData) return

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Informe Clínico - ${reportData.pacienteInfo.nombre}</title>
        <style>
          body { 
            font-family: 'Times New Roman', serif; 
            font-size: 12pt; 
            line-height: 1.6; 
            margin: 2cm; 
            white-space: pre-line;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30pt; 
            border-bottom: 2px solid #333; 
            padding-bottom: 15pt; 
          }
          .header h1 { 
            font-size: 18pt; 
            font-weight: bold; 
            margin: 0; 
          }
          .header p { 
            margin: 5pt 0; 
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>INFORME CLÍNICO</h1>
          <p><strong>Fecha del informe:</strong> ${new Date().toLocaleDateString("es-ES")}</p>
          <p><strong>Paciente:</strong> ${reportData.pacienteInfo.nombre}</p>
        </div>
        <div class="content">
          ${generatedReport}
        </div>
      </body>
      </html>
    `

    const blob = new Blob([htmlContent], { type: "application/msword;charset=utf-8" })
    const element = document.createElement("a")
    element.href = URL.createObjectURL(blob)
    element.download = `Informe_Clinico_${reportData.pacienteInfo.nombre.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.doc`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)

    toast({
      title: "Descarga iniciada",
      description: "El informe se ha descargado como documento de Word",
    })
  }

  const handleDownloadPDF = async () => {
    if (!reportData) return

    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              font-size: 11pt; 
              line-height: 1.5; 
              margin: 0; 
              padding: 20px; 
              white-space: pre-line;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #333; 
              padding-bottom: 15px; 
            }
            .header h1 { 
              font-size: 18pt; 
              margin: 0; 
              color: #333; 
            }
            .header p { 
              margin: 5px 0; 
              color: #666; 
            }
            .patient-info { 
              background-color: #f8f9fa; 
              padding: 15px; 
              border-radius: 5px; 
              margin-bottom: 20px; 
            }
            .patient-info table { 
              width: 100%; 
              border-collapse: collapse; 
            }
            .patient-info td { 
              padding: 5px; 
              border-bottom: 1px solid #eee; 
            }
            .patient-info td:first-child { 
              font-weight: bold; 
              width: 30%; 
            }
            @media print { 
              body { 
                margin: 0; 
              } 
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>INFORME CLÍNICO</h1>
            <p><strong>Fecha del informe:</strong> ${new Date().toLocaleDateString("es-ES")}</p>
          </div>
          
          <div class="patient-info">
            <table>
              <tr><td>Paciente:</td><td>${reportData.pacienteInfo.nombre}</td></tr>
              <tr><td>Edad:</td><td>${calcularEdad(reportData.pacienteInfo.fechaNacimiento)} años</td></tr>
              <tr><td>Teléfono:</td><td>${reportData.pacienteInfo.telefono || "No registrado"}</td></tr>
              <tr><td>Email:</td><td>${reportData.pacienteInfo.email || "No registrado"}</td></tr>
              <tr><td>Última visita:</td><td>${formatearFecha(reportData.metadatos.ultimaVisita)}</td></tr>
            </table>
          </div>
          
          <div class="content">
            ${generatedReport}
          </div>
        </body>
        </html>
      `

      const printWindow = window.open("", "_blank")
      if (printWindow) {
        printWindow.document.write(htmlContent)
        printWindow.document.close()

        setTimeout(() => {
          printWindow.print()
          printWindow.close()
        }, 500)

        toast({
          title: "Generando PDF",
          description: "Se abrirá el diálogo de impresión para guardar como PDF",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo generar el PDF",
        variant: "destructive",
      })
    }
  }

  const handleClose = () => {
    setObservaciones("")
    setGeneratedReport("")
    onClose()
  }

  // Función para renderizar el informe con formato preservado
  const renderFormattedReport = (report: string) => {
    return (
      <div className="space-y-4">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-800 bg-white p-6 rounded-lg border">
          {report}
        </pre>
      </div>
    )
  }

  // Mostrar loading mientras se cargan los datos
  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              Cargando datos del paciente...
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Mostrar error si hay algún problema
  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-red-600" />
              Error al cargar datos
            </DialogTitle>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="flex justify-end">
            <Button onClick={handleClose}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Si no hay datos del reporte
  if (!reportData) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
              Sin datos disponibles
            </DialogTitle>
          </DialogHeader>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>No se encontraron datos del paciente para generar el informe.</AlertDescription>
          </Alert>
          <div className="flex justify-end">
            <Button onClick={handleClose}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const alergias = getAlergias()
  const diagnosticos = getDiagnosticos()
  const medicacion = getMedicacion()

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <FileText className="w-6 h-6 text-blue-600" />
            Generar Informe Clínico - {reportData.pacienteInfo.nombre}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del paciente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="w-5 h-5 text-green-600" />
                Información del Paciente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">Nombre:</span>
                    <span>{reportData.pacienteInfo.nombre}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">Edad:</span>
                    <span>{calcularEdad(reportData.pacienteInfo.fechaNacimiento)} años</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">Teléfono:</span>
                    <span>{reportData.pacienteInfo.telefono || "No registrado"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">Email:</span>
                    <span>{reportData.pacienteInfo.email || "No registrado"}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">Última visita:</span>
                    <span>{formatearFecha(reportData.metadatos.ultimaVisita)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">Total seguimientos:</span>
                    <span>{reportData.metadatos.totalSeguimientos}</span>
                  </div>
                </div>
              </div>

              {/* Información médica */}
              <div className="pt-4 border-t space-y-3">
                {alergias.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="font-medium text-red-700">Alergias:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {alergias.map((alergia: string, index: number) => (
                        <Badge key={index} variant="destructive" className="text-xs">
                          {alergia}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {diagnosticos.length > 0 && (
                  <div>
                    <span className="font-medium text-blue-700">Diagnósticos:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {diagnosticos.map((diagnostico: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {diagnostico}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {medicacion.length > 0 && (
                  <div>
                    <span className="font-medium text-purple-700">Medicación:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {medicacion.map((medicamento: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {medicamento}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {reportData.historialMedico?.observacionesAdicionales && (
                  <div>
                    <span className="font-medium text-gray-700">Notas:</span>
                    <p className="text-sm text-gray-600 mt-1 bg-gray-50 p-2 rounded">
                      {reportData.historialMedico.observacionesAdicionales}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Observaciones adicionales */}
          <div className="space-y-2">
            <Label htmlFor="observaciones" className="text-base font-medium">
              Observaciones adicionales para el informe (opcional)
            </Label>
            <Textarea
              id="observaciones"
              placeholder="Escribe aquí cualquier observación adicional que quieras incluir en el informe clínico..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button onClick={generateReport} disabled={isGenerating} className="bg-blue-600 hover:bg-blue-700">
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Generar Informe
                </>
              )}
            </Button>
          </div>

          {/* Informe generado */}
          {generatedReport && (
            <Card className="mt-6">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="w-5 h-5 text-green-600" />
                  Informe Clínico Generado
                  <div className="ml-auto flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopyReport}>
                      <Copy className="w-4 h-4 mr-1" />
                      Copiar
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownloadTXT}>
                      <Download className="w-4 h-4 mr-1" />
                      TXT
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadWord}
                      className="bg-blue-50 hover:bg-blue-100"
                    >
                      <FileDown className="w-4 h-4 mr-1" />
                      Word
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadPDF}
                      className="bg-red-50 hover:bg-red-100"
                    >
                      <FileDown className="w-4 h-4 mr-1" />
                      PDF
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="bg-white border-2 border-gray-100 max-h-[600px] overflow-y-auto">
                  {/* Header del informe */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 text-center">
                    <h1 className="text-2xl font-bold mb-2">INFORME CLÍNICO</h1>
                    <p className="text-blue-100">
                      Fecha:{" "}
                      {new Date().toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-blue-100">Paciente: {reportData.pacienteInfo.nombre}</p>
                  </div>

                  {/* Contenido del informe con formato preservado */}
                  <div className="p-8">{renderFormattedReport(generatedReport)}</div>

                  {/* Footer del informe */}
                  <div className="bg-gray-50 border-t p-4 text-center text-sm text-gray-600">
                    <p>Este informe ha sido generado automáticamente el {new Date().toLocaleString("es-ES")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
