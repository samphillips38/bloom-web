/**
 * InteractiveBlockEditor
 *
 * A searchable component picker with per-component friendly prop editors
 * and a live preview.
 */
import { useState, useMemo } from 'react'
import { Search, X, ChevronLeft } from 'lucide-react'
import { interactiveComponents } from '../interactives'

// ── Types ──────────────────────────────────────────────────────────────────

type Props = Record<string, unknown>

interface ComponentConfig {
  id: string
  label: string
  emoji: string
  description: string
  category: string
  defaultProps: Props
  PropsEditor: React.ComponentType<{ props: Props; onChange: (props: Props) => void }>
}

// ── Reusable editor primitives ─────────────────────────────────────────────

function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="flex items-baseline gap-2 mb-1">
      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</span>
      {hint && <span className="text-xs text-slate-400 normal-case">{hint}</span>}
    </div>
  )
}

function StringField({ label, hint, value, onChange, placeholder, multiline }: {
  label: string; hint?: string; value: string; onChange: (v: string) => void
  placeholder?: string; multiline?: boolean
}) {
  return (
    <div>
      <FieldLabel label={label} hint={hint} />
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-400/40 resize-y"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-400/40"
        />
      )}
    </div>
  )
}

function NumberField({ label, hint, value, onChange, min, max, step }: {
  label: string; hint?: string; value: number; onChange: (v: number) => void
  min?: number; max?: number; step?: number
}) {
  return (
    <div>
      <FieldLabel label={label} hint={hint} />
      <input
        type="number"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        step={step ?? 1}
        className="w-full text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-400/40"
      />
    </div>
  )
}

function BooleanField({ label, hint, value, onChange }: {
  label: string; hint?: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={value}
        onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 rounded accent-violet-600"
      />
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </label>
  )
}

function SelectField({ label, hint, value, options, onChange }: {
  label: string; hint?: string; value: string; options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div>
      <FieldLabel label={label} hint={hint} />
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-400/40"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function StringListField({ label, hint, items, onChange, placeholder }: {
  label: string; hint?: string; items: string[]; onChange: (items: string[]) => void
  placeholder?: string
}) {
  return (
    <div>
      <FieldLabel label={label} hint={hint} />
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              type="text"
              value={item}
              onChange={e => {
                const next = [...items]; next[i] = e.target.value; onChange(next)
              }}
              placeholder={placeholder ?? `Item ${i + 1}`}
              className="flex-1 text-sm border rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-violet-400/40"
            />
            <button
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="p-1 hover:bg-red-50 rounded text-red-400 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        <button
          onClick={() => onChange([...items, ''])}
          className="text-xs text-violet-600 font-medium hover:underline"
        >
          + Add item
        </button>
      </div>
    </div>
  )
}

function PairListField({ label, hint, pairs, fieldA, fieldB, onChange, multilineB }: {
  label: string; hint?: string
  pairs: { a: string; b: string }[]
  fieldA: string; fieldB: string
  onChange: (pairs: { a: string; b: string }[]) => void
  multilineB?: boolean
}) {
  return (
    <div>
      <FieldLabel label={label} hint={hint} />
      <div className="space-y-3">
        {pairs.map((pair, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">#{i + 1}</span>
              <button
                onClick={() => onChange(pairs.filter((_, j) => j !== i))}
                className="p-0.5 hover:bg-red-50 rounded text-red-400 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
            <input
              type="text"
              value={pair.a}
              onChange={e => {
                const next = [...pairs]; next[i] = { ...next[i], a: e.target.value }; onChange(next)
              }}
              placeholder={fieldA}
              className="w-full text-xs border rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-violet-400/40 bg-white"
            />
            {multilineB ? (
              <textarea
                value={pair.b}
                onChange={e => {
                  const next = [...pairs]; next[i] = { ...next[i], b: e.target.value }; onChange(next)
                }}
                placeholder={fieldB}
                rows={2}
                className="w-full text-xs border rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-violet-400/40 bg-white resize-y"
              />
            ) : (
              <input
                type="text"
                value={pair.b}
                onChange={e => {
                  const next = [...pairs]; next[i] = { ...next[i], b: e.target.value }; onChange(next)
                }}
                placeholder={fieldB}
                className="w-full text-xs border rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-violet-400/40 bg-white"
              />
            )}
          </div>
        ))}
        <button
          onClick={() => onChange([...pairs, { a: '', b: '' }])}
          className="text-xs text-violet-600 font-medium hover:underline"
        >
          + Add pair
        </button>
      </div>
    </div>
  )
}

