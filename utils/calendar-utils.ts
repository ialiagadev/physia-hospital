import type { DiaEspecial } from "@/types/calendar-types"

export const verificarDisponibilidad = (
  fecha: Date,
  hora: string,
  profesionalId: number,
  diasEspeciales: DiaEspecial[],
) => {
  const fechaStr = fecha.toISOString().split("T")[0]

  // Verificar días especiales
  const diaEspecial = diasEspeciales.find((d) => d.fecha === fechaStr)

  if (diaEspecial) {
    if (diaEspecial.tipo === "cerrado") {
      return {
        disponible: false,
        motivo: diaEspecial.motivo,
      }
    }

    if (diaEspecial.tipo === "horario_especial" && diaEspecial.horarioEspecial) {
      const horaMinutos = horaAMinutos(hora)
      const aperturaMinutos = horaAMinutos(diaEspecial.horarioEspecial.apertura)
      const cierreMinutos = horaAMinutos(diaEspecial.horarioEspecial.cierre)

      if (horaMinutos < aperturaMinutos || horaMinutos >= cierreMinutos) {
        return {
          disponible: false,
          motivo: `Fuera del horario especial (${diaEspecial.horarioEspecial.apertura}-${diaEspecial.horarioEspecial.cierre})`,
        }
      }

      return {
        disponible: true,
        fueraHorarioNormal: true,
      }
    }
  }

  return {
    disponible: true,
  }
}

export const obtenerHorariosDisponibles = (fecha: Date, profesionalId: number, diasEspeciales: DiaEspecial[]) => {
  const fechaStr = fecha.toISOString().split("T")[0]
  const diaSemana = fecha.getDay() === 0 ? 7 : fecha.getDay() // Convertir domingo de 0 a 7

  // Verificar días especiales
  const diaEspecial = diasEspeciales.find((d) => d.fecha === fechaStr)

  if (diaEspecial) {
    if (diaEspecial.tipo === "cerrado") {
      return []
    }

    if (diaEspecial.tipo === "horario_especial" && diaEspecial.horarioEspecial) {
      return [
        {
          apertura: diaEspecial.horarioEspecial.apertura,
          cierre: diaEspecial.horarioEspecial.cierre,
          fueraHorarioNormal: true,
        },
      ]
    }
  }

  // Horario normal
  return [
    {
      apertura: "08:00",
      cierre: "20:00",
      fueraHorarioNormal: false,
    },
  ]
}

export const horaAMinutos = (hora: string): number => {
  const [horas, minutos] = hora.split(":").map(Number)
  return horas * 60 + minutos
}

export const minutosAHora = (minutos: number): string => {
  const horas = Math.floor(minutos / 60)
  const mins = minutos % 60
  return `${horas.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
}

export const calcularHoraFin = (horaInicio: string, duracionMinutos: number): string => {
  const minutosInicio = horaAMinutos(horaInicio)
  const minutosFin = minutosInicio + duracionMinutos
  return minutosAHora(minutosFin)
}

export const formatearFecha = (fecha: Date): string => {
  return fecha.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export const esMismaFecha = (fecha1: Date, fecha2: Date): boolean => {
  return fecha1.toDateString() === fecha2.toDateString()
}
