# State Management Refactor Design Document

**Issue:** ui-hjre
**Status:** Design Phase
**Date:** 2026-01-10

## Executive Summary

SaaSKit currently uses three distinct state management patterns across its codebase:

1. **Database Layer** - Proxy + Map pattern with lazy initialization
2. **React Layer** - Context API with `useState`/`useCallback`
3. **Events Layer** - Module-level closures with Map storage

This document analyzes each pattern, identifies inconsistencies, and proposes a unified approach.

---

## 1. Current State Analysis

### 1.1 Database Pattern: Proxy + Map

**Location:** `src/database/`, `src/core/context.ts`

**How state is created:**
```typescript
// Module-level Maps for storage
const storage = new Map<string, Map<string, BaseRecord>>()

// Lazy initialization via Proxy
const { proxy: dbProxy } = createDbProxy<DatabaseAccessor>({
  isInitialized: () => nounDefinitions !== null,
  isRegistered: (nounName) => nounName in nounDefinitions,
  createAccessor: (nounName) => createDatabaseAccessor(nounName, ...),
})
```

**How state is accessed:**
```typescript
// Through Proxy getter - creates accessor on first access
$.db.Customer.get(id)

// Proxy intercepts property access and returns cached or new accessor
```

**How state is mutated:**
```typescript
// Direct Map mutations with async wrappers
async create(data) {
  storage.set(id, record)
  return record
}

async update(id, data) {
  const existing = storage.get(id)
  storage.set(id, updated)
  return updated
}
```

**Trade-offs:**
| Pros | Cons |
|------|------|
| Lazy initialization saves memory | Hidden mutation - no change tracking |
| Type-safe accessor creation | No built-in subscription system |
| Caching prevents duplicate work | State changes not observable |
| Clean `$.db.Noun` API | No undo/redo capability |

---

### 1.2 React Pattern: Context API

**Location:** `src/generators/app/context.tsx`

**How state is created:**
```typescript
const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children, initialData, ... }) {
  const [data, setData] = useState<Record<string, unknown>>(initialData)
  const [realtimeStatus, setRealtimeStatus] = useState('connecting')
  // ...
}
```

**How state is accessed:**
```typescript
export function useAppContext(): AppContextValue {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider')
  }
  return context
}
```

**How state is mutated:**
```typescript
// Via callback functions passed through context
const updateData = useCallback((key: string, value: unknown) => {
  setData((prev) => ({ ...prev, [key]: value }))
}, [])

// Realtime event handling with complex nested updates
const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
  if (event.type === 'created' && nounData?.data) {
    setData((prev) => ({
      ...prev,
      [event.noun]: {
        ...prev[event.noun] as object,
        data: [...currentList, event.data],
      },
    }))
  }
  // ... more cases
}, [data])
```

**Trade-offs:**
| Pros | Cons |
|------|------|
| React-native, familiar pattern | Complex nested state updates |
| Automatic re-renders on change | `data` dependency in handleRealtimeEvent causes issues |
| Composable with other hooks | No type safety for data keys |
| DevTools support | Growing callback complexity |

---

### 1.3 Events Pattern: Module-Level Closures

**Location:** `src/events/`, `src/events.ts`

**How state is created:**
```typescript
// Module-level Maps (multiple places)
const scheduleLocks: Map<string, ScheduleLock> = new Map()
const lockTokens: Map<string, string> = new Map()
const processedEvents: Map<string, ProcessedEntry> = new Map()
```

**How state is accessed:**
```typescript
// Direct Map access via exported functions
export function isScheduleRunning(scheduleId: string): boolean {
  const lock = scheduleLocks.get(scheduleId)
  if (!lock) return false
  // ... expiry check
  return true
}
```

**How state is mutated:**
```typescript
// Direct mutations with cleanup side effects
export function acquireLock(scheduleId: string, options = {}): AcquireLockResult {
  scheduleLocks.set(scheduleId, lock)
  lockTokens.set(token, scheduleId)
  return { acquired: true, token }
}

export function releaseLock(token: string): boolean {
  lockTokens.delete(token)
  scheduleLocks.delete(scheduleId)
  return true
}
```

