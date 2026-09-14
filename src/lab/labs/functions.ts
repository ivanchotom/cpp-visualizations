import { lab } from '../make.ts'
import type { Lab } from '../schema.ts'

export const functionsLabs: Lab[] = [
  lab(
    'functions',
    'A declaration names a callable. The definition lives in one translation unit unless it is inline or a template.',
    [
      {
        id: 'decl',
        title: 'Declaration versus definition',
        voice:
          'Default arguments are filled in at the call site from the declaration the caller sees. Inline allows the same definition in multiple units. It is a hint to the inliner, not a command.',
        stage: {
          type: 'compare',
          left: { title: 'Declaration', lines: ['int scale(int, int = 2);'] },
          right: { title: 'Definition', lines: ['int scale(int x, int f) { return x * f; }'] },
        },
        try: {
          type: 'pick',
          prompt: 'Where do default arguments live?',
          options: [
            {
              label: 'On the declaration the caller sees',
              code: 'int scale(int x, int factor = 2);',
              voice: 'The caller that does not see the default does not get it. Put defaults on the header declaration once.',
              verdict: 'Call site uses the visible declaration.',
              stage: {
                type: 'flow',
                steps: [
                  { label: 'caller sees factor=2', on: true },
                  { label: 'scale(3) → scale(3,2)', on: true },
                ],
              },
            },
            {
              label: 'Only on the definition in a cpp',
              voice: 'Other translation units never saw the default. Their calls need both arguments or they fail to compile.',
              verdict: 'Invisible default. Usually a mistake.',
              stage: {
                type: 'compare',
                left: { title: 'main.cpp', lines: ['scale(3) — error'] },
                right: { title: 'math.cpp', lines: ['definition has default'] },
              },
            },
          ],
        },
      },
    ],
  ),
  lab(
    'overloading',
    'Identity beats promotion beats standard conversion beats user-defined. A tie is ill-formed.',
    [
      {
        id: 'rank',
        title: 'Which f did you mean?',
        voice:
          'The compiler builds viable candidates, then ranks conversions. A deleted overload still participates — it can win and then error. That is how you ban a type.',
        stage: {
          type: 'flow',
          steps: [
            { label: 'exact', on: true },
            { label: 'promotion', on: false },
            { label: 'standard', on: false },
            { label: 'user-defined', on: false },
          ],
        },
        try: {
          type: 'pick',
          prompt: 'Call draw with an int or a double when the double overload is deleted.',
          options: [
            {
              label: 'draw(1)',
              code: 'void draw(int);\nvoid draw(double) = delete;\ndraw(1);',
              voice: 'Exact match on int. Fine.',
              verdict: 'Calls draw(int).',
              stage: {
                type: 'flow',
                steps: [
                  { label: 'draw(int) wins', on: true },
                  { label: 'draw(double) ignored', on: false },
                ],
              },
            },
            {
              label: 'draw(1.2)',
              code: 'draw(1.2);',
              voice: 'The double overload is the best match — and it is deleted. The program is ill-formed. Deletion is not the same as absence.',
              verdict: 'Error: deleted function.',
              stage: {
                type: 'flow',
                steps: [{ label: 'draw(double) = delete wins', on: true, warn: true }],
              },
            },
          ],
        },
      },
    ],
  ),
  lab(
    'pass-by',
    'Cheap small types by value. Read-only bigger types as const T reference. Ownership as a sink by value.',
    [
      {
        id: 'sink',
        title: 'How the argument arrives',
        voice:
          'A sink parameter takes T by value, then moves inside. Lvalues copy. Rvalues move. In a template, T amp amp is a forwarding reference — pair it with std forward.',
        stage: {
          type: 'cells',
          rows: [
            { label: 'caller', items: [{ label: 'name', value: 'string', kind: 'stack' }] },
            { label: 'store(name)', items: [{ label: 'param', value: 'copy', kind: 'stack' }] },
          ],
        },
        try: {
          type: 'pick',
          prompt: 'How does the string enter store?',
          options: [
            {
              label: 'store(local)',
              code: 'void store(std::string name);\nstore(local);',
              voice: 'Local is an lvalue. The parameter is copy-constructed, then you can move it into the container.',
              verdict: 'Copy into the sink.',
              stage: {
                type: 'compare',
                left: { title: 'local', lines: ['still intact'] },
                right: { title: 'parameter', lines: ['copy of the buffer'] },
              },
            },
            {
              label: 'store(std::move(local))',
              voice: 'You marked local as an xvalue. The sink move-constructs. Local is valid but unspecified.',
              verdict: 'Move into the sink.',
              stage: {
                type: 'compare',
                left: { title: 'local', lines: ['moved-from'] },
                right: { title: 'parameter', lines: ['stole the buffer'] },
              },
            },
          ],
        },
      },
    ],
    'pass-by',
  ),
  lab(
    'lambdas',
    'A lambda is an unnamed class with operator paren. Captures become members.',
    [
      {
        id: 'capture',
        title: 'What the closure holds',
        voice:
          'Brackets copy or reference. Init-capture in C++14 can move a unique pointer in. Returning a lambda that captured locals by reference dangles.',
        stage: {
          type: 'graph',
          nodes: [
            { id: 'c', title: 'closure', sub: 'members = captures', kind: 'stack' },
            { id: 'p', title: 'unique_ptr', kind: 'heap' },
          ],
          edges: [{ from: 'c', to: 'p', label: 'owns' }],
        },
        try: {
          type: 'code',
          prompt: 'Write a lambda capture: [=], [&], or [p = std::move(p)].',
          starter: `auto p = std::make_unique<int>(7);\nauto f = [p = std::move(p)] { return *p; };`,
          runs: [
            {
              when: ['std::move(p)'],
              voice: 'Init-capture moved the unique pointer into the closure. The original p is empty. The lambda now owns the int.',
              verdict: 'C++14 init-capture. Unique lambdas are legal.',
              stage: {
                type: 'graph',
                nodes: [
                  { id: 'f', title: 'f', sub: 'owns p', kind: 'stack' },
                  { id: 'h', title: 'int 7', kind: 'heap' },
                ],
                edges: [{ from: 'f', to: 'h' }],
              },
            },
            {
              when: ['[&]'],
              voice: 'Everything is a reference. If f outlives this stack frame, those references dangle.',
              verdict: 'Cheap, dangerous if returned.',
              stage: {
                type: 'graph',
                nodes: [
                  { id: 'f', title: 'f', sub: 'refs', kind: 'stack' },
                  { id: 'loc', title: 'locals', kind: 'stack', ghost: true },
                ],
                edges: [{ from: 'f', to: 'loc', label: 'may dangle', dashed: true }],
              },
            },
          ],
          fallback: {
            voice: 'Add a capture list I can parse: reference, copy, or init-capture move.',
            verdict: 'Need a capture to draw the closure.',
            stage: { type: 'cells', rows: [{ label: 'closure', items: [] }] },
          },
        },
      },
    ],
  ),
  lab(
    'constexpr',
    'Constexpr means can be evaluated at compile time if the inputs are constant. It is not the same as const.',
    [
      {
        id: 'when',
        title: 'Compile time or run time',
        voice:
          'C++14 constexpr functions may loop and mutate locals. Required compile-time only when the result is needed as a constant — array bound, case label, template argument. Otherwise it is just a function.',
        stage: {
          type: 'compare',
          left: { title: 'constexpr int n = pow2(10)', lines: ['compile time', '1024 in the binary'] },
          right: { title: 'int k = pow2(x)', lines: ['run time if x varies'] },
        },
        try: {
          type: 'pick',
          prompt: 'Is this call required to be a constant expression?',
          options: [
            {
              label: 'Array bound',
              code: 'constexpr int n = pow2(10);\nint a[n];',
              voice: 'An array bound needs a constant. The compiler must finish pow2 now.',
              verdict: 'Evaluated at compile time.',
              stage: {
                type: 'flow',
                steps: [
                  { label: 'pow2(10) folded', on: true },
                  { label: 'int a[1024]', on: true },
                ],
              },
            },
            {
              label: 'Runtime argument',
              code: 'int k = pow2(x);',
              voice: 'X is not a constant. Pow2 is an ordinary function call. Constexpr did not make it magic.',
              verdict: 'Runs when you call it.',
              stage: {
                type: 'flow',
                steps: [
                  { label: 'call pow2', on: true },
                  { label: 'machine code loop', on: true },
                ],
              },
            },
          ],
        },
      },
    ],
  ),
  lab(
    'function-pointers',
    'A captureless lambda converts to a function pointer. A closure with state does not.',
    [
      {
        id: 'decay',
        title: 'Callables as addresses',
        voice:
          'A function pointer is just an address of a function. Stateless lambdas convert to that. Once you capture, you have an object — pass it as a template or std function, not as a raw pointer.',
        stage: {
          type: 'graph',
          nodes: [
            { id: 'p', title: 'int(*)(int)', kind: 'stack' },
            { id: 'f', title: 'code of twice', kind: 'static' },
          ],
          edges: [{ from: 'p', to: 'f' }],
        },
        try: {
          type: 'pick',
          prompt: 'Can this lambda become a function pointer?',
          options: [
            {
              label: 'Captureless',
              code: 'int (*p)(int) = [](int x) { return x * 2; };',
              voice: 'No members. The closure converts to a function pointer. C APIs accept this.',
              verdict: 'Conversion allowed.',
              stage: {
                type: 'graph',
                nodes: [
                  { id: 'p', title: 'p', kind: 'stack' },
                  { id: 'fn', title: 'thunk', kind: 'static' },
                ],
                edges: [{ from: 'p', to: 'fn' }],
              },
            },
            {
              label: 'Captures n',
              code: 'int n = 2; auto f = [n](int x) { return x * n; };',
              voice: 'The closure has a data member. There is no single function address that knows n. This will not convert to a function pointer.',
              verdict: 'No conversion. It is an object.',
              stage: {
                type: 'graph',
                nodes: [
                  { id: 'f', title: 'closure', sub: 'n=2', kind: 'stack' },
                  { id: 'fn', title: 'operator()', kind: 'static' },
                ],
                edges: [{ from: 'f', to: 'fn', label: 'call' }],
              },
            },
          ],
        },
      },
    ],
  ),
  lab(
    'adl',
    'Unqualified calls also search namespaces associated with the argument types — that is how swap finds std::swap.',
    [
      {
        id: 'lookup',
        title: 'Argument-dependent lookup',
        voice:
          'Write swap of a and b without std colon colon. The compiler looks in the namespaces of a and b. That is why you should not hide std swap, and why using namespace in headers is hostile.',
        stage: {
          type: 'flow',
          steps: [
            { label: 'ordinary lookup', on: true },
            { label: 'associated namespaces of args', on: true },
            { label: 'overload resolution', on: true },
          ],
        },
        try: {
          type: 'pick',
          prompt: 'Why does swap(v.begin(), v.end()) sometimes compile?',
          options: [
            {
              label: 'Unqualified swap(a, b)',
              code: 'using std::swap; swap(a, b);',
              voice: 'The using brings std swap into ordinary lookup. ADL may also find a friend swap in the type’s namespace. This is the idiom.',
              verdict: 'Best swap wins.',
              stage: {
                type: 'compare',
                left: { title: 'ordinary', lines: ['std::swap via using'] },
                right: { title: 'ADL', lines: ['ns::swap if it exists'] },
              },
            },
            {
              label: 'std::swap only',
              code: 'std::swap(a, b);',
              voice: 'You skipped ADL. A user-defined swap that is faster or friendlier never gets a chance. Qualified calls disable ADL.',
              verdict: 'May miss the better swap.',
              stage: {
                type: 'flow',
                steps: [{ label: 'only std::swap', on: true, warn: true }],
              },
            },
          ],
        },
      },
    ],
  ),
]
