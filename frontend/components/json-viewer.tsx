import * as React from "react"
import { cn } from "@/lib/utils"

interface JsonViewerProps {
  data: string | object
  className?: string
}

export function JsonViewer({ data, className }: JsonViewerProps) {
  const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
  
  return (
    <pre className={cn(
      "bg-gray-900 text-gray-100 p-4 rounded-md overflow-y-auto text-xs font-mono",
      "max-h-[600px] whitespace-pre-wrap break-words",
      className
    )}>
      <code className="break-words">{jsonString}</code>
    </pre>
  )
}