// ── Per-component Props Editors ─────────────────────────────────────────────

function FlashcardDeckEditor({ props, onChange }: { props: Props; onChange: (p: Props) => void }) {
  const title = (props.title as string) ?? 'Flashcards'
  const cards = (props.cards as { front: string; back: string }[]) ?? []
  const pairs = cards.map(c => ({ a: c.front, b: c.back }))
  return (
    <div className="space-y-4">
      <StringField label="Title" value={title} onChange={v => onChange({ ...props, title: v })} />
      <PairListField
        label="Cards" hint="(front / back)"
        pairs={pairs} fieldA="Front (term)" fieldB="Back (definition)"
        onChange={ps => onChange({ ...props, cards: ps.map(p => ({ front: p.a, back: p.b })) })}
        multilineB
      />
    </div>
  )
}

function WordMatchEditor({ props, onChange }: { props: Props; onChange: (p: Props) => void }) {
  const title = (props.title as string) ?? 'Match the Terms'
  const rawPairs = (props.pairs as { term: string; definition: string }[]) ?? []
  const pairs = rawPairs.map(p => ({ a: p.term, b: p.definition }))
  return (
    <div className="space-y-4">
      <StringField label="Title" value={title} onChange={v => onChange({ ...props, title: v })} />
      <PairListField
        label="Pairs" hint="(term / definition)"
        pairs={pairs} fieldA="Term" fieldB="Definition"
        onChange={ps => onChange({ ...props, pairs: ps.map(p => ({ term: p.a, definition: p.b })) })}
      />
    </div>
  )
}

function MemoryMatchEditor({ props, onChange }: { props: Props; onChange: (p: Props) => void }) {
  const title = (props.title as string) ?? 'Memory Match'
  const rawPairs = (props.pairs as { term: string; definition: string }[]) ?? []
  const pairs = rawPairs.map(p => ({ a: p.term, b: p.definition }))
  return (
    <div className="space-y-4">
      <StringField label="Title" value={title} onChange={v => onChange({ ...props, title: v })} />
      <PairListField
        label="Pairs" hint="4–8 pairs recommended"
        pairs={pairs} fieldA="Term / symbol" fieldB="Definition / meaning"
        onChange={ps => onChange({ ...props, pairs: ps.map(p => ({ term: p.a, definition: p.b })) })}
      />
    </div>
  )
}

function SortableCategoriesEditor({ props, onChange }: { props: Props; onChange: (p: Props) => void }) {
  const title = (props.title as string) ?? 'Sort into Categories'
  const instruction = (props.instruction as string) ?? 'Tap an item, then tap a category.'
  const categories = (props.categories as { label: string; items: string[] }[]) ?? []

  function updateCategory(i: number, label: string) {
    const next = [...categories]; next[i] = { ...next[i], label }; onChange({ ...props, categories: next })
  }
  function updateItems(i: number, items: string[]) {
    const next = [...categories]; next[i] = { ...next[i], items }; onChange({ ...props, categories: next })
  }
  function addCategory() {
    onChange({ ...props, categories: [...categories, { label: 'Category', items: [] }] })
  }
  function removeCategory(i: number) {
    onChange({ ...props, categories: categories.filter((_, j) => j !== i) })
  }

  return (
    <div className="space-y-4">
      <StringField label="Title" value={title} onChange={v => onChange({ ...props, title: v })} />
      <StringField label="Instruction" value={instruction} onChange={v => onChange({ ...props, instruction: v })} />
      <div>
        <FieldLabel label="Categories" hint="Each category contains items to sort into it" />
        <div className="space-y-3">
          {categories.map((cat, i) => (
            <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={cat.label}
                  onChange={e => updateCategory(i, e.target.value)}
                  placeholder="Category name"
                  className="flex-1 text-sm font-semibold border rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-violet-400/40 bg-white"
                />
                <button onClick={() => removeCategory(i)} className="p-1 hover:bg-red-50 rounded text-red-400">
                  <X size={14} />
                </button>
              </div>
              <StringListField
                label="Items" items={cat.items}
                onChange={items => updateItems(i, items)}
                placeholder="Item text"
              />
            </div>
          ))}
          <button onClick={addCategory} className="text-xs text-violet-600 font-medium hover:underline">
            + Add category
          </button>
        </div>
      </div>
    </div>
  )
}

