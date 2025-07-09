"use client"

import { useRef, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight } from "lucide-react"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  error?: boolean
}

export function RichTextEditor({ value, onChange, placeholder, className, error }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (editorRef.current && !isInitialized) {
      editorRef.current.innerHTML = value || ""
      setIsInitialized(true)
    }
  }, [value, isInitialized])

  const handleInput = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML
      onChange(content === "<div><br></div>" || content === "<br>" ? "" : content)
    }
  }

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    handleInput()
  }

  const formatBlock = (tag: string) => {
    document.execCommand("formatBlock", false, tag)
    editorRef.current?.focus()
    handleInput()
  }

  const insertList = (ordered: boolean) => {
    const command = ordered ? "insertOrderedList" : "insertUnorderedList"
    document.execCommand(command, false)
    editorRef.current?.focus()
    handleInput()
  }

  const setAlignment = (align: string) => {
    document.execCommand("justify" + align, false)
    editorRef.current?.focus()
    handleInput()
  }

  return (
    <div className={cn("rich-text-editor border rounded-md", error && "border-red-500", className)}>
      {/* Toolbar */}
      <div className="border-b bg-gray-50 p-2 flex flex-wrap gap-1">
        {/* Headers */}
        <select
          onChange={(e) => formatBlock(e.target.value)}
          className="px-2 py-1 text-sm border rounded mr-2"
          defaultValue=""
        >
          <option value="">Formato</option>
          <option value="h1">Título 1</option>
          <option value="h2">Título 2</option>
          <option value="h3">Título 3</option>
          <option value="p">Párrafo</option>
        </select>

        {/* Text formatting */}
        <Button type="button" variant="ghost" size="sm" onClick={() => execCommand("bold")} className="h-8 w-8 p-0">
          <Bold className="h-4 w-4" />
        </Button>

        <Button type="button" variant="ghost" size="sm" onClick={() => execCommand("italic")} className="h-8 w-8 p-0">
          <Italic className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand("underline")}
          className="h-8 w-8 p-0"
        >
          <Underline className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Lists */}
        <Button type="button" variant="ghost" size="sm" onClick={() => insertList(false)} className="h-8 w-8 p-0">
          <List className="h-4 w-4" />
        </Button>

        <Button type="button" variant="ghost" size="sm" onClick={() => insertList(true)} className="h-8 w-8 p-0">
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Alignment */}
        <Button type="button" variant="ghost" size="sm" onClick={() => setAlignment("Left")} className="h-8 w-8 p-0">
          <AlignLeft className="h-4 w-4" />
        </Button>

        <Button type="button" variant="ghost" size="sm" onClick={() => setAlignment("Center")} className="h-8 w-8 p-0">
          <AlignCenter className="h-4 w-4" />
        </Button>

        <Button type="button" variant="ghost" size="sm" onClick={() => setAlignment("Right")} className="h-8 w-8 p-0">
          <AlignRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className={cn(
          "min-h-[300px] p-4 focus:outline-none",
          "prose prose-sm max-w-none",
          "prose-headings:text-gray-900 prose-p:text-gray-700",
          "prose-li:text-gray-700 prose-strong:text-gray-900",
        )}
        style={{
          wordBreak: "break-word",
          overflowWrap: "break-word",
        }}
        data-placeholder={placeholder}
      />

      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        
        .rich-text-editor h1 {
          font-size: 1.875rem;
          font-weight: 700;
          margin: 1rem 0 0.5rem 0;
          line-height: 1.2;
        }
        
        .rich-text-editor h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 1rem 0 0.5rem 0;
          line-height: 1.3;
        }
        
        .rich-text-editor h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0.75rem 0 0.5rem 0;
          line-height: 1.4;
        }
        
        .rich-text-editor p {
          margin: 0.5rem 0;
          line-height: 1.6;
        }
        
        .rich-text-editor ul, .rich-text-editor ol {
          margin: 0.5rem 0;
          padding-left: 1.5rem;
        }
        
        .rich-text-editor li {
          margin: 0.25rem 0;
          line-height: 1.5;
        }
        
        .rich-text-editor strong {
          font-weight: 600;
        }
        
        .rich-text-editor em {
          font-style: italic;
        }
        
        .rich-text-editor u {
          text-decoration: underline;
        }
      `}</style>
    </div>
  )
}
