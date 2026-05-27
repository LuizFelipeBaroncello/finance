"use client"

import * as React from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type OptionSelectOption = {
  value: string
  label: React.ReactNode
  displayLabel?: React.ReactNode
  disabled?: boolean
}

export interface OptionSelectProps {
  value: string
  onValueChange: (value: string) => void
  options: OptionSelectOption[]
  placeholder?: string
  disabled?: boolean
  size?: "sm" | "default"
  triggerClassName?: string
}

export function OptionSelect({
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  size = "default",
  triggerClassName,
}: OptionSelectProps) {
  const handleChange = React.useCallback(
    (next: string | null) => {
      onValueChange(next ?? "")
    },
    [onValueChange],
  )

  return (
    <Select
      value={value}
      onValueChange={handleChange}
      disabled={disabled}
    >
      <SelectTrigger className={triggerClassName} size={size}>
        <SelectValue placeholder={placeholder}>
          {(current) => {
            const key = current == null ? "" : String(current)
            if (!key) return placeholder ?? ""
            const found = options.find((o) => o.value === key)
            if (!found) return key
            return found.displayLabel ?? found.label ?? key
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
