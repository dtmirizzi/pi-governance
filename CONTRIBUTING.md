# Contributing to pi-governance

Thank you for your interest in contributing to pi-governance! This guide covers the development workflow, coding standards, and how to submit changes.

## Getting started

```bash
git clone https://github.com/dtmirizzi/pi-governance.git
cd pi-governance
pnpm install
```

## Development workflow

### Build

```bash
pnpm run build          # ESM + CJS + DTS via tsup
```

### Test

```bash
pnpm run test           # Run all tests
pnpm run test:coverage  # Run with coverage report
pnpm vitest bench       # Run performance benchmarks
```

### Lint & format

```bash
pnpm run lint           # ESLint
pnpm run format         # Prettier
pnpm run typecheck      # tsc --noEmit
```

### Docs

```bash
pnpm run docs:dev       # Start VitePress dev server
pnpm run docs:build     # Build static docs site
```

## Code conventions

### TypeScript

- **Strict mode** — all strict compiler options enabled
- **ES2022 target** — use modern JavaScript features
- **ESM imports** — use `.js` extension in relative imports (e.g., `import from './schema.js'`)
- **Node builtins** — use `node:` prefix (e.g., `node:fs`, `node:crypto`)
- **Unused variables** — prefix with `_` (e.g., `_unusedParam`)

### Project structure

```
src/
  lib/           # Pure library — zero Pi dependency
  extensions/    # Pi integration layer
test/
  unit/          # Unit tests (mirror src/lib/ structure)
  integration/   # Integration tests
  bench/         # Performance benchmarks
```

### Path aliases

- `@lib/*` maps to `src/lib/*`
- `@extensions/*` maps to `src/extensions/*`

These work in tests via the Vitest alias config.

## Writing tests

Tests use Vitest with globals enabled (`describe`, `it`, `expect` available without imports).

```typescript
import { describe, it, expect } from 'vitest';
import { MyClass } from '../../../src/lib/my-module/my-class.js';

describe('MyClass', () => {
  it('does something', () => {
    expect(new MyClass().method()).toBe('expected');
  });
});
```

Coverage targets: 80% minimum for statements, branches, functions, and lines.

## Submitting changes

1. Fork the repo and create a feature branch from `main`
2. Make your changes with tests
3. Run `pnpm run lint && pnpm run typecheck && pnpm run test` — all must pass
4. Commit using [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` — new feature
   - `fix:` — bug fix
   - `docs:` — documentation only
   - `refactor:` — code change that neither fixes a bug nor adds a feature
   - `test:` — adding or updating tests
   - `chore:` — maintenance (deps, CI, etc.)
5. Open a pull request against `main`

## Architecture notes

- **`lib/` is standalone** — no Pi imports allowed in `src/lib/`. This layer can be used independently for testing or with other agent frameworks.
- **Blocked takes precedence** — `blocked_tools` > `allowed_tools`, `blocked_paths` > `allowed_paths`
- **Full-command danger check** — bash classifier checks dangerous patterns on the full command before splitting on pipes
- **Optional deps use dynamic import** — Oso is loaded via `import()` only when configured

## License

By contributing, you agree that your contributions will be licensed under the [Apache-2.0 License](LICENSE).
