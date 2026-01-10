/**
 * Test Utilities for App Generator
 *
 * Provides renderWithProviders and other test helpers.
 */

import { createElement, type ReactElement, useState, useCallback, useRef, useEffect } from 'react'
import type { RenderOptions, RenderResult, RealtimeEvent, AppUser } from './types'

// Re-export screen, waitFor, fireEvent from @testing-library/react
export { screen, waitFor, fireEvent } from '@testing-library/react'
import { render } from '@testing-library/react'

/**
 * Internal context for test state management
 */
interface TestContextValue {
  data: Record<string, unknown>
  params: Record<string, string>
  navigate: (path: string) => void
  mutations: Record<string, Record<string, (...args: unknown[]) => Promise<unknown>>>
  verbs: Record<string, Record<string, (ctx: unknown) => Promise<unknown>>>
  user?: AppUser
  onSort?: (sort: { field: string; direction: string }) => void
  checkPermission: (permission: string, context: { record: unknown }) => boolean
  realtimeStatus: string
  setRealtimeStatus: (status: string) => void
  updateData: (noun: string, data: unknown) => void
  handleRealtimeEvent: (event: RealtimeEvent) => void
}

/**
 * Simple context without using createContext (to avoid JSX in this file)
 */
let testContext: TestContextValue | null = null

export function getTestContext(): TestContextValue {
  if (!testContext) {
    throw new Error('Test context not initialized')
  }
  return testContext
}

/**
 * Hook to use in generated components
 */
export function useTestContext(): TestContextValue {
  return getTestContext()
}

/**
 * Test provider component
 */
function TestProvider({
  children,
  options,
  onRealtimeEmit,
  onSetRealtimeStatus,
}: {
  children: ReactElement
  options: RenderOptions
  onRealtimeEmit: (callback: (event: RealtimeEvent) => void) => void
  onSetRealtimeStatus: (callback: (status: string) => void) => void
}) {
  const [data, setData] = useState<Record<string, unknown>>(options.initialData || {})
  const [realtimeStatus, setRealtimeStatusState] = useState('connecting')

  const navigate = options.navigate || (() => {})
  const mutations = options.mutations || {}
  const verbs = options.verbs || {}

  const defaultCheckPermission = useCallback(
    (permission: string, context: { record: unknown }) => {
      if (options.checkPermission) {
        return options.checkPermission(permission, context)
      }
      if (!options.user) return true
      if (!options.user.permissions) return true
      return options.user.permissions.includes(permission)
    },
    [options.user, options.checkPermission]
  )

  const updateData = useCallback((noun: string, newData: unknown) => {
    setData((prev) => ({ ...prev, [noun]: newData }))
  }, [])

  const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
    setData((prev) => {
      const nounData = prev[event.noun] as Record<string, unknown> | undefined

      if (event.type === 'created' && nounData?.data) {
        const currentList = nounData.data as unknown[]
        return {
          ...prev,
          [event.noun]: {
            ...nounData,
            data: [...currentList, event.data],
          },
        }
      } else if (event.type === 'updated') {
        // Update in list
        if (nounData?.data) {
          const currentList = nounData.data as Array<{ id: string }>
          return {
            ...prev,
            [event.noun]: {
              ...nounData,
              data: currentList.map((item) =>
                item.id === event.id ? { ...item, ...event.data } : item
              ),
            },
          }
        }
        // Update single record
        if (nounData?.record) {
          const record = nounData.record as { id: string }
          if (record.id === event.id) {
            return {
              ...prev,
              [event.noun]: {
                ...nounData,
                record: { ...record, ...event.data },
              },
            }
          }
        }
      } else if (event.type === 'deleted' && nounData?.data) {
        const currentList = nounData.data as Array<{ id: string }>
        return {
          ...prev,
          [event.noun]: {
            ...nounData,
            data: currentList.filter((item) => item.id !== event.id),
          },
        }
      }

      return prev
    })
  }, [])

  const setRealtimeStatus = useCallback((status: string) => {
    setRealtimeStatusState(status)
  }, [])

  // Connect realtime on mount
  useEffect(() => {
    if (options.realtime?.connect) {
      options.realtime.connect()
    }
  }, [options.realtime])

  // Auto-reconnect on disconnect
  useEffect(() => {
    if (realtimeStatus === 'disconnected' && options.realtime?.connect) {
      options.realtime.connect()
    }
  }, [realtimeStatus, options.realtime])

  // Expose callbacks
  useEffect(() => {
    onRealtimeEmit((event) => handleRealtimeEvent(event))
    onSetRealtimeStatus((status) => setRealtimeStatus(status))
  }, [handleRealtimeEvent, setRealtimeStatus, onRealtimeEmit, onSetRealtimeStatus])

  // Set global context
  testContext = {
    data,
    params: options.params || {},
    navigate,
    mutations,
    verbs,
    user: options.user,
    onSort: options.onSort,
    checkPermission: defaultCheckPermission,
    realtimeStatus,
    setRealtimeStatus,
    updateData,
    handleRealtimeEvent,
  }

  return children
}

/**
 * Render a component with test providers
 */
export function renderWithProviders(
  element: ReactElement,
  options: RenderOptions = { app: {} }
): RenderResult & { container: HTMLElement } {
  let realtimeEmitCallback: ((event: RealtimeEvent) => void) | null = null
  let setRealtimeStatusCallback: ((status: string) => void) | null = null

  const result = render(
    createElement(TestProvider, {
      children: element,
      options,
      onRealtimeEmit: (cb) => {
        realtimeEmitCallback = cb
      },
      onSetRealtimeStatus: (cb) => {
        setRealtimeStatusCallback = cb
      },
    })
  )

  return {
    container: result.container,
    realtimeEmit: (event: RealtimeEvent) => {
      if (realtimeEmitCallback) {
        realtimeEmitCallback(event)
      }
    },
    setRealtimeStatus: (status: string) => {
      if (setRealtimeStatusCallback) {
        setRealtimeStatusCallback(status)
      }
    },
  }
}
