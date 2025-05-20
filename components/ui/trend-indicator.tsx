import { ArrowDown, ArrowUp, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface TrendIndicatorProps {
  value: number
  suffix?: string
  className?: string
  invertColors?: boolean
  showIcon?: boolean
}

export function TrendIndicator({
  value,
  suffix = "%",
  className,
  invertColors = false,
  showIcon = true,
}: TrendIndicatorProps) {
  // Determinar si es positivo, negativo o neutro
  const isPositive = value > 0
  const isNegative = value < 0
  const isNeutral = value === 0

  // Determinar el color basado en la tendencia y si los colores están invertidos
  const getColorClass = () => {
    if (isNeutral) return "text-gray-500"

    if (invertColors) {
      return isPositive ? "text-red-500" : "text-green-500"
    }

    return isPositive ? "text-green-500" : "text-red-500"
  }

  // Formatear el valor para mostrarlo
  const formattedValue = Math.abs(value).toFixed(1)

  return (
    <div className={cn("flex items-center text-sm font-medium", getColorClass(), className)}>
      {showIcon && (
        <span className="mr-1">
          {isPositive && <ArrowUp className="h-3 w-3" />}
          {isNegative && <ArrowDown className="h-3 w-3" />}
          {isNeutral && <Minus className="h-3 w-3" />}
        </span>
      )}
      <span>
        {isPositive && "+"}
        {formattedValue}
        {suffix}
      </span>
    </div>
  )
}
