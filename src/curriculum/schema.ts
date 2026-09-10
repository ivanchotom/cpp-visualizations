export type TrackId =
  | 'foundations'
  | 'memory'
  | 'functions'
  | 'classes'
  | 'templates'
  | 'errors'
  | 'stdlib'
  | 'idioms'

export type VizKind =
  | 'types'
  | 'layout'
  | 'patterns'
  | 'compilation'
  | 'operators'
  | 'stack-heap'
  | 'pointers'
  | 'value-categories'
  | 'copy-move'
  | 'pass-by'
  | 'lifetime'
  | 'inheritance'
  | 'exceptions'
  | 'containers'
  | 'ownership'
  | 'templates'
  | 'sfinae'
  | 'forwarding'
  | 'vtable'
  | 'algorithms'
  | 'invalidation'
  | 'lambdas'
  | 'arrays'
  | 'new-delete'
  | 'constexpr'
  | 'preprocessor'
  | 'cv-qualifiers'
  | 'conversions'
  | 'special-members'
  | 'literals'
  | 'control-flow'
  | 'scope'
  | 'functions'
  | 'overloading'
  | 'classes'
  | 'op-overload'
  | 'type-traits'
  | 'noexcept'
  | 'string'
  | 'iostreams'
  | 'chrono'
  | 'concurrency'
  | 'rule-of-zero'
  | 'undefined-behavior'
  | 'const-correctness'
  | 'pitfalls'
  | 'enums'
  | 'unions'
  | 'function-pointers'
  | 'adl'
  | 'access-control'
  | 'template-deduction'
  | 'variadic-templates'
  | 'pair-tuple'
  | 'atomics'

export interface Fact {
  label: string
  body: string
}

export interface CodeSample {
  title: string
  snippet: string
  notes?: string
}

export interface LaterNote {
  standard: 'C++17' | 'C++20' | 'C++23'
  note: string
}

export interface Topic {
  id: string
  title: string
  blurb: string
  track: TrackId
  keywords: string[]
  viz?: VizKind
  summary: string
  facts: Fact[]
  code: CodeSample[]
  pitfalls: string[]
  related: string[]
  later?: LaterNote[]
}

export interface Track {
  id: TrackId
  title: string
  blurb: string
  icon: string
  topicIds: string[]
}
