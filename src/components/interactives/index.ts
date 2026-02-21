import type { ComponentType } from 'react'
import SineWaveExplorer from './SineWaveExplorer'
import TruthTableBuilder from './TruthTableBuilder'
import VennDiagram from './VennDiagram'

// Registry: maps componentId strings → React components
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const interactiveComponents: Record<string, ComponentType<any>> = {
  'sine-wave-explorer': SineWaveExplorer,
  'truth-table-builder': TruthTableBuilder,
  'venn-diagram': VennDiagram,
}