**Trade-offs:**
| Pros | Cons |
|------|------|
| Simple, functional API | No reactivity - callers must poll |
| Testable with `clearAll*` functions | Multiple Maps not coordinated |
| Works in any JS environment | No transaction support |
| TTL/expiry handling | Memory leaks if cleanup not called |

---

## 2. Identified Inconsistencies

### 2.1 Initialization Patterns

| System | Initialization |
|--------|---------------|
| Database | Lazy via Proxy, requires `$.nouns()` call first |
| React | Eager in AppProvider, passed as `initialData` |
| Events | Always initialized (module-level Maps) |

**Problem:** No consistent lifecycle. Database requires explicit init, React requires mounting, Events are always ready.

### 2.2 Access Patterns

| System | Access Style |
|--------|-------------|
| Database | Property access (`$.db.Customer`) |
| React | Hook (`useAppContext()`) |
| Events | Function call (`isScheduleRunning(id)`) |

**Problem:** Three different mental models for accessing state.

### 2.3 Mutation Patterns

| System | Mutation Style | Async | Returns |
|--------|---------------|-------|---------|
| Database | `await $.db.Noun.create()` | Yes | Record |
| React | `updateData(key, value)` | No | void |
| Events | `acquireLock(id)` | No | Result object |

**Problem:** Inconsistent async behavior and return values.

### 2.4 Observability

| System | Change Detection |
|--------|-----------------|
| Database | None - fire and forget |
| React | React re-renders |
| Events | None - must poll |

**Problem:** No unified way to subscribe to state changes.

### 2.5 Error Handling

| System | Error Approach |
|--------|---------------|
| Database | Throws on missing record |
| React | Throws on missing context |
| Events | Returns false/undefined |

**Problem:** Inconsistent error signaling.

---

## 3. Proposed Unified Pattern

### 3.1 Core Concept: AppState with Dispatch

Introduce a single `AppState` container that:
1. Holds all application state (database records, events, UI state)
2. Uses a dispatch pattern for mutations
3. Supports subscriptions for reactivity
4. Works in both server and client contexts

```typescript
interface AppState<T extends NounDefinitions = NounDefinitions> {
  // Current state snapshot
  readonly state: StateSnapshot<T>

  // Dispatch an action to mutate state
  dispatch(action: Action): Promise<ActionResult>

  // Subscribe to state changes
  subscribe(listener: StateListener): Unsubscribe

  // Select a slice of state (with optional memoization)
  select<S>(selector: Selector<S>): S
}

type StateSnapshot<T> = {
  db: DatabaseState<T>
  events: EventState
  ui: UIState
  meta: MetaState
}

type Action =
  | { type: 'db/create'; noun: string; data: Record<string, unknown> }
  | { type: 'db/update'; noun: string; id: string; data: Record<string, unknown> }
  | { type: 'db/delete'; noun: string; id: string }
  | { type: 'event/acquire_lock'; scheduleId: string; options?: LockOptions }
  | { type: 'event/release_lock'; token: string }
  | { type: 'event/mark_processed'; eventId: string; ttl?: number }
  | { type: 'ui/update_data'; key: string; value: unknown }
  | { type: 'ui/set_realtime_status'; status: string }
  // ... etc
```

### 3.2 Benefits of This Approach

1. **Single Source of Truth** - All state in one place
2. **Predictable Mutations** - All changes go through dispatch
3. **Time Travel Debugging** - Action log enables undo/replay
4. **Middleware Support** - Logging, persistence, validation
5. **Framework Agnostic** - Works in React, Node, Workers
6. **Type Safety** - Discriminated unions for actions

### 3.3 Migration Strategy

#### Phase 1: Create AppState Core (Non-breaking)

