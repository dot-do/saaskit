/**
 * App Generator Context
 *
 * React context for providing app data and actions to generated pages.
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { AppGeneratorConfig, AppUser, RealtimeEvent } from './types'

/**
 * App context value
 */
export interface AppContextValue {
  config: AppGeneratorConfig
  data: Record<string, unknown>
  params: Record<string, string>
  user?: AppUser
  navigate: (path: string) => void
  mutations: Record<string, Record<string, (...args: unknown[]) => Promise<unknown>>>
  verbs: Record<string, Record<string, (ctx: unknown) => Promise<unknown>>>
  onSort?: (sort: { field: string; direction: string }) => void
  checkPermission: (permission: string, context: { record: unknown }) => boolean
  realtimeStatus: string
  setRealtimeStatus: (status: string) => void
  handleRealtimeEvent: (event: RealtimeEvent) => void
  updateData: (key: string, value: unknown) => void
}

const AppContext = createContext<AppContextValue | null>(null)

/**
 * Hook to access app context
 */
export function useAppContext(): AppContextValue {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider')
  }
  return context
}

/**
 * App provider props
 */
export interface AppProviderProps {
  children: ReactNode
  config: AppGeneratorConfig
  initialData?: Record<string, unknown>
  params?: Record<string, string>
  navigate?: (path: string) => void
  mutations?: Record<string, Record<string, (...args: unknown[]) => Promise<unknown>>>
  verbs?: Record<string, Record<string, (ctx: unknown) => Promise<unknown>>>
  realtime?: { connect: () => void }
  user?: AppUser
  onSort?: (sort: { field: string; direction: string }) => void
  checkPermission?: (permission: string, context: { record: unknown }) => boolean
}

/**
 * App provider component
 */
export function AppProvider({
  children,
  config,
  initialData = {},
  params = {},
  navigate = () => {},
  mutations = {},
  verbs = {},
  realtime,
  user,
  onSort,
  checkPermission,
}: AppProviderProps) {
  const [data, setData] = useState<Record<string, unknown>>(initialData)
  const [realtimeStatus, setRealtimeStatus] = useState('connecting')

  // Connect to realtime on mount
  useEffect(() => {
    if (realtime?.connect) {
      realtime.connect()
    }
  }, [realtime])

  // Auto-reconnect on disconnect
  useEffect(() => {
    if (realtimeStatus === 'disconnected' && realtime?.connect) {
      realtime.connect()
    }
  }, [realtimeStatus, realtime])

  const updateData = useCallback((key: string, value: unknown) => {
    setData((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
    const nounData = data[event.noun] as Record<string, unknown> | undefined

    if (event.type === 'created' && nounData?.data) {
      const currentList = nounData.data as unknown[]
      setData((prev) => ({
        ...prev,
        [event.noun]: {
          ...prev[event.noun] as object,
          data: [...currentList, event.data],
        },
      }))
    } else if (event.type === 'updated') {
      // Update in list
      if (nounData?.data) {
        const currentList = nounData.data as Array<{ id: string }>
        setData((prev) => ({
          ...prev,
          [event.noun]: {
            ...prev[event.noun] as object,
            data: currentList.map((item) =>
              item.id === event.id ? { ...item, ...event.data } : item
            ),
          },
        }))
      }
      // Update single record
      if (nounData?.record) {
        const record = nounData.record as { id: string }
        if (record.id === event.id) {
          setData((prev) => ({
            ...prev,
            [event.noun]: {
              ...prev[event.noun] as object,
              record: { ...record, ...event.data },
            },
          }))
        }
      }
    } else if (event.type === 'deleted' && nounData?.data) {
      const currentList = nounData.data as Array<{ id: string }>
      setData((prev) => ({
        ...prev,
        [event.noun]: {
          ...prev[event.noun] as object,
          data: currentList.filter((item) => item.id !== event.id),
        },
      }))
    }
  }, [data])

  const defaultCheckPermission = useCallback(
    (permission: string, _context: { record: unknown }) => {
      if (!user) return true
      if (!user.permissions) return true
      return user.permissions.includes(permission)
    },
    [user]
  )

  const value: AppContextValue = {
    config,
    data,
    params,
    user,
    navigate,
    mutations,
    verbs,
    onSort,
    checkPermission: checkPermission || defaultCheckPermission,
    realtimeStatus,
    setRealtimeStatus,
    handleRealtimeEvent,
    updateData,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
