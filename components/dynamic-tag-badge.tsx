"use client"

import { Badge } from "@/components/ui/badge"
import { hexToDisplayStyle } from "@/lib/dynamic-tag-colors"

interface DynamicTagBadgeProps {
  tagName: string
  color: string // Hex color
  className?: string
  onClick?: () => void
  children?: React.ReactNode
}

export function DynamicTagBadge({ tagName, color, className = "", onClick, children }: DynamicTagBadgeProps) {
  const displayStyle = hexToDisplayStyle(color)

  return (
    <Badge
      className={`px-3 py-1 font-medium cursor-pointer hover:scale-105 transition-all duration-200 shadow-sm ${
        displayStyle.isDynamic ? 'border-0' : displayStyle.className
      } ${className}`}
      style={displayStyle.isDynamic ? displayStyle.style : undefined}
      onClick={onClick}
    >
      {tagName}
      {children}
    </Badge>
  )
}