```typescript
// New file: src/state/app-state.ts
export function createAppState<T extends NounDefinitions>(
  config: AppStateConfig<T>
): AppState<T> {
  // Internal state
  let state: StateSnapshot<T> = {
    db: { records: new Map(), definitions: null },
    events: { locks: new Map(), processed: new Map() },
    ui: { data: {}, realtimeStatus: 'disconnected' },
    meta: { initialized: false, version: 0 }
  }

  const listeners = new Set<StateListener>()

  // Reducer for state transitions
  function reduce(state: StateSnapshot<T>, action: Action): StateSnapshot<T> {
    switch (action.type) {
      case 'db/create':
        // Immutable update...
      case 'event/acquire_lock':
        // Immutable update...
      // ...
    }
  }

  return {
    get state() { return state },

    async dispatch(action: Action): Promise<ActionResult> {
      const nextState = reduce(state, action)
      state = nextState
      listeners.forEach(l => l(state, action))
      return { success: true }
    },

    subscribe(listener: StateListener): Unsubscribe {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    select<S>(selector: Selector<S>): S {
      return selector(state)
    }
  }
}
```

#### Phase 2: Create Compatibility Layers

Keep existing APIs working by wrapping AppState:

```typescript
// Compatibility layer for $.db
export function createDbLayer<T extends NounDefinitions>(
  appState: AppState<T>
): Database<T> {
  return createDbProxy({
    createAccessor: (nounName) => ({
      async create(data) {
        const result = await appState.dispatch({
          type: 'db/create',
          noun: nounName,
          data
        })
        return result.record
      },
      // ... other methods
    })
  })
}

// Compatibility layer for React context
export function AppProvider({ children, appState }) {
  const [, forceUpdate] = useReducer(x => x + 1, 0)

  useEffect(() => {
    return appState.subscribe(() => forceUpdate())
  }, [appState])

  // Adapt to existing context shape
  const contextValue = useMemo(() => ({
    data: appState.select(s => s.ui.data),
    updateData: (key, value) => appState.dispatch({
      type: 'ui/update_data', key, value
    }),
    // ... other values
  }), [appState.state])

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
}
```

#### Phase 3: Migrate Consumers Gradually

1. Update internal code to use `appState.dispatch()` directly
2. Mark old APIs as deprecated with migration guides
3. Remove compatibility layers in next major version

### 3.4 Proposed Directory Structure

```
src/
├── state/
│   ├── app-state.ts       # Core AppState implementation
│   ├── actions.ts         # Action type definitions
│   ├── reducers/
│   │   ├── db.ts          # Database state reducer
│   │   ├── events.ts      # Events state reducer
│   │   └── ui.ts          # UI state reducer
│   ├── selectors.ts       # Memoized selectors
│   ├── middleware/
│   │   ├── logger.ts      # Action logging
│   │   ├── persistence.ts # Persist to storage
│   │   └── validation.ts  # Validate actions
│   └── index.ts
├── compat/
│   ├── db-layer.ts        # $.db compatibility
│   ├── context-layer.tsx  # React context compatibility
│   └── events-layer.ts    # Events API compatibility
```

---

## 4. Breaking Changes

### 4.1 If Full Migration (Major Version)

| Change | Impact | Migration |
|--------|--------|-----------|
| `$.db` returns sync selectors | All async code | Wrap in async dispatch |
| `AppContext` shape changes | All context consumers | Update hook usage |
| Event functions removed | Direct function calls | Use `appState.dispatch()` |

### 4.2 With Compatibility Layers (Minor Version)

No breaking changes initially. Deprecation warnings guide migration.

---

## 5. Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- [ ] Create `src/state/app-state.ts`
- [ ] Define action types in `src/state/actions.ts`
- [ ] Implement reducers for each domain
- [ ] Add basic middleware support
- [ ] Write unit tests

### Phase 2: Compatibility Layers (Week 2)
- [ ] Create `$.db` compatibility layer
- [ ] Create React context compatibility layer
- [ ] Create events API compatibility layer
- [ ] Verify existing tests still pass

### Phase 3: Migration Tooling (Week 3)
- [ ] Add deprecation warnings to old APIs
- [ ] Write migration documentation
- [ ] Create codemod for common patterns
- [ ] Update examples

### Phase 4: Cleanup (Next Major)
- [ ] Remove compatibility layers
- [ ] Remove deprecated APIs
- [ ] Update all documentation

