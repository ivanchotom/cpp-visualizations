import { useState } from 'react'
import { SceneShell } from './scene/SceneShell.tsx'
import { useBeats } from './scene/useBeats.ts'

type Mode = 'remove' | 'sort' | 'bound' | 'unsorted'

const MODES: { id: Mode; title: string }[] = [
  { id: 'remove', title: 'remove_if' },
  { id: 'sort', title: 'sort' },
  { id: 'bound', title: 'lower_bound' },
  { id: 'unsorted', title: 'unsorted' },
]

function Cells({
  vals,
  read,
  write,
  junkFrom,
  found,
}: {
  vals: readonly (number | string)[]
  read?: number | null
  write?: number | null
  junkFrom?: number | null
  found?: number | null
}) {
  return (
    <div className="fx-buf-row">
      {vals.map((v, n) => {
        const junk = junkFrom != null && n >= junkFrom
        const isFound = found === n
        const isWrite = write === n
        const isRead = read === n
        return (
          <span
            key={n}
            className={`fx-letter${
              junk
                ? ' fx-letter--junk'
                : isFound
                  ? ' fx-letter--it'
                  : isWrite
                    ? ' fx-letter--write'
                    : isRead
                      ? ' fx-letter--read'
                      : ' fx-letter--on'
            }`}
          >
            {v}
          </span>
        )
      })}
    </div>
  )
}