function SequenceSorterEditor({ props, onChange }: { props: Props; onChange: (p: Props) => void }) {
  const title = (props.title as string) ?? 'Put in the Correct Order'
  const instruction = (props.instruction as string) ?? 'Arrange from first to last.'
  const items = (props.items as string[]) ?? []
  const hint = (props.hint as string) ?? ''
  return (
    <div className="space-y-4">
      <StringField label="Title" value={title} onChange={v => onChange({ ...props, title: v })} />
      <StringField label="Instruction" value={instruction} onChange={v => onChange({ ...props, instruction: v })} />
      <StringListField
        label="Items (in correct order)" hint="They'll be shuffled for the learner"
        items={items} onChange={items => onChange({ ...props, items })}
        placeholder="Step or item..."
      />
      <StringField label="Hint" hint="Optional" value={hint} onChange={v => onChange({ ...props, hint: v || undefined })} />
    </div>
  )
}

function FillInTheBlankEditor({ props, onChange }: { props: Props; onChange: (p: Props) => void }) {
  const title = (props.title as string) ?? 'Fill in the Blanks'
  const sentence = (props.sentence as string) ?? ''
  const blanks = (props.blanks as string[]) ?? []
  const wordBank = (props.wordBank as string[]) ?? []
  return (
    <div className="space-y-4">
      <StringField label="Title" value={title} onChange={v => onChange({ ...props, title: v })} />
      <StringField
        label="Sentence" hint='Use __BLANK__ for each gap'
        value={sentence} onChange={v => onChange({ ...props, sentence: v })}
        multiline placeholder="The answer is __BLANK__ because of __BLANK__."
      />
      <StringListField
        label="Correct answers" hint="One per blank, in order"
        items={blanks} onChange={b => onChange({ ...props, blanks: b })}
        placeholder="Correct word"
      />
      <StringListField
        label="Decoy words" hint="Extra wrong options in the word bank"
        items={wordBank} onChange={w => onChange({ ...props, wordBank: w })}
        placeholder="Wrong option"
      />
    </div>
  )
}

function PollEditor({ props, onChange }: { props: Props; onChange: (p: Props) => void }) {
  const question = (props.question as string) ?? ''
  const options = (props.options as string[]) ?? []
  return (
    <div className="space-y-4">
      <StringField label="Question" value={question} onChange={v => onChange({ ...props, question: v })} />
      <StringListField
        label="Options"
        items={options} onChange={o => onChange({ ...props, options: o })}
        placeholder="Option..."
      />
    </div>
  )
}

function BarChartBuilderEditor({ props, onChange }: { props: Props; onChange: (p: Props) => void }) {
  const title = (props.title as string) ?? 'Chart Title'
  const description = (props.description as string) ?? ''
  const showValues = (props.showValues as boolean) ?? true
  const bars = (props.bars as { label: string; value: number; maxValue?: number }[]) ?? []

  function updateBar(i: number, field: string, val: string | number) {
    const next = [...bars]; (next[i] as any)[field] = val; onChange({ ...props, bars: next })
  }

  return (
    <div className="space-y-4">
      <StringField label="Title" value={title} onChange={v => onChange({ ...props, title: v })} />
      <StringField label="Description" hint="Optional subtitle" value={description} onChange={v => onChange({ ...props, description: v })} />
      <BooleanField label="Show values" value={showValues} onChange={v => onChange({ ...props, showValues: v })} />
      <div>
        <FieldLabel label="Bars" />
        <div className="space-y-2">
          {bars.map((bar, i) => (
            <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Bar {i + 1}</span>
                <button onClick={() => onChange({ ...props, bars: bars.filter((_, j) => j !== i) })} className="p-0.5 hover:bg-red-50 rounded text-red-400"><X size={12} /></button>
              </div>
              <input type="text" value={bar.label} onChange={e => updateBar(i, 'label', e.target.value)} placeholder="Label" className="w-full text-xs border rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-violet-400/40 bg-white" />
              <div className="flex gap-2">
                <div className="flex-1">
                  <span className="text-[10px] text-slate-400">Value</span>
                  <input type="number" value={bar.value} onChange={e => updateBar(i, 'value', parseInt(e.target.value) || 0)} className="w-full text-xs border rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-violet-400/40 bg-white" />
                </div>
                <div className="flex-1">
                  <span className="text-[10px] text-slate-400">Max value</span>
                  <input type="number" value={bar.maxValue ?? 100} onChange={e => updateBar(i, 'maxValue', parseInt(e.target.value) || 100)} className="w-full text-xs border rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-violet-400/40 bg-white" />
                </div>
              </div>
            </div>
          ))}
          <button onClick={() => onChange({ ...props, bars: [...bars, { label: '', value: 50, maxValue: 100 }] })} className="text-xs text-violet-600 font-medium hover:underline">
            + Add bar
          </button>
        </div>
      </div>
    </div>
  )
}

