'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  FiBold,
  FiItalic,
  FiUnderline,
  FiList,
  FiTrash2,
  FiRotateCcw,
  FiRotateCw,
} from 'react-icons/fi'
import {
  LuStrikethrough,
  LuHeading1,
  LuHeading2,
  LuHeading3,
  LuListOrdered,
  LuQuote,
  LuFileCode2,
  LuCheck,
} from 'react-icons/lu'

const STORAGE_KEY = 'quicknotes-content'

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

interface ToolbarButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  isActive?: boolean
}

function ToolbarButton({ icon, label, onClick, isActive }: ToolbarButtonProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault()
              onClick()
            }}
            className={`h-8 w-8 p-0 rounded-md transition-all duration-200 ${isActive ? 'bg-primary/15 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
          >
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function VerticalDivider() {
  return <div className="w-px h-5 bg-border mx-1.5" />
}

export default function Page() {
  const editorRef = useRef<HTMLDivElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set())

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved && editorRef.current) {
        editorRef.current.innerHTML = saved
      }
    } catch {
      // localStorage not available
    }
    setIsLoaded(true)
  }, [])

  // Debounced save
  const saveContent = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    setSaveStatus('saving')
    saveTimeoutRef.current = setTimeout(() => {
      try {
        const content = editorRef.current?.innerHTML ?? ''
        localStorage.setItem(STORAGE_KEY, content)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        // localStorage not available
      }
    }, 500)
  }, [])

  // Check active formats
  const updateActiveFormats = useCallback(() => {
    const formats = new Set<string>()
    try {
      if (document.queryCommandState('bold')) formats.add('bold')
      if (document.queryCommandState('italic')) formats.add('italic')
      if (document.queryCommandState('underline')) formats.add('underline')
      if (document.queryCommandState('strikeThrough')) formats.add('strikethrough')
      if (document.queryCommandState('insertUnorderedList')) formats.add('bulletList')
      if (document.queryCommandState('insertOrderedList')) formats.add('orderedList')
    } catch {
      // Some commands may not be supported
    }
    try {
      const block = document.queryCommandValue('formatBlock')
      if (block) formats.add(block.toLowerCase().replace(/[<>]/g, ''))
    } catch {
      // ignore
    }
    setActiveFormats(formats)
  }, [])

  const execCommand = useCallback(
    (command: string, value?: string) => {
      editorRef.current?.focus()
      document.execCommand(command, false, value)
      saveContent()
      updateActiveFormats()
    },
    [saveContent, updateActiveFormats]
  )

  const handleClearAll = () => {
    if (editorRef.current) {
      editorRef.current.innerHTML = ''
    }
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
    setShowClearDialog(false)
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        document.execCommand('insertText', false, '    ')
        saveContent()
      }
    },
    [saveContent]
  )

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-foreground font-sans tracking-tight">
              QuickNotes
            </h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowClearDialog(true)}
            className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive gap-1.5"
          >
            <FiTrash2 className="w-3.5 h-3.5" />
            Clear All
          </Button>
        </header>

        {/* Formatting Toolbar */}
        <div className="flex items-center gap-0.5 px-4 py-2 border-b border-border bg-card/60 flex-wrap">
          <ToolbarButton
            icon={<FiBold className="w-4 h-4" />}
            label="Bold"
            onClick={() => execCommand('bold')}
            isActive={activeFormats.has('bold')}
          />
          <ToolbarButton
            icon={<FiItalic className="w-4 h-4" />}
            label="Italic"
            onClick={() => execCommand('italic')}
            isActive={activeFormats.has('italic')}
          />
          <ToolbarButton
            icon={<FiUnderline className="w-4 h-4" />}
            label="Underline"
            onClick={() => execCommand('underline')}
            isActive={activeFormats.has('underline')}
          />
          <ToolbarButton
            icon={<LuStrikethrough className="w-4 h-4" />}
            label="Strikethrough"
            onClick={() => execCommand('strikeThrough')}
            isActive={activeFormats.has('strikethrough')}
          />

          <VerticalDivider />

          <ToolbarButton
            icon={<LuHeading1 className="w-4 h-4" />}
            label="Heading 1"
            onClick={() => execCommand('formatBlock', 'h1')}
            isActive={activeFormats.has('h1')}
          />
          <ToolbarButton
            icon={<LuHeading2 className="w-4 h-4" />}
            label="Heading 2"
            onClick={() => execCommand('formatBlock', 'h2')}
            isActive={activeFormats.has('h2')}
          />
          <ToolbarButton
            icon={<LuHeading3 className="w-4 h-4" />}
            label="Heading 3"
            onClick={() => execCommand('formatBlock', 'h3')}
            isActive={activeFormats.has('h3')}
          />

          <VerticalDivider />

          <ToolbarButton
            icon={<FiList className="w-4 h-4" />}
            label="Bullet List"
            onClick={() => execCommand('insertUnorderedList')}
            isActive={activeFormats.has('bulletList')}
          />
          <ToolbarButton
            icon={<LuListOrdered className="w-4 h-4" />}
            label="Numbered List"
            onClick={() => execCommand('insertOrderedList')}
            isActive={activeFormats.has('orderedList')}
          />

          <VerticalDivider />

          <ToolbarButton
            icon={<LuQuote className="w-4 h-4" />}
            label="Blockquote"
            onClick={() => execCommand('formatBlock', 'blockquote')}
            isActive={activeFormats.has('blockquote')}
          />
          <ToolbarButton
            icon={<LuFileCode2 className="w-4 h-4" />}
            label="Code Block"
            onClick={() => execCommand('formatBlock', 'pre')}
            isActive={activeFormats.has('pre')}
          />

          <VerticalDivider />

          <ToolbarButton
            icon={<FiRotateCcw className="w-3.5 h-3.5" />}
            label="Undo"
            onClick={() => execCommand('undo')}
          />
          <ToolbarButton
            icon={<FiRotateCw className="w-3.5 h-3.5" />}
            label="Redo"
            onClick={() => execCommand('redo')}
          />
        </div>

        {/* Editor Canvas */}
        <div className="flex-1 relative bg-background">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            data-quicknotes="true"
            data-placeholder="Start writing..."
            onInput={() => {
              saveContent()
              updateActiveFormats()
            }}
            onKeyUp={updateActiveFormats}
            onMouseUp={updateActiveFormats}
            onKeyDown={handleKeyDown}
            className="absolute inset-0 overflow-y-auto px-8 py-6 md:px-16 lg:px-24 font-serif text-base text-foreground outline-none focus:outline-none"
            style={{ lineHeight: 1.65, wordBreak: 'break-word' }}
          />
        </div>

        {/* Auto-save Indicator */}
        {saveStatus !== 'idle' && (
          <div className="fixed bottom-5 right-5 z-40 flex items-center gap-1.5 bg-card border border-border rounded-full px-3 py-1.5" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            {saveStatus === 'saving' && (
              <span className="text-xs text-muted-foreground font-sans animate-pulse">
                Saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <>
                <LuCheck className="w-3 h-3 text-primary" />
                <span className="text-xs text-muted-foreground font-sans">
                  Saved
                </span>
              </>
            )}
          </div>
        )}

        {/* Clear All Confirmation Dialog */}
        <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
          <DialogContent className="sm:max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground font-sans">Clear All Notes</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                This will permanently delete all your notes. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setShowClearDialog(false)}
                className="border-border"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleClearAll}
                className="gap-1.5"
              >
                <FiTrash2 className="w-3.5 h-3.5" />
                Clear All
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ErrorBoundary>
  )
}
