import type { VizKind } from '../curriculum/schema.ts'

export type CellKind = 'stack' | 'heap' | 'static' | 'ghost' | 'pad' | 'vptr' | 'code'

export interface Cell {
  label: string
  value?: string
  kind?: CellKind
  ghost?: boolean
}

export interface GraphNode {
  id: string
  title: string
  sub?: string
  kind?: 'stack' | 'heap' | 'ctrl' | 'ghost' | 'static'
  ghost?: boolean
}

export interface GraphEdge {
  from: string
  to: string
  label?: string
  dashed?: boolean
}

export interface ByteSlot {
  label: string
  size: number
  kind: 'data' | 'pad' | 'vptr' | 'vbptr'
}

export interface StageCells {
  type: 'cells'
  rows: { label: string; items: Cell[] }[]
}

export interface StageGraph {
  type: 'graph'
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface StageStack {
  type: 'stack'
  frames: { name: string; dead?: boolean; tag?: string; locals?: string[] }[]
}

export interface StageBytes {
  type: 'bytes'
  total?: string
  slots: ByteSlot[]
  note?: string
}

export interface StageCompare {
  type: 'compare'
  left: { title: string; lines: string[] }
  right: { title: string; lines: string[] }
}

export interface StageFlow {
  type: 'flow'
  steps: { label: string; on?: boolean; warn?: boolean }[]
}

export interface StageRuler {
  type: 'ruler'
  base: number
  blocks: { label: string; offset: number; size: number; accent?: boolean }[]
  pointers: { name: string; at: number; color?: string }[]
}

export type Stage =
  | StageCells
  | StageGraph
  | StageStack
  | StageBytes
  | StageCompare
  | StageFlow
  | StageRuler

export interface PickOption {
  label: string
  code?: string
  voice: string
  verdict: string
  stage: Stage
}

export interface CodeRun {
  /** Lowercase snippets that must all appear. */
  when: string[]
  unless?: string[]
  voice: string
  verdict: string
  stage: Stage
}

export interface TryPick {
  type: 'pick'
  prompt: string
  options: PickOption[]
}

export interface TryCode {
  type: 'code'
  prompt: string
  starter: string
  runs: CodeRun[]
  fallback: { voice: string; verdict: string; stage: Stage }
}

export interface TryStep {
  type: 'none'
}

export type TryIt = TryPick | TryCode | TryStep

export interface Scene {
  id: string
  title: string
  voice: string
  code?: string
  stage: Stage
  try: TryIt
}

export interface Lab {
  topicId: string
  hook: string
  /** Existing custom visualization shown above the scene stage. */
  customViz?: VizKind
  scenes: Scene[]
}
