import type { ComponentType } from 'react'
import SineWaveExplorer from './SineWaveExplorer'
import TruthTableBuilder from './TruthTableBuilder'
import VennDiagram from './VennDiagram'
import FlashcardDeck from './FlashcardDeck'
import WordMatch from './WordMatch'
import SortableCategories from './SortableCategories'
import SequenceSorter from './SequenceSorter'
import FillInTheBlank from './FillInTheBlank'
import Poll from './Poll'
import BarChartBuilder from './BarChartBuilder'
import MemoryMatch from './MemoryMatch'
import Timeline from './Timeline'
import NumberLine from './NumberLine'
import ConceptWeb from './ConceptWeb'

// Registry: maps componentId strings → React components
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const interactiveComponents: Record<string, ComponentType<any>> = {
  // ── Original components ──
  'sine-wave-explorer': SineWaveExplorer,
  'truth-table-builder': TruthTableBuilder,
  'venn-diagram': VennDiagram,

  // ── Flashcard & Matching ──
  'flashcard-deck': FlashcardDeck,
  'word-match': WordMatch,
  'memory-match': MemoryMatch,

  // ── Sorting & Ordering ──
  'sortable-categories': SortableCategories,
  'sequence-sorter': SequenceSorter,

  // ── Writing & Completion ──
  'fill-in-the-blank': FillInTheBlank,

  // ── Data & Polling ──
  'poll': Poll,
  'bar-chart-builder': BarChartBuilder,

  // ── Visual & Spatial ──
  'timeline': Timeline,
  'number-line': NumberLine,
  'concept-web': ConceptWeb,
}
