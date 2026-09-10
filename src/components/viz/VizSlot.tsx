import type { ReactElement } from 'react'
import type { VizKind } from '../../curriculum/schema.ts'
import { DataTypesView } from '../DataTypesView.tsx'
import { MemoryLayoutView } from '../MemoryLayoutView.tsx'
import { PatternsView } from '../PatternsView.tsx'
import { CompilationViz } from './CompilationViz.tsx'
import { OperatorsViz } from './OperatorsViz.tsx'
import { StackHeapViz } from './StackHeapViz.tsx'
import { PointersViz } from './PointersViz.tsx'
import { ValueCategoriesViz } from './ValueCategoriesViz.tsx'
import { CopyMoveViz } from './CopyMoveViz.tsx'
import { PassByViz } from './PassByViz.tsx'
import { LifetimeViz } from './LifetimeViz.tsx'
import { InheritanceViz } from './InheritanceViz.tsx'
import { ExceptionsViz } from './ExceptionsViz.tsx'
import { ContainersViz } from './ContainersViz.tsx'
import { OwnershipViz } from './OwnershipViz.tsx'
import { TemplatesViz } from './TemplatesViz.tsx'
import { SfinaeViz } from './SfinaeViz.tsx'
import { ForwardingViz } from './ForwardingViz.tsx'
import { VtableViz } from './VtableViz.tsx'
import { AlgorithmsViz } from './AlgorithmsViz.tsx'
import { InvalidationViz } from './InvalidationViz.tsx'
import { LambdasViz } from './LambdasViz.tsx'
import { ArraysViz } from './ArraysViz.tsx'
import { NewDeleteViz } from './NewDeleteViz.tsx'
import { ConstexprViz } from './ConstexprViz.tsx'
import { PreprocessorViz } from './PreprocessorViz.tsx'
import { CvQualViz } from './CvQualViz.tsx'
import { ConversionsViz } from './ConversionsViz.tsx'
import { SpecialMembersViz } from './SpecialMembersViz.tsx'
import { LiteralsViz } from './LiteralsViz.tsx'
import { ControlFlowViz } from './ControlFlowViz.tsx'
import { ScopeViz } from './ScopeViz.tsx'
import { FunctionsViz } from './FunctionsViz.tsx'
import { OverloadViz } from './OverloadViz.tsx'
import { ClassesViz } from './ClassesViz.tsx'
import { OpOverloadViz } from './OpOverloadViz.tsx'
import { TypeTraitsViz } from './TypeTraitsViz.tsx'
import { NoexceptViz } from './NoexceptViz.tsx'
import { StringViz } from './StringViz.tsx'
import { IostreamsViz } from './IostreamsViz.tsx'
import { ChronoViz } from './ChronoViz.tsx'
import { ConcurrencyViz } from './ConcurrencyViz.tsx'
import { RuleOfZeroViz } from './RuleOfZeroViz.tsx'

const registry: Record<VizKind, () => ReactElement> = {
  types: () => <DataTypesView />,
  layout: () => <MemoryLayoutView />,
  patterns: () => <PatternsView />,
  compilation: () => <CompilationViz />,
  operators: () => <OperatorsViz />,
  'stack-heap': () => <StackHeapViz />,
  pointers: () => <PointersViz />,
  'value-categories': () => <ValueCategoriesViz />,
  'copy-move': () => <CopyMoveViz />,
  'pass-by': () => <PassByViz />,
  lifetime: () => <LifetimeViz />,
  inheritance: () => <InheritanceViz />,
  exceptions: () => <ExceptionsViz />,
  containers: () => <ContainersViz />,
  ownership: () => <OwnershipViz />,
  templates: () => <TemplatesViz />,
  sfinae: () => <SfinaeViz />,
  forwarding: () => <ForwardingViz />,
  vtable: () => <VtableViz />,
  algorithms: () => <AlgorithmsViz />,
  invalidation: () => <InvalidationViz />,
  lambdas: () => <LambdasViz />,
  arrays: () => <ArraysViz />,
  'new-delete': () => <NewDeleteViz />,
  constexpr: () => <ConstexprViz />,
  preprocessor: () => <PreprocessorViz />,
  'cv-qualifiers': () => <CvQualViz />,
  conversions: () => <ConversionsViz />,
  'special-members': () => <SpecialMembersViz />,
  literals: () => <LiteralsViz />,
  'control-flow': () => <ControlFlowViz />,
  scope: () => <ScopeViz />,
  functions: () => <FunctionsViz />,
  overloading: () => <OverloadViz />,
  classes: () => <ClassesViz />,
  'op-overload': () => <OpOverloadViz />,
  'type-traits': () => <TypeTraitsViz />,
  noexcept: () => <NoexceptViz />,
  string: () => <StringViz />,
  iostreams: () => <IostreamsViz />,
  chrono: () => <ChronoViz />,
  concurrency: () => <ConcurrencyViz />,
  'rule-of-zero': () => <RuleOfZeroViz />,
}

export function VizSlot({ kind }: { kind: VizKind }) {
  const View = registry[kind]
  return <View />
}