function TimelineEditor({ props, onChange }: { props: Props; onChange: (p: Props) => void }) {
  const title = (props.title as string) ?? 'Timeline'
  const events = (props.events as { year: string; title: string; description: string; emoji?: string }[]) ?? []

  function updateEvent(i: number, field: string, val: string) {
    const next = [...events]; (next[i] as any)[field] = val; onChange({ ...props, events: next })
  }

  return (
    <div className="space-y-4">
      <StringField label="Title" value={title} onChange={v => onChange({ ...props, title: v })} />
      <div>
        <FieldLabel label="Events" />
        <div className="space-y-2">
          {events.map((evt, i) => (
            <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Event {i + 1}</span>
                <button onClick={() => onChange({ ...props, events: events.filter((_, j) => j !== i) })} className="p-0.5 hover:bg-red-50 rounded text-red-400"><X size={12} /></button>
              </div>
              <div className="flex gap-2">
                <input type="text" value={evt.year} onChange={e => updateEvent(i, 'year', e.target.value)} placeholder="Year / date" className="w-24 text-xs border rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-violet-400/40 bg-white" />
                <input type="text" value={evt.emoji ?? ''} onChange={e => updateEvent(i, 'emoji', e.target.value)} placeholder="Emoji" className="w-16 text-xs border rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-violet-400/40 bg-white text-center" />
                <input type="text" value={evt.title} onChange={e => updateEvent(i, 'title', e.target.value)} placeholder="Event title" className="flex-1 text-xs border rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-violet-400/40 bg-white" />
              </div>
              <textarea value={evt.description} onChange={e => updateEvent(i, 'description', e.target.value)} placeholder="Description" rows={2} className="w-full text-xs border rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-violet-400/40 bg-white resize-y" />
            </div>
          ))}
          <button onClick={() => onChange({ ...props, events: [...events, { year: '', title: '', description: '', emoji: '📌' }] })} className="text-xs text-violet-600 font-medium hover:underline">
            + Add event
          </button>
        </div>
      </div>
    </div>
  )
}

function NumberLineEditor({ props, onChange }: { props: Props; onChange: (p: Props) => void }) {
  const title = (props.title as string) ?? 'Number Line'
  const question = (props.question as string) ?? ''
  const min = (props.min as number) ?? 0
  const max = (props.max as number) ?? 10
  const step = (props.step as number) ?? 1
  const unit = (props.unit as string) ?? ''
  const answer = props.answer as number | undefined
  const answerTolerance = (props.answerTolerance as number) ?? 1
  const hasAnswer = answer !== undefined

  return (
    <div className="space-y-4">
      <StringField label="Title" value={title} onChange={v => onChange({ ...props, title: v })} />
      <StringField label="Question" value={question} onChange={v => onChange({ ...props, question: v })} />
      <div className="grid grid-cols-3 gap-3">
        <NumberField label="Min" value={min} onChange={v => onChange({ ...props, min: v })} />
        <NumberField label="Max" value={max} onChange={v => onChange({ ...props, max: v })} />
        <NumberField label="Step" value={step} step={0.1} onChange={v => onChange({ ...props, step: v })} />
      </div>
      <StringField label="Unit" hint="Optional (e.g. km, %)" value={unit} onChange={v => onChange({ ...props, unit: v })} />
      <BooleanField
        label="Has a correct answer"
        value={hasAnswer}
        onChange={v => onChange({ ...props, answer: v ? Math.round((min + max) / 2) : undefined })}
      />
      {hasAnswer && (
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Correct answer" value={answer!} min={min} max={max} step={step} onChange={v => onChange({ ...props, answer: v })} />
          <NumberField label="Tolerance" hint="±" value={answerTolerance} min={0} onChange={v => onChange({ ...props, answerTolerance: v })} />
        </div>
      )}
    </div>
  )
}

