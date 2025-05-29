"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  date?: Date
  setDate: (date?: Date) => void
}

export function DatePicker({ date, setDate }: DatePickerProps) {
  const [inputValue, setInputValue] = useState<string>(date ? formatDate(date) : "")

  function formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setInputValue(value)

    if (value) {
      try {
        const newDate = new Date(value)
        if (!isNaN(newDate.getTime())) {
          setDate(newDate)
        }
      } catch (error) {
        console.error("Invalid date format", error)
      }
    } else {
      setDate(undefined)
    }
  }

  return (
    <div className="relative">
      <Input
        type="date"
        value={inputValue}
        onChange={handleChange}
        className={cn("pr-10", !date && "text-muted-foreground")}
      />
      <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full">
        <CalendarIcon className="h-4 w-4" />
      </Button>
    </div>
  )
}
