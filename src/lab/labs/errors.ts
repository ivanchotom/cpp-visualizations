import { lab } from '../make.ts'
import type { Lab } from '../schema.ts'

export const errorsLabs: Lab[] = [
  lab(
    'exceptions',
    'Throw starts unwind: destructors of automatic objects run until a matching catch. Catch by const reference.',
    [
      {
        id: 'unwind',
        title: 'The stack walks back',
        voice:
          'Parse throws. Open file’s destructor runs, then run catches. That is RAII as the cleanup mechanism — not an optional style. Catch by value slices. Never throw from a destructor during unwind.',
        stage: {
          type: 'stack',
          frames: [
            { name: 'main' },
            { name: 'run', tag: 'catch' },
            { name: 'openFile', tag: 'dtor runs' },
            { name: 'parse', tag: 'throw', dead: true },
          ],
        },
        try: {
          type: 'pick',
          prompt: 'Step the unwind.',
          options: [
            {
              label: 'throw in parse',
              voice: 'The exception object is constructed. Parse’s locals destroy. Control will not return normally.',
              verdict: 'Unwind begins.',
              stage: {
                type: 'stack',
                frames: [
                  { name: 'main' },
                  { name: 'run' },
                  { name: 'openFile' },
                  { name: 'parse', tag: 'throw', dead: true },
                ],
              },
            },
            {
              label: 'openFile unwinds',
              voice: 'Open file’s automatic objects destroy — that is where the file handle closes. This is why you do not leak on throw.',
              verdict: 'RAII cleanup on the way out.',
              stage: {
                type: 'stack',
                frames: [
                  { name: 'main' },
                  { name: 'run' },
                  { name: 'openFile', tag: 'dtors', dead: true },
                ],
              },
            },
            {
              label: 'caught in run',
              voice: 'A handler matched. Unwind stops. If you catch by value you sliced the exception object.',
              verdict: 'catch (const std::exception&).',
              stage: {
                type: 'stack',
                frames: [
                  { name: 'main' },
                  { name: 'run', tag: 'handler' },
                ],
              },
            },
          ],
        },
      },
    ],
    'exceptions',
  ),
  lab(
    'error-handling',
    'Pick a policy. Noexcept is both documentation and the reason vector can move on resize.',
    [
      {
        id: 'policy',
        title: 'Exceptions, codes, or abort',
        voice:
          'Mixing exceptions and error codes without a boundary makes APIs unusable. A noexcept function that throws calls terminate. Destructors are noexcept in practice — throwing there during unwind is fatal.',
        stage: {
          type: 'compare',
          left: { title: 'exceptions', lines: ['unwind + RAII', 'hard to ignore'] },
          right: { title: 'error_code', lines: ['no unwind', 'easy to ignore'] },
        },
        try: {
          type: 'pick',
          prompt: 'Mark a move constructor noexcept — or not.',
          options: [
            {
              label: 'noexcept move',
              voice: 'Vector will move elements on reallocation. You promised not to throw. Break that promise and the program dies.',
              verdict: 'Faster growth. Fatal if you lie.',
              stage: {
                type: 'flow',
                steps: [
                  { label: 'move_if_noexcept → move', on: true },
                  { label: 'throw → terminate', on: false, warn: true },
                ],
              },
            },
            {
              label: 'Throwing move',
              voice: 'Vector copies instead so it can keep the old buffer. Growth is slower. Honesty about throw is better than a fake noexcept.',
              verdict: 'Copies on resize.',
              stage: {
                type: 'flow',
                steps: [{ label: 'move_if_noexcept → copy', on: true }],
              },
            },
          ],
        },
      },
    ],
  ),
]
