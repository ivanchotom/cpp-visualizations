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
  const unsortedTrap = id === 'unsorted' && decided
  const trap = unsortedTrap
  const ok = (id === 'remove' && recap) || (id === 'sort' && recap) || (id === 'bound' && recap)

  const code =
    id === 'remove'
      ? recap
        ? `v.erase(new_end, v.end());
// the “erase” in erase-remove
// C++14: no std::erase_if`
        : `auto new_end = std::remove_if(
    v.begin(), v.end(), pred);
// size still 5; tail is junk`
      : id === 'sort'
        ? recap
          ? `// list: L.sort() — not std::sort
// needs random-access iterators`
          : `std::sort(v.begin(), v.end());
// N log N, random-access iterators
// vector, deque, array — not list`
        : id === 'bound'
          ? recap
            ? `if (it != v.end() && *it == 9) { }
// C++14 has no ranges::sort`
            : `std::sort(v.begin(), v.end());
auto it = std::lower_bound(
    v.begin(), v.end(), 9);`
          : recap
            ? `// v is not sorted
std::lower_bound(v.begin(), v.end(), 7);
// not a diagnostic — just wrong`
            : `// v is not sorted
std::lower_bound(v.begin(), v.end(), 7);`

  const caption =
    i === 0
      ? id === 'remove'
        ? 'Play remove_if. Predicate: drop x <= 0. remove_if only shifts keepers left. You still erase the tail. C++14 has no std::erase_if.'
        : id === 'sort'
          ? 'Play sort. Named loop, N log N. Needs random-access iterators — vector, deque, array. Not list.'
          : id === 'bound'
            ? 'Play lower_bound. Log N on a partitioned range. The binary-search primitive. C++14 has no ranges::sort.'
            : 'Play unsorted. lower_bound / binary_search on an unsorted range is nonsense, not a compiler error.'
      : id === 'remove' && i === 1
        ? '4 is kept. −1 fails: write stays on that hole. Stations light in place. size() is still 5.'
        : id === 'remove' && i === 2
          ? 'Keepers compacted. new_end marks the first junk. size() is still 5. Tail is unspecified.'
          : id === 'remove'
            ? 'v.erase(new_end, v.end()) actually shortens. That second call is the “erase” in the erase-remove idiom.'
            : id === 'sort' && i === 1
              ? 'sort permutes in place. N log N. Needs random-access iterators.'
              : id === 'sort' && i === 2
                ? 'Sorted. Equivalent elements’ order is not preserved (that is stable_sort, more memory).'
                : id === 'sort'
                  ? 'list has bidirectional iterators, not random access. sort(L.begin(), L.end()) does not compile. Use L.sort().'
                  : id === 'bound' && i === 1
                    ? 'Mid is 7. 7 < 9, so the search continues on the right half.'
                    : id === 'bound' && i === 2
                      ? 'Hits 9. lower_bound returns the first position not less than 9. Check *it == 9; the iterator may be end() or a greater value.'
                      : id === 'bound'
                        ? 'binary_search only answers yes/no. lower_bound gives you the insertion point. Both require the range already be partitioned.'
                        : i === 1
                          ? 'The algorithm still runs. It assumes the range is partitioned. Here 7 is first by accident, not by order.'
                          : i === 2
                            ? 'You may get a plausible iterator. You may not. There is no diagnostic. Sortedness is a precondition, not a check.'
                            : 'Sort first, then lower_bound. Or use find_if if the range is unsorted — linear, but honest.'

  const tone = trap ? 'trap' : ok ? 'ok' : 'idle'
  const playLabel =
    id === 'remove' ? 'Play remove_if' : id === 'sort' ? 'Play sort' : id === 'bound' ? 'Play lower_bound' : 'Play unsorted'

  const verdict =
    id === 'remove' && recap
      ? 'erase the tail · size 3'
      : id === 'remove' && decided
        ? 'new_end · tail is junk'
        : id === 'remove' && stepped
          ? 'write stays on the hole'
          : id === 'sort' && recap
            ? 'list · use L.sort()'
            : id === 'sort' && decided
              ? 'N log N · random access'
              : id === 'sort' && stepped
                ? 'permute in place'
                : id === 'bound' && recap
                  ? '*it == 9 · found'
                  : id === 'bound' && decided
                    ? 'lower_bound · 9'
                    : id === 'bound' && stepped
                      ? 'mid · 7'
                      : unsortedTrap && recap
                        ? 'precondition · not a diagnostic'
                        : unsortedTrap
                          ? 'result is meaningless'
                          : id === 'unsorted' && stepped
                            ? 'looks like a search'
                            : ''

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
      {id === 'remove' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>sz</code>
            <span className="fx-note">size</span>
            <span className="fx-note">{recap ? '3' : stepped ? '5' : '—'}</span>
          </div>
          <div className={`fx-rank${decided ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : decided ? ' fx-rank--trap' : ''}`}>
            <code>end</code>
            <span className="fx-note">cut</span>
            <span className="fx-note">{recap ? 'ok' : decided ? 'junk' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'sort' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>v</code>
            <span className="fx-note">RA</span>
            <span className="fx-note">{decided ? 'ok' : stepped ? 'mix' : '—'}</span>
          </div>
          <div className={`fx-rank${recap ? ' fx-rank--trap' : ''}`}>
            <code>L</code>
            <span className="fx-note">list</span>
            <span className="fx-note">{recap ? 'ill' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'bound' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}${recap ? ' fx-rank--done' : ''}`}>
            <code>it</code>
            <span className="fx-note">mid</span>
            <span className="fx-note">{decided ? '9' : stepped ? '7' : '—'}</span>
          </div>
          <div className={`fx-rank${recap ? ' fx-rank--on fx-rank--done' : decided ? ' fx-rank--on' : ''}`}>
            <code>hit</code>
            <span className="fx-note">*it</span>
            <span className="fx-note">{recap ? 'ok' : '—'}</span>
          </div>
        </div>
      )}
      {id === 'unsorted' && (
        <div className="fx-ladder">
          <div className={`fx-rank${stepped ? ' fx-rank--on' : ''}`}>
            <code>v</code>
            <span className="fx-note">ord</span>
            <span className="fx-note">{stepped ? 'no' : '—'}</span>
          </div>
          <div className={`fx-rank${unsortedTrap ? ' fx-rank--trap' : ''}`}>
            <code>lb</code>
            <span className="fx-note">lb</span>
            <span className="fx-note">{unsortedTrap ? 'ub' : '—'}</span>
          </div>
        </div>
      )}
      <div
        className={`fx-verdict${verdict ? ' fx-verdict--show' : ''} ${
          trap ? 'fx-verdict--trap' : ok ? 'fx-verdict--ok' : ''
        }`}
      >
        {verdict}
      </div>
    </SceneShell>
  )
}
