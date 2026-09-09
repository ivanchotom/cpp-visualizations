#!/bin/sh
# Idempotent: point this clone at repo hooks and Ivan's git identity.
set -e
cd "$(git rev-parse --show-toplevel)"
git config core.hooksPath .githooks
chmod +x .githooks/commit-msg .githooks/post-commit
git config user.name "Ivan"
git config user.email "46633666+ivanchotom@users.noreply.github.com"