export function AlgorithmsViz() {
  const [id, setId] = useState<Mode>('remove')
  const { i, playing, play, reset } = useBeats(4)

  function select(next: string) {
    reset()
    setId(next as Mode)
  }

  const stepped = i >= 1
  const decided = i >= 2
  const recap = i >= 3

  const removeVals: readonly (number | string)[] =
    i === 0
      ? [4, -1, 7, 0, 2]
      : i === 1
        ? [4, -1, 7, 0, 2]
        : i === 2
          ? [4, 7, 2, 0, 2]
          : [4, 7, 2]
  const removeRead = i === 0 ? 0 : i === 1 ? 2 : null
  const removeWrite = i === 0 ? 0 : i === 1 ? 1 : i === 2 ? 3 : null
  const removeJunk = i === 2 ? 3 : null

  const sortVals: readonly number[] = recap || decided ? [1, 2, 4, 5] : [5, 1, 4, 2]
  const boundVals: readonly number[] = [1, 3, 7, 9, 12]
  const boundRead = i === 1 ? 2 : i === 2 ? 3 : recap ? 3 : null
  const unsortedVals: readonly number[] = [7, 1, 9, 3]
  const unsortedRead = stepped ? 0 : null

  const code =
    id === 'remove'
      ? recap
        ? `v.erase(new_end, v.end());
// the “erase” in erase-remove`
        : decided
          ? `auto new_end = std::remove_if(
    v.begin(), v.end(), pred);
// size still 5; tail is junk`
          : `std::vector<int> v{4, -1, 7, 0, 2};
auto pred = [](int x) { return x <= 0; };`
      : id === 'sort'
        ? `std::sort(v.begin(), v.end());
// N log N, random-access iterators
// vector, deque, array — not list`
        : id === 'bound'
          ? `std::sort(v.begin(), v.end());
auto it = std::lower_bound(
    v.begin(), v.end(), 9);
if (it != v.end() && *it == 9) { }`
          : `// v is not sorted
std::lower_bound(v.begin(), v.end(), 7);
// not a diagnostic — just wrong`

  const caption =
    i === 0
      ? id === 'remove'
        ? 'Play remove_if. Predicate: drop x <= 0. remove_if only shifts keepers left. You still erase the tail.'
        : id === 'sort'
          ? 'Play sort. Named loop, N log N. Needs random-access iterators — vector, deque, array. Not list.'
          : id === 'bound'
            ? 'Play lower_bound. Log N on a partitioned range. The binary-search primitive. C++14 has no ranges::sort.'
            : 'Play unsorted. lower_bound / binary_search on an unsorted range is nonsense, not a compiler error.'
      : id === 'remove' && i === 1
        ? '4 is kept. −1 fails: write stays on that hole, read walks to 7. Values stay in their slots — the next beat overwrites the hole in place.'
        : id === 'remove' && i === 2
          ? 'Keepers compacted: 4, 7, 2. new_end marks the first junk. size() is still 5. Tail is unspecified.'
          : id === 'remove'
            ? 'v.erase(new_end, v.end()) actually shortens. That second call is the “erase” in the erase-remove idiom. C++14 has no std::erase_if.'
            : id === 'sort' && i === 1
              ? 'sort permutes in place. Adjacent cells light as the partition walks. No flyer — the buffer is the algorithm.'
              : id === 'sort' && i === 2
                ? 'Sorted. Equivalent elements’ order is not preserved (that is stable_sort, more memory).'
                : id === 'sort'
                  ? 'list has bidirectional iterators, not random access. sort(L.begin(), L.end()) does not compile. Use L.sort().'
                  : id === 'bound' && i === 1
                    ? 'Mid is 7. 7 < 9, so the search continues on the right half. Cells stay put; the highlight moves.'
                    : id === 'bound' && i === 2
                      ? 'Hits 9. lower_bound returns the first position not less than 9. Check *it == 9; the iterator may be end() or a greater value.'
                      : id === 'bound'
                        ? 'binary_search only answers yes/no. lower_bound gives you the insertion point. Both require the range already be partitioned.'
                        : i === 1
                          ? 'The algorithm still runs. It assumes the range is partitioned. Here 7 is first by accident, not by order.'
                          : i === 2
                            ? 'You may get a plausible iterator. You may not. There is no diagnostic. Sortedness is a precondition, not a check.'
                            : 'Sort first, then lower_bound. Or use find_if if the range is unsorted — linear, but honest.'

  const tone = id === 'unsorted' && decided ? 'trap' : recap && id !== 'unsorted' ? 'ok' : id === 'remove' && decided ? 'warn' : 'idle'
  const playLabel =
    id === 'remove' ? 'Play remove_if' : id === 'sort' ? 'Play sort' : id === 'bound' ? 'Play lower_bound' : 'Play unsorted'

  const vals = id === 'remove' ? removeVals : id === 'sort' ? sortVals : id === 'bound' ? boundVals : unsortedVals
  const read = id === 'remove' ? removeRead : id === 'bound' ? boundRead : id === 'unsorted' ? unsortedRead : id === 'sort' && i === 1 ? 0 : null
  const write = id === 'remove' ? removeWrite : id === 'sort' && i === 1 ? 1 : null
  const junkFrom = id === 'remove' ? removeJunk : null
  const found = id === 'bound' && recap ? 3 : id === 'sort' && decided ? null : null

  const verdict =
    id === 'remove' && i === 1
      ? 'write stays on the hole'
      : id === 'remove' && i === 2
        ? 'new_end · tail is junk'
        : id === 'remove' && recap
          ? 'erase the tail · size 3'
          : id === 'sort' && decided
            ? 'N log N · random access'
            : id === 'bound' && i === 2
              ? 'lower_bound · 9'
              : id === 'bound' && recap
                ? '*it == 9 · found'
                : id === 'unsorted' && decided
                  ? 'precondition · not a diagnostic'
                  : ''

  const note =
    id === 'remove'
      ? i === 0
        ? 'pred: drop x <= 0'
        : i === 1
          ? 'read @ 7 · write on −1'
          : i === 2
            ? 'new_end @ 3 · size still 5'
            : 'keepers only'
      : id === 'sort'
        ? decided
          ? 'in-place permutation'
          : 'not yet sorted'
        : id === 'bound'
          ? recap
            ? 'first not-less-than 9'
            : stepped
              ? 'mid highlight'
              : 'must already be sorted'
          : decided
            ? 'result is meaningless'
            : 'looks like a search'

  return (
    <SceneShell
      modes={MODES}
      mode={id}
      onSelect={select}
      playing={playing}
      onPlay={play}
      onReset={() => {
        reset()
        setId(id)
      }}
      playLabel={playLabel}
      step={i}
      stepCount={4}
      sig={MODES.find((m) => m.id === id)?.title}
      caption={caption}
      code={code}
      tone={tone}
    >
      <div className={`fx-pane${stepped ? ' fx-pane--focus' : ''}${id === 'unsorted' && decided ? ' fx-pane--trap' : ''}`}>
        <span className="fx-kicker">{id === 'remove' ? 'v' : id === 'sort' ? 'v' : 'sorted? range'}</span>
        <Cells vals={vals} read={read} write={write} junkFrom={junkFrom} found={found} />
        <span className="fx-note">{note}</span>
      </div>
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          id === 'unsorted' && decided
            ? 'fx-verdict--trap'
            : id === 'remove' && i === 2
              ? 'fx-verdict--warn'
              : verdict
                ? 'fx-verdict--ok'
                : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
