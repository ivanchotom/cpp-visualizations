import { lab } from '../make.ts'
import type { Lab } from '../schema.ts'

export const templatesLabs: Lab[] = [
  lab(
    'templates',
    'A template is a recipe. Instantiation stamps out a real function or class for those arguments.',
    [
      {
        id: 'stamp',
        title: 'One recipe, many types',
        voice:
          'Errors often appear at the use site, deep in substitutions. Keep templates thin. The implementation lives in the header so other units can instantiate it.',
        stage: {
          type: 'flow',
          steps: [
            { label: 'template <class T>', on: true },
            { label: 'maxof(1, 2) → int', on: true },
            { label: 'maxof(s, t) → string', on: false },
          ],
        },
        try: {
          type: 'pick',
          prompt: 'Where does the template definition live?',
          options: [
            {
              label: 'In the header',
              voice: 'Every translation unit that calls it can instantiate it. This is the usual rule.',
              verdict: 'Visible recipe. Correct.',
              stage: {
                type: 'compare',
                left: { title: 'header', lines: ['template definition'] },
                right: { title: 'each TU', lines: ['can stamp T=int, T=string'] },
              },
            },
            {
              label: 'Only in a cpp',
              voice: 'Other units see a declaration and cannot instantiate. You get a linker error unless you explicitly instantiate every type.',
              verdict: 'Missing instantiation. Classic trap.',
              stage: {
                type: 'flow',
                steps: [
                  { label: 'caller wants T=double', on: true },
                  { label: 'no recipe in this TU', on: true, warn: true },
                ],
              },
            },
          ],
        },
      },
    ],
    'templates',
  ),
  lab(
    'template-deduction',
    'T is deduced from the arguments. Explicit arguments override deduction. Decay happens unless you take a reference.',
    [
      {
        id: 'deduce',
        title: 'How T is chosen',
        voice:
          'Pass an lvalue int to template T f of T and T is int. Pass it to T amp and T is int, the parameter is int amp. Auto follows similar rules. Braces can become initializer_list in some C++14 corners.',
        stage: {
          type: 'compare',
          left: { title: 'f(x)  x is int', lines: ['T = int', 'by value, copy'] },
          right: { title: 'g(x)  g(T&)', lines: ['T = int', 'parameter is int&'] },
        },
        try: {
          type: 'code',
          prompt: 'Write a call: maxof(1, 2) or maxof<long>(1, 2).',
          starter: `template <typename T>\nconst T& maxof(const T& a, const T& b);\nauto m = maxof(1, 2);`,
          runs: [
            {
              when: ['maxof<'],
              voice: 'You specified T. Deduction still checks that the arguments convert. Explicit wins the type.',
              verdict: 'Explicit template argument.',
              stage: {
                type: 'cells',
                rows: [{ label: 'T', items: [{ label: 'specified', value: 'long' }] }],
              },
            },
            {
              when: ['maxof(1, 2)'],
              voice: 'Both arguments are int. T is int. The reference parameters bind to the literals via temporaries.',
              verdict: 'Deduced T = int.',
              stage: {
                type: 'cells',
                rows: [{ label: 'T', items: [{ label: 'deduced', value: 'int' }] }],
              },
            },
          ],
          fallback: {
            voice: 'Call maxof so I can show the deduced T.',
            verdict: 'Need a call.',
            stage: { type: 'flow', steps: [{ label: 'no call', on: true }] },
          },
        },
      },
    ],
  ),
  lab(
    'variadic-templates',
    'A parameter pack is zero or more arguments. You expand it with ellipsis — you do not loop in C++14 the way you loop at run time.',
    [
      {
        id: 'pack',
        title: 'Expand, do not iterate',
        voice:
          'Sizeof ellipsis pack is a compile-time count. Recursion or comma-fold tricks expand the pack. C++17 fold expressions make this less noisy — that is a looking-ahead note, not this lab.',
        stage: {
          type: 'flow',
          steps: [
            { label: 'print(1, "x", 3.0)', on: true },
            { label: 'head = 1, rest = "x", 3.0', on: true },
            { label: 'recurse', on: true },
          ],
        },
        try: {
          type: 'pick',
          prompt: 'How many types are in the pack?',
          options: [
            {
              label: 'print(1, "x", 3.0)',
              voice: 'Three arguments, three types: int, const char star, double. The recursive overload peels one per step.',
              verdict: 'sizeof...(args) == 3.',
              stage: {
                type: 'cells',
                rows: [
                  {
                    label: 'pack',
                    items: [
                      { label: 'int' },
                      { label: 'const char*' },
                      { label: 'double' },
                    ],
                  },
                ],
              },
            },
            {
              label: 'print()',
              voice: 'Empty pack. You need a base-case overload that takes no extra args or the recursion never stops.',
              verdict: 'sizeof...(args) == 0. Base case.',
              stage: {
                type: 'cells',
                rows: [{ label: 'pack', items: [] }],
              },
            },
          ],
        },
      },
    ],
  ),
  lab(
    'forwarding',
    'T amp amp in a template is a forwarding reference. Pair it with std::forward so value category survives the hop.',
    [
      {
        id: 'fwd',
        title: 'Preserve the category',
        voice:
          'An lvalue binds as T equals U amp, so T amp amp collapses to U amp. An rvalue binds as T equals U, parameter is U amp amp. Std forward restores that. Std move would steal from lvalues too — wrong here.',
        stage: {
          type: 'compare',
          left: { title: 'lvalue arg', lines: ['T = U&', 'T&& → U&', 'forward = lvalue'] },
          right: { title: 'rvalue arg', lines: ['T = U', 'T&& → U&&', 'forward = rvalue'] },
        },
        try: {
          type: 'pick',
          prompt: 'What do you write in the wrapper body?',
          options: [
            {
              label: 'g(std::forward<T>(x))',
              voice: 'Correct. Lvalues stay lvalues. Rvalues stay rvalues. This is the forwarding idiom.',
              verdict: 'Category preserved.',
              stage: {
                type: 'flow',
                steps: [
                  { label: 'wrapper(T&& x)', on: true },
                  { label: 'forward<T>(x)', on: true },
                  { label: 'g(...)', on: true },
                ],
              },
            },
            {
              label: 'g(std::move(x))',
              voice: 'Move unconditionally. An lvalue caller just had their object stolen. Forwarding references are not always rvalues — the name x is an lvalue.',
              verdict: 'Steals from lvalues. Bug.',
              stage: {
                type: 'flow',
                steps: [{ label: 'always xvalue', on: true, warn: true }],
              },
            },
          ],
        },
      },
    ],
    'forwarding',
  ),
  lab(
    'specialization',
    'Full specialization replaces the recipe. Partial is classes only. SFINAE drops a candidate instead of erroring.',
    [
      {
        id: 'sfinae',
        title: 'Substitution failure',
        voice:
          'Enable if on a return type removes the overload when the condition is false. Failure in the function body is still an error. Function templates cannot be partially specialized — overload them.',
        stage: {
          type: 'compare',
          left: { title: 'twice(3)', lines: ['is_integral', 'candidate stays'] },
          right: { title: 'twice(3.14)', lines: ['not integral', 'candidate vanishes'] },
        },
        try: {
          type: 'pick',
          prompt: 'Call twice with int or double.',
          options: [
            {
              label: 'twice(3)',
              voice: 'Substitution succeeds. You get T times two as an integer.',
              verdict: 'Overload selected.',
              stage: {
                type: 'cells',
                rows: [{ label: 'result', items: [{ label: 'int', value: '6' }] }],
              },
            },
            {
              label: 'twice(3.14)',
              voice: 'Enable if failed in the immediate context. This overload is not viable. If it was the only one, you get a no-matching-function error — not a body error.',
              verdict: 'SFINAE removed it.',
              stage: {
                type: 'flow',
                steps: [{ label: 'no viable twice', on: true, warn: true }],
              },
            },
          ],
        },
      },
    ],
    'sfinae',
  ),
  lab(
    'type-traits',
    'Traits are metafunctions: types in, types or bools out. They are compile-time reflection for C++14.',
    [
      {
        id: 'query',
        title: 'Ask the type',
        voice:
          'Is same, is integral, remove reference, decay. C++14 aliases drop colon colon type — enable_if_t, decay_t. Decltype with extra parens is a reference. That surprises people.',
        stage: {
          type: 'compare',
          left: { title: 'decay_t<int&>', lines: ['int'] },
          right: { title: 'decltype((x))', lines: ['int& if x is an lvalue'] },
        },
        try: {
          type: 'pick',
          prompt: 'What does decay do to int&?',
          options: [
            {
              label: 'std::decay_t<int&>',
              voice: 'References and top-level cv fall off, arrays and functions become pointers. You get int.',
              verdict: 'int.',
              stage: {
                type: 'cells',
                rows: [{ label: 'decay', items: [{ label: 'int&', value: '→ int' }] }],
              },
            },
            {
              label: 'decltype((x))',
              voice: 'Extra parentheses make an lvalue expression. Decltype of that is a reference. Decltype of the name x alone is the declared type.',
              verdict: 'Parentheses change everything.',
              stage: {
                type: 'compare',
                left: { title: 'decltype(x)', lines: ['the declared type'] },
                right: { title: 'decltype((x))', lines: ['lvalue → T&'] },
              },
            },
          ],
        },
      },
    ],
  ),
]