function HotspotDiagramEditor({ props, onChange }: { props: Props; onChange: (p: Props) => void }) {
  const title = (props.title as string) ?? 'Hotspot Diagram'
  const diagramEmoji = (props.diagramEmoji as string) ?? '🖥️'
  const diagramLabel = (props.diagramLabel as string) ?? ''
  const hotspots = (props.hotspots as { x: number; y: number; label: string; description: string; emoji?: string }[]) ?? []

  function updateHotspot(i: number, field: string, val: string | number) {
    const next = [...hotspots]; (next[i] as any)[field] = val; onChange({ ...props, hotspots: next })
  }

  return (
    <div className="space-y-4">
      <StringField label="Title" value={title} onChange={v => onChange({ ...props, title: v })} />
      <div className="flex gap-3">
        <StringField label="Diagram emoji" value={diagramEmoji} onChange={v => onChange({ ...props, diagramEmoji: v })} placeholder="🖥️" />
        <StringField label="Diagram label" value={diagramLabel} onChange={v => onChange({ ...props, diagramLabel: v })} />
      </div>
      <div>
        <FieldLabel label="Hotspots" hint="x/y are % from top-left (0–100)" />
        <div className="space-y-2">
          {hotspots.map((hs, i) => (
            <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Pin {i + 1}</span>
                <button onClick={() => onChange({ ...props, hotspots: hotspots.filter((_, j) => j !== i) })} className="p-0.5 hover:bg-red-50 rounded text-red-400"><X size={12} /></button>
              </div>
              <div className="flex gap-2">
                <div className="w-16">
                  <span className="text-[10px] text-slate-400">X%</span>
                  <input type="number" min={0} max={100} value={hs.x} onChange={e => updateHotspot(i, 'x', parseInt(e.target.value) || 0)} className="w-full text-xs border rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-violet-400/40 bg-white" />
                </div>
                <div className="w-16">
                  <span className="text-[10px] text-slate-400">Y%</span>
                  <input type="number" min={0} max={100} value={hs.y} onChange={e => updateHotspot(i, 'y', parseInt(e.target.value) || 0)} className="w-full text-xs border rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-violet-400/40 bg-white" />
                </div>
                <div className="w-12">
                  <span className="text-[10px] text-slate-400">Emoji</span>
                  <input type="text" value={hs.emoji ?? ''} onChange={e => updateHotspot(i, 'emoji', e.target.value)} className="w-full text-xs border rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-violet-400/40 bg-white text-center" />
                </div>
                <div className="flex-1">
                  <span className="text-[10px] text-slate-400">Label</span>
                  <input type="text" value={hs.label} onChange={e => updateHotspot(i, 'label', e.target.value)} className="w-full text-xs border rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-violet-400/40 bg-white" />
                </div>
              </div>
              <textarea value={hs.description} onChange={e => updateHotspot(i, 'description', e.target.value)} placeholder="Description when clicked" rows={2} className="w-full text-xs border rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-violet-400/40 bg-white resize-y" />
            </div>
          ))}
          <button onClick={() => onChange({ ...props, hotspots: [...hotspots, { x: 50, y: 50, label: '', description: '', emoji: '📍' }] })} className="text-xs text-violet-600 font-medium hover:underline">
            + Add hotspot
          </button>
        </div>
      </div>
    </div>
  )
}

function ConceptWebEditor({ props, onChange }: { props: Props; onChange: (p: Props) => void }) {
  const title = (props.title as string) ?? 'Concept Web'
  const center = (props.center as string) ?? 'Main Concept'
  const centerEmoji = (props.centerEmoji as string) ?? '🧠'
  const nodes = (props.nodes as { label: string; description: string; emoji?: string }[]) ?? []

  function updateNode(i: number, field: string, val: string) {
    const next = [...nodes]; (next[i] as any)[field] = val; onChange({ ...props, nodes: next })
  }

  return (
    <div className="space-y-4">
      <StringField label="Title" value={title} onChange={v => onChange({ ...props, title: v })} />
      <div className="flex gap-3">
        <StringField label="Center label" value={center} onChange={v => onChange({ ...props, center: v })} />
        <StringField label="Center emoji" value={centerEmoji} onChange={v => onChange({ ...props, centerEmoji: v })} placeholder="🧠" />
      </div>
      <div>
        <FieldLabel label="Satellite nodes" hint="4–6 recommended" />
        <div className="space-y-2">
          {nodes.map((node, i) => (
            <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Node {i + 1}</span>
                <button onClick={() => onChange({ ...props, nodes: nodes.filter((_, j) => j !== i) })} className="p-0.5 hover:bg-red-50 rounded text-red-400"><X size={12} /></button>
              </div>
              <div className="flex gap-2">
                <input type="text" value={node.emoji ?? ''} onChange={e => updateNode(i, 'emoji', e.target.value)} placeholder="💡" className="w-12 text-xs border rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-violet-400/40 bg-white text-center" />
                <input type="text" value={node.label} onChange={e => updateNode(i, 'label', e.target.value)} placeholder="Short label" className="flex-1 text-xs border rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-violet-400/40 bg-white" />
              </div>
              <textarea value={node.description} onChange={e => updateNode(i, 'description', e.target.value)} placeholder="Explanation shown when clicked" rows={2} className="w-full text-xs border rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-violet-400/40 bg-white resize-y" />
            </div>
          ))}
          <button onClick={() => onChange({ ...props, nodes: [...nodes, { label: '', description: '', emoji: '💡' }] })} className="text-xs text-violet-600 font-medium hover:underline">
            + Add node
          </button>
        </div>
      </div>
    </div>
  )
}