---

## 6. Alternatives Considered

### 6.1 Keep Current Patterns, Add Subscriptions

**Approach:** Add event emitters to existing Map mutations.

**Rejected because:**
- Doesn't address inconsistent access patterns
- Would add complexity without consolidation
- No single source of truth

### 6.2 Use External State Library (Zustand, Jotai, etc.)

**Approach:** Adopt existing state management library.

**Rejected because:**
- Adds external dependency
- May not fit serverless/Workers context
- Less control over API surface

### 6.3 Full Redux Pattern

**Approach:** Use Redux with actions, reducers, middleware.

**Rejected because:**
- Too heavy for this use case
- Redux is React-focused
- Want lighter-weight approach

---

## 7. Open Questions

1. **Should async operations be handled in middleware or reducers?**
   - Middleware: More flexible, but complex
   - Reducers with thunks: Simpler, but mixes concerns

2. **How to handle optimistic updates for database operations?**
   - Update state immediately, rollback on failure?
   - Or wait for server confirmation?

3. **Should subscriptions be fine-grained (per-key) or coarse (whole state)?**
   - Fine-grained: Better performance, more complex
   - Coarse: Simpler, may cause extra renders

4. **How to handle Workers.do integration?**
   - State persistence across worker invocations
   - Durable Objects consideration

---

## 8. Success Criteria

1. Single `createAppState()` function initializes all state
2. All mutations go through `dispatch()`
3. Subscriptions work for all state changes
4. Existing tests pass with compatibility layers
5. Performance: No regression in benchmarks
6. Bundle size: < 5KB increase

---

## 9. References

- Current database implementation: `src/database/index.ts`
- Current React context: `src/generators/app/context.tsx`
- Current events system: `src/events/`, `src/events.ts`
- Issue: ui-hjre

---

## Appendix A: Current Code Examples

### Database Proxy Pattern
```typescript
// From src/database/proxy.ts
export function createDbProxy<TAccessor>(config: DbProxyConfig<TAccessor>): DbProxyResult<TAccessor> {
  const { proxy: baseProxy, clearCache, cache } = createCachedProxy<TAccessor>({
    validKeys: () => getNounNames ? new Set(getNounNames()) : new Set<string>(),
    createValue: createAccessor,
    onInvalidKey: (key) => { /* error handling */ },
  })

  const proxy = new Proxy(baseProxy, {
    get(target, prop) {
      checkInitialized()
      if (!isRegistered(prop)) return undefined
      return cache.get(prop) || createAccessor(prop)
    },
    // ... has, ownKeys traps
  })

  return { proxy, clearCache }
}
```

### React Context Pattern
```typescript
// From src/generators/app/context.tsx
export function AppProvider({ children, initialData, ... }) {
  const [data, setData] = useState(initialData)

  const updateData = useCallback((key, value) => {
    setData(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleRealtimeEvent = useCallback((event) => {
    if (event.type === 'created') {
      setData(prev => ({
        ...prev,
        [event.noun]: {
          ...prev[event.noun],
          data: [...currentList, event.data],
        },
      }))
    }
  }, [data]) // Note: data dependency causes stale closure issues

  return <AppContext.Provider value={{ data, updateData, ... }}>{children}</AppContext.Provider>
}
```

### Events Closure Pattern
```typescript
// From src/events/scheduler.ts
const scheduleLocks: Map<string, ScheduleLock> = new Map()
const lockTokens: Map<string, string> = new Map()

export function acquireLock(scheduleId: string, options = {}): AcquireLockResult {
  if (isScheduleRunning(scheduleId)) {
    return { acquired: false, lockedUntil: existingLock.expiresAt }
  }

  scheduleLocks.set(scheduleId, lock)
  lockTokens.set(token, scheduleId)

  return { acquired: true, token }
}

export function releaseLock(token: string): boolean {
  const scheduleId = lockTokens.get(token)
  if (!scheduleId) return false

  lockTokens.delete(token)
  scheduleLocks.delete(scheduleId)
  return true
}
```
