export interface MemberType {
  name: string
  size: number
  align: number
}

/** Palette of member types users can drop into a struct. */
export const memberTypes: MemberType[] = [
  { name: 'char', size: 1, align: 1 },
  { name: 'bool', size: 1, align: 1 },
  { name: 'short', size: 2, align: 2 },
  { name: 'int', size: 4, align: 4 },
  { name: 'float', size: 4, align: 4 },
  { name: 'double', size: 8, align: 8 },
  { name: 'long', size: 8, align: 8 },
  { name: 'void*', size: 8, align: 8 },
]

export interface StructMember {
  id: string
  type: MemberType
  fieldName: string
}

export type SlotKind = 'member' | 'padding'

export interface LayoutSlot {
  kind: SlotKind
  offset: number
  size: number
  /** Present for member slots. */
  label?: string
  typeName?: string
}

export interface StructLayout {
  slots: LayoutSlot[]
  totalSize: number
  alignment: number
  paddingBytes: number
}

/**
 * Compute the in-memory layout of a struct following standard C++ alignment
 * rules: each member starts at an offset that is a multiple of its alignment,
 * the struct's alignment is the largest member alignment, and the total size
 * is rounded up to a multiple of that alignment (trailing padding).
 */
export function computeLayout(members: StructMember[]): StructLayout {
  const slots: LayoutSlot[] = []
  let offset = 0
  let maxAlign = 1
  let paddingBytes = 0

  for (const member of members) {
    const { size, align } = member.type
    maxAlign = Math.max(maxAlign, align)

    const misalignment = offset % align
    if (misalignment !== 0) {
      const pad = align - misalignment
      slots.push({ kind: 'padding', offset, size: pad })
      offset += pad
      paddingBytes += pad
    }

    slots.push({
      kind: 'member',
      offset,
      size,
      label: member.fieldName,
      typeName: member.type.name,
    })
    offset += size
  }

  const tailMisalignment = offset % maxAlign
  if (tailMisalignment !== 0) {
    const pad = maxAlign - tailMisalignment
    slots.push({ kind: 'padding', offset, size: pad })
    offset += pad
    paddingBytes += pad
  }

  return {
    slots,
    totalSize: offset,
    alignment: maxAlign,
    paddingBytes,
  }
}

let nextId = 0
export function makeMember(type: MemberType, fieldName: string): StructMember {
  nextId += 1
  return { id: `m${nextId}`, type, fieldName }
}