function SineWaveExplorerEditor({ props, onChange }: { props: Props; onChange: (p: Props) => void }) {
  const title = (props.title as string) ?? 'Sine Wave Explorer'
  const showAmplitude = (props.showAmplitude as boolean) ?? true
  const showFrequency = (props.showFrequency as boolean) ?? true
  const showPhase = (props.showPhase as boolean) ?? true
  return (
    <div className="space-y-4">
      <StringField label="Title" value={title} onChange={v => onChange({ ...props, title: v })} />
      <div className="space-y-2">
        <FieldLabel label="Controls to show" />
        <BooleanField label="Amplitude slider" value={showAmplitude} onChange={v => onChange({ ...props, showAmplitude: v })} />
        <BooleanField label="Frequency slider" value={showFrequency} onChange={v => onChange({ ...props, showFrequency: v })} />
        <BooleanField label="Phase slider" value={showPhase} onChange={v => onChange({ ...props, showPhase: v })} />
      </div>
    </div>
  )
}

function TruthTableEditor({ props, onChange }: { props: Props; onChange: (p: Props) => void }) {
  const title = (props.title as string) ?? 'Truth Table'
  const operator = (props.operator as string) ?? 'AND'
  return (
    <div className="space-y-4">
      <StringField label="Title" value={title} onChange={v => onChange({ ...props, title: v })} />
      <SelectField
        label="Operator"
        value={operator}
        options={[
          { value: 'AND', label: 'AND (∧)' },
          { value: 'OR', label: 'OR (∨)' },
          { value: 'NOT', label: 'NOT (¬)' },
          { value: 'IMPLIES', label: 'IMPLIES (→)' },
        ]}
        onChange={v => onChange({ ...props, operator: v })}
      />
    </div>
  )
}

function VennDiagramEditor({ props, onChange }: { props: Props; onChange: (p: Props) => void }) {
  const title = (props.title as string) ?? 'Venn Diagram'
  const leftLabel = (props.leftLabel as string) ?? 'Set A'
  const rightLabel = (props.rightLabel as string) ?? 'Set B'
  const leftItems = (props.leftItems as string[]) ?? []
  const rightItems = (props.rightItems as string[]) ?? []
  const bothItems = (props.bothItems as string[]) ?? []
  return (
    <div className="space-y-4">
      <StringField label="Title" value={title} onChange={v => onChange({ ...props, title: v })} />
      <div className="flex gap-3">
        <StringField label="Left circle label" value={leftLabel} onChange={v => onChange({ ...props, leftLabel: v })} />
        <StringField label="Right circle label" value={rightLabel} onChange={v => onChange({ ...props, rightLabel: v })} />
      </div>
      <StringListField label="Left only items" items={leftItems} onChange={v => onChange({ ...props, leftItems: v })} />
      <StringListField label="Both (intersection) items" items={bothItems} onChange={v => onChange({ ...props, bothItems: v })} />
      <StringListField label="Right only items" items={rightItems} onChange={v => onChange({ ...props, rightItems: v })} />
    </div>
  )
}

// ── Component Registry ─────────────────────────────────────────────────────

