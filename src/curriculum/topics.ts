import type { Topic } from './schema.ts'

export const topics: Topic[] = [
  {
    id: 'compilation',
    title: 'Compilation model',
    blurb: 'Source → object → executable',
    track: 'foundations',
    keywords: ['compiler', 'linker', 'tu', 'odr', 'header', 'object file'],
    viz: 'compilation',
    summary:
      'A C++ program is not “one file that runs.” The compiler translates each translation unit into an object file; the linker stitches those together and resolves names. Most “it compiles but won’t link” bugs live in this gap.',
    facts: [
      {
        label: 'Translation unit',
        body: 'A .cpp after preprocessing — the compiler sees one TU at a time.',
      },
      {
        label: 'ODR',
        body: 'One Definition Rule: each entity has exactly one definition in the program (inline/templates are the structured exceptions).',
      },
      {
        label: 'Declarations vs definitions',
        body: 'Headers declare; a single .cpp usually defines. Duplicate definitions → linker errors.',
      },
      {
        label: 'Linkage',
        body: 'external (visible to linker), internal (this TU only, e.g. static / anonymous namespace).',
      },
    ],
    code: [
      {
        title: 'Typical layout',
        snippet: `// math.hpp
int add(int a, int b);          // declaration

// math.cpp
#include "math.hpp"
int add(int a, int b) {         // definition
  return a + b;
}

// main.cpp
#include "math.hpp"
int main() { return add(1, 2); }`,
        notes: 'Compile each .cpp, then link. Never #include a .cpp.',
      },
    ],
    pitfalls: [
      'Defining a non-inline function in a header included from two TUs → multiple definition error.',
      'Forgetting to compile/link a .cpp that contains a needed definition.',
      'Relying on include order — headers should be self-contained and include what they use.',
    ],
    related: ['preprocessor', 'templates', 'functions'],
    later: [
      {
        standard: 'C++20',
        note: 'Modules replace much of the header/TU model with explicit import/export.',
      },
    ],
  },
  {
    id: 'preprocessor',
    title: 'Preprocessor',
    blurb: 'Text in, text out — before the compiler',
    track: 'foundations',
    keywords: ['#include', '#define', 'macro', 'ifdef', 'pragma once'],
    summary:
      'The preprocessor is a text engine. It pastes headers, expands macros, and strips code behind #if. Prefer the language (constants, inline, templates) over macros whenever you can.',
    facts: [
      {
        label: '#include',
        body: 'Literal paste of a file. Quotes search locally first; angle brackets search the include path.',
      },
      {
        label: 'Include guards',
        body: '#pragma once or classic #ifndef/#define/#endif — stop a header from being pasted twice into one TU.',
      },
      {
        label: 'Macros',
        body: 'Have no scope, no types, and ignore namespaces. They will surprise you.',
      },
      {
        label: 'Conditional compilation',
        body: '#if / #ifdef for platform or debug builds — not for everyday logic.',
      },
    ],
    code: [
      {
        title: 'Guard + constant (prefer the language)',
        snippet: `#pragma once
#include <cstddef>

constexpr std::size_t kMax = 256;   // not #define MAX 256

#if defined(_WIN32)
  void nativeLog(const char*);
#else
  void nativeLog(const char*);
#endif`,
      },
    ],
    pitfalls: [
      'Function-like macros that evaluate arguments twice: #define SQR(x) ((x)*(x)) — SQR(++i) is undefined-ish chaos.',
      'Missing parentheses in macros: #define DOUBLE(x) x+x then 2*DOUBLE(3) → 2*3+3.',
      'Using #define for constants or inline functions — constexpr / inline do it with types.',
    ],
    related: ['compilation', 'constexpr', 'cv-qualifiers'],
  },
  {
    id: 'types',
    title: 'Fundamental types',
    blurb: 'Sizes, ranges, and typical widths',
    track: 'foundations',
    keywords: ['int', 'double', 'bool', 'char', 'size', 'LP64'],
    viz: 'types',
    summary:
      'The standard guarantees minimum sizes and relative ranking, not exact widths. This sheet shows a typical 64-bit LP64 machine (Linux/macOS). Windows uses LLP64: long is 32-bit there.',
    facts: [
      {
        label: 'Ranking',
        body: 'sizeof(char) ≤ sizeof(short) ≤ sizeof(int) ≤ sizeof(long) ≤ sizeof(long long).',
      },
      {
        label: 'int is default',
        body: 'Use int unless you need a specific width or unsigned wraparound. Reach for <cstdint> (int32_t…) when the width is part of the contract.',
      },
      {
        label: 'char ≠ byte always',
        body: 'sizeof(char) is 1 by definition, but CHAR_BIT is usually 8. Signedness of plain char is implementation-defined.',
      },
      {
        label: 'nullptr',
        body: 'Use nullptr (type std::nullptr_t), never NULL or 0, for pointers.',
      },
    ],
    code: [
      {
        title: 'Fixed-width when size matters',
        snippet: `#include <cstdint>
#include <cstddef>

std::int32_t  id = 0;
std::uint64_t mask = 0;
std::size_t   n = 0;     // unsigned, object size / index`,
      },
    ],
    pitfalls: [
      'Assuming long is 64-bit — false on Windows (LLP64).',
      'Mixing signed and unsigned in comparisons: -1 < 1u is false because -1 converts to a huge unsigned.',
      'Using float for money or exact decimals.',
    ],
    related: ['cv-qualifiers', 'layout', 'literals', 'enums'],
  },
  {
    id: 'cv-qualifiers',
    title: 'const, volatile, mutable',
    blurb: 'What you may change, and when',
    track: 'foundations',
    keywords: ['const', 'constexpr', 'mutable', 'volatile', 'const-correct'],
    summary:
      'const is a compile-time promise: this object will not be mutated through this name. It is the backbone of APIs that are safe to reason about. volatile is almost never what you want in application code.',
    facts: [
      {
        label: 'const applies to the thing on its left',
        body: 'int const* p (pointer to const int) vs int* const p (const pointer to int). Read right-to-left.',
      },
      {
        label: 'Member functions',
        body: 'void f() const means *this is const — you may only call other const members.',
      },
      {
        label: 'mutable',
        body: 'A data member that may change even in a const member function (caches, mutexes).',
      },
      {
        label: 'volatile',
        body: 'Tells the compiler “this can change out of band.” For memory-mapped hardware, not for threads — use atomics.',
      },
    ],
    code: [
      {
        title: 'Read declarations inside-out',
        snippet: `int x = 1;
const int* pc = &x;     // cannot write *pc
int* const cp = &x;     // cannot reseat cp
const int* const cpc = &x;

struct Counter {
  int value = 0;
  mutable int hits = 0;
  int get() const { ++hits; return value; }
};`,
      },
    ],
    pitfalls: [
      'const on a pointer itself vs on the pointee — the * position changes the meaning.',
      'Casting away const (const_cast) and then mutating a truly const object is undefined behavior.',
      'volatile does not make operations atomic or provide a memory barrier.',
    ],
    related: ['const-correctness', 'pointers-refs', 'constexpr', 'concurrency'],
  },
  {
    id: 'literals',
    title: 'Literals & initialization',
    blurb: 'How values enter the language',
    track: 'foundations',
    keywords: ['literal', 'auto', 'brace', 'uniform init', 'nullptr'],
    summary:
      'A literal has a type. Initialization syntax decides what that type becomes in a variable, and whether narrowing is allowed. Brace initialization is the modern default because it refuses silent narrowing.',
    facts: [
      {
        label: 'Integer suffixes',
        body: '42, 42u, 42l, 42ll, 0x2A, 052 (octal). Type is the first that fits in the list for that literal kind.',
      },
      {
        label: 'Floating',
        body: '3.14 is double; 3.14f is float; 3.14L is long double.',
      },
      {
        label: 'Brace init',
        body: 'int x{3.14}; is an error. int x = 3.14; silently truncates. Prefer braces.',
      },
      {
        label: 'auto + braces',
        body: 'In C++14, auto x{1}; is a subtle corner — prefer auto x = 1; or explicit types with braces.',
      },
    ],
    code: [
      {
        title: 'Prefer braces; be explicit with auto',
        snippet: `int a{42};
double pi{3.14159};
auto n = 10;                 // int
auto s = std::string{"hi"};
char utf8[] = u8"café";      // UTF-8 string literal
auto p = nullptr;            // std::nullptr_t`,
      },
    ],
    pitfalls: [
      'Narrowing through = initialization: int n = 1.9; compiles, n == 1.',
      'Leading 0 means octal: int x = 010; is 8.',
      'auto x{1, 2}; is ill-formed; std::initializer_list surprises with auto.',
    ],
    related: ['types', 'conversions', 'functions'],
    later: [
      {
        standard: 'C++17',
        note: 'auto x{1}; became a plain int (not initializer_list). Guaranteed copy elision for prvalues.',
      },
    ],
  },
  {
    id: 'operators',
    title: 'Operators & precedence',
    blurb: 'What binds tighter than what',
    track: 'foundations',
    keywords: ['precedence', 'associativity', 'overload', 'short-circuit'],
    viz: 'operators',
    summary:
      'When in doubt, use parentheses. Precedence is real, but readers should not have to recite the table. Short-circuit && and || skip the right-hand side — a feature and a footgun.',
    facts: [
      {
        label: 'Highest → lowest (sketch)',
        body: '::  then postfix () [] ->  then unary  then * / %  then + -  then << >>  then comparisons  then ==  then bitops  then && ||  then ?:  then assignment  then throw  then comma.',
      },
      {
        label: 'Associativity',
        body: 'Most binary ops are left-to-right. Assignment and ?: are right-to-left: a = b = 1 assigns 1 to b, then to a.',
      },
      {
        label: 'Overloadable',
        body: 'Almost all operators can be overloaded except :: . .* ?: sizeof typeid.',
      },
      {
        label: 'Sequence',
        body: 'C++14 has sequenced-before rules. i = i++ is undefined. Don’t modify an object twice between sequence points / without sequencing.',
      },
    ],
    code: [
      {
        title: 'Parentheses beat trivia',
        snippet: `if (flags & MASK == 0) { }      // parsed as flags & (MASK == 0)
if ((flags & MASK) == 0) { }    // what you meant

std::cout << a ? b : c;         // parsed as (cout << a) ? b : c
std::cout << (a ? b : c);`,
      },
    ],
    pitfalls: [
      'Bitwise vs comparison precedence — always parenthesize & | ^ with ==.',
      'Overloaded << for streams vs bit shift: same token, very different intent.',
      'Comma operator in for-loops is fine; comma anywhere else is usually a bug.',
    ],
    related: ['operator-overloading', 'control-flow', 'undefined-behavior'],
  },
  {
    id: 'control-flow',
    title: 'Control flow',
    blurb: 'if, switch, loops, jump',
    track: 'foundations',
    keywords: ['if', 'switch', 'for', 'while', 'break', 'goto'],
    summary:
      'Structured control is boring on purpose. Prefer range-for for containers, switch for dense integer dispatch, and keep goto in the museum except for a few low-level cleanup patterns you will rarely need.',
    facts: [
      {
        label: 'if / else',
        body: 'Condition converts to bool. In C++14 you cannot declare in if (int x = f(); x) — that arrives later.',
      },
      {
        label: 'switch',
        body: 'Integral / enum types. Cases fall through unless you break (or return). A default is not required but often wise.',
      },
      {
        label: 'Loops',
        body: 'while, do-while, for. Range-based for (C++11): for (auto& x : xs).',
      },
      {
        label: 'jump',
        body: 'break, continue, return, throw. goto exists; you almost never want it.',
      },
    ],
    code: [
      {
        title: 'Range-for and a deliberate fallthrough',
        snippet: `for (const auto& item : items) {
  if (item.skip) continue;
  use(item);
}

switch (kind) {
  case Kind::A:
  case Kind::B:  // fall through on purpose
    handleAB();
    break;
  default:
    handleOther();
    break;
}`,
      },
    ],
    pitfalls: [
      'switch fallthrough without a comment is a defect in review.',
      'for (auto x : vec) copies every element — use auto& or const auto&.',
      'Modifying a container while range-for iterating it can invalidate the iteration.',
    ],
    related: ['iterators', 'exceptions', 'literals'],
    later: [
      {
        standard: 'C++17',
        note: 'if/switch init-statements: if (auto it = m.find(k); it != m.end()).',
      },
    ],
  },
  {
    id: 'scope-namespaces',
    title: 'Scope, lifetime, namespaces',
    blurb: 'Who can see a name, how long it lives',
    track: 'foundations',
    keywords: ['scope', 'namespace', 'static', 'global', 'ADL'],
    summary:
      'Scope is visibility. Lifetime is how long the object exists. They often line up (a local lives until its block ends) and sometimes don’t (new lives until delete; static locals live until program exit).',
    facts: [
      {
        label: 'Block scope',
        body: 'A local automatic object is destroyed in reverse order of construction when the block ends.',
      },
      {
        label: 'static local',
        body: 'Initialized the first time control passes through the declaration; destroyed at program end.',
      },
      {
        label: 'namespace',
        body: 'A named scope. Prefer named namespaces over static at namespace scope. using namespace std; does not belong in headers.',
      },
      {
        label: 'ADL',
        body: 'Argument-dependent lookup: swap(a, b) can find std::swap via the types of a and b.',
      },
    ],
    code: [
      {
        title: 'Namespaces and a Meyers singleton',
        snippet: `namespace app {
inline namespace v1 {
  int version();
}
}

int counter() {
  static int n = 0;   // one n for the whole program
  return ++n;
}`,
      },
    ],
    pitfalls: [
      'using namespace std; in a header pollutes every TU that includes it.',
      'Static initialization order across TUs (“SIOF”) is unspecified — don’t have globals depend on other globals.',
      'A reference bound to a function-local that already died is a dangling reference.',
    ],
    related: ['lifetime', 'stack-heap', 'adl'],
  },
  {
    id: 'conversions',
    title: 'Conversions & casts',
    blurb: 'Implicit vs named, and the four casts',
    track: 'foundations',
    keywords: ['static_cast', 'const_cast', 'reinterpret_cast', 'dynamic_cast', 'narrowing'],
    summary:
      'C++ converts more eagerly than you might like. Named casts document intent. C-style (T)x is a blunt instrument that can mix several cast kinds — avoid it.',
    facts: [
      {
        label: 'static_cast',
        body: 'Well-defined related conversions: numeric, void*, upcast, explicit constructors.',
      },
      {
        label: 'dynamic_cast',
        body: 'Safe downcast of polymorphic types. Pointer → nullptr on failure; reference → throws std::bad_cast.',
      },
      {
        label: 'const_cast',
        body: 'Add/remove const/volatile. Mutating an object that was defined const is UB.',
      },
      {
        label: 'reinterpret_cast',
        body: 'Type punning of pointers/integers. Almost always a smell; memcpy / bit_cast (later) are safer.',
      },
    ],
    code: [
      {
        title: 'Name the conversion',
        snippet: `double d = 3.9;
auto n = static_cast<int>(d);     // 3, explicit

Base* b = new Derived;
auto* p = dynamic_cast<Derived*>(b);
if (p) p->derivedOnly();

// int* ip = (int*)dp;            // don't: C-style`,
      },
    ],
    pitfalls: [
      'Implicit narrowing and signed/unsigned mixes in arithmetic.',
      'dynamic_cast requires a polymorphic source (virtual function) and RTTI enabled.',
      'reinterpret_cast between unrelated object types and then dereferencing is usually UB (strict aliasing).',
    ],
    related: ['types', 'polymorphism', 'undefined-behavior', 'literals'],
    later: [
      { standard: 'C++20', note: 'std::bit_cast<T> for safe type punning of trivially copyable objects.' },
    ],
  },
  {
    id: 'stack-heap',
    title: 'Stack vs heap',
    blurb: 'Automatic storage vs free store',
    track: 'memory',
    keywords: ['stack', 'heap', 'new', 'automatic', 'free store'],
    viz: 'stack-heap',
    summary:
      'Automatic (“stack”) objects appear when a function is entered and vanish when it returns — fast, exception-safe, cache-friendly. Free-store (“heap”) objects live until you release them. Default to the stack; use the heap when lifetime must outlast the function or size is unknown.',
    facts: [
      {
        label: 'Stack',
        body: 'Per-thread, grows/shrinks with calls. Huge locals can overflow it.',
      },
      {
        label: 'Free store',
        body: 'new / delete (or allocators). Flexible lifetime, slower, fragmentation, leaks if you forget.',
      },
      {
        label: 'RAII',
        body: 'Put heap ownership inside a stack object (unique_ptr, containers) so cleanup is automatic.',
      },
      {
        label: 'Static storage',
        body: 'Globals and static locals live for the program — neither stack nor heap.',
      },
    ],
    code: [
      {
        title: 'Stack by default, heap behind RAII',
        snippet: `void f() {
  Widget w;                         // stack
  auto p = std::make_unique<Widget>(); // heap, owned
  std::vector<int> xs(1000);        // buffer on heap, vector on stack
}`,
      },
    ],
    pitfalls: [
      'Returning a pointer/reference to a local automatic object.',
      'new without a matching owner — leaks or double-delete.',
      'Recursion + large stack arrays → stack overflow.',
    ],
    related: ['new-delete', 'smart-pointers', 'lifetime', 'pointers-refs'],
  },
  {
    id: 'pointers-refs',
    title: 'Pointers & references',
    blurb: 'Addresses vs aliases',
    track: 'memory',
    keywords: ['pointer', 'reference', '&', '*', 'nullptr'],
    viz: 'pointers',
    summary:
      'A pointer is an object that holds an address; it can be reseated, be null, and participate in arithmetic. A reference is another name for an existing object; it cannot be null and cannot be reseated. Prefer references in APIs, pointers when absence or reseating is part of the design.',
    facts: [
      {
        label: 'Pointer',
        body: 'T* p; p = &x; *p is the pointee. Can be nullptr.',
      },
      {
        label: 'Reference',
        body: 'T& r = x; r is x. Must bind at initialization.',
      },
      {
        label: 'Pointer arithmetic',
        body: 'Valid only within an array (or one-past-the-end). Anything else is UB.',
      },
      {
        label: 'const T&',
        body: 'The default for read-only parameters that are not cheap to copy.',
      },
    ],
    code: [
      {
        title: 'Reseat a pointer, not a reference',
        snippet: `int a = 1, b = 2;
int* p = &a;
p = &b;          // ok
*p = 9;          // b is 9

int& r = a;
r = b;           // assigns to a, does not reseat r
// int& n;       // error: must bind`,
      },
    ],
    pitfalls: [
      'Dangling: pointer/reference to an object whose lifetime ended.',
      'Forgetting that r = b assigns through the reference.',
      'Using a pointer after delete (use-after-free).',
    ],
    related: ['stack-heap', 'pass-by', 'arrays', 'cv-qualifiers'],
  },
  {
    id: 'arrays',
    title: 'Arrays & C-strings',
    blurb: 'Fixed buffers and the decay trap',
    track: 'memory',
    keywords: ['array', 'decay', 'cstring', 'std::array', 'vector'],
    summary:
      'Built-in arrays are a raw block of objects. They decay to a pointer at the slightest excuse, losing their length. Prefer std::array for fixed size and std::vector for dynamic size. C-strings are arrays of char terminated by \\0.',
    facts: [
      {
        label: 'Decay',
        body: 'T[N] becomes T* when passed to a function — sizeof no longer yields the array size.',
      },
      {
        label: 'std::array',
        body: 'A thin aggregate around T[N] that knows its size and can be copied.',
      },
      {
        label: 'std::vector',
        body: 'Dynamic array: contiguous, size/capacity, reallocates as needed.',
      },
      {
        label: 'C-string',
        body: 'char s[] = "hi"; is {\'h\',\'i\',\'\\0\'}. Use std::string unless an API demands char*.',
      },
    ],
    code: [
      {
        title: 'Keep the length',
        snippet: `#include <array>
#include <vector>

void takePtr(int* p, std::size_t n);

std::array<int, 4> a{{1, 2, 3, 4}};
takePtr(a.data(), a.size());

std::vector<int> v{1, 2, 3};
v.push_back(4);`,
      },
    ],
    pitfalls: [
      'Using sizeof(array_param) inside a function — you get sizeof(pointer).',
      'Buffer overflow on C-strings (strcpy, sprintf). Prefer std::string / snprintf.',
      'new T[n] must be delete[] — mismatch with delete is UB.',
    ],
    related: ['pointers-refs', 'containers', 'string', 'new-delete'],
  },
  {
    id: 'layout',
    title: 'Object layout',
    blurb: 'Alignment, padding, sizeof',
    track: 'memory',
    keywords: ['align', 'padding', 'struct', 'sizeof', 'alignof'],
    viz: 'layout',
    summary:
      'Members are laid out in order. Each one starts at an offset that is a multiple of its alignment. The compiler inserts padding so that is true, then rounds the struct size to a multiple of the strictest member alignment.',
    facts: [
      {
        label: 'alignof(T)',
        body: 'Addresses of T must be 0 mod this value. Usually equal to sizeof for scalars.',
      },
      {
        label: 'Order matters',
        body: 'Largest-to-smallest members often pack tighter than mixed sizes.',
      },
      {
        label: 'Empty base',
        body: 'Empty base optimization can make a base take zero extra size; empty members still take at least 1 byte.',
      },
      {
        label: '#pragma pack',
        body: 'Can crush padding for wire formats — misaligned access and non-portable ABIs await.',
      },
    ],
    code: [
      {
        title: 'Padding you can see',
        snippet: `struct Bad  { char c; int n; double d; };
struct Good { double d; int n; char c; };
// inspect sizeof / the visualizer — Good usually packs tighter`,
      },
    ],
    pitfalls: [
      'Sending a struct over the network by memcpy of padding — padding is not part of your protocol.',
      'Assuming members occupy consecutive bytes.',
      'Bit-fields and virtual bases have extra layout rules (vtables, vbptrs).',
    ],
    related: ['types', 'inheritance', 'unions-bitfields'],
  },
  {
    id: 'value-categories',
    title: 'Value categories',
    blurb: 'lvalue, xvalue, prvalue',
    track: 'memory',
    keywords: ['lvalue', 'rvalue', 'xvalue', 'prvalue', 'glvalue', 'move'],
    viz: 'value-categories',
    summary:
      'Every expression is an lvalue, xvalue, or prvalue. Roughly: lvalues have identity and you cannot steal from them; prvalues are pure incoming values; xvalues are “expiring” objects you are allowed to steal from (the result of std::move).',
    facts: [
      {
        label: 'glvalue',
        body: 'lvalue ∪ xvalue — has identity (you can take its address, in spirit).',
      },
      {
        label: 'rvalue',
        body: 'xvalue ∪ prvalue — may be moved from.',
      },
      {
        label: 'std::move',
        body: 'An unconditional cast to T&&. It does not move; it marks the expression as an xvalue.',
      },
      {
        label: 'T&& vs auto&&',
        body: 'T&& in a template is a forwarding reference if T is deduced. A named rvalue reference is an lvalue.',
      },
    ],
    code: [
      {
        title: 'A named rvalue reference is an lvalue',
        snippet: `void take(std::string&& s);

void wrap(std::string&& s) {
  // take(s);            // error: s is an lvalue
  take(std::move(s));    // ok: xvalue
}`,
      },
    ],
    pitfalls: [
      'Returning std::move(local) can block NRVO — just return local;',
      'Using an object after std::move without reassigning — the object is valid but unspecified.',
      'Overloading on T const& and T&& and forgetting the const lvalue case is usually OK; forgetting T& can bite with non-const lvalues if you only have &&.',
    ],
    related: ['copy-move', 'pass-by', 'lambdas'],
  },
  {
    id: 'copy-move',
    title: 'Copy & move',
    blurb: 'Duplicate vs steal',
    track: 'memory',
    keywords: ['copy', 'move', 'rule of five', 'noexcept'],
    viz: 'copy-move',
    summary:
      'Copying duplicates resources. Moving transfers them and leaves the source in a valid empty-ish state. Moves should be noexcept when possible — std::vector relocates elements with move only if it cannot throw.',
    facts: [
      {
        label: 'Copy ctor / copy assign',
        body: 'T(const T&) and T& operator=(const T&).',
      },
      {
        label: 'Move ctor / move assign',
        body: 'T(T&&) and T& operator=(T&&). Steal pointers, null out the source.',
      },
      {
        label: 'Rule of five',
        body: 'If you write one special member, consider all five (or delete them). Prefer Rule of Zero.',
      },
      {
        label: 'Trivial vs nontrivial',
        body: 'Trivially copyable types can memcpy. Most types with pointers cannot.',
      },
    ],
    code: [
      {
        title: 'A move that steals a buffer',
        snippet: `struct Buf {
  std::size_t n = 0;
  char* p = nullptr;

  Buf(Buf&& o) noexcept : n(o.n), p(o.p) {
    o.n = 0;
    o.p = nullptr;
  }
  Buf& operator=(Buf&& o) noexcept {
    if (this == &o) return *this;
    delete[] p;
    n = o.n; p = o.p;
    o.n = 0; o.p = nullptr;
    return *this;
  }
  ~Buf() { delete[] p; }
};`,
      },
    ],
    pitfalls: [
      'Throwing move constructors make vector fall back to copy on reallocation.',
      'Forgetting to handle self-move-assignment.',
      'Writing a destructor and not deleting or defining copy/move — the compiler still generates copies that may double-free.',
    ],
    related: ['special-members', 'rule-of-zero', 'value-categories', 'smart-pointers'],
  },
  {
    id: 'new-delete',
    title: 'new & delete',
    blurb: 'Bare allocation, and why to hide it',
    track: 'memory',
    keywords: ['new', 'delete', 'nothrow', 'placement new', 'allocator'],
    summary:
      'new T allocates and constructs; delete p destroys and deallocates. new T[n] pairs with delete[]. You almost never write these in application code — unique_ptr, vector, and make_unique wrap them.',
    facts: [
      {
        label: 'new T',
        body: 'Calls operator new, then constructor. Throws std::bad_alloc on failure (unless nothrow).',
      },
      {
        label: 'delete p',
        body: 'Destructor, then operator delete. delete nullptr is safe.',
      },
      {
        label: 'Arrays',
        body: 'new[] / delete[] — mixing with non-array forms is UB.',
      },
      {
        label: 'Placement new',
        body: 'new (addr) T(args) constructs in existing storage. You must ~T() manually.',
      },
    ],
    code: [
      {
        title: 'Hide new behind an owner',
        snippet: `auto w = std::make_unique<Widget>(42);

// rare: placement
alignas(Widget) unsigned char buf[sizeof(Widget)];
Widget* p = new (buf) Widget(1);
p->~Widget();`,
      },
    ],
    pitfalls: [
      'Every new needs exactly one matching delete of the right form.',
      'Exception between new and the pointer being stored → leak. make_unique closes that window.',
      'delete on a pointer to base without virtual destructor → UB.',
    ],
    related: ['smart-pointers', 'stack-heap', 'exceptions', 'polymorphism'],
  },
  {
    id: 'functions',
    title: 'Functions',
    blurb: 'Declarations, defaults, inline',
    track: 'functions',
    keywords: ['function', 'inline', 'default argument', 'trailing return'],
    summary:
      'A function declaration names a callable. Definitions live in one TU unless the function is inline (or a template). Default arguments are filled in at the call site from the declaration the caller sees.',
    facts: [
      {
        label: 'Signature',
        body: 'Name + parameter types (not names, not return type) identify overloads. cv / ref-qualifiers on members count.',
      },
      {
        label: 'Default args',
        body: 'Only in a declaration, once. Callers that don’t see the default don’t get it.',
      },
      {
        label: 'inline',
        body: 'Allows the same definition in multiple TUs. A hint, not a command, to the inliner.',
      },
      {
        label: 'Trailing return',
        body: 'auto f() -> int; useful when the return type uses parameter names or decltype.',
      },
    ],
    code: [
      {
        title: 'Defaults and trailing return',
        snippet: `int scale(int x, int factor = 2);

auto add(int a, int b) -> int {
  return a + b;
}`,
      },
    ],
    pitfalls: [
      'Default arguments in a virtual override that differ from the base — dispatch uses the static type’s defaults.',
      'Putting non-inline function definitions in headers.',
      'Ambiguous overloads after default arguments are filled in.',
    ],
    related: ['overloading', 'function-pointers', 'pass-by'],
  },
  {
    id: 'overloading',
    title: 'Overload resolution',
    blurb: 'Which f() did you mean?',
    track: 'functions',
    keywords: ['overload', 'ADL', 'viable', 'best match'],
    summary:
      'The compiler builds a set of viable functions, then ranks conversions. Identity beats promotion beats standard conversion beats user-defined conversion. If two winners tie, the program is ill-formed.',
    facts: [
      {
        label: 'Viable',
        body: 'Right number of args (after defaults), and each arg can convert.',
      },
      {
        label: 'ICS rank',
        body: 'Exact match > promotion (short→int, float→double) > standard conversion > user-defined.',
      },
      {
        label: 'deleted',
        body: 'A deleted overload still participates — it can win and then error. Useful to ban copies.',
      },
      {
        label: 'ADL',
        body: 'Unqualified calls also search namespaces associated with the argument types.',
      },
    ],
    code: [
      {
        title: 'A deleted overload that wins',
        snippet: `void draw(int);
void draw(double) = delete;

draw(1);      // ok, int
// draw(1.2); // error: double overload is deleted`,
      },
    ],
    pitfalls: [
      'bool and integer overloads: a pointer converts to bool surprisingly well.',
      'initializer_list constructors being greedy with braces.',
      'Using-declaration of a base function is needed if you overload in the derived class (otherwise the base is hidden).',
    ],
    related: ['functions', 'conversions', 'adl', 'templates'],
  },
  {
    id: 'pass-by',
    title: 'Passing arguments',
    blurb: 'Value, reference, pointer, forward',
    track: 'functions',
    keywords: ['by value', 'const T&', 'T&&', 'forward', 'sink'],
    viz: 'pass-by',
    summary:
      'Cheap small types: pass by value. Read-only bigger types: const T&. Transfer ownership: T by value (then move inside) or T&&. Optional/reseatable: T*. In templates, T&& is a forwarding reference — pair with std::forward.',
    facts: [
      {
        label: 'By value',
        body: 'Caller’s object is copied (or moved). Callee owns a distinct instance.',
      },
      {
        label: 'const T&',
        body: 'No copy. Cannot mutate. Can bind to temporaries.',
      },
      {
        label: 'T&',
        body: 'Out-parameter / in-out. Cannot bind to a temporary.',
      },
      {
        label: 'Forwarding',
        body: 'template<class T> void f(T&& x) { g(std::forward<T>(x)); } preserves value category.',
      },
    ],
    code: [
      {
        title: 'A sink parameter',
        snippet: `void store(std::string name) {  // by value: copy or move
  names_.push_back(std::move(name));
}

store(local);                 // copies
store(std::move(local));      // moves
store(std::string{"tmp"});    // constructs into the parameter`,
      },
    ],
    pitfalls: [
      'Passing a huge object by value accidentally in a hot loop.',
      'T&& on a non-template function is just an rvalue reference — it will not bind to lvalues.',
      'std::forward only on forwarding references, std::move on owned rvalues you are done with.',
    ],
    related: ['value-categories', 'copy-move', 'forwarding', 'smart-pointers'],
  },
  {
    id: 'lambdas',
    title: 'Lambdas',
    blurb: 'Inline function objects',
    track: 'functions',
    keywords: ['lambda', 'capture', 'closure', 'generic lambda'],
    summary:
      'A lambda is syntactic sugar for a unique unnamed class with operator(). Captures become members. In C++14, generic lambdas (auto parameters) and init-captures are available.',
    facts: [
      {
        label: 'Capture',
        body: '[] none, [=] copy, [&] ref, [x] copy x, [&x] ref x, [x = expr] init-capture (C++14).',
      },
      {
        label: 'mutable',
        body: 'Allows operator() to modify captured-by-value members.',
      },
      {
        label: 'Generic',
        body: '[](auto x) { return x + 1; } is a template operator() (C++14).',
      },
      {
        label: 'Stateless',
        body: 'A captureless lambda converts to a function pointer.',
      },
    ],
    code: [
      {
        title: 'Init-capture a unique_ptr (C++14)',
        snippet: `auto p = std::make_unique<int>(7);
auto f = [p = std::move(p)]() {
  return *p;
};
f();`,
      },
    ],
    pitfalls: [
      '[&] then returning the lambda from the function — dangling references.',
      'Capturing this by accident in [=] (C++14 copies the pointer, not the object).',
      'Huge [=] captures copying entire containers — capture a reference or a view of what you need.',
    ],
    related: ['functions', 'copy-move', 'algorithms', 'value-categories'],
    later: [
      {
        standard: 'C++20',
        note: 'Templated lambdas, captureless lambdas in unevaluated contexts, pack expansion in capture.',
      },
    ],
  },
  {
    id: 'constexpr',
    title: 'constexpr & compile time',
    blurb: 'Work the compiler can finish for you',
    track: 'functions',
    keywords: ['constexpr', 'const', 'compile time', 'C++14'],
    summary:
      'constexpr means “can be evaluated at compile time if the inputs are constant.” C++14 relaxed constexpr functions: loops, locals, mutation of locals are allowed. It is not the same as const.',
    facts: [
      {
        label: 'constexpr variable',
        body: 'Must be initialized by a constant expression. Implicitly const.',
      },
      {
        label: 'constexpr function',
        body: 'May run at compile time or run time depending on the call.',
      },
      {
        label: 'What C++14 allows',
        body: 'More than one statement, local variables, if/for, mutating locals. Still no try, goto, or uninitialized locals.',
      },
      {
        label: 'When it runs at compile time',
        body: 'Required if used in a context that needs a constant (array bound, case label, template arg).',
      },
    ],
    code: [
      {
        title: 'C++14 constexpr with a loop',
        snippet: `constexpr int pow2(int n) {
  int r = 1;
  for (int i = 0; i < n; ++i) r *= 2;
  return r;
}

constexpr int table_size = pow2(10);  // 1024, compile time
int k = pow2(x);                      // run time if x is not const`,
      },
    ],
    pitfalls: [
      'Marking something constexpr does not magically make I/O or heap allocation legal in C++14.',
      'A constexpr function called with a runtime value is just a normal function.',
      'Floating-point constexpr results can still surprise across platforms.',
    ],
    related: ['cv-qualifiers', 'templates', 'functions'],
    later: [
      {
        standard: 'C++20',
        note: 'consteval (must be compile time), constinit, constexpr new/vector/string in limited forms.',
      },
    ],
  },
  {
    id: 'classes',
    title: 'Classes',
    blurb: 'Members, access, construction',
    track: 'classes',
    keywords: ['class', 'struct', 'public', 'private', 'this'],
    summary:
      'A class is a user-defined type: data + functions + invariants. struct and class are the same except default access (public vs private) and default inheritance. Keep data private and enforce invariants in constructors.',
    facts: [
      {
        label: 'Access',
        body: 'public API, private implementation, protected for derived classes. Friendship punches a hole — use sparingly.',
      },
      {
        label: 'this',
        body: 'T* in a non-const member, T const* in a const member.',
      },
      {
        label: 'In-class initializers',
        body: 'int n = 0; used if a constructor doesn’t mention n in its mem-initializer list.',
      },
      {
        label: 'aggregates',
        body: 'No user ctor, no private/protected non-static data, no virtuals, no virtual/private bases… can be brace-initialized.',
      },
    ],
    code: [
      {
        title: 'Invariant in the constructor',
        snippet: `class Ratio {
public:
  Ratio(int n, int d) : num_(n), den_(d) {
    if (den_ == 0) throw std::invalid_argument("den");
  }
  int num() const { return num_; }
  int den() const { return den_; }
private:
  int num_;
  int den_;
};`,
      },
    ],
    pitfalls: [
      'Public data with no invariant — that’s a struct DTO, not an encapsulated type.',
      'Doing virtual calls in constructors — the derived part isn’t constructed yet.',
      'Forgetting to initialize members in the initializer list (declaration order is construction order).',
    ],
    related: ['special-members', 'lifetime', 'inheritance', 'const-correctness'],
  },
  {
    id: 'special-members',
    title: 'Special member functions',
    blurb: 'The five the compiler may write',
    track: 'classes',
    keywords: ['destructor', 'copy', 'move', 'rule of five', 'default'],
    summary:
      'Default ctor, destructor, copy ctor, copy assign, move ctor, move assign. The compiler generates them under specific rules. If you define one, look at all of them. =default and =delete make intent explicit.',
    facts: [
      {
        label: 'Default ctor',
        body: 'Generated if no user-declared constructor exists.',
      },
      {
        label: 'Copy',
        body: 'Generated if you don’t declare it; suppressed if you declare a move.',
      },
      {
        label: 'Move',
        body: 'Generated if you declare no copy, destructor, or move. Otherwise often absent.',
      },
      {
        label: '=delete / =default',
        body: 'Delete the copy to make a type move-only (unique_ptr). Default to get the obvious implementation back.',
      },
    ],
    code: [
      {
        title: 'Move-only type',
        snippet: `class Handle {
public:
  Handle() = default;
  Handle(const Handle&) = delete;
  Handle& operator=(const Handle&) = delete;
  Handle(Handle&&) noexcept = default;
  Handle& operator=(Handle&&) noexcept = default;
  ~Handle() = default;
};`,
      },
    ],
    pitfalls: [
      'User-declared destructor suppresses implicit moves (C++11/14 rules) — your class silently starts copying.',
      'Generating a copy of a type that owns a raw pointer → double free.',
      'Declaring an empty destructor “for virtuality” without =default on moves.',
    ],
    related: ['copy-move', 'rule-of-zero', 'pimpl'],
  },
  {
    id: 'lifetime',
    title: 'Object lifetime',
    blurb: 'Ctor order, dtor order',
    track: 'classes',
    keywords: ['constructor', 'destructor', 'order', 'RAII'],
    viz: 'lifetime',
    summary:
      'Construction: bases (left-to-right, depth-first), then members in declaration order, then the constructor body. Destruction is the exact reverse. This is why RAII works: members clean up even if a later member’s constructor throws.',
    facts: [
      {
        label: 'Mem-initializer list',
        body: 'Writes the initial value, but order is still declaration order — list order is ignored.',
      },
      {
        label: 'Delegating ctor',
        body: 'A() : A(0) {} runs the target fully, then the delegating body.',
      },
      {
        label: 'Virtual bases',
        body: 'Constructed first by the most-derived class (diamond inheritance).',
      },
      {
        label: 'Temporary',
        body: 'Destroyed at the end of the full-expression, unless bound to a reference that extends life.',
      },
    ],
    code: [
      {
        title: 'Declaration order wins',
        snippet: `struct S {
  int a;
  int b;
  S(int x) : b(x), a(b) {}  // a is initialized FIRST — b is still junk
};`,
      },
    ],
    pitfalls: [
      'Initializing members in the list in a different order than they are declared — misleading, and uses of later members are wrong.',
      'Throwing from a destructor — during unwind this calls std::terminate.',
      'Reference members and const members cannot be rebound; they freeze the Rule of Zero.',
    ],
    related: ['classes', 'exceptions', 'stack-heap', 'rule-of-zero'],
  },
  {
    id: 'inheritance',
    title: 'Inheritance',
    blurb: 'is-a, bases, and object layout',
    track: 'classes',
    keywords: ['base', 'derived', 'virtual inheritance', 'override'],
    viz: 'inheritance',
    summary:
      'Public inheritance models is-a. Protected/private inheritance is rarely the right tool (it’s “implemented-in-terms-of”). Multiple inheritance is legal; the diamond problem is why virtual inheritance exists. Prefer composition unless you truly need polymorphism.',
    facts: [
      {
        label: 'public Derived : Base',
        body: 'Derived is-a Base. Implicit Derived* → Base*.',
      },
      {
        label: 'virtual Base',
        body: 'One shared Base subobject in a diamond. Layout includes a vbptr; construction is special.',
      },
      {
        label: 'override / final',
        body: 'C++11: override makes a typo a compile error. final blocks further overrides or derivation.',
      },
      {
        label: 'slicing',
        body: 'Assigning Derived to a Base by value drops the derived part.',
      },
    ],
    code: [
      {
        title: 'override is non-negotiable',
        snippet: `struct Base {
  virtual void step(int n);
  virtual ~Base() = default;
};
struct Derived : Base {
  void step(int n) override;
};`,
      },
    ],
    pitfalls: [
      'Object slicing by putting polymorphic types in containers by value — store unique_ptr<Base>.',
      'Non-virtual destructor on a base you delete through.',
      'Overusing inheritance for code reuse — a private member does it without an is-a lie.',
    ],
    related: ['polymorphism', 'layout', 'lifetime', 'special-members'],
  },
  {
    id: 'polymorphism',
    title: 'Virtual functions',
    blurb: 'Dynamic dispatch and vtables',
    track: 'classes',
    keywords: ['virtual', 'vtable', 'override', 'pure virtual'],
    viz: 'vtable',
    summary:
      'virtual means “call the most-derived override at runtime.” Compilers typically implement this with a vptr in the object pointing at a vtable of function pointers. You pay a slot in the object and an indirect call.',
    facts: [
      {
        label: 'Dynamic type',
        body: 'The real type of the object, not the type of the pointer/reference you hold.',
      },
      {
        label: 'Pure virtual',
        body: 'virtual void f() = 0; makes the class abstract. You can still define f() for derived calls to Base::f().',
      },
      {
        label: 'virtual dtor',
        body: 'Required if you delete through Base*.',
      },
      {
        label: 'NVI',
        body: 'Non-Virtual Interface: public non-virtual wraps a private virtual — a stable public API.',
      },
    ],
    code: [
      {
        title: 'NVI sketch',
        snippet: `class Shape {
public:
  void draw() const { doDraw(); }   // non-virtual
  virtual ~Shape() = default;
private:
  virtual void doDraw() const = 0;
};`,
      },
    ],
    pitfalls: [
      'Calling virtuals in constructors/destructors uses the currently constructed type, not the most-derived.',
      'Forgetting override and accidentally creating a new function (wrong const or parameter).',
      'A vtable is per-class, a vptr is per-object (two with multiple polymorphic bases).',
    ],
    related: ['inheritance', 'layout', 'access-control', 'special-members'],
  },
  {
    id: 'operator-overloading',
    title: 'Operator overloading',
    blurb: 'Make types feel built-in',
    track: 'classes',
    keywords: ['operator', '<<', '<=>', 'member vs free'],
    summary:
      'Overload operators to match existing notation, not to be clever. Prefer non-member overloads when either operand should convert (operator+). Keep overloaded operators’ semantics unsurprising: + shouldn’t mutate, == should be an equivalence.',
    facts: [
      {
        label: 'Must be members',
        body: '= () [] ->  and the compound assignments are typically members. () [] -> must be members.',
      },
      {
        label: '<< for streams',
        body: 'Free function: std::ostream& operator<<(std::ostream&, const T&).',
      },
      {
        label: 'bool conversion',
        body: 'In C++11+, explicit operator bool() — avoids accidental int math.',
      },
      {
        label: 'postfix ++',
        body: 'operator++(int) dummy argument. Implement via prefix.',
      },
    ],
    code: [
      {
        title: 'Symmetric +',
        snippet: `class Vec {
public:
  Vec& operator+=(const Vec& o);
};
inline Vec operator+(Vec a, const Vec& b) {
  a += b;
  return a;
}`,
      },
    ],
    pitfalls: [
      'operator== that isn’t consistent with operator< for ordered containers.',
      'Overloading && || , — you lose short-circuit and sequencing.',
      'Returning a reference to a local from operator+.',
    ],
    related: ['operators', 'classes', 'overloading'],
    later: [
      { standard: 'C++20', note: 'operator<=> generates == and ordering; rewrite rules for comparisons.' },
    ],
  },
  {
    id: 'templates',
    title: 'Templates',
    blurb: 'Code generation with types as parameters',
    track: 'templates',
    keywords: ['template', 'generic', 'instantiation', 'two-phase'],
    viz: 'templates',
    summary:
      'A template is a recipe. Instantiation stamps out a real function or class for a given set of arguments. Errors often appear at the use site, deep in a stack of substitutions. Keep templates thin and constraints obvious.',
    facts: [
      {
        label: 'Function template',
        body: 'template<class T> T clamp(T v, T lo, T hi); — T is deduced from arguments.',
      },
      {
        label: 'Class template',
        body: 'template<class T, class A = std::allocator<T>> class vector;',
      },
      {
        label: 'Two-phase lookup',
        body: 'Non-dependent names are checked at definition; dependent names at instantiation.',
      },
      {
        label: 'typename / template',
        body: 'Disambiguate dependent nested types and templates: typename T::iterator.',
      },
    ],
    code: [
      {
        title: 'A tiny function template',
        snippet: `template <typename T>
const T& maxof(const T& a, const T& b) {
  return a < b ? b : a;
}

auto m = maxof(1, 2);          // T = int
auto s = maxof<std::string>("a", "b");`,
      },
    ],
    pitfalls: [
      'Including a template’s implementation only in a .cpp — other TUs cannot instantiate it. Keep templates in headers.',
      'Using a dependent type without typename.',
      'Uncontrolled instantiation bloat — hide the heavy part behind a non-template .cpp when types are few.',
    ],
    related: ['specialization', 'type-traits', 'template-deduction', 'forwarding'],
    later: [
      { standard: 'C++20', note: 'Concepts and requires-clauses replace most enable_if soup.' },
    ],
  },
  {
    id: 'specialization',
    title: 'Specialization & SFINAE',
    blurb: 'Custom recipes and substitution failure',
    track: 'templates',
    keywords: ['specialization', 'partial', 'SFINAE', 'enable_if'],
    viz: 'sfinae',
    summary:
      'Full specialization replaces the recipe for exact arguments. Partial specialization (classes only) is a more specific recipe. SFINAE: a substitution that would be invalid quietly removes an overload instead of erroring — that’s how enable_if works.',
    facts: [
      {
        label: 'Full specialization',
        body: 'template<> class Box<bool> { … };',
      },
      {
        label: 'Partial',
        body: 'template<class T> class Box<T*> { … }; — class templates only.',
      },
      {
        label: 'SFINAE',
        body: 'Substitution Failure Is Not An Error — in the immediate context of deduction.',
      },
      {
        label: 'enable_if',
        body: 'std::enable_if<cond, T>::type is T if cond, otherwise the candidate vanishes.',
      },
    ],
    code: [
      {
        title: 'enable_if on a return type (C++14)',
        snippet: `template <typename T>
std::enable_if_t<std::is_integral<T>::value, T>
twice(T x) {
  return static_cast<T>(x * 2);
}`,
      },
    ],
    pitfalls: [
      'Function templates cannot be partially specialized — overload or use enable_if / tag dispatch.',
      'SFINAE does not catch errors in the function body, only in the signature’s immediate context.',
      'Over-specializing std:: types is undefined except for the cases the standard allows.',
    ],
    related: ['templates', 'type-traits', 'overloading'],
  },
  {
    id: 'type-traits',
    title: 'Type traits',
    blurb: '<type_traits> as compile-time reflection',
    track: 'templates',
    keywords: ['type_traits', 'enable_if', 'decltype', 'declval'],
    summary:
      'Traits are metafunctions: they map types (and sometimes values) to other types or bools. Combined with decltype, std::declval, and enable_if they let generic code branch at compile time in C++14.',
    facts: [
      {
        label: 'Query',
        body: 'is_same, is_integral, is_move_constructible, is_nothrow_move_constructible.',
      },
      {
        label: 'Transform',
        body: 'remove_reference, decay, add_const, conditional.',
      },
      {
        label: 'C++14 aliases',
        body: 'std::enable_if_t, std::decay_t, std::remove_reference_t — drop ::type.',
      },
      {
        label: 'decltype',
        body: 'decltype(expr) is the type of that expression, including references.',
      },
    ],
    code: [
      {
        title: 'decay and a static assert',
        snippet: `static_assert(std::is_same<std::decay_t<int&>, int>::value, "");

template <typename It>
using value_t = typename std::iterator_traits<It>::value_type;`,
      },
    ],
    pitfalls: [
      'is_copy_constructible<T> can be true even if the copy is deleted in some incomplete-type edge cases — test the operations you actually need.',
      'decltype((x)) is a reference (extra parens make an lvalue expression).',
      'Traits on incomplete types are often ill-formed or unspecified.',
    ],
    related: ['templates', 'specialization', 'variadic-templates'],
    later: [
      { standard: 'C++17', note: 'if constexpr, void_t in std, bool_constant convenience.' },
    ],
  },
  {
    id: 'exceptions',
    title: 'Exceptions',
    blurb: 'throw, catch, unwind',
    track: 'errors',
    keywords: ['throw', 'catch', 'stack unwind', 'RAII', 'what'],
    viz: 'exceptions',
    summary:
      'throw packages a value and starts stack unwinding: destructors of automatic objects run until a matching catch. This is why RAII is not optional in C++ — it is the cleanup mechanism. Catch by const reference.',
    facts: [
      {
        label: 'Matching',
        body: 'Handlers are tried in order. catch (const std::exception&) catches derived exceptions.',
      },
      {
        label: 'catch (...)',
        body: 'Last resort. You cannot inspect the object. Often rethrow.',
      },
      {
        label: 'exception_ptr',
        body: 'std::current_exception / rethrow_exception to ferry exceptions across threads.',
      },
      {
        label: 'never throw from a dtor',
        body: 'If a destructor throws during unwind, std::terminate is called.',
      },
    ],
    code: [
      {
        title: 'Catch by const ref',
        snippet: `try {
  doWork();
} catch (const std::runtime_error& e) {
  log(e.what());
} catch (const std::exception& e) {
  log(e.what());
} catch (...) {
  log("unknown");
  throw;
}`,
      },
    ],
    pitfalls: [
      'catch (std::exception e) slices and copies.',
      'Using exceptions for expected, high-frequency control flow.',
      'Letting an exception escape a destructor or a noexcept function → terminate.',
    ],
    related: ['error-handling', 'lifetime', 'rule-of-zero', 'new-delete'],
  },
  {
    id: 'error-handling',
    title: 'noexcept & error strategy',
    blurb: 'Pick a policy and stick to it',
    track: 'errors',
    keywords: ['noexcept', 'error_code', 'expected', 'terminate'],
    summary:
      'C++ offers exceptions, error codes, and abort. Mixing them without a boundary is how APIs become unusable. noexcept is both documentation and an optimization hint (vector moves). A violation calls terminate.',
    facts: [
      {
        label: 'noexcept',
        body: 'noexcept / noexcept(true) — function must not throw. noexcept(expr) is a compile-time bool.',
      },
      {
        label: 'Move + vector',
        body: 'vector uses move_if_noexcept: throwing moves force copies on resize.',
      },
      {
        label: 'error codes',
        body: 'std::error_code / errno-style. No unwind; easy to ignore. Pair with [[nodiscard]] intent (attribute is C++17).',
      },
      {
        label: 'Destructors',
        body: 'Implicitly noexcept(true) in practice for most types — throwing there is fatal during unwind.',
      },
    ],
    code: [
      {
        title: 'Query noexcept',
        snippet: `void f() noexcept;
static_assert(noexcept(f()), "f must not throw");

template <typename T>
void relocate(T* d, T* s)
    noexcept(std::is_nothrow_move_constructible<T>::value) {
  new (d) T(std::move(*s));
}`,
      },
    ],
    pitfalls: [
      'Marking a function noexcept and then calling something that throws.',
      'Swallowing errors from error_code APIs.',
      'Half the codebase using exceptions, half returning -1, no translation layer.',
    ],
    related: ['exceptions', 'copy-move', 'smart-pointers'],
    later: [
      { standard: 'C++23', note: 'std::expected<T,E> as a value-based error channel.' },
    ],
  },
  {
    id: 'string',
    title: 'std::string',
    blurb: 'Owning text, not char*',
    track: 'stdlib',
    keywords: ['string', 'string_view', 'c_str', 'SSO'],
    summary:
      'std::string owns a mutable buffer of char, guarantees contiguous storage, and always keeps a terminating \\0 so c_str() is cheap. Small-string optimization (SSO) keeps short strings off the heap — implementation-defined size.',
    facts: [
      {
        label: 'size vs capacity',
        body: 'size() is length; capacity() is allocated. reserve() avoids repeated growth.',
      },
      {
        label: 'operator+',
        body: 'Creates new strings. In loops, append or ostringstream / reserve.',
      },
      {
        label: 'compare',
        body: 'Lexicographic on unsigned char values. == is equality of contents.',
      },
      {
        label: 'encoding',
        body: 'std::string is bytes. UTF-8 is a convention, not a type (until later char8_t).',
      },
    ],
    code: [
      {
        title: 'Build text without quadratic +',
        snippet: `std::string s;
s.reserve(64);
s += "id=";
s += std::to_string(42);`,
      },
    ],
    pitfalls: [
      'Holding a pointer from &s[0] / c_str() across a mutation that reallocates.',
      'Passing substr() results around when you meant a view — copies.',
      'Assuming char is UTF-32 or that length() is number of glyphs.',
    ],
    related: ['arrays', 'containers', 'iostreams'],
    later: [
      { standard: 'C++17', note: 'std::string_view — non-owning read-only slice. Dangling if the string dies.' },
    ],
  },
  {
    id: 'containers',
    title: 'Containers',
    blurb: 'vector, deque, list, map, unordered',
    track: 'stdlib',
    keywords: ['vector', 'map', 'unordered_map', 'list', 'deque', 'set'],
    viz: 'containers',
    summary:
      'Pick the container for the operations you actually do. vector is the default: contiguous, fast iteration, occasional realloc. node-based maps/sets give stable references and log n lookup. unordered_* give average O(1) with a hash and no ordering.',
    facts: [
      {
        label: 'vector',
        body: 'Contiguous. Insert at end amortized O(1). Insert in middle O(n). Realloc invalidates all iterators.',
      },
      {
        label: 'deque',
        body: 'Block map. Fast push/pop front and back. Not fully contiguous.',
      },
      {
        label: 'list / forward_list',
        body: 'Stable iterators on insert/erase (except erased). Poor cache. Rarely what you want.',
      },
      {
        label: 'map vs unordered_map',
        body: 'map: ordered keys, log n. unordered_map: hash, average O(1), worst O(n), needs a hash.',
      },
    ],
    code: [
      {
        title: 'Default to vector',
        snippet: `std::vector<int> v;
v.reserve(100);
v.push_back(1);

std::map<std::string, int> ordered;
std::unordered_map<std::string, int> fast;`,
      },
    ],
    pitfalls: [
      'Using list because you “insert in the middle” — a vector + index is often faster.',
      'Holding iterators/pointers into a vector across push_back without reserve.',
      'unordered_map with a terrible hash or mutable keys.',
    ],
    related: ['iterators', 'algorithms', 'layout', 'arrays'],
  },
  {
    id: 'iterators',
    title: 'Iterators',
    blurb: 'The glue between containers and algorithms',
    track: 'stdlib',
    keywords: ['iterator', 'begin', 'end', 'invalidation', 'category'],
    viz: 'invalidation',
    summary:
      'An iterator is a generalized pointer: *it, ++it, and a half-open range [begin, end). Categories (input → random access) describe what you may do. Invalidation rules are per-container — that’s the table you actually need.',
    facts: [
      {
        label: 'Half-open',
        body: 'end() is one-past-last, never dereference it.',
      },
      {
        label: 'Categories',
        body: 'input, output, forward, bidirectional, random access (C++14). Pointers are random access.',
      },
      {
        label: 'vector invalidation',
        body: 'insert/push that grows capacity invalidates everything. erase invalidates at/after the erase.',
      },
      {
        label: 'node containers',
        body: 'map/set/list: insert does not invalidate. erase invalidates only erased iterators.',
      },
    ],
    code: [
      {
        title: 'Erase while iterating a map',
        snippet: `for (auto it = m.begin(); it != m.end(); ) {
  if (it->second < 0)
    it = m.erase(it);   // C++11 returns the next iterator
  else
    ++it;
}`,
      },
    ],
    pitfalls: [
      '++it after erase(it) on a vector/map — use the returned iterator.',
      'Comparing iterators from different containers.',
      'reverse_iterator’s base() is one off from *rit — easy to be wrong.',
    ],
    related: ['containers', 'algorithms', 'pointers-refs'],
  },
  {
    id: 'algorithms',
    title: 'Algorithms',
    blurb: '<algorithm> instead of raw loops',
    track: 'stdlib',
    keywords: ['sort', 'find', 'transform', 'accumulate', 'binary_search'],
    viz: 'algorithms',
    summary:
      'The STL algorithms are named loops with known complexity. They operate on iterator ranges. Learn find/find_if, sort, lower_bound, transform, copy_if, accumulate — then reach for the rest as needed.',
    facts: [
      {
        label: 'sort',
        body: 'N log N. Needs random-access iterators (vector, deque, array).',
      },
      {
        label: 'lower_bound',
        body: 'Log N on a partitioned/sorted range. The binary-search primitive.',
      },
      {
        label: 'stable vs unstable',
        body: 'stable_sort / stable_partition keep equivalent elements’ order — more memory, slower.',
      },
      {
        label: 'numeric',
        body: 'std::accumulate, inner_product live in <numeric>.',
      },
    ],
    code: [
      {
        title: 'Find and sort',
        snippet: `std::sort(v.begin(), v.end());
auto it = std::lower_bound(v.begin(), v.end(), 42);
if (it != v.end() && *it == 42) { /* found */ }

auto n = std::count_if(v.begin(), v.end(),
                       [](int x) { return x > 0; });`,
      },
    ],
    pitfalls: [
      'std::remove / remove_if only shift — you still erase the tail (erase-remove idiom).',
      'binary_search / lower_bound on an unsorted range is nonsense, not a diagnostic.',
      'Modifying a sequence while an algorithm iterates it.',
    ],
    related: ['iterators', 'lambdas', 'containers'],
    later: [
      { standard: 'C++20', note: 'Ranges: std::ranges::sort(v) with projections and concepts.' },
    ],
  },
  {
    id: 'smart-pointers',
    title: 'Smart pointers',
    blurb: 'Ownership encoded in the type',
    track: 'stdlib',
    keywords: ['unique_ptr', 'shared_ptr', 'weak_ptr', 'make_unique'],
    viz: 'ownership',
    summary:
      'unique_ptr: exclusive owner, zero overhead, move-only. shared_ptr: shared ownership with a control block (refcount). weak_ptr: observe without keeping alive, break cycles. make_unique (C++14) and make_shared are the construction entry points.',
    facts: [
      {
        label: 'unique_ptr',
        body: 'sizeof typically one pointer. Custom deleters possible. Arrays: unique_ptr<T[]>.',
      },
      {
        label: 'shared_ptr',
        body: 'Two pointers (object + control block) typically. Thread-safe refcount, not thread-safe object.',
      },
      {
        label: 'weak_ptr',
        body: 'lock() → shared_ptr or empty. Does not keep the object alive.',
      },
      {
        label: 'aliasing',
        body: 'shared_ptr can point at a member while owning the parent object.',
      },
    ],
    code: [
      {
        title: 'make_unique and a cycle breaker',
        snippet: `auto a = std::make_unique<Node>(1);

struct Node {
  std::shared_ptr<Node> next;
  std::weak_ptr<Node> parent;  // no cycle
};`,
      },
    ],
    pitfalls: [
      'shared_ptr cycles leak (A → B → A). Use weak_ptr on the back-edge.',
      'make_shared + weak_ptr: the control block (and allocation) lives until the last weak dies.',
      'Creating two shared_ptrs from the same raw pointer → double delete. Enable shared_from_this instead.',
    ],
    related: ['new-delete', 'copy-move', 'pass-by', 'rule-of-zero'],
  },
  {
    id: 'iostreams',
    title: 'I/O streams',
    blurb: 'iostream, files, and formatting',
    track: 'stdlib',
    keywords: ['cout', 'cin', 'fstream', 'stringstream', 'iomanip'],
    summary:
      'Streams are typed, overloadable I/O. operator<< / >> chain. Failures set failbit/eofbit/badbit — check the stream or enable exceptions. For files, RAII fstream closes the handle in the destructor.',
    facts: [
      {
        label: 'cin / cout / cerr',
        body: 'Tied by default (cout flushes before cin). cerr is unbuffered-ish for diagnostics.',
      },
      {
        label: 'fmt flags',
        body: '<iomanip>: setw, setprecision, boolalpha, hex. Flags stick until changed (setw is the exception).',
      },
      {
        label: 'stringstream',
        body: 'In-memory formatting. Useful, but not the fastest way to build huge strings.',
      },
      {
        label: 'locales',
        body: 'Streams are locale-aware. That can surprise numeric parsing.',
      },
    ],
    code: [
      {
        title: 'File + check',
        snippet: `std::ifstream in("data.txt");
if (!in) throw std::runtime_error("open");
std::string line;
while (std::getline(in, line)) {
  use(line);
}`,
      },
    ],
    pitfalls: [
      'while (!in.eof()) — eof is set after a failed read; you process a bad record.',
      'setw applies only to the next field; precision sticks.',
      'Mixing C stdio and iostreams without std::ios::sync_with_stdio(false) considerations.',
    ],
    related: ['string', 'exceptions', 'patterns'],
  },
  {
    id: 'chrono',
    title: 'Time (<chrono>)',
    blurb: 'Durations, clocks, casts',
    track: 'stdlib',
    keywords: ['chrono', 'duration', 'steady_clock', 'time_point'],
    summary:
      '<chrono> separates duration (how long) from time_point (when) from clock (which epoch). Use steady_clock to measure intervals; system_clock to talk to the wall / std::time.',
    facts: [
      {
        label: 'duration',
        body: 'std::chrono::milliseconds, seconds, or duration<Rep, Period>.',
      },
      {
        label: 'steady_clock',
        body: 'Monotonic. Best for elapsed time. Not related to wall time.',
      },
      {
        label: 'system_clock',
        body: 'Wall clock. Can jump (NTP, user). to_time_t for C APIs.',
      },
      {
        label: 'duration_cast',
        body: 'Truncates toward zero. You choose the unit explicitly.',
      },
    ],
    code: [
      {
        title: 'Measure a call',
        snippet: `using clock = std::chrono::steady_clock;
auto t0 = clock::now();
work();
auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
    clock::now() - t0);
std::cout << ms.count() << " ms\\n";`,
      },
    ],
    pitfalls: [
      'Using system_clock to measure speed — it can jump backwards.',
      'Integer duration overflow for very long ticks with a fine Period.',
      'Comparing time_points from different clocks — they don’t convert implicitly.',
    ],
    related: ['concurrency', 'literals'],
    later: [
      { standard: 'C++20', note: 'Calendar, time zones, operator<< for durations, more clocks.' },
    ],
  },
  {
    id: 'concurrency',
    title: 'Threads & atomics',
    blurb: 'std::thread, mutex, memory order',
    track: 'stdlib',
    keywords: ['thread', 'mutex', 'atomic', 'data race', 'lock_guard'],
    summary:
      'A data race is undefined behavior — not a “maybe stale value.” Protect shared mutable data with a mutex or make it atomic. RAII locks (lock_guard / unique_lock) are mandatory. Join or detach every thread; destroying a joinable thread calls terminate.',
    facts: [
      {
        label: 'std::thread',
        body: 'Starts a thread running a callable. join() waits; detach() lets it run freely.',
      },
      {
        label: 'mutex',
        body: 'lock_guard<mutex> lock(m); unlocks on all exit paths.',
      },
      {
        label: 'atomic',
        body: 'std::atomic<T> for a single object. Default memory order is seq_cst.',
      },
      {
        label: 'condition_variable',
        body: 'Always wait with a predicate in a loop — spurious wakeups exist.',
      },
    ],
    code: [
      {
        title: 'RAII lock and a join',
        snippet: `std::mutex m;
int hits = 0;

std::thread t([&] {
  std::lock_guard<std::mutex> lock(m);
  ++hits;
});
t.join();`,
      },
    ],
    pitfalls: [
      'Sharing a non-atomic, non-mutex-protected int “because it’s just an int.” Data race = UB.',
      'Deadlock: two mutexes locked in opposite order. std::lock / scoped_lock (C++17) help.',
      'Capturing [&] into a thread that outlives the locals.',
    ],
    related: ['undefined-behavior', 'smart-pointers', 'atomics', 'cv-qualifiers'],
    later: [
      { standard: 'C++20', note: 'std::jthread (joins on destroy), std::stop_token, std::atomic_ref, latch/barrier/semaphore.' },
    ],
  },
  {
    id: 'patterns',
    title: 'Common patterns',
    blurb: 'RAII, smart pointers, range-for, auto, lambdas, move',
    track: 'idioms',
    keywords: ['RAII', 'idiom', 'make_unique', 'auto'],
    viz: 'patterns',
    summary:
      'These six patterns show up in almost every modern C++14 codebase. They are not decorations — they are how resources, loops, and types stay under control.',
    facts: [
      {
        label: 'RAII',
        body: 'Lifetime of a resource = lifetime of an object. Destructors run on throw.',
      },
      {
        label: 'Ownership in signatures',
        body: 'unique_ptr<T> means transfer. T const& means borrow. T* often means nullable borrow.',
      },
      {
        label: 'auto',
        body: 'Deduce from the initializer. Still write the type when it documents a contract.',
      },
      {
        label: 'Move',
        body: 'Return locals by value; let the compiler move or elide. std::move when you mean steal.',
      },
    ],
    code: [
      {
        title: 'RAII file handle',
        snippet: `class File {
public:
  explicit File(const char* path)
      : handle_(std::fopen(path, "r")) {}
  ~File() { if (handle_) std::fclose(handle_); }
  File(const File&) = delete;
  File& operator=(const File&) = delete;
private:
  std::FILE* handle_;
};`,
      },
    ],
    pitfalls: [
      'RAII that throws from the destructor.',
      'auto that hides an expensive copy (auto x = vec[i] vs const auto&).',
      'std::move on a return of a local — can inhibit NRVO.',
    ],
    related: ['rule-of-zero', 'smart-pointers', 'lambdas', 'copy-move'],
  },
  {
    id: 'rule-of-zero',
    title: 'Rule of Zero',
    blurb: 'Members manage; the class stays quiet',
    track: 'idioms',
    keywords: ['rule of zero', 'rule of five', 'RAII'],
    summary:
      'If every resource is already owned by a member that knows how to copy/move/destroy (string, vector, unique_ptr), your class needs no custom special members. That’s the Rule of Zero — the one you want.',
    facts: [
      {
        label: 'Zero',
        body: 'No user dtor/copy/move. Compiler-generated ones do the right thing memberwise.',
      },
      {
        label: 'Five',
        body: 'If you must manage a raw resource, define or delete all five special members.',
      },
      {
        label: 'Three (legacy)',
        body: 'Pre-C++11: dtor, copy ctor, copy assign. Moves didn’t exist.',
      },
      {
        label: 'virtual dtor exception',
        body: 'A polymorphic base often needs a virtual destructor — that’s a deliberate Rule of Five moment (=default the rest).',
      },
    ],
    code: [
      {
        title: 'Zero: members do the work',
        snippet: `class Person {
  std::string name_;
  std::vector<int> scores_;
  std::unique_ptr<Profile> profile_;
public:
  explicit Person(std::string name) : name_(std::move(name)) {}
};`,
      },
    ],
    pitfalls: [
      'A do-nothing destructor “for debugging” that silently kills moves.',
      'Mixing a raw owning pointer with Rule of Zero thinking.',
      'Forgetting virtual ~Base() = default on a polymorphic base.',
    ],
    related: ['special-members', 'smart-pointers', 'pimpl', 'classes'],
  },
  {
    id: 'undefined-behavior',
    title: 'Undefined behavior',
    blurb: 'The compiler owes you nothing',
    track: 'idioms',
    keywords: ['UB', 'data race', 'dangling', 'overflow', 'aliasing'],
    summary:
      'Undefined behavior is not “implementation-defined” or “a crash.” The compiler may assume it never happens and delete your checks. Signed overflow, use-after-free, data races, out-of-bounds, uninitialized reads — all UB.',
    facts: [
      {
        label: 'UB vs unspecified vs impl-defined',
        body: 'UB: no requirements. Unspecified: some legal choices. Impl-defined: must document the choice.',
      },
      {
        label: 'Signed overflow',
        body: 'int overflow is UB. unsigned wrap is defined modulo 2^N.',
      },
      {
        label: 'Strict aliasing',
        body: 'Don’t read an object through a pointer of the wrong type (char* is a blessed exception).',
      },
      {
        label: 'Sanitizers',
        body: 'ASan/UBsan/TSan catch a large fraction. Use them; they are not optional tooling.',
      },
    ],
    code: [
      {
        title: 'Looks “fine,” is UB',
        snippet: `int a[4] = {1,2,3,4};
int i = 4;
// return a[i];           // out of bounds: UB

int n = INT_MAX;
// n += 1;                // signed overflow: UB`,
      },
    ],
    pitfalls: [
      'Testing a program that has UB — the bug may vanish with -O0 and explode with -O2.',
      'Placement new without ending lifetime of the old object (C++ rules got stricter over time).',
      'memcmp on types with padding, or using a dangling iterator “just once.”',
    ],
    related: ['concurrency', 'pointers-refs', 'conversions', 'arrays'],
  },
  {
    id: 'const-correctness',
    title: 'Const-correctness',
    blurb: 'A habit that documents and enables',
    track: 'idioms',
    keywords: ['const', 'constexpr', 'member', 'thread-safe'],
    summary:
      'Mark everything that doesn’t mutate. Const member functions can be called on const objects and are the first step toward thinking about thread safety. Compilers also use const to reason about aliasing.',
    facts: [
      {
        label: 'Parameters',
        body: 'const T& for read-only. T const* when the pointer may be null.',
      },
      {
        label: 'Members',
        body: 'const methods, mutable only for logical-const caches.',
      },
      {
        label: 'Locals',
        body: 'const int n = f(); — a cheap assertion that n won’t change.',
      },
      {
        label: 'Return',
        body: 'Returning const T by value is usually pointless (blocks moves). Returning const T& is a borrow.',
      },
    ],
    code: [
      {
        title: 'A const observer',
        snippet: `class Bag {
public:
  bool empty() const { return items_.empty(); }
  const Item* find(Id id) const;
  Item* find(Id id);
private:
  std::vector<Item> items_;
};`,
      },
    ],
    pitfalls: [
      'Returning const T by value — prevents moving from a temporary in some cases.',
      'const_cast as a routine tool.',
      'A const method that mutates shared global state.',
    ],
    related: ['cv-qualifiers', 'pass-by', 'concurrency', 'classes'],
  },
  {
    id: 'pitfalls',
    title: 'Common pitfalls',
    blurb: 'A field guide to classic own-goals',
    track: 'idioms',
    keywords: ['gotcha', 'slicing', 'most vexing parse', 'using namespace'],
    summary:
      'A short list of mistakes that keep showing up in real code reviews. If you only re-read one page before an interview or a refactor, make it this one plus Undefined behavior.',
    facts: [
      {
        label: 'Most vexing parse',
        body: 'Widget w(); declares a function, not a default-constructed Widget. Use Widget w{};',
      },
      {
        label: 'Slicing',
        body: 'void f(Base b); f(derived); drops the derived part. Pass Base& or a smart pointer.',
      },
      {
        label: 'using namespace',
        body: 'Never in headers. In .cpp, keep it local or don’t.',
      },
      {
        label: 'Macro min/max',
        body: 'Windows.h defines min/max. Use (std::min)(a,b) or NOMINMAX.',
      },
    ],
    code: [
      {
        title: 'Parse vs construct',
        snippet: `Widget w();     // function declaration
Widget w{};     // object

std::vector<int> v(std::istream_iterator<int>{in},
                   std::istream_iterator<int>{});  // not vexing`,
      },
    ],
    pitfalls: [
      'Integer division when you wanted a ratio: 1/2 is 0.',
      'for (auto x : v) when v holds fat objects.',
      'Ignoring [[noreturn]] / [[nodiscard]] intent — check return values of emplace, new(nothrow), fstream opens.',
    ],
    related: ['undefined-behavior', 'inheritance', 'literals', 'scope-namespaces'],
  },
]
