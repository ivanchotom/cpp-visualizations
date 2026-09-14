import type { Topic } from './schema.ts'

export const moreTopics: Topic[] = [
  {
    id: 'enums',
    title: 'Enums',
    blurb: 'Named integer constants, scoped and unscoped',
    track: 'foundations',
    keywords: ['enum', 'enum class', 'scoped', 'underlying type'],
    viz: 'enums',
    summary:
      'Unscoped enum leaks enumerators into the surrounding scope and converts to int without asking. enum class (C++11) is the default choice: scoped names, no implicit conversion to int.',
    facts: [
      {
        label: 'enum class',
        body: 'Color::red, not red. No implicit conversion to the underlying integer.',
      },
      {
        label: 'Underlying type',
        body: 'enum class Color : std::uint8_t { red, green }; — specify when the width or signedness matters.',
      },
      {
        label: 'Unscoped',
        body: 'enum Legacy { A, B }; puts A and B in the enclosing scope and converts to int.',
      },
      {
        label: 'Switch',
        body: 'switch (c) with enumerators is the usual dispatch. A default (or a compiler warning as error) catches new enumerators.',
      },
    ],
    code: [
      {
        title: 'Scoped enum',
        snippet: `enum class Color : int { red, green, blue };

Color c = Color::red;
int n = static_cast<int>(c);   // explicit

enum Legacy { FLAG_ON = 1 };
int x = FLAG_ON;               // implicit, and FLAG_ON is in this scope`,
      },
    ],
    pitfalls: [
      'Unscoped enumerators colliding with macros or other enums (especially from C headers).',
      'Assuming the underlying type is int — it is implementation-defined unless you specify it.',
      'Using enum class as a bit mask without defining operator| — it will not compile, which is the point.',
    ],
    related: ['types', 'conversions', 'operators'],
  },
  {
    id: 'unions-bitfields',
    title: 'Unions & bit-fields',
    blurb: 'Overlay storage, pack bits',
    track: 'foundations',
    keywords: ['union', 'bit-field', 'active member', 'punning'],
    viz: 'unions',
    summary:
      'A union stores one of its members at a time in the same bytes. Reading a member that is not the active one is usually undefined (type punning via union is not the portable C++ tool — memcpy / std::memcpy is). Bit-fields pack integer fields into a word; layout is implementation-defined.',
    facts: [
      {
        label: 'Active member',
        body: 'The last member written is the active one. Assigning a different member ends the previous lifetime.',
      },
      {
        label: 'Size',
        body: 'sizeof(union) is at least the size of the largest member, plus tail padding for alignment.',
      },
      {
        label: 'Bit-fields',
        body: 'unsigned flags : 3; takes 3 bits of a word. Adjacent bit-fields may pack. Cannot take the address of a bit-field.',
      },
      {
        label: 'Common initial sequence',
        body: 'A narrow, standard-blessed way to inspect a shared prefix of struct members in a union of standard-layout structs.',
      },
    ],
    code: [
      {
        title: 'One member at a time',
        snippet: `union Slot {
  std::int32_t i;
  float f;
};

Slot s;
s.i = 1;
float x = s.f;          // UB in standard C++ — not a portable pun

struct Bits {
  unsigned ready : 1;
  unsigned kind  : 3;
};`,
      },
    ],
    pitfalls: [
      'Type-punning through a union to inspect a float’s bits — use memcpy into an unsigned integer instead.',
      'Bit-field layout and signedness differ across ABIs — not a wire format.',
      'A union of non-trivial types needs you to manage construction/destruction by hand (placement new / explicit dtor).',
    ],
    related: ['layout', 'types', 'undefined-behavior', 'new-delete'],
    later: [
      {
        standard: 'C++17',
        note: 'std::variant is a type-safe union with a discriminator; std::optional covers “value or empty.”',
      },
    ],
  },
  {
    id: 'function-pointers',
    title: 'Function pointers & std::function',
    blurb: 'Callables as values',
    track: 'functions',
    keywords: ['function pointer', 'member pointer', 'std::function', 'mem_fn'],
    viz: 'function-pointers',
    summary:
      'A function pointer stores the address of a function with a given signature. Pointers to members are a different, fat type — they need an object to apply to. std::function<Sig> type-erases any callable that matches Sig, at the cost of a possible heap allocation.',
    facts: [
      {
        label: 'Function pointer',
        body: 'void (*fp)(int) = &f;  then fp(3);  Functions decay to pointers; & is optional.',
      },
      {
        label: 'Member pointer',
        body: 'void (T::*pm)() = &T::m;  (obj.*pm)();  or (ptr->*pm)();',
      },
      {
        label: 'std::function',
        body: 'Can hold a function pointer, lambda, or bind-expression. Empty function throws std::bad_function_call.',
      },
      {
        label: 'Prefer templates',
        body: 'A template parameter Callable inlines. std::function is for when you must store mixed callables in one type.',
      },
    ],
    code: [
      {
        title: 'Pointer vs type erasure',
        snippet: `int add(int a, int b) { return a + b; }
int (*fp)(int, int) = add;
int s = fp(1, 2);

std::function<int(int, int)> f = add;
f = [](int a, int b) { return a * b; };

struct W { int n; int get() const { return n; } };
int (W::*pm)() const = &W::get;
W w{7};
int g = (w.*pm)();`,
      },
    ],
    pitfalls: [
      'Calling an empty std::function.',
      'Storing a lambda that captured locals into a std::function that outlives them.',
      'Using a member-function pointer as if it were a free function pointer — the types do not convert.',
    ],
    related: ['functions', 'lambdas', 'overloading'],
  },
  {
    id: 'adl',
    title: 'ADL & name lookup',
    blurb: 'Where the compiler searches for names',
    track: 'functions',
    keywords: ['ADL', 'Koenig', 'lookup', 'using', 'hidden friend'],
    viz: 'adl',
    summary:
      'Unqualified lookup walks the scopes around the use. Argument-dependent lookup (ADL, “Koenig lookup”) also searches the namespaces of the argument types — that is why std::cout << x works: operator<< is found in namespace std. Hidden friends are found only via ADL.',
    facts: [
      {
        label: 'Ordinary lookup',
        body: 'From the use site, outward: block → class → namespace → global. A using-declaration adds names into the current scope.',
      },
      {
        label: 'ADL',
        body: 'For an unqualified function call, also look in the namespaces associated with the argument types (and their bases, templates, …).',
      },
      {
        label: 'Hidden friend',
        body: 'friend operator== defined inside the class is not visible to ordinary lookup; ADL finds it when you compare two objects of that type.',
      },
      {
        label: 'Avoiding ADL',
        body: '(std::min)(a, b) or std::min<int>(a, b) — parens or an explicit template argument suppress ADL. Useful around Windows min/max macros too.',
      },
    ],
    code: [
      {
        title: 'ADL finds the swap in N',
        snippet: `namespace N {
  struct Item {};
  void swap(Item&, Item&);     // better than std::swap for Item
}

void f(N::Item a, N::Item b) {
  using std::swap;
  swap(a, b);                  // ADL may pick N::swap
}`,
      },
    ],
    pitfalls: [
      'A using-directive (using namespace std) plus ADL can make overload sets enormous and surprising.',
      'Calling std::swap(a, b) with qualification skips a user-defined swap in the type’s namespace.',
      'Unqualified begin/end on arrays vs containers — std::begin is the portable one when you mix them.',
    ],
    related: ['scope-namespaces', 'overloading', 'operator-overloading', 'templates'],
  },
  {
    id: 'access-control',
    title: 'Access control & friends',
    blurb: 'public, protected, private, friend',
    track: 'classes',
    keywords: ['public', 'private', 'protected', 'friend', 'encapsulation'],
    viz: 'access-control',
    summary:
      'Access is a compile-time check on names, not a runtime sandbox. class defaults to private; struct defaults to public. protected is for derived classes. friend punches a hole for a function or class. Invariants belong in the private section, not in a comment.',
    facts: [
      {
        label: 'Who sees what',
        body: 'public: everyone. protected: the class and its derived classes. private: the class (and friends).',
      },
      {
        label: 'friend',
        body: 'friend void inspect(Widget&); or friend class Factory; — not inherited, not transitive.',
      },
      {
        label: 'class vs struct',
        body: 'The only language difference is default access (and default inheritance: private vs public).',
      },
      {
        label: 'Encapsulation',
        body: 'Keep data private when there is an invariant. A public struct is a fine DTO; a class with public knobs and a broken invariant is not.',
      },
    ],
    code: [
      {
        title: 'Private data, friend factory',
        snippet: `class Token {
public:
  int id() const { return id_; }
private:
  explicit Token(int id) : id_(id) {}
  int id_;
  friend Token makeToken(int);
};

Token makeToken(int id) { return Token{id}; }`,
      },
    ],
    pitfalls: [
      'protected data — derived classes become tightly coupled; prefer protected functions and private data.',
      'friend-ing a whole class when a single function would do.',
      'Assuming private hides the layout from the ABI — it does not; it only hides names from other TUs’ source.',
    ],
    related: ['classes', 'inheritance', 'pimpl'],
  },
  {
    id: 'template-deduction',
    title: 'Template argument deduction',
    blurb: 'How T is inferred from a call',
    track: 'templates',
    keywords: ['deduction', 'auto', 'decltype', 'universal reference', 'C++14'],
    viz: 'template-deduction',
    summary:
      'For a function template, each T is deduced from the arguments (or given explicitly). References and cv drop or stick according to the parameter form: T by value decays; T& keeps lvalue-ness; T&& is a forwarding reference if T is deduced. C++14 also lets auto stand in for a deduced return type and for generic lambda parameters.',
    facts: [
      {
        label: 'By value',
        body: 'template<class T> void f(T);  f(x) with int& x → T = int (decay: refs and top-level cv go). Arrays and functions decay to pointers.',
      },
      {
        label: 'Forwarding ref',
        body: 'template<class T> void f(T&&);  lvalue → T = U&, rvalue → T = U. See Forwarding.',
      },
      {
        label: 'auto return (C++14)',
        body: 'auto f() { return 1; } — return type deduced from the return statements; they must agree.',
      },
      {
        label: 'Generic lambda (C++14)',
        body: '[](auto x, auto y){ return x + y; } is an operator() template.',
      },
    ],
    code: [
      {
        title: 'Deduction vs explicit',
        snippet: `template <typename T>
T add(T a, T b) { return a + b; }

auto a = add(1, 2);          // T = int
auto b = add<double>(1, 2);  // T = double; 1 and 2 convert
// add(1, 2.0);              // error: T from 1 is int, from 2.0 is double

auto id = [](auto x) { return x; };   // C++14 generic lambda`,
      },
    ],
    pitfalls: [
      'Two parameters both named T that deduced differently — the call is ill-formed, not “the common type.”',
      'auto x = {1, 2}; makes initializer_list, not an array or a vector.',
      'decltype(auto) keeps references; auto does not. Returning decltype(auto) from a function that names a local is a dangling-ref factory.',
    ],
    related: ['templates', 'forwarding', 'lambdas', 'value-categories'],
    later: [
      {
        standard: 'C++17',
        note: 'Class template argument deduction (CTAD): std::pair p{1, 2.0}; and deduction guides.',
      },
    ],
  },
  {
    id: 'variadic-templates',
    title: 'Variadic templates',
    blurb: 'Parameter packs and expansion',
    track: 'templates',
    keywords: ['variadic', 'parameter pack', 'sizeof...', 'index_sequence'],
    viz: 'variadic-templates',
    summary:
      'A parameter pack is a list of types or values. You expand it with Pattern... in the right place: function parameter lists, template argument lists, initializer lists. Recursion or an index_sequence (C++14) is how you walk a pack when you need per-element work.',
    facts: [
      {
        label: 'sizeof...',
        body: 'sizeof...(Ts) is a compile-time size_t — the length of the pack, not the size of an object.',
      },
      {
        label: 'Expansion',
        body: 'f(xs...) calls f with every element. g(h(xs)...) applies h to each, then calls g.',
      },
      {
        label: 'C++14 index_sequence',
        body: 'std::make_index_sequence<N> plus a helper that takes std::index_sequence<I...> lets you expand 0..N-1.',
      },
      {
        label: 'Empty pack',
        body: 'A call with zero arguments is valid if the pack is empty. Watch recursive base cases.',
      },
    ],
    code: [
      {
        title: 'Expand into an initializer list',
        snippet: `#include <utility>

template <typename... Ts>
int sum(Ts... xs) {
  int t = 0;
  int _[] = {0, (t += static_cast<int>(xs), 0)...};
  (void)_;
  return t;
}

template <typename Tuple, std::size_t... I>
void each_impl(Tuple& t, std::index_sequence<I...>) {
  int _[] = {0, ((void)std::get<I>(t), 0)...};
  (void)_;
}`,
        notes: 'The comma-in-braces trick is the C++14 pack “foreach”. C++17 fold expressions replace it.',
      },
    ],
    pitfalls: [
      'Expanding a pack in a context that does not allow expansion — the compiler error is often a wall of substitution notes.',
      'A recursive variadic function without a non-template (or empty-pack) overload never terminates instantiation.',
      'sizeof...(xs) vs sizeof(xs) — the second is ill-formed on a pack.',
    ],
    related: ['templates', 'template-deduction', 'pair-tuple', 'forwarding'],
    later: [
      { standard: 'C++17', note: 'Fold expressions: (xs + … + 0) and if constexpr to replace most recursive packs.' },
    ],
  },
  {
    id: 'forwarding',
    title: 'Perfect forwarding',
    blurb: 'T&&, collapsing, and std::forward',
    track: 'templates',
    keywords: ['forward', 'universal reference', 'collapsing', 'T&&'],
    viz: 'forwarding',
    summary:
      'A deduced T&& is a forwarding reference: it binds to lvalues and rvalues. Reference collapsing decides the real type. std::forward<T>(t) restores the original value category so a wrapper does not accidentally turn a stealable object into a copy.',
    facts: [
      {
        label: 'When T&& forwards',
        body: 'Only if T is deduced (function template parameter, or auto&&). void f(Widget&&); is just an rvalue ref.',
      },
      {
        label: 'Collapsing',
        body: 'U& && → U&. U&& && → U&&. There is no “reference to reference” in the type system.',
      },
      {
        label: 'std::forward<T>(t)',
        body: 'static_cast<T&&>(t). If T is U&, that is an lvalue cast; if T is U, that is an rvalue cast.',
      },
      {
        label: 'std::move',
        body: 'Always an rvalue cast. Use on an owned object you are done with — not on a forwarding reference you must pass through.',
      },
    ],
    code: [
      {
        title: 'Factory that preserves category',
        snippet: `template <typename T, typename... Args>
std::unique_ptr<T> make(Args&&... args) {
  return std::unique_ptr<T>(new T(std::forward<Args>(args)...));
}

Widget local;
auto a = make<Widget>(local);             // copies into T
auto b = make<Widget>(Widget{});          // moves
auto c = make<Widget>(std::move(local));  // moves`,
        notes: 'Prefer std::make_unique in real code (C++14). new is shown only to see the forwarded expression.',
      },
    ],
    pitfalls: [
      'std::move on a forwarding reference — it unconditionally steals, even when the caller passed an lvalue.',
      'Returning a forwarding reference bound to a function parameter that is about to die.',
      'Writing Widget&& in a non-template and wondering why wrap(local) will not compile.',
    ],
    related: ['template-deduction', 'value-categories', 'copy-move', 'smart-pointers'],
  },
  {
    id: 'pair-tuple',
    title: 'pair & tuple',
    blurb: 'Fixed-size heterogeneous bundles',
    track: 'stdlib',
    keywords: ['pair', 'tuple', 'tie', 'get', 'make_pair'],
    viz: 'pair-tuple',
    summary:
      'std::pair<A,B> is first/second. std::tuple<Ts...> is an indexed pack of values. They are the vocabulary types for “return two things” and for generic zip. C++14 has no structured bindings — use std::tie, std::get<I>, or a named pair.',
    facts: [
      {
        label: 'make_pair / make_tuple',
        body: 'Deduce types (with decay). make_pair(1, "x") is pair<int, const char*>.',
      },
      {
        label: 'std::get',
        body: 'std::get<0>(t), std::get<int>(t) (by type if unique). Out of range is a compile error for the index form.',
      },
      {
        label: 'tie',
        body: 'std::tie(a, b) = p; unpacks into existing lvalues. std::ignore skips a slot. Also the comparison trick for operator<.',
      },
      {
        label: 'forward_as_tuple',
        body: 'A tuple of references to the arguments — dangling if you store it past the full-expression.',
      },
    ],
    code: [
      {
        title: 'Unpack without structured bindings',
        snippet: `std::pair<int, std::string> p{1, "n"};
int id = p.first;
std::string name;
std::tie(std::ignore, name) = p;

auto t = std::make_tuple(1, 2.0, 'x');
double d = std::get<1>(t);

bool operator<(const Rec& a, const Rec& b) {
  return std::tie(a.x, a.y) < std::tie(b.x, b.y);
}`,
      },
    ],
    pitfalls: [
      'tuple<int&> bound to a temporary — the reference dangles when the full-expression ends.',
      'get<T> is ill-formed if T appears more than once in the tuple.',
      'pair of a heavy type copied through a function that should have taken it by move.',
    ],
    related: ['templates', 'variadic-templates', 'value-categories', 'algorithms'],
    later: [
      { standard: 'C++17', note: 'Structured bindings: auto [id, name] = p; and std::apply.' },
    ],
  },
  {
    id: 'atomics',
    title: 'Atomics & memory order',
    blurb: 'std::atomic without inventing a protocol',
    track: 'stdlib',
    keywords: ['atomic', 'memory_order', 'CAS', 'race', 'mutex'],
    viz: 'atomics',
    summary:
      'A data race on a non-atomic is undefined behavior, not “a torn read.” std::atomic<T> makes loads and stores atomic. Start with seq_cst (the default). Relaxed/acquire/release exist for when you have measured and you know the protocol. mutex + lock_guard remains the default for anything bigger than a counter or a flag.',
    facts: [
      {
        label: 'atomic<T>',
        body: 'T should be trivially copyable. is_lock_free() tells you if the implementation needs a hidden mutex.',
      },
      {
        label: 'seq_cst',
        body: 'The default. A total order of all seq_cst ops that matches sequential consistency. Slowest, easiest to reason about.',
      },
      {
        label: 'acquire / release',
        body: 'A release store synchronizes-with an acquire load of the same atomic. Use for “publish a payload, then set a flag.”',
      },
      {
        label: 'CAS',
        body: 'compare_exchange_strong / weak. weak may fail spuriously — correct for a retry loop, cheaper on some ISAs.',
      },
    ],
    code: [
      {
        title: 'Flag and a counter',
        snippet: `std::atomic<bool> ready{false};
std::atomic<int>  hits{0};

hits.fetch_add(1, std::memory_order_relaxed);

// publisher
payload = compute();
ready.store(true, std::memory_order_release);

// listener
if (ready.load(std::memory_order_acquire)) {
  use(payload);
}`,
      },
    ],
    pitfalls: [
      'A non-atomic write in one thread and a read in another with no happen-before — UB, even for a bool.',
      'Using relaxed everywhere because it is faster — you lose the happens-before you needed.',
      'Sharing a mutex without documenting which data it guards.',
    ],
    related: ['concurrency', 'undefined-behavior', 'cv-qualifiers'],
    later: [
      { standard: 'C++20', note: 'atomic wait/notify, std::atomic_ref, more explicit memory model wording.' },
    ],
  },
  {
    id: 'pimpl',
    title: 'PIMPL',
    blurb: 'Hide the implementation behind a unique_ptr',
    track: 'idioms',
    keywords: ['pimpl', 'opaque', 'compilation firewall', 'unique_ptr'],
    viz: 'pimpl',
    summary:
      'Pointer to IMPLementation: the public class holds unique_ptr<Impl> where Impl is defined only in the .cpp. Clients recompile when the public header changes, not when private members change. You pay an allocation and a pointer hop; you gain a stable ABI and faster incremental builds.',
    facts: [
      {
        label: 'Incomplete type',
        body: 'unique_ptr<Impl> in the header works if ~Widget is defined in the .cpp after Impl is complete — otherwise unique_ptr’s dtor cannot sizeof(Impl).',
      },
      {
        label: 'Special members',
        body: 'Declare the destructor (and usually move ops) in the header, define them in the .cpp. Copies are either deleted or written by hand.',
      },
      {
        label: 'Not for every type',
        body: 'Hot small value types should stay in the header. PIMPL is for big, stable façades (a Widget, a Client, a Parser).',
      },
      {
        label: 'ABI',
        body: 'The public object’s size stays one pointer (plus padding). You can add Impl fields without changing sizeof(Widget).',
      },
    ],
    code: [
      {
        title: 'Header + .cpp split',
        snippet: `// widget.hpp
class Widget {
public:
  Widget();
  ~Widget();
  Widget(Widget&&) noexcept;
  Widget& operator=(Widget&&) noexcept;
  Widget(const Widget&) = delete;
  Widget& operator=(const Widget&) = delete;
  void draw() const;
private:
  struct Impl;
  std::unique_ptr<Impl> impl_;
};

// widget.cpp
struct Widget::Impl { int n = 0; };
Widget::Widget() : impl_(std::make_unique<Impl>()) {}
Widget::~Widget() = default;
Widget::Widget(Widget&&) noexcept = default;
Widget& Widget::operator=(Widget&&) noexcept = default;
void Widget::draw() const { /* use impl_->n */ }`,
      },
    ],
    pitfalls: [
      'Defining ~Widget() = default; in the header while Impl is incomplete — compile error inside unique_ptr.',
      'Forgetting to declare moves; a user-declared dtor suppresses implicit moves in C++14.',
      'PIMPL on a type you pass by value in a tight loop — the allocation will show up in profiles.',
    ],
    related: ['rule-of-zero', 'smart-pointers', 'special-members', 'compilation', 'access-control'],
  },
]
