# SaaSkit Abstraction Boundaries

This document defines the architectural boundaries between saaskit and the mdxui ecosystem.

## Overview

saaskit is a **Business-as-Code** framework that generates complete SaaS applications from noun/verb definitions. It is a **generator**, not a runtime UI library.

```
saaskit (generator/framework)
    |
    |-- generates code that uses -->
    |
    +-- @mdxui/admin (admin UI components)
    +-- @mdxui/primitives (base UI components)
    +-- @mdxui/app (app shell/layout)
    +-- @dotdo/react (optional backend integration)
```

## What SaaSkit Generates

SaaSkit derives multiple artifacts from a single noun/verb schema:

| Output | Description | Target Package |
|--------|-------------|----------------|
| **App** | React admin dashboard | Uses `@mdxui/admin` components |
| **API** | REST + GraphQL + WebSocket | Pure TypeScript (no UI deps) |
| **Site** | Landing page | Uses `@mdxui/beacon` |
| **Docs** | API reference | Uses Fumadocs |
| **CLI** | Command-line interface | Pure TypeScript |
| **MCP** | Model Context Protocol server | Pure TypeScript |
| **SDK** | Client libraries (TS/Python/Go) | Pure TypeScript |

## Current Dependency Analysis

### package.json Dependencies

**Runtime dependencies:** None (saaskit has no production `dependencies`)

**Peer dependencies:**
- `react`: ^18.0.0 || ^19.0.0 (required for generated components)

**Optional dependencies:**
- `@dotdo/react`: ^1.0.0 (backend integration)
- `@dotdo/client`: ^0.3.0 (API client)

**Dev dependencies:**
- `@mdxui/typescript-config`: workspace:* (build tooling only)
- Testing and build tools

### Import Audit Results

| Library | Status | Notes |
|---------|--------|-------|
| `react-admin` | **Not imported** | None found |
| `ra-core` | **Not imported** | None found |
| `@tanstack/react-query` | **Not imported** | None found |
| `react-router-dom` | **Not imported** | None found |
| `@radix-ui/*` | **Not imported** | None found |
| `lucide-react` | **Not imported** | None found |
| `clsx` | **Not imported** | None found |
| `@mdxui/*` | **Not imported** | Not yet integrated |

## Current Architecture

### UI Generation Pattern

saaskit currently generates **pure React elements** using `createElement`:

```tsx
// packages/saaskit/src/generators/app/pages/dashboard.tsx
children.push(createElement('h1', { key: 'title' }, 'Dashboard'))
children.push(createElement('button', { ... }, 'New Product'))
```

This is intentionally primitive - it generates semantic HTML without styling dependencies.

### Two Component Systems

1. **Generator Pages** (`src/generators/app/pages/`)
   - Dynamically generate components from noun/verb definitions
   - Use `createElement` to build UI
   - Currently produce unstyled HTML elements
   - Intended for integration with `@mdxui/admin` components

2. **Built-in Pages** (`src/components/pages/`)
   - Pre-defined page templates (API Keys, Webhooks, Billing, etc.)
   - Use JSX syntax
   - Currently produce unstyled HTML elements
   - Provide prop-based customization

### Provider Architecture

```tsx
// packages/saaskit/src/providers/index.tsx

// Optional @dotdo/react integration
try {
  const dotdoReact = require('@dotdo/react')
  DOProvider = dotdoReact.DO
  use$Hook = dotdoReact.use$
  // ...
} catch {
  // Falls back to stub context
}
```

When `@dotdo/react` is available:
- `DOProvider` wraps for durable object access
- `DotdoAdminProvider` provides data layer
- `use$` hook provides workflow context

When not available:
- Stub context logs operations to console
- Enables development without backend

## Interface Contracts

### 1. SaaSProvider Contract

```typescript
interface SaaSProviderProps {
  app: ResolvedApp         // From defineApp()
  auth?: AuthConfig        // Authentication settings
  realtime?: RealtimeConfig // WebSocket settings
  organizationId?: string   // Multi-tenant context
  dataProvider?: DataProvider // Custom data layer
  children: ReactNode
}
```

### 2. Generated App Contract

```typescript
interface GeneratedApp {
  routes: AppRoute[]                        // Navigation routes
  getPage(name: string): ComponentType      // Page lookup
  getShell(): ComponentType                 // App shell/layout
}
```