const COMPONENT_CONFIGS: ComponentConfig[] = [
  {
    id: 'flashcard-deck', label: 'Flashcard Deck', emoji: '🃏',
    description: 'Flip cards to reveal definitions. Great for vocabulary review.',
    category: 'Memory',
    defaultProps: { title: 'Flashcards', cards: [{ front: 'Term', back: 'Definition' }] },
    PropsEditor: FlashcardDeckEditor,
  },
  {
    id: 'word-match', label: 'Word Match', emoji: '🔗',
    description: 'Tap a term then its matching definition in two columns.',
    category: 'Memory',
    defaultProps: { title: 'Match the Terms', pairs: [{ term: 'Term', definition: 'Definition' }] },
    PropsEditor: WordMatchEditor,
  },
  {
    id: 'memory-match', label: 'Memory Match', emoji: '🧠',
    description: 'Card-flip memory game matching terms to their definitions.',
    category: 'Memory',
    defaultProps: { title: 'Memory Match', pairs: [{ term: 'A', definition: 'Alpha' }, { term: 'B', definition: 'Beta' }] },
    PropsEditor: MemoryMatchEditor,
  },
  {
    id: 'sortable-categories', label: 'Sortable Categories', emoji: '📂',
    description: 'Drag items into the correct category buckets.',
    category: 'Sorting',
    defaultProps: { title: 'Sort into Categories', instruction: 'Tap an item, then a category.', categories: [{ label: 'Category A', items: ['Item 1', 'Item 2'] }, { label: 'Category B', items: ['Item 3', 'Item 4'] }] },
    PropsEditor: SortableCategoriesEditor,
  },
  {
    id: 'sequence-sorter', label: 'Sequence Sorter', emoji: '🔢',
    description: 'Reorder shuffled steps into the correct sequence.',
    category: 'Sorting',
    defaultProps: { title: 'Put in Order', instruction: 'Arrange from first to last.', items: ['Step 1', 'Step 2', 'Step 3'] },
    PropsEditor: SequenceSorterEditor,
  },
  {
    id: 'fill-in-the-blank', label: 'Fill in the Blank', emoji: '✏️',
    description: 'Complete sentences by picking words from a word bank.',
    category: 'Comprehension',
    defaultProps: { title: 'Fill in the Blanks', sentence: 'The answer is __BLANK__.', blanks: ['correct'], wordBank: ['wrong', 'incorrect'] },
    PropsEditor: FillInTheBlankEditor,
  },
  {
    id: 'poll', label: 'Poll', emoji: '📊',
    description: 'Vote on options and see animated bar chart results.',
    category: 'Engagement',
    defaultProps: { question: 'Which topic interests you most?', options: ['Option A', 'Option B', 'Option C'] },
    PropsEditor: PollEditor,
  },
  {
    id: 'bar-chart-builder', label: 'Bar Chart Builder', emoji: '📈',
    description: 'Adjust slider bars to explore comparative data.',
    category: 'Data',
    defaultProps: { title: 'Chart Title', description: 'Explore the data.', bars: [{ label: 'Category A', value: 65, maxValue: 100 }, { label: 'Category B', value: 40, maxValue: 100 }], showValues: true },
    PropsEditor: BarChartBuilderEditor,
  },
  {
    id: 'timeline', label: 'Timeline', emoji: '📅',
    description: 'Clickable vertical timeline with expandable events.',
    category: 'Narrative',
    defaultProps: { title: 'Timeline', events: [{ year: '2000', title: 'Event One', description: 'What happened.', emoji: '📌' }] },
    PropsEditor: TimelineEditor,
  },
  {
    id: 'number-line', label: 'Number Line', emoji: '📏',
    description: 'Draggable point on a labelled number line. Can have a correct answer.',
    category: 'Math',
    defaultProps: { title: 'Number Line', question: 'Where would you place this value?', min: 0, max: 10, step: 1, unit: '' },
    PropsEditor: NumberLineEditor,
  },
  {
    id: 'hotspot-diagram', label: 'Hotspot Diagram', emoji: '🎯',
    description: 'Clickable pins on a diagram background. Great for anatomy / circuits.',
    category: 'Visual',
    defaultProps: { title: 'Diagram', diagramEmoji: '🖥️', diagramLabel: 'Diagram', hotspots: [{ x: 30, y: 40, label: 'Part A', description: 'Explanation of Part A.', emoji: '📍' }] },
    PropsEditor: HotspotDiagramEditor,
  },
  {
    id: 'concept-web', label: 'Concept Web', emoji: '🕸️',
    description: 'Central node with satellite concept nodes in a web layout.',
    category: 'Visual',
    defaultProps: { title: 'Concept Web', center: 'Main Idea', centerEmoji: '🧠', nodes: [{ label: 'Branch 1', description: 'Description.', emoji: '💡' }] },
    PropsEditor: ConceptWebEditor,
  },
  {
    id: 'sine-wave-explorer', label: 'Sine Wave Explorer', emoji: '〰️',
    description: 'Interactive sine wave with amplitude/frequency/phase sliders.',
    category: 'Math',
    defaultProps: { title: 'Sine Wave Explorer', showAmplitude: true, showFrequency: true, showPhase: true },
    PropsEditor: SineWaveExplorerEditor,
  },
  {
    id: 'truth-table-builder', label: 'Truth Table Builder', emoji: '📋',
    description: 'Build truth tables for logical operators interactively.',
    category: 'Logic',
    defaultProps: { title: 'Truth Table', operator: 'AND' },
    PropsEditor: TruthTableEditor,
  },
  {
    id: 'venn-diagram', label: 'Venn Diagram', emoji: '⭕',
    description: 'Two-circle Venn diagram — click regions to see items.',
    category: 'Visual',
    defaultProps: { title: 'Venn Diagram', leftLabel: 'Set A', rightLabel: 'Set B', leftItems: [], bothItems: [], rightItems: [] },
    PropsEditor: VennDiagramEditor,
  },
]

