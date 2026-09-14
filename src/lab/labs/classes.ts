import { lab } from '../make.ts'
import type { Lab } from '../schema.ts'

export const classesLabs: Lab[] = [
  lab(
    'classes',
    'Keep data private and enforce invariants in constructors. Struct versus class is default access, not a different type system.',
    [
      {
        id: 'invariant',
        title: 'Construction is the contract',
        voice:
          'A class is data plus functions plus invariants. If the denominator is zero, throw in the constructor. Public data with no invariant is a DTO, not an encapsulated type.',
        stage: {
          type: 'graph',
          nodes: [
            { id: 'r', title: 'Ratio', sub: 'num / den', kind: 'stack' },
          ],
          edges: [],
        },
        try: {
          type: 'pick',
          prompt: 'What happens if den is zero?',
          options: [
            {
              label: 'Check in the constructor',
              code: 'Ratio(int n, int d) { if (d == 0) throw ...; }',
              voice: 'The object never finishes construction. No Ratio exists. That is the point of an invariant.',
              verdict: 'Throw. No object.',
              stage: {
                type: 'flow',
                steps: [
                  { label: 'enter ctor', on: true },
                  { label: 'den == 0', on: true, warn: true },
                  { label: 'throw — no Ratio', on: true, warn: true },
                ],
              },
            },
            {
              label: 'Public den, no check',
              voice: 'Callers can set den to zero later. The type lied about being a ratio.',
              verdict: 'Not a class with an invariant.',
              stage: {
                type: 'cells',
                rows: [{ label: 'Ratio', items: [{ label: 'den', value: '0', kind: 'stack' }] }],
              },
            },
          ],
        },
      },
    ],
  ),
  lab(
    'special-members',
    'If you write one special member, look at all five. Prefer Rule of Zero.',
    [
      {
        id: 'five',
        title: 'What the compiler writes',
        voice:
          'Declaring a destructor suppresses implicit moves in C++11 and 14. Your class silently starts copying. Say default or delete on the rest so the intent is visible.',
        stage: {
          type: 'compare',
          left: { title: 'You wrote', lines: ['~Handle()'] },
          right: { title: 'Compiler did', lines: ['copy still generated', 'moves often gone'] },
        },
        try: {
          type: 'pick',
          prompt: 'You need a virtual destructor. What else do you write?',
          options: [
            {
              label: 'Virtual dtor only',
              code: 'virtual ~Base() {}',
              voice: 'User-declared destructor. Implicit moves vanish. Copies remain. That is a silent pessimization.',
              verdict: 'Moves suppressed. Say so explicitly.',
              stage: {
                type: 'flow',
                steps: [
                  { label: '~Base user-declared', on: true },
                  { label: 'move not generated', on: true, warn: true },
                ],
              },
            },
            {
              label: 'Virtual dtor = default, moves default',
              code: `virtual ~Base() = default;\nBase(Base&&) noexcept = default;`,
              voice: 'You opted back into moves. The five are visible. This is the polymorphic-base exception to Rule of Zero.',
              verdict: 'Intent is in the class body.',
              stage: {
                type: 'flow',
                steps: [
                  { label: 'virtual ~Base() = default', on: true },
                  { label: 'moves present', on: true },
                ],
              },
            },
          ],
        },
      },
    ],
  ),
  lab(
    'lifetime',
    'Construction is bases, then members in declaration order, then the body. Destruction is the reverse — including when a later constructor throws.',
    [
      {
        id: 'order',
        title: 'Ctor order, then unwind',
        voice:
          'Members construct in declaration order, not initializer-list order. If m2 throws, m1 and the bases still destroy. That is why RAII works. Play the happy path and the throw path in the visualizer.',
        stage: {
          type: 'flow',
          steps: [
            { label: 'Base()', on: true },
            { label: 'm1()', on: true },
            { label: 'm2() throws', on: true, warn: true },
            { label: '~m1()', on: true },
            { label: '~Base()', on: true },
          ],
        },
        try: {
          type: 'pick',
          prompt: 'Does m2 finish? What still destroys?',
          options: [
            {
              label: 'Happy path',
              voice: 'Base, m1, m2, then the Derived body. Destruction will be the exact reverse.',
              verdict: 'All subobjects exist.',
              stage: {
                type: 'cells',
                rows: [
                  {
                    label: 'object',
                    items: [
                      { label: 'Base', kind: 'stack' },
                      { label: 'm1', kind: 'stack' },
                      { label: 'm2', kind: 'stack' },
                      { label: 'body', kind: 'stack' },
                    ],
                  },
                ],
              },
            },
            {
              label: 'm2 throws',
              voice: 'm2 never completed, so it is not destroyed. m1 and Base unwind. Derived never existed. RAII is this rule.',
              verdict: 'Partial construction. Completed subobjects clean up.',
              stage: {
                type: 'cells',
                rows: [
                  {
                    label: 'after throw',
                    items: [
                      { label: 'Base', value: 'destroying', kind: 'stack' },
                      { label: 'm1', value: 'destroying', kind: 'stack' },
                      { label: 'm2', value: 'never born', kind: 'ghost', ghost: true },
                    ],
                  },
                ],
              },
            },
          ],
        },
      },
    ],
    'lifetime',
  ),
  lab(
    'inheritance',
    'This-adjustment is why static_cast to a second base moves the address. cxxfilt dumps bytes; this lab says why.',
    [
      {
        id: 'adjust',
        title: 'Why the pointer moved',
        voice:
          'A Derived object starts with BaseA, then BaseB, then Derived members. A Derived star and a BaseA star can be the same address. A BaseB star is offset. Static cast adjusts this. The diamond without virtual inheritance duplicates Base.',
        stage: {
          type: 'ruler',
          base: 0x1000,
          blocks: [
            { label: 'BaseA + vptr', offset: 0x1000, size: 16, accent: true },
            { label: 'BaseB + vptr', offset: 0x1010, size: 16 },
            { label: 'Derived extra', offset: 0x1020, size: 16 },
          ],
          pointers: [
            { name: 'Derived*', at: 0x1000 },
            { name: 'BaseB*', at: 0x1010 },
          ],
        },
        try: {
          type: 'pick',
          prompt: 'Cast the same Derived object. Watch the address.',
          options: [
            {
              label: 'static_cast<BaseA*>(d)',
              code: 'BaseA* a = d;  // same address typically',
              voice: 'BaseA is at offset zero in this layout. The pointer value does not move. Virtual calls still use BaseA’s vptr.',
              verdict: 'Address unchanged. Subobject at +0.',
              stage: {
                type: 'ruler',
                base: 0x1000,
                blocks: [
                  { label: 'BaseA ← this', offset: 0x1000, size: 16, accent: true },
                  { label: 'BaseB', offset: 0x1010, size: 16 },
                  { label: 'Derived', offset: 0x1020, size: 16 },
                ],
                pointers: [{ name: 'BaseA* this', at: 0x1000 }],
              },
            },
            {
              label: 'static_cast<BaseB*>(d)',
              code: 'BaseB* b = static_cast<BaseB*>(d);',
              voice: 'The compiler adds the offset of BaseB. The bits in the pointer change. That is this-adjustment. Fail to do it and you call BaseB methods on the wrong bytes.',
              verdict: 'Address moved. This is the picture cxxfilt will not narrate.',
              stage: {
                type: 'ruler',
                base: 0x1000,
                blocks: [
                  { label: 'BaseA', offset: 0x1000, size: 16 },
                  { label: 'BaseB ← this', offset: 0x1010, size: 16, accent: true },
                  { label: 'Derived', offset: 0x1020, size: 16 },
                ],
                pointers: [
                  { name: 'Derived*', at: 0x1000 },
                  { name: 'BaseB* this', at: 0x1010 },
                ],
              },
            },
            {
              label: 'Non-virtual diamond',
              voice: 'Two Base subobjects. Naming a Base member is ambiguous. You almost never wanted this.',
              verdict: 'Duplicate Base. Ambiguous.',
              stage: {
                type: 'ruler',
                base: 0x1000,
                blocks: [
                  { label: 'Base via A', offset: 0x1000, size: 12 },
                  { label: 'A extra', offset: 0x100c, size: 8 },
                  { label: 'Base via B', offset: 0x1014, size: 12, accent: true },
                  { label: 'B extra', offset: 0x1020, size: 8 },
                ],
                pointers: [
                  { name: 'Base* via A', at: 0x1000 },
                  { name: 'Base* via B', at: 0x1014 },
                ],
              },
            },
          ],
        },
      },
    ],
    'inheritance',
  ),
  lab(
    'polymorphism',
    'Virtual means call the most-derived override. You pay a vptr per object and an indirect call.',
    [
      {
        id: 'dispatch',
        title: 'The vptr hop',
        voice:
          'Each polymorphic object starts with a vptr to a per-class table of function pointers. Delete through Base star without a virtual destructor is undefined. Prefer override so a typo is a compile error.',
        stage: {
          type: 'graph',
          nodes: [
            { id: 'o', title: 'Derived object', sub: 'vptr', kind: 'heap' },
            { id: 't', title: 'Derived vtable', kind: 'static' },
            { id: 'f', title: 'Derived::step', kind: 'static' },
          ],
          edges: [
            { from: 'o', to: 't', label: 'vptr' },
            { from: 't', to: 'f', label: '[step]' },
          ],
        },
        try: {
          type: 'pick',
          prompt: 'Call step through a Base pointer.',
          options: [
            {
              label: 'virtual step',
              voice: 'Load vptr, index the table, call Derived::step. The static type was Base. The dynamic type decided.',
              verdict: 'Dynamic dispatch.',
              stage: {
                type: 'flow',
                steps: [
                  { label: 'load this->vptr', on: true },
                  { label: 'vtable[step]', on: true },
                  { label: 'Derived::step', on: true },
                ],
              },
            },
            {
              label: 'non-virtual step',
              voice: 'The compiler calls Base::step based on the pointer type. Derived’s function is hidden, not overriding.',
              verdict: 'Static call. Easy to get wrong without override.',
              stage: {
                type: 'flow',
                steps: [{ label: 'Base::step (static)', on: true, warn: true }],
              },
            },
          ],
        },
      },
    ],
    'vtable',
  ),
  lab(
    'operator-overloading',
    'Overload to match existing notation, not to be clever. Plus should not mutate.',
    [
      {
        id: 'sym',
        title: 'Member versus free',
        voice:
          'Assignment, call, subscript, and arrow must be members. Stream insertion is a free function so the left operand can be ostream. Symmetric plus is often a free function implemented with plus-equals.',
        stage: {
          type: 'compare',
          left: { title: 'must be members', lines: ['=', '()', '[]', '->'] },
          right: { title: 'often free', lines: ['<<', '+', '=='] },
        },
        try: {
          type: 'pick',
          prompt: 'How do you write operator plus so int plus Vec works?',
          options: [
            {
              label: 'Member Vec::operator+',
              voice: 'The left operand must be a Vec. Int plus Vec will not find this member.',
              verdict: 'Asymmetric. Fine if you only ever write v + 1.',
              stage: {
                type: 'compare',
                left: { title: 'v + 1', lines: ['ok'] },
                right: { title: '1 + v', lines: ['no member on int'] },
              },
            },
            {
              label: 'Free operator+(Vec, Vec)',
              code: 'Vec operator+(Vec a, const Vec& b) { a += b; return a; }',
              voice: 'Either side may convert. Implement plus in terms of plus-equals on a by-value left so you reuse the move.',
              verdict: 'Symmetric. Usual pattern.',
              stage: {
                type: 'flow',
                steps: [
                  { label: 'copy or move left', on: true },
                  { label: 'a += b', on: true },
                  { label: 'return a', on: true },
                ],
              },
            },
          ],
        },
      },
    ],
  ),
  lab(
    'access-control',
    'Public is the API. Private is the implementation. Protected is for derived classes — and a wider hole than people think.',
    [
      {
        id: 'who',
        title: 'Who may name this member',
        voice:
          'Friendship punches a hole for a specific function or class. Protected members are visible to all descendants, which makes them part of a wider contract. Prefer private plus a narrow protected interface.',
        stage: {
          type: 'compare',
          left: { title: 'private', lines: ['only this class', 'and friends'] },
          right: { title: 'protected', lines: ['this + derived', 'all the way down'] },
        },
        try: {
          type: 'pick',
          prompt: 'A derived class wants to reuse a helper.',
          options: [
            {
              label: 'Make the helper protected',
              voice: 'Every further derived class can call it and depend on it. You just published an API to an unknown set of types.',
              verdict: 'Wide contract. Use sparingly.',
              stage: {
                type: 'graph',
                nodes: [
                  { id: 'b', title: 'Base::helper', kind: 'static' },
                  { id: 'd', title: 'Derived', kind: 'stack' },
                  { id: 'g', title: 'Grandchild', kind: 'stack' },
                ],
                edges: [
                  { from: 'd', to: 'b' },
                  { from: 'g', to: 'b' },
                ],
              },
            },
            {
              label: 'Private + public non-virtual wrapper',
              voice: 'NVI: the public function is stable. The private virtual is the customization point. Derived overrides without seeing the guts.',
              verdict: 'Narrower. Easier to change.',
              stage: {
                type: 'flow',
                steps: [
                  { label: 'public draw()', on: true },
                  { label: 'private doDraw()', on: true },
                ],
              },
            },
          ],
        },
      },
    ],
  ),
]