### 3. Resource Hook Contract

```typescript
interface UseResourceResult<T> {
  data: T[]
  isLoading: boolean
  error: Error | null
  create: (data: Partial<T>) => Promise<T>
  update: (id: string, data: Partial<T>) => Promise<T>
  remove: (id: string) => Promise<void>
  refetch: () => Promise<void>
}
```

## Target Architecture (TODO)

### Recommended Integration Points

1. **Generated Pages** should use `@mdxui/admin` components:
   ```tsx
   // Future: Use admin components
   import { DataGrid, CreateButton, FilterForm } from '@mdxui/admin'

   // Instead of:
   createElement('table', ...)
   createElement('button', ...)
   ```

2. **App Shell** should use `@mdxui/app`:
   ```tsx
   // Future: Use app shell
   import { AppShell, AppSidebar, NavMain } from '@mdxui/app'
   ```

3. **Primitive UI** should use `@mdxui/primitives`:
   ```tsx
   // Future: Use primitives
   import { Button, Card, Input } from '@mdxui/primitives'
   ```

### Migration Path

| Component Type | Current | Target |
|----------------|---------|--------|
| Buttons | `<button>` | `@mdxui/primitives/Button` |
| Tables | `<table>` | `@mdxui/admin/DataGrid` |
| Forms | `<form>` | `@mdxui/admin/Form` |
| Layout | `<div>` | `@mdxui/app/AppShell` |
| Fields | `<input>` | `@mdxui/admin/inputs/*` |

## Abstraction Rules

### What SaaSkit SHOULD DO

1. **Define** noun/verb schemas and business logic
2. **Generate** component code using mdxui abstractions
3. **Provide** hooks and context for data access
4. **Integrate** with `@dotdo/react` for backend operations
5. **Export** types and interfaces for customization

### What SaaSkit SHOULD NOT DO

1. **Import** direct UI dependencies (radix, lucide, etc.)
2. **Bundle** styling frameworks
3. **Include** routing implementation
4. **Define** low-level UI primitives
5. **Implement** data fetching directly (use hooks/context)

### Package Responsibility Matrix

| Concern | Package |
|---------|---------|
| Business logic definition | `saaskit` |
| Admin UI components | `@mdxui/admin` |
| App shell/layout | `@mdxui/app` |
| Base primitives | `@mdxui/primitives` |
| Landing pages | `@mdxui/beacon` |
| Backend integration | `@dotdo/react` |
| Data fetching patterns | `@mdxui/app/hooks` |

## Files Overview

```
packages/saaskit/
├── src/
│   ├── core/               # defineApp, $context, built-ins
│   ├── components/
│   │   ├── SaaS.tsx        # Main <SaaS> component
│   │   └── pages/          # Built-in page templates
│   ├── generators/
│   │   ├── app/            # Admin dashboard generator
│   │   └── site/           # Landing page generator
│   ├── hooks/              # useResource, useRealtime, etc.
│   ├── providers/          # React context providers
│   ├── types/              # Type definitions
│   ├── parsers/            # Noun/verb/relationship parsing
│   ├── cli-generator/      # CLI tool generator
│   ├── sdk-generator/      # Client SDK generator
│   ├── mcp-generator/      # MCP server generator
│   ├── docs/               # API docs generator
│   ├── studio/             # SaaS management console
│   └── billing/            # Stripe integration
└── package.json
```

## Compliance Status

| Requirement | Status | Notes |
|-------------|--------|-------|
| No react-admin imports | PASS | None found |
| No ra-core imports | PASS | None found |
| No direct @tanstack/react-query | PASS | None found |
| No react-router-dom | PASS | None found |
| No direct UI primitives | PASS | Uses createElement only |
| Integration with @mdxui/* | PENDING | Not yet implemented |

## Next Steps

1. [ ] Add `@mdxui/admin` as peer dependency
2. [ ] Add `@mdxui/app` as peer dependency
3. [ ] Add `@mdxui/primitives` as peer dependency
4. [ ] Refactor generators to use mdxui components
5. [ ] Create adapter layer for component customization
6. [ ] Document component override patterns

---

*Last updated: 2026-01-12*