const CATEGORIES = ['All', ...Array.from(new Set(COMPONENT_CONFIGS.map(c => c.category)))]

// ── Category badge colours ─────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  Memory: 'bg-indigo-100 text-indigo-700',
  Sorting: 'bg-amber-100 text-amber-700',
  Comprehension: 'bg-violet-100 text-violet-700',
  Engagement: 'bg-sky-100 text-sky-700',
  Data: 'bg-emerald-100 text-emerald-700',
  Narrative: 'bg-orange-100 text-orange-700',
  Math: 'bg-cyan-100 text-cyan-700',
  Visual: 'bg-rose-100 text-rose-700',
  Logic: 'bg-slate-100 text-slate-700',
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function InteractiveBlockEditor({
  componentId,
  props,
  onUpdate,
}: {
  componentId: string
  props?: Record<string, unknown>
  onUpdate: (componentId: string, props: Record<string, unknown> | undefined) => void
}) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [showPreview, setShowPreview] = useState(true)

  const config = COMPONENT_CONFIGS.find(c => c.id === componentId)
  const PreviewComponent = componentId ? interactiveComponents[componentId] : null
  const currentProps = props ?? config?.defaultProps ?? {}

  const filtered = useMemo(() => {
    return COMPONENT_CONFIGS.filter(c => {
      const matchesSearch = !search.trim() || c.label.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = activeCategory === 'All' || c.category === activeCategory
      return matchesSearch && matchesCategory
    })
  }, [search, activeCategory])

  // No component selected — show picker
  if (!componentId) {
    return (
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search components..."
            className="w-full pl-8 pr-3 py-2 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-violet-400/40"
          />
        </div>

        {/* Category filter */}
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                activeCategory === cat
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No components match your search.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {filtered.map(c => (
              <button
                key={c.id}
                onClick={() => onUpdate(c.id, c.defaultProps)}
                className="flex flex-col gap-1.5 p-3 rounded-xl border-2 border-slate-200 hover:border-violet-400 hover:bg-violet-50/30 transition-all text-left group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{c.emoji}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${CATEGORY_COLORS[c.category] ?? 'bg-slate-100 text-slate-600'}`}>
                    {c.category}
                  </span>
                </div>
                <span className="text-sm font-semibold text-bloom-text group-hover:text-violet-700 leading-tight">{c.label}</span>
                <span className="text-xs text-slate-400 leading-snug line-clamp-2">{c.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Component selected — show prop editor + preview
  return (
    <div className="space-y-4">
      {/* Selected component header */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-violet-50 border border-violet-200">
        <span className="text-2xl">{config?.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-violet-900 text-sm">{config?.label ?? componentId}</p>
          <p className="text-xs text-violet-600 truncate">{config?.description}</p>
        </div>
        <button
          onClick={() => onUpdate('', undefined)}
          className="p-1.5 rounded-lg hover:bg-violet-200 text-violet-500 transition-colors flex-shrink-0"
          title="Change component"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Props editor */}
      {config ? (
        <config.PropsEditor
          props={currentProps}
          onChange={p => onUpdate(componentId, p)}
        />
      ) : (
        <p className="text-xs text-slate-400 italic">No editor available for this component.</p>
      )}

      {/* Live preview toggle */}
      {PreviewComponent && (
        <div>
          <button
            onClick={() => setShowPreview(v => !v)}
            className="text-xs text-violet-600 font-semibold hover:underline flex items-center gap-1"
          >
            {showPreview ? '▲ Hide preview' : '▼ Show preview'}
          </button>
          {showPreview && (
            <div className="mt-2 rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/20 p-2">
              <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wide mb-2 px-1">Live Preview</p>
              <div className="bg-white rounded-lg overflow-hidden">
                <PreviewComponent {...currentProps} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
