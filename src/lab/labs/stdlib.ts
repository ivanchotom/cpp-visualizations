import { lab } from '../make.ts'
import type { Lab } from '../schema.ts'

export const stdlibLabs: Lab[] = [
  lab(
    'string',
    'std::string owns a mutable buffer and keeps a trailing null so c_str is cheap. SSO may keep short text off the heap.',
    [
      {
        id: 'own',
        title: 'Owning text',
        voice:
          'Size is length, capacity is allocated. Plus in a loop is quadratic. Reserve or append. A pointer from c_str dies when the string reallocates.',
        stage: {
          type: 'cells',
          rows: [
            { label: 'string object', items: [{ label: 'ptr/SSO', kind: 'stack' }] },
            { label: 'buffer', items: [{ label: 'h', kind: 'heap' }, { label: 'i', kind: 'heap' }, { label: '\\0', kind: 'heap' }] },
          ],
        },
        try: {
          type: 'pick',
          prompt: 'Build a string in a loop.',
          options: [
            {
              label: 's += piece',
              voice: 'Append into one buffer. Reserve first if you know the size. This is the usual fix.',
              verdict: 'Amortized growth.',
              stage: {
                type: 'cells',
                rows: [
                  {
                    label: 's',
                    items: [
                      { label: 'id=', kind: 'heap' },
                      { label: '42', kind: 'heap' },
                    ],
                  },
                ],
              },
            },
            {
              label: 's = s + piece',
              voice: 'Each plus allocates a new string. In a loop that is quadratic copies.',
              verdict: 'Avoid in a loop.',
              stage: {
                type: 'compare',
                left: { title: 'old s', lines: ['copied'] },
                right: { title: 'new s', lines: ['another allocation'] },
              },
            },
          ],
        },
      },
    ],
  ),
  lab(
    'containers',
    'Vector is the default: contiguous, fast iteration, occasional realloc. Pick the container for the operations you actually do.',
    [
      {
        id: 'pick',
        title: 'What the structure costs',
        voice:
          'Vector insert in the middle is linear and may invalidate everything. Node maps keep references stable. Unordered map is average constant time with a hash — worst linear if the hash is terrible.',
        stage: {
          type: 'compare',
          left: { title: 'vector', lines: ['contiguous', 'realloc invalidates'] },
          right: { title: 'map', lines: ['nodes', 'stable refs on insert'] },
        },
        try: {
          type: 'pick',
          prompt: 'You insert in the middle a lot. Is list the answer?',
          options: [
            {
              label: 'std::list',
              voice: 'Stable iterators, terrible cache. A vector plus an index is often faster even when you shift elements.',
              verdict: 'Rarely what you want.',
              stage: {
                type: 'graph',
                nodes: [
                  { id: 'a', title: 'node', kind: 'heap' },
                  { id: 'b', title: 'node', kind: 'heap' },
                ],
                edges: [{ from: 'a', to: 'b' }],
              },
            },
            {
              label: 'std::vector',
              voice: 'Contiguous. Insert shifts tail. Still usually faster than chasing list pointers. Reserve if you know n.',
              verdict: 'Default container.',
              stage: {
                type: 'cells',
                rows: [
                  {
                    label: 'buffer',
                    items: [
                      { label: '0', kind: 'heap' },
                      { label: '1', kind: 'heap' },
                      { label: '2', kind: 'heap' },
                    ],
                  },
                ],
              },
            },
          ],
        },
      },
    ],
    'containers',
  ),
  lab(
    'iterators',
    'Half-open ranges. Invalidation rules are per container — that is the table you actually need.',
    [
      {
        id: 'inval',
        title: 'When the iterator dies',
        voice:
          'Vector growth invalidates everything. Erase invalidates at and after. Map insert does not invalidate. Erase only kills the erased iterator — use the returned next.',
        stage: {
          type: 'cells',
          rows: [
            { label: 'vector', items: [{ label: 'it', value: 'dead after push', kind: 'ghost', ghost: true }] },
          ],
        },
        try: {
          type: 'pick',
          prompt: 'You push_back without reserve. Is it still valid?',
          options: [
            {
              label: 'vector::push_back grew',
              voice: 'Capacity changed. Old iterators and pointers into the buffer are dangling.',
              verdict: 'Invalidated.',
              stage: {
                type: 'compare',
                left: { title: 'old buffer', lines: ['freed', 'it dangles'] },
                right: { title: 'new buffer', lines: ['new addresses'] },
              },
            },
            {
              label: 'map::insert',
              voice: 'Node containers do not move existing nodes. Your iterator to another element is still good.',
              verdict: 'Still valid.',
              stage: {
                type: 'graph',
                nodes: [
                  { id: 'a', title: 'old node', kind: 'heap' },
                  { id: 'n', title: 'new node', kind: 'heap' },
                ],
                edges: [],
              },
            },
          ],
        },
      },
    ],
    'invalidation',
  ),
  lab(
    'algorithms',
    'Named loops with known complexity. Remove only shifts — you still erase the tail.',
    [
      {
        id: 'erase',
        title: 'Erase-remove',
        voice:
          'Std remove moves keepers forward and returns the new logical end. The tail is junk. Erase that range or the size is a lie.',
        stage: {
          type: 'cells',
          rows: [
            {
              label: 'after remove(3)',
              items: [
                { label: '1' },
                { label: '2' },
                { label: '4' },
                { label: 'junk', kind: 'ghost', ghost: true },
              ],
            },
          ],
        },
        try: {
          type: 'pick',
          prompt: 'You called remove. Are you done?',
          options: [
            {
              label: 'remove only',
              voice: 'The container size is unchanged. The last slots still hold moved-from or leftover values.',
              verdict: 'Not done. Erase the tail.',
              stage: {
                type: 'compare',
                left: { title: 'logical', lines: ['1 2 4'] },
                right: { title: 'size()', lines: ['still 4'] },
              },
            },
            {
              label: 'erase-remove',
              code: 'v.erase(std::remove(v.begin(), v.end(), 3), v.end());',
              voice: 'Now size matches the keepers. This is the idiom.',
              verdict: 'Done.',
              stage: {
                type: 'cells',
                rows: [
                  {
                    label: 'v',
                    items: [{ label: '1' }, { label: '2' }, { label: '4' }],
                  },
                ],
              },
            },
          ],
        },
      },
    ],
    'algorithms',
  ),
  lab(
    'smart-pointers',
    'Ownership is the type. Unique is exclusive. Shared is a refcount. Weak observes and breaks cycles.',
    [
      {
        id: 'cycle',
        title: 'The cycle Python Tutor will not name',
        voice:
          'If A holds shared to B and B holds shared to A, dropping the external pointers leaves use counts at one. The objects leak. Put weak_ptr on the back edge. That is the contract, not just arrows on a heap.',
        stage: {
          type: 'graph',
          nodes: [
            { id: 'a', title: 'A', sub: 'use=1', kind: 'heap' },
            { id: 'b', title: 'B', sub: 'use=1', kind: 'heap' },
          ],
          edges: [
            { from: 'a', to: 'b', label: 'shared' },
            { from: 'b', to: 'a', label: 'shared — leak' },
          ],
        },
        try: {
          type: 'pick',
          prompt: 'Break the cycle or keep it.',
          options: [
            {
              label: 'shared both ways',
              voice: 'Each object keeps the other alive. Use count never hits zero. Leak.',
              verdict: 'Cycle. Memory stays allocated.',
              stage: {
                type: 'graph',
                nodes: [
                  { id: 'a', title: 'A', sub: 'use≥1 forever', kind: 'heap' },
                  { id: 'b', title: 'B', sub: 'use≥1 forever', kind: 'heap' },
                ],
                edges: [
                  { from: 'a', to: 'b', label: 'shared' },
                  { from: 'b', to: 'a', label: 'shared' },
                ],
              },
            },
            {
              label: 'weak back-edge',
              code: 'struct Node { shared_ptr<Node> next; weak_ptr<Node> parent; };',
              voice: 'Parent does not keep the child’s parent alive. Drop the roots and both objects die. lock on a weak fails after that.',
              verdict: 'Cycle broken. This is the contract.',
              stage: {
                type: 'graph',
                nodes: [
                  { id: 'a', title: 'A', sub: 'use=0 → gone', kind: 'ghost', ghost: true },
                  { id: 'b', title: 'B', sub: 'use=0 → gone', kind: 'ghost', ghost: true },
                ],
                edges: [
                  { from: 'a', to: 'b', label: 'shared' },
                  { from: 'b', to: 'a', label: 'weak', dashed: true },
                ],
              },
            },
          ],
        },
      },
    ],
    'ownership',
  ),
  lab(
    'iostreams',
    'Check the stream. While not eof is the wrong loop — eof is set after a failed read.',
    [
      {
        id: 'loop',
        title: 'Read until failure',
        voice:
          'Getline returns the stream. Use it as the condition. Failbit means the last attempt failed; do not process that record. RAII fstream closes the file in the destructor.',
        stage: {
          type: 'flow',
          steps: [
            { label: 'getline', on: true },
            { label: 'ok? use line', on: true },
            { label: 'fail → stop', on: false },
          ],
        },
        try: {
          type: 'pick',
          prompt: 'Which loop do you write?',
          options: [
            {
              label: 'while (getline(in, line))',
              voice: 'The read is the condition. You only enter the body with a valid line.',
              verdict: 'Correct.',
              stage: {
                type: 'flow',
                steps: [
                  { label: 'read', on: true },
                  { label: 'success → body', on: true },
                  { label: 'fail → done', on: true },
                ],
              },
            },
            {
              label: 'while (!in.eof())',
              voice: 'Eof becomes true after a failed read. You process one garbage record. This is the classic iostreams own-goal.',
              verdict: 'Wrong.',
              stage: {
                type: 'flow',
                steps: [
                  { label: 'eof still false', on: true },
                  { label: 'failed read', on: true, warn: true },
                  { label: 'body runs anyway', on: true, warn: true },
                ],
              },
            },
          ],
        },
      },
    ],
  ),
  lab(
    'pair-tuple',
    'Pair and tuple are anonymous structs. Prefer a named type once the fields have meaning.',
    [
      {
        id: 'named',
        title: 'When to stop using tuple',
        voice:
          'Get 0 and get 1 do not document anything. Structured bindings arrive later. For C++14, a small struct with names is clearer the moment you pass it across a function boundary.',
        stage: {
          type: 'compare',
          left: { title: 'pair<int,int>', lines: ['first / second', 'what are they?'] },
          right: { title: 'struct Point', lines: ['x, y', 'the API speaks'] },
        },
        try: {
          type: 'pick',
          prompt: 'Return two numbers from a function.',
          options: [
            {
              label: 'std::pair',
              voice: 'Fine for a local algorithm. At an API boundary the names first and second will rot.',
              verdict: 'Anonymous. Use briefly.',
              stage: {
                type: 'cells',
                rows: [{ label: 'pair', items: [{ label: 'first' }, { label: 'second' }] }],
              },
            },
            {
              label: 'struct with names',
              voice: 'The return type is the documentation. You can add invariants later.',
              verdict: 'Prefer this once it leaves the function.',
              stage: {
                type: 'cells',
                rows: [{ label: 'Point', items: [{ label: 'x' }, { label: 'y' }] }],
              },
            },
          ],
        },
      },
    ],
  ),
  lab(
    'chrono',
    'Duration is how long. Time point is when. Steady clock measures intervals; system clock talks to the wall.',
    [
      {
        id: 'clocks',
        title: 'Which clock',
        voice:
          'System clock can jump — NTP, the user. Do not use it to time a function. Steady clock is monotonic. Duration cast truncates toward zero.',
        stage: {
          type: 'compare',
          left: { title: 'steady_clock', lines: ['monotonic', 'elapsed time'] },
          right: { title: 'system_clock', lines: ['wall', 'can jump'] },
        },
        try: {
          type: 'pick',
          prompt: 'You want to report milliseconds for work().',
          options: [
            {
              label: 'steady_clock',
              code: 'auto t0 = steady_clock::now(); work();',
              voice: 'The difference is a duration you can cast to milliseconds. This is the measurement clock.',
              verdict: 'Correct for elapsed time.',
              stage: {
                type: 'flow',
                steps: [
                  { label: 'now', on: true },
                  { label: 'work', on: true },
                  { label: 'now - t0', on: true },
                ],
              },
            },
            {
              label: 'system_clock',
              voice: 'If the clock jumps backward, you print a negative duration and look foolish. Save system clock for time_t and the wall.',
              verdict: 'Wrong tool for speed.',
              stage: {
                type: 'flow',
                steps: [{ label: 'NTP jump', on: true, warn: true }],
              },
            },
          ],
        },
      },
    ],
  ),
  lab(
    'concurrency',
    'A data race is undefined behavior — not a maybe-stale int. Join or detach every thread.',
    [
      {
        id: 'race',
        title: 'Shared mutable',
        voice:
          'Two threads writing hits without a mutex or an atomic is a data race. Destroying a joinable thread calls terminate. Capture reference into a thread that outlives the locals and you dangle.',
        stage: {
          type: 'graph',
          nodes: [
            { id: 't1', title: 'thread A', kind: 'stack' },
            { id: 't2', title: 'thread B', kind: 'stack' },
            { id: 'h', title: 'hits', sub: 'unprotected', kind: 'heap' },
          ],
          edges: [
            { from: 't1', to: 'h', label: 'write' },
            { from: 't2', to: 'h', label: 'write' },
          ],
        },
        try: {
          type: 'pick',
          prompt: 'Protect hits, or do not.',
          options: [
            {
              label: 'bare ++hits',
              voice: 'Two cores, one int, no atomic, no lock. The compiler may delete your checks. This is UB.',
              verdict: 'Data race.',
              stage: {
                type: 'cells',
                rows: [{ label: 'hits', items: [{ label: '???', value: 'UB', kind: 'ghost', ghost: true }] }],
              },
            },
            {
              label: 'lock_guard',
              code: 'std::lock_guard<std::mutex> lock(m); ++hits;',
              voice: 'The mutex is released on every exit path, including throw. That is RAII again.',
              verdict: 'Defined. Serialize the write.',
              stage: {
                type: 'flow',
                steps: [
                  { label: 'lock', on: true },
                  { label: '++hits', on: true },
                  { label: 'unlock in dtor', on: true },
                ],
              },
            },
          ],
        },
      },
    ],
  ),
  lab(
    'atomics',
    'Atomic protects one object, not a protocol. Default memory order is sequential consistency.',
    [
      {
        id: 'one',
        title: 'A single word',
        voice:
          'Atomic int is fine for a counter. Two atomics that must stay in sync still need a mutex or a carefully designed lock-free protocol. Relaxed order is not a beginner default.',
        stage: {
          type: 'compare',
          left: { title: 'atomic<int> hits', lines: ['one object', 'ok'] },
          right: { title: 'atomic flag + atomic ptr', lines: ['two objects', 'not automatically a pair'] },
        },
        try: {
          type: 'pick',
          prompt: 'Is volatile enough for a thread flag?',
          options: [
            {
              label: 'volatile bool done',
              voice: 'Volatile does not provide atomicity or a memory barrier. Another thread may never see the write. Use atomic.',
              verdict: 'Wrong tool. Volatile is for hardware.',
              stage: {
                type: 'compare',
                left: { title: 'writer', lines: ['done = true'] },
                right: { title: 'reader', lines: ['may spin forever'] },
              },
            },
            {
              label: 'atomic<bool> done',
              voice: 'Store and load are atomic. Seq cst is the default and the one you want until you can prove otherwise.',
              verdict: 'Correct flag.',
              stage: {
                type: 'flow',
                steps: [
                  { label: 'store true', on: true },
                  { label: 'other thread loads true', on: true },
                ],
              },
            },
          ],
        },
      },
    ],
  ),
]
