export type TypeCategory =
  | 'boolean'
  | 'character'
  | 'integer'
  | 'floating'
  | 'pointer'

export interface CppType {
  name: string
  category: TypeCategory
  /** Typical size in bytes on a 64-bit LP64 platform (Linux x86-64). */
  bytes: number
  /** Human-readable value range or description of the representable values. */
  range: string
  /** Short note about typical usage or gotchas. */
  note: string
  signed?: boolean
}

/**
 * Fundamental C++ types with sizes taken from the common 64-bit LP64 data
 * model (Linux / macOS on x86-64 and ARM64). The C++ standard only guarantees
 * minimum sizes and relative ordering, so these are "typical" values.
 */
export const cppTypes: CppType[] = [
  {
    name: 'bool',
    category: 'boolean',
    bytes: 1,
    range: 'true / false',
    note: 'Holds a truth value. Occupies at least 1 byte so it is addressable.',
  },
  {
    name: 'char',
    category: 'character',
    bytes: 1,
    range: '-128 to 127 (usually)',
    note: 'Signedness is implementation-defined. Use for raw bytes / text.',
    signed: true,
  },
  {
    name: 'unsigned char',
    category: 'character',
    bytes: 1,
    range: '0 to 255',
    note: 'The go-to type for a single raw byte of memory.',
    signed: false,
  },
  {
    name: 'char16_t',
    category: 'character',
    bytes: 2,
    range: '0 to 65,535',
    note: 'Holds a UTF-16 code unit (C++11 and later).',
    signed: false,
  },
  {
    name: 'char32_t',
    category: 'character',
    bytes: 4,
    range: '0 to 4,294,967,295',
    note: 'Holds a UTF-32 code unit (C++11 and later).',
    signed: false,
  },
  {
    name: 'short',
    category: 'integer',
    bytes: 2,
    range: '-32,768 to 32,767',
    note: 'At least 16 bits. Short for "short int".',
    signed: true,
  },
  {
    name: 'unsigned short',
    category: 'integer',
    bytes: 2,
    range: '0 to 65,535',
    note: 'Unsigned 16-bit integer.',
    signed: false,
  },
  {
    name: 'int',
    category: 'integer',
    bytes: 4,
    range: '-2,147,483,648 to 2,147,483,647',
    note: 'The default integer type. At least 16 bits, typically 32.',
    signed: true,
  },
  {
    name: 'unsigned int',
    category: 'integer',
    bytes: 4,
    range: '0 to 4,294,967,295',
    note: 'Wraps around on overflow (well-defined modulo 2^N).',
    signed: false,
  },
  {
    name: 'long',
    category: 'integer',
    bytes: 8,
    range: '-9.22e18 to 9.22e18',
    note: 'At least 32 bits. 64 bits on LP64, 32 bits on Windows LLP64.',
    signed: true,
  },
  {
    name: 'long long',
    category: 'integer',
    bytes: 8,
    range: '-9.22e18 to 9.22e18',
    note: 'At least 64 bits (C++11 and later).',
    signed: true,
  },
  {
    name: 'unsigned long long',
    category: 'integer',
    bytes: 8,
    range: '0 to 1.84e19',
    note: 'The widest standard unsigned integer on most platforms.',
    signed: false,
  },
  {
    name: 'float',
    category: 'floating',
    bytes: 4,
    range: '~1.2e-38 to ~3.4e38',
    note: 'IEEE-754 single precision. ~7 significant decimal digits.',
  },
  {
    name: 'double',
    category: 'floating',
    bytes: 8,
    range: '~2.3e-308 to ~1.7e308',
    note: 'IEEE-754 double precision. ~15-16 significant decimal digits.',
  },
  {
    name: 'long double',
    category: 'floating',
    bytes: 16,
    range: 'platform dependent',
    note: '80-bit extended precision on x86 (padded to 16 bytes).',
  },
  {
    name: 'void*',
    category: 'pointer',
    bytes: 8,
    range: 'one memory address',
    note: 'Pointer size matches the address width: 8 bytes on 64-bit systems.',
  },
  {
    name: 'wchar_t',
    category: 'character',
    bytes: 4,
    range: 'UTF-32 code unit (Linux)',
    note: 'Wide character. 4 bytes on LP64, 2 bytes on Windows. Prefer char16_t/char32_t.',
    signed: false,
  },
  {
    name: 'std::size_t',
    category: 'integer',
    bytes: 8,
    range: '0 to 1.84e19',
    note: 'Unsigned size of objects / array index. Returned by sizeof.',
    signed: false,
  },
  {
    name: 'std::nullptr_t',
    category: 'pointer',
    bytes: 8,
    range: 'nullptr only',
    note: 'Type of nullptr. Converts to any pointer; not an integer.',
  },
]

export const categoryLabels: Record<TypeCategory, string> = {
  boolean: 'Boolean',
  character: 'Character',
  integer: 'Integer',
  floating: 'Floating point',
  pointer: 'Pointer',
}

export const categoryColors: Record<TypeCategory, string> = {
  boolean: '#e06c75',
  character: '#e5c07b',
  integer: '#61afef',
  floating: '#98c379',
  pointer: '#c678dd',
}
