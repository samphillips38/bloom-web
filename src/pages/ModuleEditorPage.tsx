import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Save, Eye, Trash2, Plus, GripVertical, ChevronDown, ChevronUp,
  Type, Image, HelpCircle, Lightbulb, List, Calculator, Minus, Space,
  X, Loader2, Check, ChevronRight, ChevronLeft, BookOpen, Zap,
} from 'lucide-react'
import {
  api, ContentData,
  ContentBlock, TextSegment, SourceReference,
} from '../lib/api'
import Card from '../components/Card'
import Button from '../components/Button'
import RichContentRenderer, { RichText } from '../components/RichContentRenderer'
import ProgressBar from '../components/ProgressBar'
import InteractiveBlockEditor from '../components/workshop/InteractiveBlockEditor'
import DiagramPickerModal from '../components/workshop/DiagramPickerModal'

// ═══════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════

interface PageDraft {
  id: string | null
  contentType: string
  contentData: ContentData
  sources: SourceReference[]
  saved: boolean
}

// ═══════════════════════════════════════════════════════
//  Module Editor Page
// ═══════════════════════════════════════════════════════

export default function ModuleEditorPage() {
  const { lessonId, moduleId } = useParams()
  const navigate = useNavigate()

  const [moduleTitle, setModuleTitle] = useState('')
  const [moduleDescription, setModuleDescription] = useState('')
  const [pages, setPages] = useState<PageDraft[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [expandedPage, setExpandedPage] = useState<number | null>(null)
  const [blockPaletteOpen, setBlockPaletteOpen] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewPageIndex, setPreviewPageIndex] = useState(0)
  const [pageDragIndex, setPageDragIndex] = useState<number | null>(null)

  useEffect(() => {
    if (lessonId && moduleId) {
      loadModuleData(lessonId, moduleId)
    }
  }, [lessonId, moduleId])

  async function loadModuleData(lid: string, mid: string) {
    try {
      setIsLoading(true)
      const { lesson } = await api.getEditableLesson(lid)
      const mod = lesson.modules?.find(m => m.id === mid)
      if (!mod) {
        console.error('Module not found')
        navigate(`/workshop/edit/${lid}`)
        return
      }
      setModuleTitle(mod.title)
      setModuleDescription(mod.description || '')
      setPages((mod.content || []).map(c => ({
        id: c.id,
        contentType: c.contentType,
        contentData: c.contentData,
        sources: c.sources || [],
        saved: true,
      })))
    } catch (error) {
      console.error('Failed to load module:', error)
      navigate(`/workshop/edit/${lid}`)
    } finally {
      setIsLoading(false)
    }
  }

  // ── Page management ──

  function addPage(contentData: ContentData) {
    const contentType = contentData.type === 'question' ? 'question' : 'page'
    setPages(prev => [...prev, { id: null, contentType, contentData, sources: [], saved: false }])
    setExpandedPage(pages.length)
    setBlockPaletteOpen(false)
  }

  function updatePage(pIdx: number, contentData: ContentData) {
    setPages(prev => prev.map((p, j) => j === pIdx ? { ...p, contentData, saved: false } : p))
  }

  function updatePageSources(pIdx: number, sources: SourceReference[]) {
    setPages(prev => prev.map((p, j) => j === pIdx ? { ...p, sources, saved: false } : p))
  }

  async function handleDeletePage(pIdx: number) {
    const page = pages[pIdx]
    if (page.id && lessonId) {
      try {
        await api.deleteLessonContent(lessonId, page.id)
      } catch (error) {
        console.error('Failed to delete page:', error)
      }
    }
    setPages(prev => prev.filter((_, j) => j !== pIdx))
    if (expandedPage === pIdx) setExpandedPage(null)
  }

  // Page drag reorder
  function handlePageDragStart(pIdx: number) { setPageDragIndex(pIdx) }
  function handlePageDragOver(pIdx: number) {
    if (pageDragIndex === null || pageDragIndex === pIdx) return
    setPages(prev => {
      const newPages = [...prev]
      const [moved] = newPages.splice(pageDragIndex, 1)
      newPages.splice(pIdx, 0, { ...moved, saved: false })
      return newPages
    })
    setPageDragIndex(pIdx)
  }
  function handlePageDragEnd() { setPageDragIndex(null) }

  // ── Save ──

  async function handleSave() {
    if (!lessonId || !moduleId) return
    setIsSaving(true)

    try {
      // Update module title/description
      await api.updateLessonModule(moduleId, {
        title: moduleTitle.trim(),
        description: moduleDescription.trim() || undefined,
      })

      // Save pages
      const updatedPages = [...pages]
      for (let pIdx = 0; pIdx < updatedPages.length; pIdx++) {
        const page = updatedPages[pIdx]
        if (!page.saved) {
          if (page.id) {
            await api.updateLessonContent(lessonId, page.id, {
              contentType: page.contentType,
              contentData: page.contentData,
              sources: page.sources,
            })
            updatedPages[pIdx] = { ...page, saved: true }
          } else {
            const { content } = await api.addLessonContent(lessonId, {
              contentType: page.contentType,
              contentData: page.contentData,
              sources: page.sources,
              moduleId: moduleId,
            })
            updatedPages[pIdx] = { ...page, id: content.id, saved: true }
          }
        }
      }

      // Reorder pages
      const pageIds = updatedPages.filter(p => p.id).map(p => p.id!)
      if (pageIds.length > 0) {
        await api.reorderLessonContent(lessonId, pageIds)
      }

      setPages(updatedPages.map(p => ({ ...p, saved: true })))
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleBack() {
    // Auto-save before navigating back
    const hasUnsaved = pages.some(p => !p.saved)
    if (hasUnsaved && lessonId && moduleId) {
      await handleSave()
    }
    navigate(`/workshop/edit/${lessonId}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-bloom-orange border-t-transparent" />
      </div>
    )
  }

  if (showPreview && pages.length > 0) {
    return (
      <PreviewOverlay
        pages={pages}
        pageIndex={previewPageIndex}
        onClose={() => setShowPreview(false)}
        onChangeIndex={setPreviewPageIndex}
      />
    )
  }

  return (
    <div className="space-y-4 animate-fade-in pb-32">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button onClick={handleBack} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ArrowLeft size={24} className="text-bloom-text" />
        </button>
        <div className="flex items-center gap-2">
          {pages.length > 0 && (
            <button
              onClick={() => { setPreviewPageIndex(0); setShowPreview(true) }}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <Eye size={20} className="text-bloom-text-secondary" />
            </button>
          )}
          <Button
            color="orange"
            onClick={handleSave}
            disabled={isSaving}
            className="!px-4 !py-2"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span className="ml-1.5">{isSaving ? 'Saving...' : 'Save'}</span>
          </Button>
        </div>
      </div>

      {/* Module Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
            <BookOpen size={16} />
          </div>
          <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">Module Editor</span>
        </div>
        <input
          type="text"
          value={moduleTitle}
          onChange={e => setModuleTitle(e.target.value)}
          placeholder="Module title..."
          className="w-full text-2xl font-bold text-bloom-text bg-transparent outline-none placeholder:text-slate-300"
        />
        <input
          type="text"
          value={moduleDescription}
          onChange={e => setModuleDescription(e.target.value)}
          placeholder="Module description (optional)..."
          className="w-full text-bloom-text-secondary bg-transparent outline-none placeholder:text-slate-300"
        />
      </div>

      {/* Pages Section */}
      <div className="space-y-3">
        <h3 className="font-semibold text-bloom-text flex items-center gap-2">
          Pages <span className="text-sm font-normal text-bloom-text-muted">({pages.length})</span>
        </h3>

        <div className="space-y-2">
          {pages.map((page, pIdx) => (
            <PageCard
              key={page.id || `draft-${pIdx}`}
              page={page}
              index={pIdx}
              isExpanded={expandedPage === pIdx}
              onToggle={() => setExpandedPage(expandedPage === pIdx ? null : pIdx)}
              onUpdate={(data) => updatePage(pIdx, data)}
              onUpdateSources={(sources) => updatePageSources(pIdx, sources)}
              onDelete={() => handleDeletePage(pIdx)}
              onDragStart={() => handlePageDragStart(pIdx)}
              onDragOver={() => handlePageDragOver(pIdx)}
              onDragEnd={handlePageDragEnd}
              isDragging={pageDragIndex === pIdx}
            />
          ))}
        </div>

        {/* Add Page Button */}
        <button
          onClick={() => setBlockPaletteOpen(true)}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-slate-200 text-bloom-text-muted hover:border-bloom-orange hover:text-bloom-orange hover:bg-orange-50/30 transition-all"
        >
          <Plus size={20} />
          <span className="font-medium">Add Page</span>
        </button>
      </div>

      {/* Block Palette Bottom Sheet */}
      {blockPaletteOpen && (
        <BlockPaletteSheet
          onSelect={(data) => addPage(data)}
          onClose={() => setBlockPaletteOpen(false)}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  Page Card (editable, draggable)
// ═══════════════════════════════════════════════════════

function PageCard({
  page,
  index,
  isExpanded,
  onToggle,
  onUpdate,
  onUpdateSources,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
}: {
  page: PageDraft
  index: number
  isExpanded: boolean
  onToggle: () => void
  onUpdate: (data: ContentData) => void
  onUpdateSources: (sources: SourceReference[]) => void
  onDelete: () => void
  onDragStart: () => void
  onDragOver: () => void
  onDragEnd: () => void
  isDragging: boolean
}) {
  const data = page.contentData
  const pageLabel = data.type === 'question'
    ? `Question: ${(data as any).question?.substring(0, 40) || 'Untitled'}...`
    : `Page ${index + 1}`

  const preview = getPagePreview(data)

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => { e.preventDefault(); onDragOver() }}
      onDragEnd={onDragEnd}
      className={`transition-all duration-200 ${isDragging ? 'opacity-50 scale-95' : ''}`}
    >
      <Card className={`${!page.saved ? 'ring-2 ring-bloom-orange/30' : ''}`}>
        {/* Header */}
        <div className="flex items-center gap-2">
          <div
            className="p-1 cursor-grab active:cursor-grabbing text-bloom-text-muted hover:text-bloom-text-secondary touch-none"
          >
            <GripVertical size={18} />
          </div>

          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
              data.type === 'question'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {data.type === 'question' ? '?' : index + 1}
          </div>

          <button onClick={onToggle} className="flex-1 text-left">
            <span className="font-medium text-bloom-text text-sm">{pageLabel}</span>
            {preview && (
              <p className="text-xs text-bloom-text-muted truncate mt-0.5">{preview}</p>
            )}
          </button>

          <div className="flex items-center gap-1">
            {!page.saved && (
              <span className="w-2 h-2 rounded-full bg-bloom-orange" title="Unsaved" />
            )}
            <button onClick={onToggle} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <button onClick={onDelete} className="p-1 hover:bg-red-50 rounded-lg text-bloom-text-muted hover:text-red-500 transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Expanded Editor */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-slate-100 animate-slide-up">
            <ContentEditor
              data={data}
              sources={page.sources}
              onUpdate={onUpdate}
              onUpdateSources={onUpdateSources}
            />
          </div>
        )}
      </Card>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  Content Editor
// ═══════════════════════════════════════════════════════

function ContentEditor({
  data,
  sources,
  onUpdate,
  onUpdateSources,
}: {
  data: ContentData
  sources: SourceReference[]
  onUpdate: (data: ContentData) => void
  onUpdateSources: (sources: SourceReference[]) => void
}) {
  if (data.type === 'question') {
    return (
      <QuestionEditor
        data={data as Extract<ContentData, { type: 'question' }>}
        onUpdate={onUpdate}
      />
    )
  }

  if (data.type === 'page') {
    return (
      <PageBlocksEditor
        blocks={(data as Extract<ContentData, { type: 'page' }>).blocks}
        sources={sources}
        onUpdate={(blocks) => onUpdate({ type: 'page', blocks })}
        onUpdateSources={onUpdateSources}
      />
    )
  }

  return <p className="text-sm text-bloom-text-muted">Unsupported content type</p>
}

// ═══════════════════════════════════════════════════════
//  Page Blocks Editor
// ═══════════════════════════════════════════════════════

function PageBlocksEditor({
  blocks,
  sources,
  onUpdate,
  onUpdateSources,
}: {
  blocks: ContentBlock[]
  sources: SourceReference[]
  onUpdate: (blocks: ContentBlock[]) => void
  onUpdateSources: (sources: SourceReference[]) => void
}) {
  function addBlock(block: ContentBlock) {
    onUpdate([...blocks, block])
  }

  function updateBlock(index: number, block: ContentBlock) {
    const newBlocks = [...blocks]
    newBlocks[index] = block
    onUpdate(newBlocks)
  }

  function removeBlock(index: number) {
    onUpdate(blocks.filter((_, i) => i !== index))
  }

  function moveBlock(index: number, direction: 'up' | 'down') {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= blocks.length) return
    const newBlocks = [...blocks]
    ;[newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]]
    onUpdate(newBlocks)
  }

  function handleAddSource(source: SourceReference) {
    onUpdateSources([...sources, source])
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => (
        <BlockEditor
          key={i}
          block={block}
          onUpdate={(b) => updateBlock(i, b)}
          onRemove={() => removeBlock(i)}
          onMoveUp={i > 0 ? () => moveBlock(i, 'up') : undefined}
          onMoveDown={i < blocks.length - 1 ? () => moveBlock(i, 'down') : undefined}
          onAddSource={handleAddSource}
        />
      ))}

      {/* Add block inline */}
      <div className="flex flex-wrap gap-2">
        {[
          { type: 'heading', label: 'heading', icon: Type },
          { type: 'paragraph', label: 'paragraph', icon: Type },
          { type: 'image', label: 'image', icon: Image },
          { type: 'callout', label: 'callout', icon: Lightbulb },
          { type: 'bulletList', label: 'list', icon: List },
          { type: 'math', label: 'math', icon: Calculator },
          { type: 'divider', label: 'divider', icon: Minus },
          { type: 'spacer', label: 'spacer', icon: Space },
          { type: 'interactive', label: 'interactive', icon: Zap },
        ].map(item => (
          <button
            key={item.type}
            onClick={() => addBlock(createEmptyBlock(item.type as ContentBlock['type']))}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              item.type === 'interactive'
                ? 'bg-violet-100 hover:bg-violet-200 text-violet-700'
                : 'bg-slate-100 hover:bg-slate-200 text-bloom-text-secondary'
            }`}
          >
            <item.icon size={12} />
            {item.label}
          </button>
        ))}
      </div>

      {/* Sources */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <SourcesEditor sources={sources} onUpdate={onUpdateSources} />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  Individual Block Editor
// ═══════════════════════════════════════════════════════

function BlockEditor({
  block,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onAddSource,
}: {
  block: ContentBlock
  onUpdate: (block: ContentBlock) => void
  onRemove: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  onAddSource?: (source: SourceReference) => void
}) {
  const [showDiagramPicker, setShowDiagramPicker] = useState(false)
  const blockLabel = block.type.charAt(0).toUpperCase() + block.type.slice(1)

  return (
    <div className="group relative bg-slate-50 rounded-xl p-3">
      {/* Block type label + controls */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{blockLabel}</span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {onMoveUp && (
            <button onClick={onMoveUp} className="p-1 hover:bg-white rounded transition-colors">
              <ChevronUp size={14} className="text-slate-400" />
            </button>
          )}
          {onMoveDown && (
            <button onClick={onMoveDown} className="p-1 hover:bg-white rounded transition-colors">
              <ChevronDown size={14} className="text-slate-400" />
            </button>
          )}
          <button onClick={onRemove} className="p-1 hover:bg-red-50 rounded transition-colors">
            <X size={14} className="text-red-400" />
          </button>
        </div>
      </div>

      {/* Block-type-specific editors */}
      {block.type === 'heading' && (
        <div className="space-y-2">
          <select
            value={block.level || 2}
            onChange={(e) => onUpdate({ ...block, level: parseInt(e.target.value) as 1 | 2 | 3 })}
            className="text-xs border rounded-lg px-2 py-1"
          >
            <option value={1}>H1</option>
            <option value={2}>H2</option>
            <option value={3}>H3</option>
          </select>
          <SegmentsEditor
            segments={block.segments}
            onUpdate={(segments) => onUpdate({ ...block, segments })}
            placeholder="Heading text..."
          />
        </div>
      )}

      {block.type === 'paragraph' && (
        <SegmentsEditor
          segments={block.segments}
          onUpdate={(segments) => onUpdate({ ...block, segments })}
          placeholder="Paragraph text..."
        />
      )}

      {block.type === 'image' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={block.src}
              onChange={(e) => onUpdate({ ...block, src: e.target.value })}
              placeholder="Image URL or emoji:🎯"
              className="flex-1 text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-bloom-orange/30 min-w-0"
            />
            <button
              onClick={() => setShowDiagramPicker(true)}
              title="Browse diagrams from Wikimedia Commons"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex-shrink-0"
            >
              <Image size={13} />
              Browse
            </button>
          </div>
          <input
            type="text"
            value={block.caption || ''}
            onChange={(e) => onUpdate({ ...block, caption: e.target.value || undefined })}
            placeholder="Caption (optional)"
            className="w-full text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-bloom-orange/30"
          />

          {showDiagramPicker && (
            <DiagramPickerModal
              initialSearch={block.alt || ''}
              onSelect={(imageUrl, altText, attributionUrl) => {
                onUpdate({ ...block, src: imageUrl, alt: altText })
                onAddSource?.({ title: altText, url: attributionUrl, description: 'Via Wikimedia Commons' })
                setShowDiagramPicker(false)
              }}
              onClose={() => setShowDiagramPicker(false)}
            />
          )}
        </div>
      )}

      {block.type === 'math' && (
        <div className="space-y-2">
          <input
            type="text"
            value={block.latex}
            onChange={(e) => onUpdate({ ...block, latex: e.target.value })}
            placeholder="LaTeX equation, e.g. E = mc^2"
            className="w-full text-sm font-mono border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-bloom-orange/30"
          />
          <input
            type="text"
            value={block.caption || ''}
            onChange={(e) => onUpdate({ ...block, caption: e.target.value || undefined })}
            placeholder="Caption (optional)"
            className="w-full text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-bloom-orange/30"
          />
        </div>
      )}

      {block.type === 'callout' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <select
              value={block.style}
              onChange={(e) => onUpdate({ ...block, style: e.target.value as any })}
              className="text-xs border rounded-lg px-2 py-1"
            >
              <option value="info">Info</option>
              <option value="tip">Tip</option>
              <option value="warning">Warning</option>
              <option value="example">Example</option>
            </select>
            <input
              type="text"
              value={block.title || ''}
              onChange={(e) => onUpdate({ ...block, title: e.target.value || undefined })}
              placeholder="Title (optional)"
              className="flex-1 text-sm border rounded-lg px-3 py-1 outline-none focus:ring-2 focus:ring-bloom-orange/30"
            />
          </div>
          <SegmentsEditor
            segments={block.segments}
            onUpdate={(segments) => onUpdate({ ...block, segments })}
            placeholder="Callout content..."
          />
        </div>
      )}

      {block.type === 'bulletList' && (
        <BulletListEditor
          items={block.items}
          onUpdate={(items) => onUpdate({ ...block, items })}
        />
      )}

      {(block.type === 'divider' || block.type === 'spacer') && (
        <div className="text-xs text-slate-400 text-center py-1">
          {block.type === 'divider' ? '— Horizontal Divider —' : `Spacer (${(block as any).size || 'md'})`}
        </div>
      )}

      {block.type === 'interactive' && (
        <InteractiveBlockEditor
          componentId={block.componentId}
          props={block.props}
          onUpdate={(componentId, props) => onUpdate({ ...block, componentId, props })}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  Text Segments Editor (simplified rich text)
// ═══════════════════════════════════════════════════════

function SegmentsEditor({
  segments,
  onUpdate,
  placeholder,
}: {
  segments: TextSegment[]
  onUpdate: (segments: TextSegment[]) => void
  placeholder?: string
}) {
  const text = segments.map(s => s.text).join('')

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newText = e.target.value
    if (segments.length === 0 || segments.length === 1) {
      onUpdate([{ ...segments[0], text: newText }])
    } else {
      onUpdate([{ text: newText }])
    }
  }

  return (
    <textarea
      value={text}
      onChange={handleChange}
      placeholder={placeholder}
      rows={Math.max(2, Math.ceil(text.length / 60))}
      className="w-full text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-bloom-orange/30 resize-none"
    />
  )
}

// ═══════════════════════════════════════════════════════
//  Bullet List Editor
// ═══════════════════════════════════════════════════════

function BulletListEditor({
  items,
  onUpdate,
}: {
  items: TextSegment[][]
  onUpdate: (items: TextSegment[][]) => void
}) {
  function updateItem(index: number, text: string) {
    const newItems = [...items]
    newItems[index] = [{ text }]
    onUpdate(newItems)
  }

  function addItem() {
    onUpdate([...items, [{ text: '' }]])
  }

  function removeItem(index: number) {
    onUpdate(items.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="mt-2.5 w-2 h-2 rounded-full bg-bloom-orange flex-shrink-0" />
          <input
            type="text"
            value={item.map(s => s.text).join('')}
            onChange={(e) => updateItem(i, e.target.value)}
            placeholder={`Item ${i + 1}`}
            className="flex-1 text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-bloom-orange/30"
          />
          <button onClick={() => removeItem(i)} className="p-1 mt-1 hover:bg-red-50 rounded">
            <X size={14} className="text-red-400" />
          </button>
        </div>
      ))}
      <button
        onClick={addItem}
        className="text-xs text-bloom-orange font-medium hover:underline"
      >
        + Add item
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  Question Editor
// ═══════════════════════════════════════════════════════

function QuestionEditor({
  data,
  onUpdate,
}: {
  data: Extract<ContentData, { type: 'question' }>
  onUpdate: (data: ContentData) => void
}) {
  function updateField<K extends keyof typeof data>(key: K, value: (typeof data)[K]) {
    onUpdate({ ...data, [key]: value })
  }

  function updateOption(index: number, text: string) {
    const newOptions = [...data.options]
    newOptions[index] = text
    updateField('options', newOptions)
  }

  function addOption() {
    updateField('options', [...data.options, ''])
  }

  function removeOption(index: number) {
    const newOptions = data.options.filter((_, i) => i !== index)
    updateField('options', newOptions)
    if ((data.correctIndex ?? 0) >= newOptions.length) {
      updateField('correctIndex', 0)
    }
  }

  return (
    <div className="space-y-3">
      <textarea
        value={data.question}
        onChange={(e) => {
          onUpdate({
            ...data,
            question: e.target.value,
            questionSegments: [{ text: e.target.value }],
          })
        }}
        placeholder="Question text..."
        rows={2}
        className="w-full text-sm font-medium border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-bloom-orange/30 resize-none"
      />

      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Options</span>
        {data.options.map((option, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              onClick={() => updateField('correctIndex', i)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                data.correctIndex === i
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {String.fromCharCode(65 + i)}
            </button>
            <input
              type="text"
              value={option}
              onChange={(e) => updateOption(i, e.target.value)}
              placeholder={`Option ${String.fromCharCode(65 + i)}`}
              className="flex-1 text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-bloom-orange/30"
            />
            {data.options.length > 2 && (
              <button onClick={() => removeOption(i)} className="p-1 hover:bg-red-50 rounded">
                <X size={14} className="text-red-400" />
              </button>
            )}
          </div>
        ))}
        {data.options.length < 6 && (
          <button
            onClick={addOption}
            className="text-xs text-bloom-orange font-medium hover:underline"
          >
            + Add option
          </button>
        )}
      </div>

      <textarea
        value={data.explanation || ''}
        onChange={(e) => {
          onUpdate({
            ...data,
            explanation: e.target.value,
            explanationSegments: [{ text: e.target.value }],
          })
        }}
        placeholder="Explanation (shown after correct answer)..."
        rows={2}
        className="w-full text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-bloom-orange/30 resize-none"
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  Sources Editor
// ═══════════════════════════════════════════════════════

function SourcesEditor({
  sources,
  onUpdate,
}: {
  sources: SourceReference[]
  onUpdate: (sources: SourceReference[]) => void
}) {
  function addSource() {
    onUpdate([...sources, { title: '', url: '', description: '' }])
  }

  function updateSource(index: number, field: keyof SourceReference, value: string) {
    const newSources = [...sources]
    newSources[index] = { ...newSources[index], [field]: value }
    onUpdate(newSources)
  }

  function removeSource(index: number) {
    onUpdate(sources.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sources</span>
      {sources.map((source, i) => (
        <div key={i} className="flex gap-2">
          <div className="flex-1 space-y-1">
            <input
              type="text"
              value={source.title}
              onChange={(e) => updateSource(i, 'title', e.target.value)}
              placeholder="Source title"
              className="w-full text-xs border rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-bloom-orange/30"
            />
            <input
              type="text"
              value={source.url || ''}
              onChange={(e) => updateSource(i, 'url', e.target.value)}
              placeholder="URL (optional)"
              className="w-full text-xs border rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-bloom-orange/30"
            />
          </div>
          <button onClick={() => removeSource(i)} className="p-1 hover:bg-red-50 rounded self-start">
            <X size={14} className="text-red-400" />
          </button>
        </div>
      ))}
      <button
        onClick={addSource}
        className="text-xs text-bloom-orange font-medium hover:underline"
      >
        + Add source
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  Block Palette Bottom Sheet
// ═══════════════════════════════════════════════════════

function BlockPaletteSheet({
  onSelect,
  onClose,
}: {
  onSelect: (data: ContentData) => void
  onClose: () => void
}) {
  const pageTypes = [
    { label: 'Content Page', description: 'Rich text with headings, images, and more', icon: Type, type: 'page' as const },
    { label: 'Question', description: 'Multiple choice quiz question', icon: HelpCircle, type: 'question' as const },
  ]

  function handleSelect(type: 'page' | 'question') {
    if (type === 'page') {
      onSelect({
        type: 'page',
        blocks: [
          { type: 'heading', segments: [{ text: '' }], level: 2 },
          { type: 'paragraph', segments: [{ text: '' }] },
        ],
      })
    } else {
      onSelect({
        type: 'question',
        question: '',
        questionSegments: [{ text: '' }],
        options: ['', '', '', ''],
        correctIndex: 0,
        explanation: '',
        explanationSegments: [{ text: '' }],
      })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-3xl p-6 animate-slide-up" style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom, 2.5rem))' }}>
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-4" />
        <h3 className="font-bold text-lg text-bloom-text mb-3">Add Page</h3>
        <div className="space-y-3 overflow-y-auto max-h-[60vh]">
          {pageTypes.map(pt => (
            <button
              key={pt.type}
              onClick={() => handleSelect(pt.type)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-200 hover:border-bloom-orange hover:bg-orange-50/30 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                <pt.icon size={24} className="text-bloom-text-secondary" />
              </div>
              <div>
                <span className="font-semibold text-bloom-text">{pt.label}</span>
                <p className="text-sm text-bloom-text-muted">{pt.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  Preview Overlay
// ═══════════════════════════════════════════════════════

const PULL_THRESHOLD = 120

function PreviewOverlay({
  pages,
  pageIndex,
  onClose,
  onChangeIndex,
}: {
  pages: PageDraft[]
  pageIndex: number
  onClose: () => void
  onChangeIndex: (index: number) => void
}) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)

  const [pullDistance, setPullDistance] = useState(0)
  const [scrollDir, setScrollDir] = useState<'forward' | 'backward'>('forward')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [pageAnim, setPageAnim] = useState<'idle' | 'exit' | 'enter'>('enter')
  const [confirmed, setConfirmed] = useState(false)
  const [animDir, setAnimDir] = useState<'forward' | 'backward'>('forward')

  const containerRef = useRef<HTMLDivElement>(null)
  const isTransitioningRef = useRef(false)
  const canAdvanceRef = useRef(false)
  const canGoBackRef = useRef(false)
  const doAdvanceRef = useRef<() => void>(() => {})
  const doGoBackRef = useRef<() => void>(() => {})
  const pullDistanceRef = useRef(0)
  const scrollDirRef = useRef<'forward' | 'backward'>('forward')
  const wheelAccumRef = useRef(0)
  const wheelDirRef = useRef<'forward' | 'backward'>('forward')
  const wheelTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const data = pages[pageIndex]?.contentData
  const isLast = pageIndex >= pages.length - 1
  const isFirst = pageIndex === 0
  const isQuestion = data?.type === 'question'
  const canContinue = !isQuestion || isCorrect === true
  const progress = (pageIndex + 1) / pages.length
  const pullProgress = Math.min(pullDistance / PULL_THRESHOLD, 1)

  canAdvanceRef.current = canContinue && !isTransitioningRef.current
  canGoBackRef.current = !isFirst && !isTransitioningRef.current
  pullDistanceRef.current = pullDistance
  scrollDirRef.current = scrollDir

  useEffect(() => {
    const prev = document.body.style.overflow
    const prevHeight = document.body.style.height
    const prevPosition = document.body.style.position
    document.body.style.overflow = 'hidden'
    document.body.style.height = '100%'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    document.documentElement.style.overflow = 'hidden'

    const t = setTimeout(() => setPageAnim('idle'), 420)

    return () => {
      document.body.style.overflow = prev
      document.body.style.height = prevHeight
      document.body.style.position = prevPosition
      document.body.style.width = ''
      document.documentElement.style.overflow = ''
      clearTimeout(t)
    }
  }, [])

  const doAdvance = useCallback(async () => {
    if (isTransitioningRef.current) return
    isTransitioningRef.current = true
    setIsTransitioning(true)
    wheelAccumRef.current = 0
    setAnimDir('forward')
    setConfirmed(true)
    setPageAnim('exit')
    await new Promise(r => setTimeout(r, 350))
    setPullDistance(0)
    if (isLast) { onClose(); return }
    onChangeIndex(pageIndex + 1)
    setSelectedAnswer(null); setIsCorrect(null); setShowExplanation(false)
    if (containerRef.current) containerRef.current.scrollTop = 0
    setConfirmed(false)
    setPageAnim('enter')
    await new Promise(r => setTimeout(r, 380))
    setPageAnim('idle'); setScrollDir('forward')
    isTransitioningRef.current = false; setIsTransitioning(false)
  }, [isLast, pageIndex, onChangeIndex, onClose])

  const doGoBack = useCallback(async () => {
    if (isTransitioningRef.current || isFirst) return
    isTransitioningRef.current = true
    setIsTransitioning(true)
    wheelAccumRef.current = 0
    setAnimDir('backward')
    setConfirmed(true)
    setPageAnim('exit')
    await new Promise(r => setTimeout(r, 350))
    setPullDistance(0)
    onChangeIndex(pageIndex - 1)
    setSelectedAnswer(null); setIsCorrect(null); setShowExplanation(false)
    if (containerRef.current) containerRef.current.scrollTop = 0
    setConfirmed(false)
    setPageAnim('enter')
    await new Promise(r => setTimeout(r, 380))
    setPageAnim('idle'); setScrollDir('forward')
    isTransitioningRef.current = false; setIsTransitioning(false)
  }, [isFirst, pageIndex, onChangeIndex])

  doAdvanceRef.current = doAdvance
  doGoBackRef.current = doGoBack

  function handleAnswerSelect(index: number) {
    if (selectedAnswer !== null) return
    setSelectedAnswer(index)
    if (data?.type === 'question') {
      const qData = data as any
      const correct = index === qData.correctIndex
      setIsCorrect(correct)
      if (correct) {
        setTimeout(() => setShowExplanation(true), 600)
      } else {
        setTimeout(() => { setSelectedAnswer(null); setIsCorrect(null) }, 1400)
      }
    }
  }

  useEffect(() => {
    if (showExplanation && containerRef.current) {
      setTimeout(() => {
        containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' })
      }, 100)
    }
  }, [showExplanation])

  useEffect(() => {
    setSelectedAnswer(null); setIsCorrect(null); setShowExplanation(false)
  }, [pageIndex])

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose() }
      else if ((e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowRight') && canAdvanceRef.current) { e.preventDefault(); doAdvanceRef.current() }
      else if ((e.key === 'ArrowUp' || e.key === 'ArrowLeft') && canGoBackRef.current) { e.preventDefault(); doGoBackRef.current() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  // Touch & wheel gesture handlers
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let touchStartY: number | null = null
    let touchDir: 'forward' | 'backward' | null = null
    let hSwipeStartX: number | null = null
    let hSwipeStartY: number | null = null
    let hSwipeActive = false
    let hSwipeDir: 'forward' | 'backward' | null = null
    const H_SWIPE_THRESHOLD = 80
    let hTouchInsideInteractive = false

    const isAtBottom = () => el.scrollHeight - el.scrollTop - el.clientHeight < 5
    const isAtTop = () => el.scrollTop < 5

    const onTouchStart = (e: TouchEvent) => {
      if (isTransitioningRef.current) return
      const target = e.target as HTMLElement
      hTouchInsideInteractive = !!target.closest?.('[data-interactive]')
      touchStartY = e.touches[0].clientY
      hSwipeStartX = e.touches[0].clientX
      hSwipeStartY = e.touches[0].clientY
      touchDir = null; hSwipeActive = false; hSwipeDir = null
    }

    const onTouchMove = (e: TouchEvent) => {
      if (isTransitioningRef.current) return

      // Horizontal swipe
      if (!hTouchInsideInteractive && hSwipeStartX !== null && hSwipeStartY !== null) {
        const dx = e.touches[0].clientX - hSwipeStartX
        const dy = Math.abs(hSwipeStartY - e.touches[0].clientY)
        if (!hSwipeActive && Math.abs(dx) > 20 && Math.abs(dx) > dy * 1.5) {
          hSwipeActive = true
          if (dx > 0 && canGoBackRef.current) hSwipeDir = 'backward'
          else if (dx < 0 && canAdvanceRef.current) hSwipeDir = 'forward'
          else hSwipeDir = null
        }
        if (hSwipeActive && hSwipeDir) {
          e.preventDefault()
          const absDx = Math.abs(dx)
          const prog = Math.min(1, absDx / H_SWIPE_THRESHOLD)
          setPullDistance(prog * PULL_THRESHOLD)
          setScrollDir(hSwipeDir)
          if (absDx >= H_SWIPE_THRESHOLD) {
            hSwipeStartX = null; hSwipeActive = false
            if (hSwipeDir === 'forward') doAdvanceRef.current()
            else doGoBackRef.current()
            hSwipeDir = null
          }
          return
        }
      }

      // Vertical pull
      if (touchStartY === null) return
      const delta = touchStartY - e.touches[0].clientY
      if (touchDir === null) {
        if (delta > 10 && isAtBottom() && canAdvanceRef.current) touchDir = 'forward'
        else if (delta < -10 && isAtTop() && canGoBackRef.current) touchDir = 'backward'
        else return
      }
      if (touchDir === 'forward') {
        if (!canAdvanceRef.current || !isAtBottom()) { if (pullDistanceRef.current > 0) { setPullDistance(0); setScrollDir('forward') } return }
        e.preventDefault()
        const dist = Math.max(0, delta - 10)
        setPullDistance(dist); setScrollDir('forward')
        if (dist >= PULL_THRESHOLD) { touchStartY = null; touchDir = null; doAdvanceRef.current() }
      } else if (touchDir === 'backward') {
        if (!canGoBackRef.current || !isAtTop()) { if (pullDistanceRef.current > 0) { setPullDistance(0); setScrollDir('forward') } return }
        e.preventDefault()
        const dist = Math.max(0, -delta - 10)
        setPullDistance(dist); setScrollDir('backward')
        if (dist >= PULL_THRESHOLD) { touchStartY = null; touchDir = null; doGoBackRef.current() }
      }
    }

    const onTouchEnd = () => {
      if (pullDistanceRef.current > 0 && pullDistanceRef.current < PULL_THRESHOLD) setPullDistance(0)
      touchStartY = null; touchDir = null
      hSwipeStartX = null; hSwipeStartY = null; hSwipeActive = false; hSwipeDir = null; hTouchInsideInteractive = false
    }

    const onWheel = (e: WheelEvent) => {
      if (isTransitioningRef.current) return
      const scrollingDown = e.deltaY > 0
      const scrollingUp = e.deltaY < 0

      if (scrollingDown && isAtBottom() && canAdvanceRef.current) {
        if (wheelDirRef.current === 'backward') { wheelAccumRef.current = 0; setPullDistance(0) }
        wheelDirRef.current = 'forward'; setScrollDir('forward')
        e.preventDefault()
        wheelAccumRef.current += e.deltaY * 1.2
        wheelAccumRef.current = Math.max(0, wheelAccumRef.current)
        setPullDistance(wheelAccumRef.current)
        if (wheelAccumRef.current >= PULL_THRESHOLD) { wheelAccumRef.current = 0; doAdvanceRef.current(); return }
        if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current)
        wheelTimeoutRef.current = setTimeout(() => { wheelAccumRef.current = 0; setPullDistance(0) }, 400)
        return
      }

      if (scrollingUp && isAtTop() && canGoBackRef.current) {
        if (wheelDirRef.current === 'forward') { wheelAccumRef.current = 0; setPullDistance(0) }
        wheelDirRef.current = 'backward'; setScrollDir('backward')
        e.preventDefault()
        wheelAccumRef.current += Math.abs(e.deltaY) * 1.2
        wheelAccumRef.current = Math.max(0, wheelAccumRef.current)
        setPullDistance(wheelAccumRef.current)
        if (wheelAccumRef.current >= PULL_THRESHOLD) { wheelAccumRef.current = 0; doGoBackRef.current(); return }
        if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current)
        wheelTimeoutRef.current = setTimeout(() => { wheelAccumRef.current = 0; setPullDistance(0) }, 400)
        return
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('wheel', onWheel)
      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current)
    }
  }, [])

  const contentStyle = (() => {
    const isForward = animDir === 'forward'
    if (pageAnim === 'exit') {
      const currentOffset = pullProgress * 24
      return isForward
        ? { transform: `translateY(${-(currentOffset + 60)}px) scale(0.96)`, opacity: 0, transition: 'transform 0.3s ease-in, opacity 0.25s ease-in' }
        : { transform: `translateY(${currentOffset + 60}px) scale(0.96)`, opacity: 0, transition: 'transform 0.3s ease-in, opacity 0.25s ease-in' }
    }
    if (pageAnim === 'enter') return { transform: undefined as string | undefined, opacity: 1, transition: undefined as string | undefined }
    if (pullProgress > 0) {
      const dir = scrollDir === 'forward' ? -1 : 1
      return { transform: `translateY(${dir * pullProgress * 24}px) scale(${1 - pullProgress * 0.015})`, opacity: pullProgress > 0.85 ? 1 - (pullProgress - 0.85) * 4 : 1, transition: 'none' }
    }
    return { transform: undefined as string | undefined, opacity: 1, transition: 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease' }
  })()

  const enterClass = pageAnim === 'enter' ? (animDir === 'forward' ? 'lesson-page-enter' : 'lesson-page-enter-reverse') : ''

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50 overflow-hidden z-50" style={{ height: '100dvh', overscrollBehavior: 'none' }}>
      <header className="flex-shrink-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all duration-200 hover:scale-105">
            <X size={24} className="text-bloom-text" />
          </button>
          <div className="flex-1"><ProgressBar progress={progress} color="green" animated /></div>
          <div className="px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/50">
            <span className="text-xs font-semibold text-purple-600">Preview</span>
          </div>
        </div>
      </header>

      <main ref={containerRef} className="flex-1 overflow-y-auto relative" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'none' }}>
        <div className={`min-h-full flex flex-col px-6 md:px-8 ${enterClass}`} style={contentStyle}>
          <div className="flex-1 min-h-[24px]" />
          <div className="max-w-2xl w-full mx-auto">
            {data && <PreviewPageContent data={data} selectedAnswer={selectedAnswer} isCorrect={isCorrect} showExplanation={showExplanation} onAnswerSelect={handleAnswerSelect} />}
          </div>
          <div className="flex-1 min-h-[24px]" />
        </div>
        {pullProgress > 0 && (
          <div className="absolute inset-x-0 pointer-events-none" style={{
            ...(scrollDir === 'forward'
              ? { bottom: 0, height: '160px', background: `linear-gradient(to top, rgba(74, 175, 80, ${pullProgress * 0.12}), transparent)` }
              : { top: 0, height: '160px', background: `linear-gradient(to bottom, rgba(74, 144, 217, ${pullProgress * 0.12}), transparent)` }),
          }} />
        )}
      </main>

      <footer className="flex-shrink-0 bg-white/80 backdrop-blur-xl border-t border-slate-200/50 px-4 pt-4 pb-5">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between w-full">
            <span className="text-sm text-bloom-text-secondary font-medium tabular-nums">{pageIndex + 1} / {pages.length}</span>
            <PreviewMorphButton
              pullProgress={pullProgress} scrollDir={scrollDir} canContinue={canContinue}
              canGoBack={!isFirst} isTransitioning={isTransitioning} confirmed={confirmed}
              confirmedDir={animDir} isCorrect={isCorrect} isLast={isLast}
              onClickForward={() => { if (canAdvanceRef.current) doAdvanceRef.current() }}
            />
          </div>
        </div>
      </footer>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  PreviewPageContent
// ═══════════════════════════════════════════════════════

function PreviewPageContent({
  data, selectedAnswer, isCorrect, showExplanation, onAnswerSelect,
}: {
  data: ContentData; selectedAnswer: number | null; isCorrect: boolean | null
  showExplanation: boolean; onAnswerSelect: (index: number) => void
}) {
  if (data.type === 'page') return <RichContentRenderer blocks={data.blocks} />

  if (data.type === 'question') {
    return (
      <div className="space-y-5 py-2 animate-slide-up">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 shadow-xl">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-bloom-orange/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-bloom-orange font-bold text-lg">?</span>
            </div>
            <h2 className="text-xl md:text-2xl font-semibold text-white leading-snug">
              {data.questionSegments ? <RichText segments={data.questionSegments} /> : data.question}
            </h2>
          </div>
        </div>
        <div className="space-y-3">
          {data.options.map((option, index) => {
            const isSelected = selectedAnswer === index
            const isCorrectAnswer = index === data.correctIndex
            const showResult = selectedAnswer !== null

            let bgStyles = 'bg-white border-slate-200 hover:border-bloom-blue hover:shadow-md'
            let textColor = 'text-bloom-text'
            let iconElement: React.ReactNode = null

            if (showResult) {
              if (isCorrectAnswer) {
                bgStyles = 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-400 shadow-emerald-100 shadow-md'
                textColor = 'text-emerald-800'
                iconElement = <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center animate-pop-in"><Check size={18} className="text-white" strokeWidth={3} /></div>
              } else if (isSelected) {
                bgStyles = 'bg-red-50 border-red-300'
                textColor = 'text-red-700'
                iconElement = <div className="w-8 h-8 rounded-full bg-red-400 flex items-center justify-center animate-shake"><X size={18} className="text-white" strokeWidth={3} /></div>
              } else {
                bgStyles = 'bg-slate-50 border-slate-200 opacity-50'
              }
            }

            return (
              <button key={index} onClick={() => onAnswerSelect(index)} disabled={selectedAnswer !== null}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-300 ${bgStyles}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                    showResult && isCorrectAnswer ? 'bg-emerald-500 text-white' : showResult && isSelected ? 'bg-red-400 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>{String.fromCharCode(65 + index)}</div>
                  <span className={`flex-1 font-medium ${textColor}`}>
                    {data.optionSegments?.[index] ? <RichText segments={data.optionSegments[index]} /> : option}
                  </span>
                  {iconElement}
                </div>
              </button>
            )
          })}
        </div>
        {isCorrect === false && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 animate-slide-up">
            <p className="text-red-700 font-medium">Not quite — try again!</p>
          </div>
        )}
        {showExplanation && (data.explanation || data.explanationSegments) && (
          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 animate-slide-up">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center"><Lightbulb size={22} className="text-white" /></div>
              <span className="font-bold text-amber-900 text-lg">Great insight!</span>
            </div>
            <p className="text-amber-800 leading-relaxed">
              {data.explanationSegments ? <RichText segments={data.explanationSegments} /> : data.explanation}
            </p>
          </div>
        )}
      </div>
    )
  }

  if (data.type === 'text') {
    const isBold = data.formatting?.bold
    return (
      <div className={`py-4 animate-slide-up ${isBold ? 'text-center py-6' : ''}`}>
        {isBold ? (
          <><h2 className="font-bold text-bloom-text leading-tight text-2xl md:text-3xl">{data.text}</h2>
            <div className="h-1 w-20 bg-gradient-to-r from-bloom-orange to-bloom-yellow rounded-full mx-auto mt-6" /></>
        ) : <p className="text-xl md:text-2xl leading-relaxed text-bloom-text text-center">{data.text}</p>}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center py-4 animate-slide-up">
      <div className="p-8 rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-600 w-full max-w-sm shadow-xl">
        <div className="text-center text-white"><p className="font-semibold text-xl">Interactive Component</p></div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  PreviewMorphButton
// ═══════════════════════════════════════════════════════

function PreviewMorphButton({
  pullProgress, scrollDir, canContinue, canGoBack, isTransitioning, confirmed, isLast, onClickForward,
}: {
  pullProgress: number; scrollDir: 'forward' | 'backward'; canContinue: boolean; canGoBack: boolean
  isTransitioning: boolean; confirmed: boolean; confirmedDir: 'forward' | 'backward'
  isCorrect: boolean | null; isLast: boolean; onClickForward: () => void
}) {
  const isForward = scrollDir === 'forward'
  const activePull = isForward ? (canContinue ? pullProgress : 0) : (canGoBack ? pullProgress : 0)
  const pastThreshold = activePull >= 1
  const disabled = isForward ? (!canContinue || isTransitioning) : (!canGoBack || isTransitioning)
  const minW = 130; const maxW = 56
  const width = minW - activePull * (minW - maxW)
  const borderRadius = 16 + activePull * 12
  const forwardBg = pastThreshold ? '#22c55e' : `color-mix(in srgb, #22c55e ${50 + activePull * 50}%, #94a3b8)`
  const backwardBg = pastThreshold ? '#3b82f6' : `color-mix(in srgb, #3b82f6 ${50 + activePull * 50}%, #94a3b8)`
  const activeBg = isForward ? forwardBg : backwardBg
  const textOpacity = confirmed ? 0 : Math.max(0, 1 - activePull * 3)
  const iconOpacity = confirmed ? 1 : activePull > 0.2 ? Math.min(1, (activePull - 0.2) * 2.5) : 0
  const transformOrigin = isForward ? 'right center' : 'left center'

  return (
    <button onClick={onClickForward} disabled={disabled}
      className={`relative overflow-hidden text-white font-semibold flex-shrink-0
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        ${!confirmed && !isTransitioning ? 'active:scale-95' : ''}
        ${pastThreshold && isForward ? 'shadow-lg shadow-emerald-400/50' : ''}
        ${pastThreshold && !isForward ? 'shadow-lg shadow-blue-400/50' : ''}
        ${!pastThreshold ? 'shadow-sm' : ''}`}
      style={{
        width: `${width}px`, height: '48px', borderRadius: `${borderRadius}px`,
        backgroundColor: activeBg, transformOrigin,
        transition: confirmed ? 'all 0.25s cubic-bezier(0.22, 1, 0.36, 1)'
          : activePull > 0 ? 'background-color 0.15s, box-shadow 0.15s'
          : 'all 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <span className="absolute inset-0 flex items-center justify-center gap-2"
        style={{ opacity: textOpacity, transition: confirmed ? 'opacity 0.15s' : undefined }}>
        {isLast ? 'Complete' : 'Continue'}<ChevronRight size={18} />
      </span>
      <span className="absolute inset-0 flex items-center justify-center"
        style={{ opacity: iconOpacity, transform: confirmed ? 'scale(1.15)' : 'scale(1)',
          transition: confirmed ? 'all 0.25s cubic-bezier(0.22, 1, 0.36, 1)' : undefined }}>
        {pastThreshold
          ? (isForward ? <Check size={22} strokeWidth={3} /> : <ChevronLeft size={22} strokeWidth={3} />)
          : (isForward ? <ChevronDown size={22} /> : <ChevronUp size={22} />)}
      </span>
    </button>
  )
}

// ═══════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════

function createEmptyBlock(type: ContentBlock['type']): ContentBlock {
  switch (type) {
    case 'heading': return { type: 'heading', segments: [{ text: '' }], level: 2 }
    case 'paragraph': return { type: 'paragraph', segments: [{ text: '' }] }
    case 'image': return { type: 'image', src: 'emoji:📚', caption: '' }
    case 'math': return { type: 'math', latex: '', caption: '' }
    case 'callout': return { type: 'callout', style: 'tip', title: '', segments: [{ text: '' }] }
    case 'bulletList': return { type: 'bulletList', items: [[{ text: '' }]] }
    case 'divider': return { type: 'divider' }
    case 'spacer': return { type: 'spacer', size: 'md' }
    case 'animation': return { type: 'animation', src: '', caption: '' }
    case 'interactive': return { type: 'interactive', componentId: '' }
    default: return { type: 'paragraph', segments: [{ text: '' }] }
  }
}

function getPagePreview(data: ContentData): string {
  if (data.type === 'question') return (data as any).question?.substring(0, 60) || ''
  if (data.type === 'page') {
    const blocks = (data as any).blocks as ContentBlock[]
    for (const block of blocks) {
      if ('segments' in block && Array.isArray(block.segments)) {
        const text = block.segments.map((s: TextSegment) => s.text).join('')
        if (text.trim()) return text.substring(0, 60)
      }
    }
  }
  return ''
}
