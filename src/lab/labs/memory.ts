import { lab } from '../make.ts'
import type { Lab } from '../schema.ts'

export const memoryLabs: Lab[] = [
  lab(
    'stack-heap',
    'Automatic objects vanish when the function returns. Heap objects live until an owner releases them.',
    [
      {
        id: 'where',
        title: 'Where it lives',
        voice:
          'The stack is a per-thread bump allocator for locals. The free store is for lifetime that outlasts the function. Default to the stack. Put heap ownership inside a stack object so RAII can clean up.',
        stage: {
          type: 'cells',
          rows: [
            { label: 'stack', items: [{ label: 'p', value: 'unique_ptr', kind: 'stack' }] },
            { label: 'heap', items: [{ label: '*p', value: '42', kind: 'heap' }] },
          ],
        },
        try: {
          type: 'code',
          prompt: 'Write a local, a bare new, or make_unique — then visualize storage.',
          starter: `void f() {\n  auto p = std::make_unique<int>(42);\n}`,
          runs: [
            {
              when: ['make_unique'],
              voice: 'The unique pointer is automatic. Its destructor deletes the heap int even if f throws.',
              verdict: 'Heap behind RAII. This is the default.',
              stage: {
                type: 'cells',
                rows: [
                  { label: 'stack f()', items: [{ label: 'p', value: 'unique_ptr', kind: 'stack' }] },
                  { label: 'heap', items: [{ label: 'int', value: '42 owned', kind: 'heap' }] },
                ],
              },
            },
            {
              when: ['new int'],
              unless: ['unique', 'shared'],
              voice: 'You allocated without an owner. If you forget delete, or an exception fires first, it leaks.',
              verdict: 'Bare new. Hide it.',
              stage: {
                type: 'cells',
                rows: [
                  { label: 'stack', items: [{ label: 'raw*', value: 'address', kind: 'stack' }] },
                  { label: 'heap', items: [{ label: 'int', value: 'orphan risk', kind: 'heap' }] },
                ],
              },
            },
            {
              when: ['int x'],
              unless: ['new', 'unique'],
              voice: 'X is automatic. Returning from f destroys it. No delete. Do not return its address.',
              verdict: 'Stack local. Fast and exception-safe.',
              stage: {
                type: 'cells',
                rows: [{ label: 'stack f()', items: [{ label: 'x', value: '7', kind: 'stack' }] }],
              },
            },
          ],
          fallback: {
            voice: 'Add a local int, a bare new, or make_unique.',
            verdict: 'Need a storage choice to draw.',
            stage: { type: 'cells', rows: [{ label: 'memory', items: [] }] },
          },
        },
      },
    ],
    'stack-heap',
  ),
  lab(
    'pointers-refs',
    'A pointer is an object that holds an address. A reference is another name — it cannot be null or reseated.',
    [
      {
        id: 'alias',
        title: 'Address versus name',
        voice:
          'Pointers can be reseated and can be null. References bind once. Assigning through a reference assigns to the object, it does not reseat the name.',
        stage: {
          type: 'graph',
          nodes: [
            { id: 'a', title: 'a=1', kind: 'stack' },
            { id: 'p', title: 'p', sub: 'int*', kind: 'stack' },
          ],
          edges: [{ from: 'p', to: 'a' }],
        },
        try: {
          type: 'pick',
          prompt: 'Reseat the pointer, or assign through the reference.',
          options: [
            {
              label: 'p = &b',
              code: `int a=1,b=2; int* p=&a; p=&b;`,
              voice: 'The pointer now holds the address of b. A is unchanged. Pointers reseat.',
              verdict: 'p points at b.',
              stage: {
                type: 'graph',
                nodes: [
                  { id: 'a', title: 'a=1', kind: 'stack' },
                  { id: 'b', title: 'b=2', kind: 'stack' },
                  { id: 'p', title: 'p', kind: 'stack' },
                ],
                edges: [{ from: 'p', to: 'b' }],
              },
            },
            {
              label: 'r = b',
              code: `int a=1,b=2; int& r=a; r=b;`,
              voice: 'R is another name for a. R equals b writes two into a. The reference still names a.',
              verdict: 'a is now 2. r did not reseat.',
              stage: {
                type: 'graph',
                nodes: [
                  { id: 'a', title: 'a=2', kind: 'stack' },
                  { id: 'b', title: 'b=2', kind: 'stack' },
                  { id: 'r', title: 'r', sub: 'alias of a', kind: 'stack' },
                ],
                edges: [{ from: 'r', to: 'a', label: 'is' }],
              },
            },
          ],
        },
      },
    ],
    'pointers',
  ),
  lab(
    'arrays',
    'A built-in array decays to a pointer and loses its length. Prefer std::array or vector.',
    [
      {
        id: 'decay',
        title: 'The decay trap',
        voice:
          'Pass T bracket N to a function and it becomes T star. Sizeof no longer yields the count. That is why we keep length in the type — std array — or in the object — vector.',
        stage: {
          type: 'compare',
          left: { title: 'T[4] at the call site', lines: ['4 ints', 'sizeof == 16'] },
          right: { title: 'T* in the callee', lines: ['pointer', 'sizeof == 8', 'length gone'] },
        },
        try: {
          type: 'pick',
          prompt: 'How do you pass a buffer and keep the count?',
          options: [
            {
              label: 'Decay to pointer',
              code: 'void f(int a[4]);  // really int*',
              voice: 'The 4 is a lie. The callee sees a pointer. sizeof a is sizeof pointer.',
              verdict: 'Length lost.',
              stage: {
                type: 'cells',
                rows: [{ label: 'parameter', items: [{ label: 'a', value: 'int*', kind: 'stack' }] }],
              },
            },
            {
              label: 'std::array + size',
              code: 'void f(const std::array<int,4>& a);',
              voice: 'The type still knows 4. You can also pass a.data and a.size to C APIs.',
              verdict: 'Length kept.',
              stage: {
                type: 'cells',
                rows: [
                  {
                    label: 'array',
                    items: [
                      { label: '[0]', value: '1' },
                      { label: '[1]', value: '2' },
                      { label: '[2]', value: '3' },
                      { label: '[3]', value: '4' },
                    ],
                  },
                ],
              },
            },
          ],
        },
      },
    ],
  ),
  lab(
    'layout',
    'Typical LP64 padding — not Clang. Reorder fields and watch wasted bytes.',
    [
      {
        id: 'pad',
        title: 'Alignment gaps',
        voice:
          'Each member starts at a multiple of its alignment. The compiler inserts padding, then rounds the struct so arrays stay aligned. This sandbox is a typical LP64 model, not a substitute for cxxfilt.',
        stage: {
          type: 'bytes',
          total: '24 typical',
          slots: [
            { label: 'char', size: 1, kind: 'data' },
            { label: 'pad', size: 3, kind: 'pad' },
            { label: 'int', size: 4, kind: 'data' },
            { label: 'double', size: 8, kind: 'data' },
          ],
        },
        try: {
          type: 'pick',
          prompt: 'Order the members. Largest-first usually packs tighter.',
          options: [
            {
              label: 'char, int, double',
              voice: 'Char then pad then int, then double. You pay for the small fields first.',
              verdict: 'Often 16 or 24 depending on the last field. Check the ruler above.',
              stage: {
                type: 'bytes',
                slots: [
                  { label: 'c', size: 1, kind: 'data' },
                  { label: 'pad', size: 3, kind: 'pad' },
                  { label: 'i', size: 4, kind: 'data' },
                  { label: 'd', size: 8, kind: 'data' },
                ],
              },
            },
            {
              label: 'double, int, char',
              voice: 'Largest alignment first. The tail padding is just enough to keep the struct aligned for arrays.',
              verdict: 'Usually tighter. Cache lines like this.',
              stage: {
                type: 'bytes',
                slots: [
                  { label: 'd', size: 8, kind: 'data' },
                  { label: 'i', size: 4, kind: 'data' },
                  { label: 'c', size: 1, kind: 'data' },
                  { label: 'pad', size: 3, kind: 'pad' },
                ],
              },
            },
          ],
        },
      },
    ],
    'layout',
  ),
  lab(
    'value-categories',
    'Identity versus steal — the taxonomy interviews actually use.',
    [
      {
        id: 'taxonomy',
        title: 'lvalue, xvalue, prvalue',
        voice:
          'An lvalue has identity; you do not steal from it. A prvalue is a pure incoming value. An xvalue is an expiring object you may steal from — that is what std move marks. A named rvalue reference is still an lvalue.',
        stage: {
          type: 'compare',
          left: { title: 'identity', lines: ['lvalue', 'xvalue'] },
          right: { title: 'may steal', lines: ['xvalue', 'prvalue'] },
        },
        try: {
          type: 'code',
          prompt: 'Type an expression: x, std::move(x), 42, or return std::move(local).',
          starter: `std::string f() {\n  std::string local{"hi"};\n  return local;\n}`,
          runs: [
            {
              when: ['return std::move'],
              voice:
                'Returning std move of a local can block named return value optimization. Just return local. The compiler already knows it is going away.',
              verdict: 'Footgun. Prefer return local;',
              stage: {
                type: 'compare',
                left: { title: 'return local', lines: ['NRVO possible', 'no extra move'] },
                right: { title: 'return std::move(local)', lines: ['xvalue', 'NRVO inhibited'] },
              },
            },
            {
              when: ['std::move'],
              voice: 'Std move does not move. It casts to T amp amp, producing an xvalue. The steal happens in the constructor that binds it.',
              verdict: 'xvalue. Identity remains until a move ctor runs.',
              stage: {
                type: 'cells',
                rows: [
                  { label: 'x', items: [{ label: 'object', value: 'identity', kind: 'stack' }] },
                  { label: 'std::move(x)', items: [{ label: 'xvalue', value: 'you may steal', kind: 'stack' }] },
                ],
              },
            },
            {
              when: ['return local'],
              voice: 'Returning a local by value is the happy path. Let the compiler elide or move.',
              verdict: 'prvalue at the call site in C++14; often elided.',
              stage: {
                type: 'flow',
                steps: [
                  { label: 'local constructed', on: true },
                  { label: 'return local', on: true },
                  { label: 'elide or move', on: true },
                ],
              },
            },
          ],
          fallback: {
            voice: 'Write std move, return local, or a literal.',
            verdict: 'Need an expression to classify.',
            stage: {
              type: 'cells',
              rows: [{ label: 'category', items: [{ label: '?', value: 'unknown' }] }],
            },
          },
        },
      },
    ],
    'value-categories',
  ),
  lab(
    'copy-move',
    'Copy duplicates. Move steals. Vector only moves on reallocation if the move cannot throw.',
    [
      {
        id: 'steal',
        title: 'Duplicate versus steal',
        voice:
          'A move constructor takes the pointer and nulls the source. Mark it noexcept when you can. Std vector uses move if noexcept, otherwise it copies so a throw mid-reallocation can roll back.',
        stage: {
          type: 'compare',
          left: { title: 'copy', lines: ['new buffer', 'duplicate elements', 'source intact'] },
          right: { title: 'move', lines: ['steal pointer', 'source empty', 'should be noexcept'] },
        },
        try: {
          type: 'pick',
          prompt: 'Reallocate a vector. Does T’s move throw?',
          options: [
            {
              label: 'move noexcept',
              code: 'Buf(Buf&&) noexcept;',
              voice: 'Vector relocates each element with move. Cheap. If a later move threw you would be in trouble — that is why noexcept matters.',
              verdict: 'Elements moved into the new buffer.',
              stage: {
                type: 'cells',
                rows: [
                  { label: 'old buffer', items: [{ label: 'ghost', ghost: true, kind: 'ghost' }] },
                  {
                    label: 'new buffer',
                    items: [
                      { label: 'A', kind: 'heap' },
                      { label: 'B', kind: 'heap' },
                      { label: 'C', kind: 'heap' },
                    ],
                  },
                ],
              },
            },
            {
              label: 'move may throw',
              code: 'Buf(Buf&&);  // not noexcept',
              voice: 'Vector falls back to copy so it can keep the old buffer if a constructor throws. Moves that throw make growth expensive.',
              verdict: 'Copies on reallocation. Slower, safer rollback.',
              stage: {
                type: 'cells',
                rows: [
                  {
                    label: 'old (kept until copies finish)',
                    items: [
                      { label: 'A', kind: 'heap' },
                      { label: 'B', kind: 'heap' },
                    ],
                  },
                  {
                    label: 'new (copies)',
                    items: [
                      { label: 'A′', kind: 'heap' },
                      { label: 'B′', kind: 'heap' },
                    ],
                  },
                ],
              },
            },
          ],
        },
      },
    ],
    'copy-move',
  ),
  lab(
    'new-delete',
    'Every new needs one matching delete of the right form. make_unique closes the leak window.',
    [
      {
        id: 'pair',
        title: 'Allocate and own',
        voice:
          'New calls operator new then the constructor. Delete runs the destructor then operator delete. New bracket pairs with delete bracket. Mixing them is undefined. You almost never write these in application code.',
        stage: {
          type: 'flow',
          steps: [
            { label: 'operator new', on: true },
            { label: 'constructor', on: true },
            { label: '… use …', on: false },
            { label: 'destructor', on: false },
            { label: 'operator delete', on: false },
          ],
        },
        try: {
          type: 'pick',
          prompt: 'How do you allocate an array versus one object?',
          options: [
            {
              label: 'new T / delete',
              voice: 'One object. Pair with delete, not delete bracket.',
              verdict: 'Scalar form.',
              stage: {
                type: 'cells',
                rows: [{ label: 'heap', items: [{ label: 'T', kind: 'heap' }] }],
              },
            },
            {
              label: 'new T[n] / delete[]',
              voice: 'Array new stores a cookie so delete bracket can destroy every element. Mixing with scalar delete is undefined.',
              verdict: 'Array form. Do not mix.',
              stage: {
                type: 'cells',
                rows: [
                  {
                    label: 'heap',
                    items: [
                      { label: 'T0', kind: 'heap' },
                      { label: 'T1', kind: 'heap' },
                      { label: 'T2', kind: 'heap' },
                    ],
                  },
                ],
              },
            },
          ],
        },
      },
    ],
  ),
]
