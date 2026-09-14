import { lab } from '../make.ts'
import type { Lab } from '../schema.ts'

export const idiomsLabs: Lab[] = [
  lab(
    'patterns',
    'RAII, ownership in signatures, auto with eyes open, return locals by value.',
    [
      {
        id: 'six',
        title: 'The working set',
        voice:
          'These six patterns show up in almost every C++14 codebase. They are how resources, loops, and types stay under control — not decorations.',
        stage: {
          type: 'flow',
          steps: [
            { label: 'RAII', on: true },
            { label: 'unique_ptr in signatures', on: true },
            { label: 'range-for', on: false },
            { label: 'auto', on: false },
            { label: 'lambdas', on: false },
            { label: 'move', on: false },
          ],
        },
        try: {
          type: 'pick',
          prompt: 'A FILE star you opened. Who closes it?',
          options: [
            {
              label: 'RAII wrapper',
              code: 'class File { FILE* h; ~File() { if (h) fclose(h); } };',
              voice: 'The destructor runs on return and on throw. You deleted copies so two wrappers cannot fclose twice.',
              verdict: 'Lifetime of the handle equals lifetime of the object.',
              stage: {
                type: 'graph',
                nodes: [
                  { id: 'f', title: 'File', kind: 'stack' },
                  { id: 'h', title: 'FILE', kind: 'heap' },
                ],
                edges: [{ from: 'f', to: 'h', label: 'owns' }],
              },
            },
            {
              label: 'fclose at each return',
              voice: 'You will miss a path. An exception skips your fclose. This is why C++ has destructors.',
              verdict: 'Fragile.',
              stage: {
                type: 'flow',
                steps: [{ label: 'throw skips fclose', on: true, warn: true }],
              },
            },
          ],
        },
      },
    ],
    'patterns',
  ),
  lab(
    'rule-of-zero',
    'If members already know how to copy, move, and destroy, the class stays quiet.',
    [
      {
        id: 'zero',
        title: 'Members manage',
        voice:
          'String, vector, unique pointer — the compiler-generated special members do the right thing memberwise. A do-nothing destructor for debugging silently kills moves.',
        stage: {
          type: 'cells',
          rows: [
            {
              label: 'Person',
              items: [
                { label: 'string', kind: 'stack' },
                { label: 'vector', kind: 'stack' },
                { label: 'unique_ptr', kind: 'stack' },
              ],
            },
          ],
        },
        try: {
          type: 'pick',
          prompt: 'You added an empty destructor to log. What happened?',
          options: [
            {
              label: 'User-declared ~Person()',
              voice: 'Moves are not generated. Copies may deep-copy unique_ptr and fail to compile, or worse if you also have a raw pointer.',
              verdict: 'You left Rule of Zero. Declare the five.',
              stage: {
                type: 'compare',
                left: { title: 'before', lines: ['moves work'] },
                right: { title: 'after empty ~', lines: ['moves gone'] },
              },
            },
            {
              label: 'No special members',
              voice: 'The members do the work. This is the class you want.',
              verdict: 'Rule of Zero.',
              stage: {
                type: 'flow',
                steps: [{ label: 'compiler-generated five', on: true }],
              },
            },
          ],
        },
      },
    ],
  ),
  lab(
    'undefined-behavior',
    'The compiler may assume UB never happens and delete your checks. Sanitizers are not optional tooling.',
    [
      {
        id: 'assume',
        title: 'No requirements',
        voice:
          'Signed overflow, use after free, data races, out of bounds, uninitialized reads. This is not implementation-defined. The optimizer will take the permission you granted.',
        stage: {
          type: 'compare',
          left: { title: 'you wrote', lines: ['if (i < 4) return a[i]'] },
          right: { title: 'if i is poisoned', lines: ['the check may vanish'] },
        },
        try: {
          type: 'code',
          prompt: 'Write an out-of-bounds index or a signed overflow and visualize the permission you gave the compiler.',
          starter: `int a[4] = {1,2,3,4};\nreturn a[4];`,
          runs: [
            {
              when: ['a[4]'],
              voice: 'Index 4 is one past the last element. That load is undefined. ASan would shout. The green path in your head is not a guarantee.',
              verdict: 'Out of bounds. UB.',
              stage: {
                type: 'cells',
                rows: [
                  {
                    label: 'a',
                    items: [
                      { label: '[0]' },
                      { label: '[1]' },
                      { label: '[2]' },
                      { label: '[3]' },
                      { label: '[4]', value: 'UB', kind: 'ghost', ghost: true },
                    ],
                  },
                ],
              },
            },
            {
              when: ['int_max', '+= 1'],
              voice: 'Signed overflow is undefined. Unsigned wrap is defined. Do not add one to INT_MAX and hope.',
              verdict: 'Signed overflow. UB.',
              stage: {
                type: 'cells',
                rows: [{ label: 'n', items: [{ label: 'INT_MAX+1', value: 'anything', kind: 'ghost', ghost: true }] }],
              },
            },
          ],
          fallback: {
            voice: 'Index off the end of an array, or overflow a signed int.',
            verdict: 'Need a classic UB pattern.',
            stage: { type: 'flow', steps: [{ label: 'defined… for now', on: true }] },
          },
        },
      },
    ],
  ),
  lab(
    'const-correctness',
    'Mark everything that does not mutate. Const methods are the first step toward thinking about threads.',
    [
      {
        id: 'habit',
        title: 'A promise the compiler checks',
        voice:
          'Const T reference for read-only parameters. Const methods on observers. Returning const T by value is usually pointless and can block moves. Const_cast as a habit is a smell.',
        stage: {
          type: 'compare',
          left: { title: 'empty() const', lines: ['callable on const Bag'] },
          right: { title: 'empty()', lines: ['not callable on const'] },
        },
        try: {
          type: 'pick',
          prompt: 'A finder that should not mutate.',
          options: [
            {
              label: 'const method',
              code: 'const Item* find(Id) const;',
              voice: 'You can search a const Bag. Overload a non-const version if you need a mutable pointer.',
              verdict: 'Observer. Correct.',
              stage: {
                type: 'graph',
                nodes: [
                  { id: 'b', title: 'const Bag', kind: 'stack' },
                  { id: 'i', title: 'Item', kind: 'heap' },
                ],
                edges: [{ from: 'b', to: 'i', label: 'borrow' }],
              },
            },
            {
              label: 'non-const only',
              voice: 'A const Bag cannot be searched. Callers will const_cast or copy. You pushed mutability outward.',
              verdict: 'Incomplete API.',
              stage: {
                type: 'flow',
                steps: [{ label: 'const Bag — cannot find', on: true, warn: true }],
              },
            },
          ],
        },
      },
    ],
  ),
  lab(
    'pimpl',
    'A unique pointer to an incomplete Impl hides the layout. You must define the destructor in the cpp where Impl is complete.',
    [
      {
        id: 'hide',
        title: 'Pointer to implementation',
        voice:
          'The header only sees unique pointer of Impl. Clients do not recompile when Impl grows. Unique pointer delete needs a complete type — define the destructor out of line after Impl is defined.',
        stage: {
          type: 'graph',
          nodes: [
            { id: 'w', title: 'Widget', sub: 'header', kind: 'stack' },
            { id: 'i', title: 'Impl', sub: 'cpp only', kind: 'heap' },
          ],
          edges: [{ from: 'w', to: 'i', label: 'unique_ptr' }],
        },
        try: {
          type: 'pick',
          prompt: 'Where is ~Widget defined?',
          options: [
            {
              label: 'Defaulted in the header',
              voice: 'The unique pointer destructor is instantiated here, Impl is incomplete, the program is ill-formed. This is the PIMPL footgun.',
              verdict: 'Incomplete type in sizeof/delete.',
              stage: {
                type: 'flow',
                steps: [{ label: 'unique_ptr<Impl> ~ in header', on: true, warn: true }],
              },
            },
            {
              label: 'Out of line in the cpp',
              code: 'Widget::~Widget() = default;  // after struct Impl { ... }',
              voice: 'Impl is complete. Delete is legal. The header only declares the destructor.',
              verdict: 'The usual PIMPL shape.',
              stage: {
                type: 'flow',
                steps: [
                  { label: '~Widget(); in header', on: true },
                  { label: 'Impl complete, = default', on: true },
                ],
              },
            },
          ],
        },
      },
    ],
  ),
  lab(
    'pitfalls',
    'Most vexing parse, slicing, using namespace in headers — the field guide.',
    [
      {
        id: 'vex',
        title: 'Looks like an object',
        voice:
          'Widget w parentheses declares a function. Widget w braces constructs an object. Slicing drops the derived part when you pass by value. If you only reread one page before a review, make it this one plus undefined behavior.',
        stage: {
          type: 'compare',
          left: { title: 'Widget w();', lines: ['function declaration'] },
          right: { title: 'Widget w{};', lines: ['object'] },
        },
        try: {
          type: 'pick',
          prompt: 'Which line creates a Widget?',
          options: [
            {
              label: 'Widget w();',
              voice: 'Most vexing parse. You declared a function named w that returns Widget.',
              verdict: 'No object.',
              stage: {
                type: 'cells',
                rows: [{ label: 'w', items: [{ label: 'function', value: 'Widget()', kind: 'static' }] }],
              },
            },
            {
              label: 'Widget w{};',
              voice: 'Brace initialization. You have an object. This is the habit that avoids the parse.',
              verdict: 'Object exists.',
              stage: {
                type: 'cells',
                rows: [{ label: 'stack', items: [{ label: 'w', value: 'Widget', kind: 'stack' }] }],
              },
            },
          ],
        },
      },
    ],
  ),
]
