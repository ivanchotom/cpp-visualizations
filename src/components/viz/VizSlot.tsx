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
}

export function VizSlot({ kind }: { kind: VizKind }) {
  const View = registry[kind]
  return <View />
}
