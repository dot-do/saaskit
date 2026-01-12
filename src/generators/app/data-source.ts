/**
 * Data Source Abstraction
 *
 * Provides hooks for data fetching that can be mocked in tests.
 * Uses @mdxui/do hooks when available, otherwise provides no-ops.
 */

// Type definitions for the hooks
type UseThingsConfig = { type: string }
type UseThingsResult = { data: unknown[]; isLoading: boolean; error: unknown }

type UseThingConfig = { type: string; id: string }
type UseThingResult = { data: unknown; isLoading: boolean; error: unknown }

type UseMutationConfig = { type: string }
type UseMutationResult = { mutate: (data: unknown) => void; isPending: boolean }

// Hook implementations - these are what get called and can be mocked
export let useThings: (config: UseThingsConfig) => UseThingsResult = () => ({
  data: [],
  isLoading: false,
  error: null,
})

export let useThing: (config: UseThingConfig) => UseThingResult = () => ({
  data: null,
  isLoading: false,
  error: null,
})

export let useCreateThing: (config: UseMutationConfig) => UseMutationResult = () => ({
  mutate: () => {},
  isPending: false,
})

export let useUpdateThing: (config: UseMutationConfig) => UseMutationResult = () => ({
  mutate: () => {},
  isPending: false,
})

export let useDeleteThing: (config: UseMutationConfig) => UseMutationResult = () => ({
  mutate: () => {},
  isPending: false,
})

// Try to load real implementations from @mdxui/do at runtime
// This allows the package to work without @mdxui/do installed
try {
  // Dynamic import to avoid build-time errors
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const doModule = require('@mdxui/do')
  if (doModule.useThings) useThings = doModule.useThings
  if (doModule.useThing) useThing = doModule.useThing
  if (doModule.useCreateThing) useCreateThing = doModule.useCreateThing
  if (doModule.useUpdateThing) useUpdateThing = doModule.useUpdateThing
  if (doModule.useDeleteThing) useDeleteThing = doModule.useDeleteThing
} catch {
  // @mdxui/do not installed, use default no-ops
}

/**
 * For testing: allows overriding hook implementations
 */
export function setHookImplementations(hooks: {
  useThings?: typeof useThings
  useThing?: typeof useThing
  useCreateThing?: typeof useCreateThing
  useUpdateThing?: typeof useUpdateThing
  useDeleteThing?: typeof useDeleteThing
}) {
  if (hooks.useThings) useThings = hooks.useThings
  if (hooks.useThing) useThing = hooks.useThing
  if (hooks.useCreateThing) useCreateThing = hooks.useCreateThing
  if (hooks.useUpdateThing) useUpdateThing = hooks.useUpdateThing
  if (hooks.useDeleteThing) useDeleteThing = hooks.useDeleteThing
}
