/**
 * DiagramPickerModal
 *
 * Lets workshop authors search Wikimedia Commons for freely-licensed
 * educational diagrams and insert them as image blocks.
 *
 * Uses two sequential Wikimedia API calls (both browser-side, no backend):
 *  1. action=query&list=search  — finds File: pages matching the query
 *  2. action=query&prop=imageinfo — resolves thumbnail + full image URLs
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Loader2, ExternalLink, ImageOff } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────

interface DiagramResult {
  title: string       // e.g. "File:Photosynthesis_en.svg"
  thumbUrl: string    // 300-px-wide thumbnail
  fullUrl: string     // full-resolution image URL
  pageUrl: string     // Wikimedia Commons page (for attribution)
  displayName: string // human-readable label
}

export interface DiagramPickerModalProps {
  /** Pre-populate the search box (e.g. pass the lesson title) */
  initialSearch?: string
  /** Called when the user clicks "Insert Diagram" */
  onSelect: (imageUrl: string, altText: string, attributionUrl: string) => void
  onClose: () => void
}

// ── Wikimedia Commons helpers ──────────────────────────────────────────────

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php'

async function searchCommons(term: string): Promise<DiagramResult[]> {
  // Step 1 — text search in the File: namespace (srnamespace=6)
  const searchParams = new URLSearchParams({
    action: 'query',
    list: 'search',
    srnamespace: '6',
    srsearch: term,
    srlimit: '24',
    format: 'json',
    origin: '*',
  })
  const searchRes = await fetch(`${COMMONS_API}?${searchParams}`)
  if (!searchRes.ok) throw new Error('Search request failed')
  const searchData = await searchRes.json()
  const hits: Array<{ title: string }> = searchData?.query?.search ?? []
  if (hits.length === 0) return []

  // Step 2 — resolve thumbnail + full image URL for each hit
  const titles = hits.map(h => h.title).join('|')
  const infoParams = new URLSearchParams({
    action: 'query',
    titles,
    prop: 'imageinfo',
    iiprop: 'url|thumburl',
    iiurlwidth: '300',
    format: 'json',
    origin: '*',
  })
  const infoRes = await fetch(`${COMMONS_API}?${infoParams}`)
  if (!infoRes.ok) throw new Error('Image info request failed')
  const infoData = await infoRes.json()
  const pages: Record<string, { title: string; imageinfo?: Array<{ url: string; thumburl: string }> }> =
    infoData?.query?.pages ?? {}

  const results: DiagramResult[] = []
  for (const page of Object.values(pages)) {
    const info = page?.imageinfo?.[0]
    if (!info?.thumburl || !info?.url) continue
    const title = page.title
    const displayName = title
      .replace(/^File:/, '')
      .replace(/\.[^.]+$/, '')
      .replace(/_/g, ' ')
    results.push({
      title,
      thumbUrl: info.thumburl,
      fullUrl: info.url,
      pageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(title)}`,
      displayName,
    })
  }
  return results
}

// ── Component ──────────────────────────────────────────────────────────────

export default function DiagramPickerModal({
  initialSearch = '',
  onSelect,
  onClose,
}: DiagramPickerModalProps) {
  const [query, setQuery] = useState(initialSearch)
  const [results, setResults] = useState<DiagramResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<DiagramResult | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const runSearch = useCallback(async (term: string) => {
    const trimmed = term.trim()
    if (!trimmed) {
      setResults([])
      return
    }
    setIsLoading(true)
    setError(null)
    setSelected(null)
    try {
      const res = await searchCommons(trimmed)
      setResults(res)
    } catch {
      setError('Search failed. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Run initial search and focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
    if (initialSearch.trim()) {
      runSearch(initialSearch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleQueryChange(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(value), 600)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      runSearch(query)
    }
    if (e.key === 'Escape') onClose()
  }

  function handleInsert() {
    if (!selected) return
    onSelect(selected.fullUrl, selected.displayName, selected.pageUrl)
  }

  function toggleSelected(result: DiagramResult) {
    setSelected(prev => (prev?.title === result.title ? null : result))
  }

  const isEmpty = !isLoading && !error && results.length === 0
  const hasQuery = query.trim().length > 0

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col overflow-hidden">
      <div className="flex flex-col h-full w-full">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 sm:px-6 pt-5 pb-3 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-bloom-text-primary">Browse Diagrams</h2>
            <p className="text-xs text-bloom-text-secondary mt-0.5">
              Wikimedia Commons — free, open-licensed educational images
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Search bar ── */}
        <div className="px-4 sm:px-6 py-3 flex-shrink-0">
          <div className="relative max-w-2xl">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='Search, e.g. "photosynthesis", "circuit diagram", "cell division"…'
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-bloom-orange/30 focus:border-bloom-orange/50"
            />
          </div>
        </div>

        {/* ── Results area ── */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-3 min-h-0">

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 size={22} className="animate-spin mr-2" />
              <span className="text-sm">Searching Wikimedia Commons…</span>
            </div>
          )}

          {/* Error */}
          {!isLoading && error && (
            <div className="flex items-center justify-center py-16 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* No results */}
          {!isLoading && !error && isEmpty && hasQuery && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <ImageOff size={34} className="mb-2 opacity-40" />
              <span className="text-sm">No results found. Try a different search term.</span>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && isEmpty && !hasQuery && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-300 select-none">
              <Search size={38} className="mb-3 opacity-40" />
              <span className="text-sm text-slate-400">Search for diagrams above</span>
              <p className="text-xs text-slate-300 mt-1.5 text-center max-w-xs leading-relaxed">
                Try "photosynthesis", "water cycle", "DNA replication",<br />
                "circuit diagram", "human anatomy"…
              </p>
            </div>
          )}

          {/* Results grid */}
          {!isLoading && results.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {results.map(result => {
                const isSelected = selected?.title === result.title
                return (
                  <button
                    key={result.title}
                    onClick={() => toggleSelected(result)}
                    className={`group relative rounded-xl border-2 overflow-hidden transition-all text-left focus:outline-none ${
                      isSelected
                        ? 'border-bloom-orange shadow-md shadow-bloom-orange/20'
                        : 'border-transparent hover:border-slate-200 hover:shadow-sm'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="aspect-square bg-slate-50 flex items-center justify-center overflow-hidden">
                      <img
                        src={result.thumbUrl}
                        alt={result.displayName}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    </div>

                    {/* Label */}
                    <div className="p-1.5 bg-white">
                      <p className="text-[10px] text-slate-500 leading-tight line-clamp-2">
                        {result.displayName}
                      </p>
                    </div>

                    {/* Selection checkmark */}
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-bloom-orange rounded-full flex items-center justify-center shadow-sm">
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path
                            d="M1 4L3.5 6.5L9 1"
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-100 flex items-center justify-between flex-shrink-0 bg-slate-50/50">
          <div className="min-w-0 flex-1">
            {selected ? (
              <a
                href={selected.pageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline truncate max-w-full"
              >
                <ExternalLink size={11} className="flex-shrink-0" />
                <span className="truncate">{selected.displayName}</span>
                <span className="flex-shrink-0 text-blue-400">— Wikimedia Commons</span>
              </a>
            ) : (
              <span className="text-xs text-slate-400">Select an image to insert</span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleInsert}
              disabled={!selected}
              className="px-4 py-1.5 text-sm font-medium bg-bloom-orange text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-bloom-orange/90 transition-colors"
            >
              Insert Diagram
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
