import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Info, Lightbulb, AlertTriangle, BookOpen, X } from 'lucide-react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import type { ContentBlock, TextSegment } from '../lib/api'

// ═══════════════════════════════════════════════════════
//  Interactive Component Registry
// ═══════════════════════════════════════════════════════

import { interactiveComponents } from './interactives'

// ═══════════════════════════════════════════════════════
//  Inline LaTeX Renderer
// ═══════════════════════════════════════════════════════

function InlineLatex({ tex }: { tex: string }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, { throwOnError: false, displayMode: false })
    } catch {
      return tex
    }
  }, [tex])

  return <span className="inline-latex" dangerouslySetInnerHTML={{ __html: html }} />
}

function BlockLatex({ tex, caption }: { tex: string; caption?: string }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, { throwOnError: false, displayMode: true })
    } catch {
      return tex
    }
  }, [tex])

  return (
    <div className="my-4 animate-slide-up">
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 md:p-8 border border-slate-200/50 shadow-sm">
        <div
          className="text-center overflow-x-auto block-latex"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
      {caption && (
        <p className="text-sm text-bloom-text-secondary text-center mt-2 italic">{caption}</p>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  Definition Popover
// ═══════════════════════════════════════════════════════

function DefinitionTerm({
  children,
  definition,
}: {
  children: React.ReactNode
  definition: string
}) {
  const [open, setOpen] = useState(false)
  const termRef = useRef<HTMLSpanElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; arrowLeft: number; flipped: boolean }>({
    top: 0, left: 0, arrowLeft: 0, flipped: false,
  })

  // Compute popup position from the term's bounding rect
  const reposition = useCallback(() => {
    if (!termRef.current || !popRef.current) return

    const termRect = termRef.current.getBoundingClientRect()
    const popRect = popRef.current.getBoundingClientRect()
    const pad = 8

    // Account for sticky/fixed headers
    const header = document.querySelector('header')
    const topBound = header ? header.getBoundingClientRect().bottom + 4 : pad

    // Prefer above; flip below if not enough room
    const spaceAbove = termRect.top - topBound
    const flipped = spaceAbove < popRect.height + 8

    // Vertical position
    const top = flipped
      ? termRect.bottom + 8   // below the term
      : termRect.top - popRect.height - 8 // above the term

    // Horizontal: center on the term, then clamp to viewport
    let left = termRect.left + termRect.width / 2 - popRect.width / 2
    left = Math.max(pad, Math.min(left, window.innerWidth - popRect.width - pad))

    // Arrow should point at the center of the term
    const arrowLeft = termRect.left + termRect.width / 2 - left

    setPos({ top, left, arrowLeft, flipped })
  }, [])

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        termRef.current &&
        !termRef.current.contains(e.target as Node) &&
        popRef.current &&
        !popRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Position on open + reposition on scroll/resize
  useEffect(() => {
    if (!open) return
    // Small delay so the popup has rendered and we can measure it
    const frame = requestAnimationFrame(reposition)

    // Reposition if the page scrolls or resizes
    const scrollParents: EventTarget[] = [window]
    let el: HTMLElement | null = termRef.current
    while (el) {
      if (el.scrollHeight > el.clientHeight) scrollParents.push(el)
      el = el.parentElement
    }

    scrollParents.forEach(sp => sp.addEventListener('scroll', reposition, { passive: true }))
    window.addEventListener('resize', reposition, { passive: true })

    return () => {
      cancelAnimationFrame(frame)
      scrollParents.forEach(sp => sp.removeEventListener('scroll', reposition))
      window.removeEventListener('resize', reposition)
    }
  }, [open, reposition])

  return (
    <span className="inline">
      <span
        ref={termRef}
        onClick={() => setOpen(!open)}
        className="definition-term cursor-pointer border-b-2 border-dashed border-bloom-orange/50 text-bloom-orange hover:border-bloom-orange hover:text-bloom-orange/80 transition-colors duration-200"
      >
        {children}
      </span>

      {open && createPortal(
        <div
          ref={popRef}
          className="definition-popover fixed w-72 max-w-[90vw]"
          style={{ zIndex: 9999, top: pos.top, left: pos.left }}
        >
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-4 animate-pop-in">
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="text-xs font-semibold text-bloom-orange uppercase tracking-wider">Definition</span>
              <button
                onClick={(e) => { e.stopPropagation(); setOpen(false) }}
                className="p-0.5 hover:bg-slate-100 rounded-md transition-colors"
              >
                <X size={14} className="text-slate-400" />
              </button>
            </div>
            <p className="text-sm text-bloom-text leading-relaxed">{definition}</p>
            {/* Arrow pointing toward the term */}
            {pos.flipped ? (
              <div
                className="absolute bottom-full w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-white"
                style={{ left: pos.arrowLeft, transform: 'translateX(-50%)' }}
              />
            ) : (
              <div
                className="absolute top-full w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white"
                style={{ left: pos.arrowLeft, transform: 'translateX(-50%)' }}
              />
            )}
          </div>
        </div>,
        document.body
      )}
    </span>
  )
}

// ═══════════════════════════════════════════════════════
//  Text Segment Renderer
// ═══════════════════════════════════════════════════════

const colorMap: Record<string, string> = {
  accent: 'text-bloom-orange',
  secondary: 'text-bloom-text-secondary',
  success: 'text-bloom-green',
  warning: 'text-amber-500',
  blue: 'text-bloom-blue',
  purple: 'text-bloom-purple',
}

function RichText({ segments }: { segments: TextSegment[] }) {
  return (
    <>
      {segments.map((seg, i) => {
        // LaTeX segment
        if (seg.latex) {
          return <InlineLatex key={i} tex={seg.text} />
        }

        let className = ''
        if (seg.bold) className += ' font-bold'
        if (seg.italic) className += ' italic'
        if (seg.color && colorMap[seg.color]) className += ` ${colorMap[seg.color]}`

        const el = (
          <span key={i} className={className || undefined}>
            {seg.text}
          </span>
        )

        // Wrap in definition popover if needed
        if (seg.definition) {
          return (
            <DefinitionTerm key={i} definition={seg.definition}>
              {seg.text}
            </DefinitionTerm>
          )
        }

        return el
      })}
    </>
  )
}

// ═══════════════════════════════════════════════════════
//  Block Renderers
// ═══════════════════════════════════════════════════════

function HeadingBlock({ block }: { block: Extract<ContentBlock, { type: 'heading' }> }) {
  const level = block.level ?? 2
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3'
  const sizes: Record<number, string> = {
    1: 'text-3xl md:text-4xl',
    2: 'text-2xl md:text-3xl',
    3: 'text-xl md:text-2xl',
  }

  return (
    <div className="text-center py-2 animate-slide-up">
      <Tag className={`font-bold text-bloom-text leading-tight ${sizes[level]}`}>
        <RichText segments={block.segments} />
      </Tag>
      {level <= 2 && (
        <div className="h-1 w-20 bg-gradient-to-r from-bloom-orange to-bloom-yellow rounded-full mx-auto mt-4" />
      )}
    </div>
  )
}

function ParagraphBlock({ block }: { block: Extract<ContentBlock, { type: 'paragraph' }> }) {
  return (
    <div className="py-1.5 animate-slide-up">
      <p className="text-lg md:text-xl leading-relaxed text-bloom-text">
        <RichText segments={block.segments} />
      </p>
    </div>
  )
}

function ImageBlock({ block }: { block: Extract<ContentBlock, { type: 'image' }> }) {
  const isEmoji = block.src.startsWith('emoji:')
  const emojiChar = isEmoji ? block.src.replace('emoji:', '') : null

  // Gradient for placeholder images
  const gradients = [
    'from-blue-400 to-indigo-500',
    'from-emerald-400 to-teal-500',
    'from-orange-400 to-rose-500',
    'from-violet-400 to-purple-500',
    'from-cyan-400 to-blue-500',
  ]
  const idx = block.src.length % gradients.length

  if (isEmoji) {
    return (
      <div className="flex flex-col items-center py-3 animate-slide-up">
        <div className={`bg-gradient-to-br ${gradients[idx]} rounded-3xl p-8 w-full max-w-xs aspect-square flex items-center justify-center shadow-xl relative overflow-hidden`}>
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-6 right-10 w-24 h-24 rounded-full bg-white/30" />
            <div className="absolute bottom-8 left-8 w-36 h-36 rounded-full bg-white/20" />
          </div>
          <span className="text-7xl relative z-10">{emojiChar}</span>
        </div>
        {block.caption && (
          <p className="text-sm text-bloom-text-secondary italic text-center mt-3 px-4">{block.caption}</p>
        )}
      </div>
    )
  }

  if (block.src.startsWith('http')) {
    return (
      <div className={`flex flex-col items-center py-3 animate-slide-up ${block.style === 'inline' ? '' : ''}`}>
        <img
          src={block.src}
          alt={block.alt || ''}
          className={`rounded-2xl shadow-lg ${
            block.style === 'icon' ? 'w-20 h-20' :
            block.style === 'inline' ? 'max-w-[200px]' :
            'w-full max-w-md'
          }`}
        />
        {block.caption && (
          <p className="text-sm text-bloom-text-secondary italic text-center mt-3 px-4">{block.caption}</p>
        )}
      </div>
    )
  }

  // SVG or placeholder
  return (
    <div className="flex flex-col items-center py-3 animate-slide-up">
      <div className={`bg-gradient-to-br ${gradients[idx]} rounded-3xl p-10 w-full max-w-sm aspect-[4/3] flex items-center justify-center shadow-xl relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-6 right-10 w-24 h-24 rounded-full bg-white/30" />
          <div className="absolute bottom-8 left-8 w-36 h-36 rounded-full bg-white/20" />
        </div>
        <div className="text-center relative z-10">
          <span className="text-white/90 text-base font-medium">{block.alt || 'Illustration'}</span>
        </div>
      </div>
      {block.caption && (
        <p className="text-sm text-bloom-text-secondary italic text-center mt-3 px-4">{block.caption}</p>
      )}
    </div>
  )
}

const calloutConfig = {
  info: {
    icon: Info,
    bg: 'from-blue-50 to-sky-50',
    border: 'border-blue-200',
    iconBg: 'bg-blue-500',
    titleColor: 'text-blue-900',
    textColor: 'text-blue-800',
  },
  tip: {
    icon: Lightbulb,
    bg: 'from-amber-50 to-yellow-50',
    border: 'border-amber-200',
    iconBg: 'bg-amber-400',
    titleColor: 'text-amber-900',
    textColor: 'text-amber-800',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'from-red-50 to-rose-50',
    border: 'border-red-200',
    iconBg: 'bg-red-500',
    titleColor: 'text-red-900',
    textColor: 'text-red-800',
  },
  example: {
    icon: BookOpen,
    bg: 'from-violet-50 to-purple-50',
    border: 'border-violet-200',
    iconBg: 'bg-violet-500',
    titleColor: 'text-violet-900',
    textColor: 'text-violet-800',
  },
}

function CalloutBlock({ block }: { block: Extract<ContentBlock, { type: 'callout' }> }) {
  const config = calloutConfig[block.style]
  const Icon = config.icon

  return (
    <div className={`p-5 rounded-2xl bg-gradient-to-br ${config.bg} border ${config.border} animate-slide-up my-2`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-9 h-9 rounded-xl ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon size={20} className="text-white" />
        </div>
        {block.title && (
          <span className={`font-bold ${config.titleColor} text-lg`}>{block.title}</span>
        )}
      </div>
      <p className={`${config.textColor} leading-relaxed`}>
        <RichText segments={block.segments} />
      </p>
    </div>
  )
}

function BulletListBlock({ block }: { block: Extract<ContentBlock, { type: 'bulletList' }> }) {
  return (
    <div className="space-y-3 py-2 animate-slide-up">
      {block.items.map((item, i) => (
        <div key={i} className="flex gap-3 items-start">
          <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-bloom-orange to-bloom-yellow mt-2.5 flex-shrink-0" />
          <p className="text-lg leading-relaxed text-bloom-text">
            <RichText segments={item} />
          </p>
        </div>
      ))}
    </div>
  )
}

function DividerBlock() {
  return (
    <div className="py-4 animate-slide-up">
      <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
    </div>
  )
}

function SpacerBlock({ block }: { block: Extract<ContentBlock, { type: 'spacer' }> }) {
  const sizes = { sm: 'h-4', md: 'h-8', lg: 'h-14' }
  return <div className={sizes[block.size ?? 'md']} />
}

function InteractiveBlock({ block }: { block: Extract<ContentBlock, { type: 'interactive' }> }) {
  const Component = interactiveComponents[block.componentId]

  if (!Component) {
    return (
      <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-center text-white animate-slide-up my-2">
        <p className="font-semibold">Interactive: {block.componentId}</p>
        <p className="text-white/70 text-sm mt-1">Component not found</p>
      </div>
    )
  }

  return (
    <div className="my-3 animate-slide-up" data-interactive="true">
      <Component {...(block.props || {})} />
    </div>
  )
}

function AnimationBlock({ block }: { block: Extract<ContentBlock, { type: 'animation' }> }) {
  // For now, render as a styled placeholder or an actual image/gif
  const isUrl = block.src.startsWith('http')

  if (isUrl) {
    return (
      <div className="flex flex-col items-center py-3 animate-slide-up">
        <img
          src={block.src}
          alt={block.caption || 'Animation'}
          className="rounded-2xl shadow-lg w-full max-w-md"
        />
        {block.caption && (
          <p className="text-sm text-bloom-text-secondary italic text-center mt-3">{block.caption}</p>
        )}
      </div>
    )
  }

  // Placeholder for Lottie or custom animations
  return (
    <div className="flex flex-col items-center py-3 animate-slide-up">
      <div className="bg-gradient-to-br from-indigo-400 to-purple-500 rounded-3xl p-8 w-full max-w-sm aspect-video flex items-center justify-center shadow-xl relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="animation-pulse-ring absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-2 border-white/30" />
          <div className="animation-pulse-ring-delay absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-2 border-white/20" />
        </div>
        <div className="text-center relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
            <span className="text-3xl">▶️</span>
          </div>
          <span className="text-white/90 text-sm font-medium">{block.caption || 'Animation'}</span>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  Main Renderer — renders an array of ContentBlocks
// ═══════════════════════════════════════════════════════

export default function RichContentRenderer({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="rich-content space-y-1">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'heading':
            return <HeadingBlock key={i} block={block} />
          case 'paragraph':
            return <ParagraphBlock key={i} block={block} />
          case 'image':
            return <ImageBlock key={i} block={block} />
          case 'math':
            return <BlockLatex key={i} tex={block.latex} caption={block.caption} />
          case 'callout':
            return <CalloutBlock key={i} block={block} />
          case 'bulletList':
            return <BulletListBlock key={i} block={block} />
          case 'divider':
            return <DividerBlock key={i} />
          case 'spacer':
            return <SpacerBlock key={i} block={block} />
          case 'interactive':
            return <InteractiveBlock key={i} block={block} />
          case 'animation':
            return <AnimationBlock key={i} block={block} />
          default:
            return null
        }
      })}
    </div>
  )
}

export { RichText }
