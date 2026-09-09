# Agent instructions

## Git attribution (required)

Every commit in this repository is **Ivan only**. Cursor must never appear as author, committer, or co-author.

Canonical identity (match `main`):

```
Ivan <46633666+ivanchotom@users.noreply.github.com>
```

Hard rules:

- Do not set author or committer to `Cursor Agent` or `cursoragent@cursor.com`.
- Do not add `Co-authored-by:`, `Made-with:`, or any Cursor attribution trailer.
- Create commits with an explicit author:

```bash
git -c user.name="Ivan" -c user.email="46633666+ivanchotom@users.noreply.github.com" \
  commit --author="Ivan <46633666+ivanchotom@users.noreply.github.com>"
```

- Immediately after each commit, check `git log -1 --format=full`. If the author/committer is Cursor or the message contains a co-author trailer, amend it away before pushing:

```bash
git commit --amend --no-edit --no-verify \
  --author="Ivan <46633666+ivanchotom@users.noreply.github.com>"
# then strip any Co-authored-by / Made-with lines from the message
```

Repo hooks in `.githooks/` (enabled via `core.hooksPath`) strip those trailers and rewrite a Cursor author after commit. Do not bypass them with `--no-verify` except when the hook itself is amending.

## C++ snippets

All C++ examples in this project target the **C++14** standard.

## Cursor Cloud specific instructions

`.cursor/environment.json` `install` runs `scripts/setup-git-attribution.sh` after `npm ci`. That script sets `core.hooksPath` to `.githooks` and the local git user to Ivan. Platform env vars (`GIT_AUTHOR_NAME=Cursor Agent`) still override config, which is why `--author=...` and the post-commit rewrite exist — use both.
