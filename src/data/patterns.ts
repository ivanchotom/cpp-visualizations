export interface CppPattern {
  title: string
  tagline: string
  /** C++14-compatible example snippet. */
  code: string
  /** Why the pattern matters, in plain language. */
  explanation: string
}

/**
 * Common, idiomatic C++ patterns. All snippets compile under the C++14
 * standard (e.g. std::make_unique and generic lambdas are used).
 */
export const cppPatterns: CppPattern[] = [
  {
    title: 'RAII',
    tagline: 'Resource Acquisition Is Initialization',
    code: `class File {
public:
  explicit File(const char* path)
      : handle_(std::fopen(path, "r")) {}
  ~File() { if (handle_) std::fclose(handle_); }
private:
  std::FILE* handle_;
};`,
    explanation:
      'Tie a resource\'s lifetime to a stack object. The destructor releases it automatically, even when an exception unwinds the stack.',
  },
  {
    title: 'Smart pointers',
    tagline: 'Automatic ownership',
    code: `auto widget = std::make_unique<Widget>(42);
widget->doWork();
// memory is freed automatically when
// 'widget' goes out of scope`,
    explanation:
      'std::unique_ptr owns exactly one object and frees it deterministically. std::make_unique (C++14) avoids naked new and is exception-safe.',
  },
  {
    title: 'Range-based for',
    tagline: 'Iterate without indices',
    code: `std::vector<int> nums{1, 2, 3, 4};
int sum = 0;
for (const auto& n : nums) {
  sum += n;
}`,
    explanation:
      'Loop directly over a container\'s elements. Using const auto& avoids copies and clearly signals read-only access.',
  },
  {
    title: 'auto type deduction',
    tagline: 'Let the compiler figure it out',
    code: `auto count = 10;            // int
auto ratio = 3.14;          // double
auto name = std::string{};  // std::string
auto it = nums.begin();     // iterator`,
    explanation:
      'auto deduces the exact type from the initializer, cutting verbose declarations and preventing accidental narrowing conversions.',
  },
  {
    title: 'Lambdas',
    tagline: 'Inline callable objects',
    code: `int threshold = 3;
auto keep = [threshold](int x) {
  return x > threshold;
};
auto n = std::count_if(nums.begin(),
                       nums.end(), keep);`,
    explanation:
      'Lambdas create anonymous function objects that can capture surrounding variables — perfect for passing behavior to algorithms.',
  },
  {
    title: 'Move semantics',
    tagline: 'Transfer, don\'t copy',
    code: `std::vector<int> makeData() {
  std::vector<int> v(1000, 7);
  return v;          // moved, not copied
}
std::vector<int> data = makeData();
auto other = std::move(data); // steal buffer`,
    explanation:
      'Move semantics transfer ownership of an object\'s internal resources instead of duplicating them, avoiding expensive deep copies.',
  },
  {
    title: 'Erase-remove',
    tagline: 'Delete matching elements from a vector',
    code: `v.erase(
    std::remove_if(v.begin(), v.end(),
                   [](int x) { return x < 0; }),
    v.end());`,
    explanation:
      'std::remove_if only slides keepers forward and returns the new logical end. erase the tail or the elements stay.',
  },
  {
    title: 'Copy-and-swap',
    tagline: 'Assignment that is strongly exception-safe',
    code: `T& operator=(T other) noexcept {
  using std::swap;
  swap(*this, other);
  return *this;
}`,
    explanation:
      'Take the rhs by value (copy or move), then swap. If the copy throws, *this is unchanged. other cleans up the old state.',
  },
  {
    title: 'PIMPL',
    tagline: 'Hide implementation behind a pointer',
    code: `class Widget {
public:
  Widget();
  ~Widget();
  Widget(Widget&&) noexcept;
  Widget& operator=(Widget&&) noexcept;
  void draw() const;
private:
  struct Impl;
  std::unique_ptr<Impl> impl_;
};`,
    explanation:
      'The public header stays stable and cheap to include. The destructor must be defined where Impl is complete.',
  },
]
