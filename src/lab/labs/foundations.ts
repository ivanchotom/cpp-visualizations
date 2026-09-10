import { lab } from '../make.ts'
import type { Lab, Stage } from '../schema.ts'

const tu: Stage = {
  type: 'flow',
  steps: [
    { label: 'math.cpp + headers', on: true },
    { label: 'preprocess', on: true },
    { label: 'compile → math.o', on: true },
    { label: 'link with main.o', on: false },
  ],
}

export const foundationsLabs: Lab[] = [
  lab(
    'compilation',
    'Watch a translation unit become an object file — then fail at link if a definition is missing.',
    [
      {
        id: 'pipeline',
        title: 'Source to binary',
        voice:
          'A C++ program is not one file that runs. Each cpp is a translation unit. The compiler sees one unit at a time. The linker stitches object files and reports the One Definition Rule.',
        code: `// math.hpp\nint add(int, int);\n// math.cpp\nint add(int a, int b) { return a + b; }\n// main.cpp\nint main() { return add(1, 2); }`,
        stage: tu,
        try: {
          type: 'pick',
          prompt: 'What happens if add is defined in the header and included from two cpp files?',
          options: [
            {
              label: 'Defined in header (not inline)',
              code: `// math.hpp\nint add(int a, int b) { return a + b; }`,
              voice:
                'Each translation unit that includes the header gets its own definition. The linker sees two add symbols and errors. That is the One Definition Rule.',
              verdict: 'Link error: multiple definition of add.',
              stage: {
                type: 'compare',
                left: { title: 'TU main.o', lines: ['add defined'] },
                right: { title: 'TU extra.o', lines: ['add defined again', 'ODR violation'] },
              },
            },
            {
              label: 'Declared in header, defined once',
              code: `int add(int, int);  // header\nint add(int a, int b) { return a + b; }  // one cpp`,
              voice: 'One definition lives in one object file. Other units only see the declaration. The linker is happy.',
              verdict: 'Links. This is the usual layout.',
              stage: {
                type: 'flow',
                steps: [
                  { label: 'main.o needs add', on: true },
                  { label: 'math.o defines add', on: true },
                  { label: 'executable', on: true },
                ],
              },
            },
          ],
        },
      },
    ],
    'compilation',
  ),
  lab(
    'preprocessor',
    'The preprocessor is a text engine. Macros have no types and no scope — watch them explode.',
    [
      {
        id: 'paste',
        title: 'Text in, text out',
        voice:
          'Hash include pastes a file. Macros replace tokens before the compiler sees types. Prefer constexpr and inline. A macro that evaluates its argument twice will bite you.',
        code: `#define SQR(x) ((x)*(x))\nint n = SQR(++i);  // increments twice`,
        stage: {
          type: 'compare',
          left: { title: 'You wrote', lines: ['SQR(++i)'] },
          right: { title: 'Preprocessor emitted', lines: ['((++i)*(++i))', 'undefined-ish chaos'] },
        },
        try: {
          type: 'code',
          prompt: 'Edit the snippet. Include SQR(++i) or a constexpr function and visualize the expansion.',
          starter: `#define SQR(x) ((x)*(x))\nint r = SQR(++i);`,
          runs: [
            {
              when: ['sqr(++i)'],
              voice: 'The macro pasted plus plus i twice. There is no function call, no single evaluation.',
              verdict: 'Argument evaluated twice. Do not do this.',
              stage: {
                type: 'compare',
                left: { title: 'Source', lines: ['SQR(++i)'] },
                right: { title: 'After preprocess', lines: ['((++i)*(++i))'] },
              },
            },
            {
              when: ['sqr('],
              voice: 'SQR is still a paste. The argument is written twice in the expansion. Harmless if it is n plus one, deadly if it has a side effect.',
              verdict: 'Macro expansion: ((arg)*(arg)). Prefer a function.',
              stage: {
                type: 'compare',
                left: { title: 'You wrote', lines: ['SQR(arg)'] },
                right: { title: 'Pasted as', lines: ['((arg)*(arg))'] },
              },
            },
            {
              when: ['constexpr'],
              voice: 'A constexpr function has a type, evaluates the argument once, and can run at compile time.',
              verdict: 'Language > macro.',
              stage: {
                type: 'flow',
                steps: [
                  { label: 'call sqr(i+1)', on: true },
                  { label: 'one evaluation', on: true },
                  { label: 'typed result', on: true },
                ],
              },
            },
          ],
          fallback: {
            voice: 'This lab visualizes SQR macros and constexpr helpers. Put SQR of something, or a constexpr function, in the box.',
            verdict: 'No matching teaching pattern in this snippet yet.',
            stage: {
              type: 'compare',
              left: { title: 'Try', lines: ['SQR(++i)', 'SQR(n + 1)'] },
              right: { title: 'Or', lines: ['constexpr int sqr(int x)'] },
            },
          },
        },
      },
    ],
  ),
  lab(
    'types',
    'Sizes are a typical 64-bit LP64 machine — not a promise from the standard.',
    [
      {
        id: 'widths',
        title: 'Typical LP64 widths',
        voice:
          'The standard ranks sizes, it does not fix them. This lab shows Linux-style LP64: int is 4, long is 8. Windows LLP64 keeps long at 4. Click types in the visualizer and compare.',
        stage: {
          type: 'bytes',
          total: 'depends on the type you pick',
          slots: [
            { label: 'char', size: 1, kind: 'data' },
            { label: 'int', size: 4, kind: 'data' },
            { label: 'long LP64', size: 8, kind: 'data' },
          ],
          note: 'Use the type table above. This is not Clang; it is a typical model.',
        },
        try: {
          type: 'pick',
          prompt: 'What is sizeof(long) on this machine versus Windows?',
          options: [
            {
              label: 'LP64 (this site)',
              voice: 'On Linux and macOS 64-bit, long is 8 bytes, same as a pointer.',
              verdict: 'long = 8. Pointer = 8.',
              stage: {
                type: 'bytes',
                slots: [
                  { label: 'int 4', size: 4, kind: 'data' },
                  { label: 'long 8', size: 8, kind: 'data' },
                  { label: 'void* 8', size: 8, kind: 'data' },
                ],
              },
            },
            {
              label: 'LLP64 (Windows)',
              voice: 'Windows 64-bit keeps long at 4 bytes. Only long long and pointers are 8. Assuming long is 64-bit is a portability bug.',
              verdict: 'long = 4 on Win64. Use int64_t when the width is the contract.',
              stage: {
                type: 'bytes',
                slots: [
                  { label: 'int 4', size: 4, kind: 'data' },
                  { label: 'long 4', size: 4, kind: 'data' },
                  { label: 'void* 8', size: 8, kind: 'data' },
                ],
              },
            },
          ],
        },
      },
    ],
    'types',
  ),
  lab(
    'cv-qualifiers',
    'Read pointer declarations right to left — const binds to the thing on its left.',
    [
      {
        id: 'bind',
        title: 'What may change',
        voice:
          'Const is a compile-time promise. Int const star cannot write through the pointer. Star const cannot reseat the pointer. Volatile is for memory-mapped hardware, not threads.',
        code: `const int* pc = &x;  // cannot write *pc\nint* const cp = &x;  // cannot reseat cp`,
        stage: {
          type: 'graph',
          nodes: [
            { id: 'pc', title: 'pc', sub: 'pointer to const', kind: 'stack' },
            { id: 'x', title: 'x', sub: 'int 1', kind: 'stack' },
          ],
          edges: [{ from: 'pc', to: 'x', label: 'may read' }],
        },
        try: {
          type: 'code',
          prompt: 'Write a pointer declaration. Include const on the left or right of the star.',
          starter: `int x = 1;\nconst int* pc = &x;\n//*pc = 2;`,
          runs: [
            {
              when: ['*pc ='],
              voice: 'You tried to write through a pointer to const. The compiler refuses. The object itself may still be mutable through another name.',
              verdict: 'Error: assignment of read-only location.',
              stage: {
                type: 'graph',
                nodes: [
                  { id: 'pc', title: 'pc', sub: 'const int*', kind: 'stack' },
                  { id: 'x', title: 'x', sub: 'blocked write', kind: 'stack' },
                ],
                edges: [{ from: 'pc', to: 'x', label: 'write ✕', dashed: true }],
              },
            },
            {
              when: ['int* const'],
              voice: 'The pointer is const. You may write the int, you may not point elsewhere.',
              verdict: 'Reseat forbidden, mutate pointee allowed.',
              stage: {
                type: 'graph',
                nodes: [
                  { id: 'cp', title: 'cp', sub: 'int* const', kind: 'stack' },
                  { id: 'x', title: 'x', sub: 'mutable', kind: 'stack' },
                ],
                edges: [{ from: 'cp', to: 'x', label: 'fixed address' }],
              },
            },
          ],
          fallback: {
            voice: 'Add const int star, or int star const, or try assigning through pc.',
            verdict: 'Waiting for a cv-qualified pointer to visualize.',
            stage: {
              type: 'cells',
              rows: [{ label: 'declaration', items: [{ label: 'type it' }] }],
            },
          },
        },
      },
    ],
  ),
  lab(
    'literals',
    'Brace initialization refuses silent narrowing. That is the whole point.',
    [
      {
        id: 'narrow',
        title: 'How values enter',
        voice:
          'A literal has a type. Three point one four is double. Braces refuse to squeeze it into an int. Equals will silently truncate. Prefer braces.',
        stage: {
          type: 'compare',
          left: { title: 'int n = 3.14', lines: ['compiles', 'n becomes 3', 'narrowing hidden'] },
          right: { title: 'int n{3.14}', lines: ['error', 'narrowing diagnosed', 'modern default'] },
        },
        try: {
          type: 'pick',
          prompt: 'Pick an initialization and see whether the compiler keeps the fractional part.',
          options: [
            {
              label: 'Equals init',
              code: 'int n = 3.14;',
              voice: 'Equals allows narrowing. You get three. The point one four vanished without a diagnostic on many compilers.',
              verdict: 'n == 3. Silent truncation.',
              stage: {
                type: 'cells',
                rows: [{ label: 'n', items: [{ label: 'int', value: '3', kind: 'stack' }] }],
              },
            },
            {
              label: 'Brace init',
              code: 'int n{3.14};',
              voice: 'List initialization forbids narrowing. This is ill-formed. That is a feature.',
              verdict: 'Does not compile.',
              stage: {
                type: 'cells',
                rows: [{ label: 'n', items: [{ label: 'int', value: '✗', kind: 'ghost', ghost: true }] }],
              },
            },
          ],
        },
      },
    ],
  ),
  lab(
    'operators',
    'When in doubt, parenthesize. Precedence is real; readers should not recite the table.',
    [
      {
        id: 'prec',
        title: 'What binds tighter',
        voice:
          'Bitwise and comparison bind in a way that surprises people. Flags and mask equals zero is parsed as flags and, then a comparison. Use parentheses.',
        stage: {
          type: 'flow',
          steps: [
            { label: 'flags & MASK == 0', on: true, warn: true },
            { label: 'parsed as flags & (MASK == 0)', on: true, warn: true },
          ],
        },
        try: {
          type: 'pick',
          prompt: 'Which parse did you mean?',
          options: [
            {
              label: 'Unparenthesized',
              code: 'if (flags & MASK == 0)',
              voice: 'Equals binds tighter than bitwise and. You compared MASK to zero, then anded that bool into flags.',
              verdict: 'Almost never what you meant.',
              stage: {
                type: 'compare',
                left: { title: 'Written', lines: ['flags & MASK == 0'] },
                right: { title: 'Parsed', lines: ['flags & (MASK == 0)'] },
              },
            },
            {
              label: 'Parenthesized',
              code: 'if ((flags & MASK) == 0)',
              voice: 'Now the mask is applied first, then compared to zero. Readers do not need the precedence table.',
              verdict: 'This is the intended test.',
              stage: {
                type: 'compare',
                left: { title: 'Written', lines: ['(flags & MASK) == 0'] },
                right: { title: 'Parsed', lines: ['same'] },
              },
            },
          ],
        },
      },
    ],
    'operators',
  ),
  lab(
    'control-flow',
    'Range-for copies unless you take a reference. Switch falls through unless you break.',
    [
      {
        id: 'range',
        title: 'Loops and fallthrough',
        voice:
          'For auto x in vec copies every element. Use auto reference or const auto reference. Switch cases fall through on purpose only when you say so in a comment.',
        stage: {
          type: 'cells',
          rows: [
            { label: 'vec', items: [{ label: '[0]', value: 'fat' }, { label: '[1]', value: 'fat' }] },
            { label: 'for (auto x : vec)', items: [{ label: 'copy', value: 'x' }] },
          ],
        },
        try: {
          type: 'code',
          prompt: 'Write a range-for. Use auto, auto&, or const auto& and visualize copies.',
          starter: `for (auto x : items) {\n  use(x);\n}`,
          runs: [
            {
              when: ['auto&'],
              voice: 'You bound a reference. No copy of the element. Mutations hit the container.',
              verdict: 'Alias, not a duplicate.',
              stage: {
                type: 'graph',
                nodes: [
                  { id: 'v', title: 'items[i]', kind: 'heap' },
                  { id: 'x', title: 'x', sub: 'reference', kind: 'stack' },
                ],
                edges: [{ from: 'x', to: 'v', label: 'alias' }],
              },
            },
            {
              when: ['auto x'],
              unless: ['auto&', 'auto &'],
              voice: 'Auto x copies the element. Fine for int. Expensive for a fat object, and mutations are local.',
              verdict: 'A distinct object named x.',
              stage: {
                type: 'graph',
                nodes: [
                  { id: 'v', title: 'items[i]', kind: 'heap' },
                  { id: 'x', title: 'x', sub: 'copy', kind: 'stack' },
                ],
                edges: [{ from: 'v', to: 'x', label: 'copied' }],
              },
            },
          ],
          fallback: {
            voice: 'Write a range-for with auto x or auto reference.',
            verdict: 'Need a range-for to visualize.',
            stage: { type: 'flow', steps: [{ label: 'loop not parsed', on: true }] },
          },
        },
      },
    ],
  ),
  lab(
    'scope-namespaces',
    'Scope is visibility. Lifetime is how long the object exists. They often line up — until new or static.',
    [
      {
        id: 'block',
        title: 'Who can see a name',
        voice:
          'A local automatic object dies when its block ends. A static local lives until program exit. Using namespace std in a header pollutes every file that includes it.',
        stage: {
          type: 'stack',
          frames: [
            { name: 'outer', locals: ['a lives'] },
            { name: 'inner', locals: ['b lives'], tag: 'block' },
          ],
        },
        try: {
          type: 'pick',
          prompt: 'Return a pointer to a local — or return by value.',
          options: [
            {
              label: 'Return &local',
              code: `int* f() { int n = 1; return &n; }`,
              voice: 'n is destroyed when f returns. The pointer dangles. Using it is undefined behavior.',
              verdict: 'Dangling. The stack slot is gone.',
              stage: {
                type: 'cells',
                rows: [
                  { label: 'caller', items: [{ label: 'p', value: 'dangling', kind: 'stack' }] },
                  { label: 'f frame', items: [{ label: 'n', value: 'dead', kind: 'ghost', ghost: true }] },
                ],
              },
            },
            {
              label: 'Return by value',
              code: `int f() { int n = 1; return n; }`,
              voice: 'The value is copied or elided into the caller. No address escapes.',
              verdict: 'Safe. Prefer this.',
              stage: {
                type: 'cells',
                rows: [{ label: 'caller', items: [{ label: 'r', value: '1', kind: 'stack' }] }],
              },
            },
          ],
        },
      },
    ],
  ),
  lab(
    'conversions',
    'Name the cast. C-style casts can mix static, const, and reinterpret — that is why they are blunt.',
    [
      {
        id: 'named',
        title: 'The four casts',
        voice:
          'Static cast is related conversions. Dynamic cast is a safe downcast of polymorphic types. Const cast only touches const. Reinterpret cast is type punning of addresses — almost always a smell.',
        stage: {
          type: 'flow',
          steps: [
            { label: 'static_cast', on: true },
            { label: 'dynamic_cast', on: false },
            { label: 'const_cast', on: false },
            { label: 'reinterpret_cast', on: false, warn: true },
          ],
        },
        try: {
          type: 'pick',
          prompt: 'Pick a cast and see the contract.',
          options: [
            {
              label: 'static_cast<int>(3.9)',
              voice: 'Explicit numeric conversion. You asked to drop the fraction. The name documents intent.',
              verdict: 'Result 3. Honest truncation.',
              stage: {
                type: 'cells',
                rows: [{ label: 'value', items: [{ label: 'double 3.9' }, { label: 'int 3' }] }],
              },
            },
            {
              label: 'dynamic_cast<Derived*>(b)',
              voice: 'Requires a polymorphic source. Pointer failure is nullptr. Reference failure throws bad_cast.',
              verdict: 'Safe downcast, or null.',
              stage: {
                type: 'graph',
                nodes: [
                  { id: 'b', title: 'Base*', kind: 'stack' },
                  { id: 'd', title: 'Derived', kind: 'heap' },
                ],
                edges: [{ from: 'b', to: 'd', label: 'RTTI check' }],
              },
            },
            {
              label: 'reinterpret_cast',
              voice: 'You are claiming these bits are a different pointer type. Dereferencing unrelated objects is usually undefined. Prefer memcpy or bit_cast later.',
              verdict: 'Smell. Strict aliasing waits.',
              stage: {
                type: 'compare',
                left: { title: 'Intent', lines: ['I know the bits'] },
                right: { title: 'Reality', lines: ['aliasing UB if you lie'] },
              },
            },
          ],
        },
      },
    ],
  ),
  lab(
    'enums',
    'enum class keeps names scoped and refuses to become int by accident.',
    [
      {
        id: 'scoped',
        title: 'Scoped versus leaky',
        voice:
          'Unscoped enumerators leak into the surrounding scope and convert to int. Enum class requires a qualifier and an explicit cast. That is the default in modern C++14 code.',
        stage: {
          type: 'compare',
          left: { title: 'enum Legacy', lines: ['FLAG_ON is in this scope', 'int x = FLAG_ON'] },
          right: { title: 'enum class Color', lines: ['Color::red', 'needs static_cast to int'] },
        },
        try: {
          type: 'pick',
          prompt: 'Which enum do you want in an API?',
          options: [
            {
              label: 'Unscoped',
              code: 'enum Legacy { red, green };\nint n = red;',
              voice: 'Red is now a name in this scope. It also becomes an int. Collides with macros and other enums.',
              verdict: 'Leaky. Avoid in new code.',
              stage: {
                type: 'cells',
                rows: [{ label: 'scope', items: [{ label: 'red=0' }, { label: 'green=1' }, { label: 'n=0' }] }],
              },
            },
            {
              label: 'enum class',
              code: 'enum class Color { red, green };\nColor c = Color::red;',
              voice: 'The name is Color colon colon red. No implicit int. Switch on Color still works.',
              verdict: 'Scoped. This is the default.',
              stage: {
                type: 'cells',
                rows: [{ label: 'Color', items: [{ label: 'c', value: 'red' }] }],
              },
            },
          ],
        },
      },
    ],
  ),
  lab(
    'unions-bitfields',
    'A union holds one member at a time. Reading the inactive member is usually undefined.',
    [
      {
        id: 'active',
        title: 'One occupant',
        voice:
          'Writing f ends the lifetime of i. The bytes are reused. Reading i now is not a portable pun — use memcpy if you meant bits. Bit-fields pack into a word; you cannot take their address.',
        stage: {
          type: 'bytes',
          total: '4 (typical int/float overlay)',
          slots: [{ label: 'i / f', size: 4, kind: 'data' }],
          note: 'Same four bytes. One active member.',
        },
        try: {
          type: 'pick',
          prompt: 'Which member is active?',
          options: [
            {
              label: 'Write i',
              code: 'slot.i = 42;',
              voice: 'I is active. The bits are an int. Reading f would be a pun, not a conversion.',
              verdict: 'Active member: i.',
              stage: {
                type: 'bytes',
                slots: [{ label: 'i=42', size: 4, kind: 'data' }],
              },
            },
            {
              label: 'Then write f',
              code: 'slot.i = 42; slot.f = 1.0f;',
              voice: 'Assigning f ended i. Those bytes are now a float. The integer 42 is gone.',
              verdict: 'Active member: f. i is not there.',
              stage: {
                type: 'bytes',
                slots: [{ label: 'f=1.0', size: 4, kind: 'data' }],
              },
            },
          ],
        },
      },
    ],
  ),
]
