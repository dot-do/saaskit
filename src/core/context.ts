/**
 * $ Context System
 *
 * The $ context is the runtime API available to all verb handlers, event handlers,
 * and scheduled tasks. It provides unified access to:
 *
 * - Database operations ($.db)
 * - AI capabilities ($.ai, $.agents)
 * - Human-in-the-loop ($.human)
 * - Workflow primitives ($.send, $.do)
 * - External integrations ($.api)
 * - Runtime context ($.input, $.record, $.id, $.user, $.org, $.env, $.time)
 * - Event handlers ($.on)
 * - Schedules ($.every)
 */

import type {
  Context,
  ContextConfig,
  NounAccessor,
  AgentDefinition,
  TimeHelpers,
  NounDefinitions,
  AIFunction,
  RunnableAgent,
} from '../types/context'
import { createCachedProxy, findSimilarKey } from '../utils/proxy-factory'
import type {
  IntegrationConfigOptions,
  StoredIntegration,
  FetchFunction,
  EmailSendOptions,
  TextSendOptions,
  CallInitiateOptions,
  SlackMessageOptions,
} from '../types/integrations'
import { VALID_CONFIG_KEYS } from '../types/integrations'

/**
 * Get API token from environment variable with fallback for development
 */
function getApiToken(): string {
  const token = process.env.SAASKIT_API_TOKEN
  if (token) {
    return `Bearer ${token}`
  }
  if (process.env.NODE_ENV !== 'test') {
    console.warn(
      '[saaskit] SAASKIT_API_TOKEN environment variable not set. ' +
        'Using development fallback token. Set SAASKIT_API_TOKEN in production.'
    )
  }
  return 'Bearer saaskit-dev-token'
}
import { createBilling } from '../billing/billing'
import type { BillingInterface } from '../billing/types'

/**
 * Extended context interface with integration layer methods
 *
 * @typeParam T - Noun definitions for typed database access
 */
export interface ExtendedContext<T extends NounDefinitions = NounDefinitions> extends Context<T> {
  /** Register an integration with credentials */
  integrate: (name: string, config: IntegrationConfigOptions) => void
  /** Get a registered integration */
  getIntegration: (name: string) => StoredIntegration | undefined
  /** Set custom fetch function for testing */
  setFetch: (fetchFn: FetchFunction) => void
  /** Billing integration for Stripe */
  billing: BillingInterface
}

/**
 * Create database accessor for a noun with CRUD + search operations
 */
function createNounAccessor(noun: string): NounAccessor {
  return {
    create: (data: Record<string, unknown>) => Promise.resolve({ id: `${noun.toLowerCase()}_new`, ...data }),
    get: (id: string) => Promise.resolve({ id }),
    update: (id: string, data: Record<string, unknown>) => Promise.resolve({ id, ...data }),
    delete: (id: string) => Promise.resolve(),
    list: (options?: Record<string, unknown>) => Promise.resolve([]),
    find: (query: Record<string, unknown>) => Promise.resolve([]),
    search: (query: string) => Promise.resolve([]),
    semanticSearch: (query: string) => Promise.resolve([]),
  }
}

/**
 * Find the closest matching noun name for helpful error suggestions
 */
function findSimilarNoun(name: string, nouns: string[]): string | null {
  const nameLower = name.toLowerCase()

  for (const noun of nouns) {
    const nounLower = noun.toLowerCase()

    // Exact case-insensitive match
    if (nameLower === nounLower) {
      return noun
    }

    // Check for common typos: missing letter, extra letter, or swapped letters
    if (Math.abs(name.length - noun.length) <= 1) {
      let diff = 0
      const longer = name.length >= noun.length ? nameLower : nounLower
      const shorter = name.length < noun.length ? nameLower : nounLower

      for (let i = 0; i < longer.length; i++) {
        if (shorter[i] !== longer[i]) diff++
        if (diff > 2) break
      }

      if (diff <= 2) return noun
    }

    // Check for plural/singular confusion
    if (nameLower === nounLower + 's' || nameLower + 's' === nounLower) {
      return noun
    }
  }

  return null
}

/**
 * Create database proxy that provides noun-specific accessors
 *
 * Features:
 * - Caches accessor instances for memory efficiency
 * - Provides helpful error messages with suggestions for typos
 * - Supports typed access when using noun definitions
 */
function createDbProxy(nouns: string[]): Record<string, NounAccessor> {
  const nounSet = new Set(nouns)
  // Cache for noun accessors - created on first access
  const accessorCache = new Map<string, NounAccessor>()

  return new Proxy({} as Record<string, NounAccessor>, {
    get(target, prop: string) {
      if (typeof prop !== 'string') return undefined

      // Check cache first for memory efficiency
      const cached = accessorCache.get(prop)
      if (cached) return cached

      // Validate noun exists
      if (!nounSet.has(prop)) {
        // Provide helpful error message with suggestions
        const similar = findSimilarNoun(prop, nouns)

        if (similar) {
          throw new Error(
            `Unknown noun: "${prop}". Did you mean "${similar}"?\n` +
              `Available nouns: ${nouns.join(', ')}`
          )
        }

        if (nouns.length === 0) {
          throw new Error(
            `Unknown noun: "${prop}". No nouns have been defined.\n` +
              `Hint: Pass nouns when creating context: createContext({ nouns: ['${prop}', ...] })`
          )
        }

        throw new Error(
          `Unknown noun: "${prop}".\n` +
            `Available nouns: ${nouns.join(', ')}\n` +
            `Hint: Make sure "${prop}" is included in the nouns array.`
        )
      }

      // Create and cache the accessor
      const accessor = createNounAccessor(prop)
      accessorCache.set(prop, accessor)
      return accessor
    },

    // Support for 'in' operator: 'Customer' in $.db
    has(target, prop: string) {
      if (typeof prop !== 'string') return false
      return nounSet.has(prop)
    },

    // Support for Object.keys($.db)
    ownKeys() {
      return Array.from(nounSet)
    },

    // Required for ownKeys to work properly
    getOwnPropertyDescriptor(target, prop: string) {
      if (typeof prop !== 'string' || !nounSet.has(prop)) return undefined

      // Get or create accessor
      let accessor = accessorCache.get(prop)
      if (!accessor) {
        accessor = createNounAccessor(prop)
        accessorCache.set(prop, accessor)
      }

      return {
        enumerable: true,
        configurable: true,
        value: accessor,
      }
    },
  })
}

/**
 * Create AI template literal tag function
 */
type AiFunctionType = ((strings: TemplateStringsArray, ...values: unknown[]) => Promise<string>) &
  ((prompt: string, options?: Record<string, unknown>) => Promise<string>)

function createAiFunction(): AiFunctionType {
  const fn = function (stringsOrPrompt: TemplateStringsArray | string, ...values: unknown[]): Promise<string> {
    // Called as template literal: $.ai`prompt`
    if (Array.isArray(stringsOrPrompt) && 'raw' in stringsOrPrompt) {
      const strings = stringsOrPrompt as TemplateStringsArray
      // Combine template strings with values
      let prompt = ''
      strings.forEach((str, i) => {
        prompt += str + (values[i] !== undefined ? String(values[i]) : '')
      })
      return Promise.resolve(`AI response for: ${prompt}`)
    }

    // Called as function: $.ai('prompt', options)
    return Promise.resolve(`AI response for: ${stringsOrPrompt}`)
  }

  return fn as AiFunctionType
}

/**
 * Create agents proxy that allows registration and running of agents
 */
function createAgentsProxy(): Record<string, AgentDefinition & { run: (input: Record<string, unknown>) => Promise<unknown> }> {
  const agents: Record<string, AgentDefinition & { run: (input: Record<string, unknown>) => Promise<unknown> }> = {}

  return new Proxy(agents, {
    get(target, prop: string) {
      if (typeof prop !== 'string') return undefined

      // Return existing agent or create placeholder
      if (!target[prop]) {
        target[prop] = {
          instructions: '',
          tools: [],
          run: (input: Record<string, unknown>) => Promise.resolve({ result: 'agent response' }),
        }
      }
      return target[prop]
    },
    set(target, prop: string, value: AgentDefinition) {
      if (typeof prop !== 'string') return false

      // Create agent with run method
      target[prop] = {
        ...value,
        run: (input: Record<string, unknown>) => Promise.resolve({ result: 'agent response' }),
      }
      return true
    },
  })
}

/**
 * Create human-in-the-loop handlers
 */
function createHumanHandlers() {
  return {
    approve: (message: string, context?: Record<string, unknown>) => Promise.resolve(true),
    ask: (question: string) => Promise.resolve(''),
    review: (content: { content: string; type: string }) => Promise.resolve({ approved: true }),
  }
}

/**
 * Find similar integration name for helpful error messages
 */
function findSimilarIntegration(name: string, registeredNames: string[]): string | null {
  for (const registered of registeredNames) {
    // Simple Levenshtein-like check: if only 1-2 chars different
    if (Math.abs(name.length - registered.length) <= 2) {
      let diff = 0
      const longer = name.length >= registered.length ? name : registered
      const shorter = name.length < registered.length ? name : registered
      for (let i = 0; i < longer.length; i++) {
        if (shorter[i] !== longer[i]) diff++
      }
      if (diff <= 2) return registered
    }
  }
  return null
}

/**
 * Create API integration proxy with nested access
 */
function createApiProxy(
  integrations: Map<string, StoredIntegration>,
  getFetch: () => FetchFunction
): Record<string, unknown> {
  // Built-in Platform.do integrations
  const builtInIntegrations = new Set(['emails', 'texts', 'calls', 'stripe'])

  // Platform.do base URLs
  const platformUrls: Record<string, string> = {
    emails: 'https://emails.do/api',
    texts: 'https://texts.do/api',
    calls: 'https://calls.do/api',
    stripe: 'https://payments.do/api/stripe',
  }

  /**
   * Handle API errors with helpful context
   */
  async function handleApiError(
    response: Response,
    serviceName: string,
    fetchFn: FetchFunction
  ): Promise<never> {
    const capitalizedName = serviceName.charAt(0).toUpperCase() + serviceName.slice(1)

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || 'unknown'
      throw new Error(`Rate limit exceeded for ${capitalizedName}.do. Retry after ${retryAfter} seconds.`)
    }

    try {
      const errorData = await response.json()
      throw new Error(`${capitalizedName}.do API error (${response.status}): ${errorData.error || response.statusText}`)
    } catch (e) {
      if (e instanceof Error && e.message.includes('API error')) throw e
      throw new Error(`${capitalizedName}.do API error (${response.status}): ${response.statusText}`)
    }
  }

  /**
   * Make API request with error handling
   */
  async function makeRequest(
    url: string,
    body: Record<string, unknown>,
    serviceName: string,
    integrationKey?: string
  ): Promise<unknown> {
    const fetchFn = getFetch()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: getApiToken(),
    }

    if (integrationKey) {
      headers['X-Integration-Key'] = integrationKey
    }

    try {
      const response = await fetchFn(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        await handleApiError(response, serviceName, fetchFn)
      }

      return response.json()
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('API error') || error.message.includes('Rate limit')) {
          throw error
        }
        if (error.message.includes('timed out') || error.message.includes('timeout')) {
          const capitalizedName = serviceName.charAt(0).toUpperCase() + serviceName.slice(1)
          throw new Error(`Request to ${capitalizedName}.do timed out`)
        }
        const capitalizedName = serviceName.charAt(0).toUpperCase() + serviceName.slice(1)
        throw new Error(`Failed to connect to ${capitalizedName}.do: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Create built-in Emails.do API
   */
  function createEmailsApi() {
    return {
      send: async (options: EmailSendOptions) => {
        return makeRequest(`${platformUrls.emails}/send`, options as unknown as Record<string, unknown>, 'emails')
      },
    }
  }

  /**
   * Create built-in Texts.do API
   */
  function createTextsApi() {
    return {
      send: async (options: TextSendOptions) => {
        return makeRequest(`${platformUrls.texts}/send`, options as unknown as Record<string, unknown>, 'texts')
      },
    }
  }

  /**
   * Create built-in Calls.do API
   */
  function createCallsApi() {
    return {
      initiate: async (options: CallInitiateOptions) => {
        return makeRequest(`${platformUrls.calls}/initiate`, options as unknown as Record<string, unknown>, 'calls')
      },
    }
  }

  /**
   * Create nested proxy for Stripe API ($.api.stripe.charges.create, etc.)
   */
  function createStripeProxy(path: string[] = []): any {
    return new Proxy(() => {}, {
      get(target, prop: string) {
        if (typeof prop !== 'string') return undefined
        // Build path for nested access
        return createStripeProxy([...path, prop])
      },
      apply(target, thisArg, args) {
        // When called as a function, make the API request
        const methodName = path[path.length - 1]
        const pathStr = path.join('/')
        const url = `${platformUrls.stripe}/${pathStr}`

        // Handle retrieve methods that take an ID as first arg
        if (methodName === 'retrieve' && typeof args[0] === 'string') {
          return makeRequest(url, { id: args[0] }, 'stripe')
        }

        // Handle query methods for salesforce-like APIs
        if (methodName === 'query' && typeof args[0] === 'string') {
          return makeRequest(url, { query: args[0] }, 'stripe')
        }

        // Default: pass first arg as body
        return makeRequest(url, args[0] || {}, 'stripe')
      },
    })
  }

  /**
   * Create Slack API (requires registration)
   */
  function createSlackApi(integration: StoredIntegration) {
    return {
      send: async (channel: string, text: string, options?: SlackMessageOptions) => {
        const fetchFn = getFetch()
        const webhookUrl = integration.config.webhook!

        const body: Record<string, unknown> = {
          channel,
          text,
        }

        if (options?.blocks) {
          body.blocks = options.blocks
        }
        if (options?.attachments) {
          body.attachments = options.attachments
        }

        const response = await fetchFn(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          throw new Error(`Slack webhook error: ${response.statusText}`)
        }
      },
    }
  }

  /**
   * Create Salesforce API with OAuth support
   */
  function createSalesforceApi(integration: StoredIntegration): any {
    const oauth = integration.config.oauth!

    async function ensureValidToken(): Promise<string> {
      // Check if token is expired
      if (oauth.expiresAt && oauth.expiresAt < Date.now()) {
        // Token is expired, refresh it
        const fetchFn = getFetch()
        const response = await fetchFn('https://apis.do/oauth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: oauth.clientId,
            clientSecret: oauth.clientSecret,
            refreshToken: oauth.refreshToken,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to refresh OAuth token')
        }

        const tokenData = await response.json()
        // Update the stored token
        oauth.accessToken = tokenData.access_token
        oauth.expiresAt = Date.now() + tokenData.expires_in * 1000
      }

      return oauth.accessToken || ''
    }

    return new Proxy(
      {},
      {
        get(target, prop: string) {
          if (typeof prop !== 'string') return undefined

          if (prop === 'query') {
            return async (soql: string) => {
              await ensureValidToken()
              const fetchFn = getFetch()
              const response = await fetchFn('https://apis.do/salesforce/query', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${oauth.accessToken}`,
                },
                body: JSON.stringify({ query: soql }),
              })

              if (!response.ok) {
                throw new Error(`Salesforce API error: ${response.statusText}`)
              }

              return response.json()
            }
          }

          // Return nested proxy for other methods
          return createThirdPartyProxy(integration, [prop])
        },
      }
    )
  }

  /**
   * Create third-party API proxy (goes through APIs.do)
   * Returns an object proxy (not a function) at the root level,
   * but nested properties return callable function proxies.
   */
  function createThirdPartyProxy(integration: StoredIntegration, path: string[] = []): any {
    // At the root level (no path), return an object proxy
    // This ensures typeof $.api.apollo === 'object'
    if (path.length === 0) {
      return new Proxy({} as Record<string, unknown>, {
        get(target, prop: string) {
          if (typeof prop !== 'string') return undefined
          return createThirdPartyProxy(integration, [prop])
        },
      })
    }

    // For nested paths, return a function proxy that can be called
    return new Proxy(() => {}, {
      get(target, prop: string) {
        if (typeof prop !== 'string') return undefined
        return createThirdPartyProxy(integration, [...path, prop])
      },
      apply(target, thisArg, args) {
        const pathStr = path.join('/')
        const url = `https://apis.do/${integration.name}/${pathStr}`

        const fetchFn = getFetch()
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: getApiToken(),
        }

        // Add integration key based on config type
        if (integration.config.apiKey) {
          headers['X-Integration-Key'] = integration.config.apiKey
        } else if (integration.config.secretKey) {
          headers['X-Integration-Key'] = integration.config.secretKey
        }

        return fetchFn(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(args[0] || {}),
        }).then((response) => {
          if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`)
          }
          return response.json()
        })
      },
    })
  }

  return new Proxy({} as Record<string, unknown>, {
    get(target, prop: string) {
      if (typeof prop !== 'string') return undefined

      // Built-in Platform.do integrations
      if (prop === 'emails') return createEmailsApi()
      if (prop === 'texts') return createTextsApi()
      if (prop === 'calls') return createCallsApi()
      if (prop === 'stripe') return createStripeProxy()

      // Check for registered integration
      const integration = integrations.get(prop)
      if (integration) {
        // Handle special integrations
        if (prop === 'slack') {
          return createSlackApi(integration)
        }
        if (prop === 'salesforce' && integration.config.oauth) {
          return createSalesforceApi(integration)
        }
        // Generic third-party integration
        return createThirdPartyProxy(integration)
      }

      // Not registered - throw helpful error
      const registeredNames = Array.from(integrations.keys())
      const similar = findSimilarIntegration(prop, registeredNames)

      if (similar) {
        throw new Error(`Integration "${prop}" is not registered. Did you mean "${similar}"?`)
      }

      throw new Error(`Integration "${prop}" is not registered. Call $.integrate("${prop}", { ... }) first.`)
    },
  })
}

/**
 * Create read-only environment variable proxy
 */
function createEnvProxy(): Record<string, string | undefined> {
  return new Proxy({} as Record<string, string | undefined>, {
    get(target, prop: string) {
      if (typeof prop !== 'string') return undefined
      return process.env[prop]
    },
    set(target, prop: string, value: unknown) {
      throw new Error('Cannot modify environment variables through $.env')
    },
  })
}

/**
 * Create time helpers
 */
function createTimeHelpers(): TimeHelpers {
  return {
    now: () => new Date(),
    daysAgo: (days: number) => {
      const date = new Date()
      date.setDate(date.getDate() - days)
      return date
    },
    daysFromNow: (days: number) => {
      const date = new Date()
      date.setDate(date.getDate() + days)
      return date
    },
    hoursAgo: (hours: number) => {
      const date = new Date()
      date.setHours(date.getHours() - hours)
      return date
    },
    startOfDay: () => {
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      return date
    },
    endOfDay: () => {
      const date = new Date()
      date.setHours(23, 59, 59, 999)
      return date
    },
  }
}

/**
 * Create $.on event handler registration proxy
 */
function createOnProxy(nouns: string[], verbs?: Record<string, string[]>): Record<string, Record<string, (handler: Function) => void>> {
  return new Proxy({} as Record<string, Record<string, (handler: Function) => void>>, {
    get(target, nounProp: string) {
      if (typeof nounProp !== 'string') return undefined

      // Return a proxy for verb events
      return new Proxy({} as Record<string, (handler: Function) => void>, {
        get(verbTarget, verbProp: string) {
          if (typeof verbProp !== 'string') return undefined

          // Return handler registration function
          return (handler: Function) => {
            // Register the handler (noop in stub implementation)
          }
        },
      })
    },
  })
}

/**
 * Create $.every schedule registration proxy
 */
function createEveryProxy(): Record<string, unknown> {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  const createDayProxy = (dayName: string) => {
    const dayProxy: Record<string, unknown> = {
      at: (time: string) => ({ __type: 'schedule', day: dayName, time }),
    }

    // Add at6am, at9am shorthands
    return new Proxy(dayProxy, {
      get(target, prop: string) {
        if (typeof prop !== 'string') return undefined
        if (prop === 'at') return target.at
        // Handle at6am, at9am etc.
        const match = prop.match(/^at(\d+)(am|pm)?$/)
        if (match) {
          return (handler?: Function) => {
            const hour = parseInt(match[1], 10)
            const time = `${hour}${match[2] || 'am'}`
            return { __type: 'schedule', day: dayName, time }
          }
        }
        return undefined
      },
    })
  }

  const every: Record<string, unknown> = {
    day: createDayProxy('day'),
    hour: { __type: 'schedule', interval: 'hour' },
    minute: { __type: 'schedule', interval: 'minute' },
  }

  // Add named days
  for (const day of days) {
    every[day] = createDayProxy(day)
  }

  return every
}

/**
 * Create a $ context for runtime use
 *
 * @typeParam T - Noun definitions for typed database access
 *
 * Features:
 * - Lazy initialization for $.ai, $.agents, $.human, $.api (only created on first access)
 * - Cached accessor instances for memory efficiency
 * - Helpful error messages with suggestions for undefined nouns
 * - Type-safe database access when using noun definitions
 *
 * @example
 * ```ts
 * // Basic usage
 * const $ = createContext({ nouns: ['Customer', 'Order'] })
 *
 * // With typed noun definitions (provides autocomplete)
 * const $ = createContext({
 *   nouns: ['Customer', 'Order'],
 *   nounDefinitions: {
 *     Customer: { name: 'string', email: 'string' },
 *     Order: { total: 'number' }
 *   }
 * })
 * ```
 */
export function createContext<T extends NounDefinitions = NounDefinitions>(
  config: ContextConfig<T> = {}
): ExtendedContext<T> {
  const nouns = config.nouns ?? []

  // Integration registry
  const integrations = new Map<string, StoredIntegration>()

  // Custom fetch function (for testing)
  let customFetch: FetchFunction = globalThis.fetch

  // Lazy-initialized subsystems (only created on first access)
  let cachedAi: AIFunction | null = null
  let cachedAgents: Record<string, RunnableAgent> | null = null
  let cachedHuman: ReturnType<typeof createHumanHandlers> | null = null
  let cachedApi: Record<string, unknown> | null = null
  let cachedDb: Record<string, NounAccessor> | null = null
  let cachedEnv: Record<string, string | undefined> | null = null
  let cachedTime: TimeHelpers | null = null
  let cachedOn: Record<string, Record<string, (handler: Function) => void>> | null = null
  let cachedEvery: Record<string, unknown> | null = null
  let cachedBilling: BillingInterface | null = null

  /**
   * Register an integration with validation
   */
  function integrate(name: string, integrationConfig: IntegrationConfigOptions): void {
    // Validate config has at least one credential
    const hasCredential =
      integrationConfig.apiKey !== undefined ||
      integrationConfig.secretKey !== undefined ||
      integrationConfig.webhook !== undefined ||
      integrationConfig.oauth !== undefined

    if (!hasCredential) {
      throw new Error(
        `Integration "${name}" requires at least one credential (apiKey, secretKey, webhook, or oauth)`
      )
    }

    // Validate no unknown keys
    const configKeys = Object.keys(integrationConfig)
    for (const key of configKeys) {
      if (!VALID_CONFIG_KEYS.includes(key as any)) {
        throw new Error(`Unknown config key "${key}" for integration "${name}"`)
      }
    }

    // Store the integration
    integrations.set(name, {
      name,
      config: integrationConfig,
    })

    // Clear API cache so new integration is available
    cachedApi = null
  }

  /**
   * Get a registered integration
   */
  function getIntegration(name: string): StoredIntegration | undefined {
    return integrations.get(name)
  }

  /**
   * Set custom fetch function (for testing)
   */
  function setFetch(fetchFn: FetchFunction): void {
    customFetch = fetchFn
    // Clear API cache so new fetch function is used
    cachedApi = null
    // Clear billing cache so new fetch function is used
    cachedBilling = null
  }

  // Use Object.defineProperty for proper getter behavior on the context object
  const context = {
    // Fire and forget (durable)
    send: (event: string, data?: Record<string, unknown>) => {
      // Noop - fire and forget returns void
      return undefined
    },

    // Wait for result (durable)
    do: (action: string, data?: Record<string, unknown>) => {
      return Promise.resolve({})
    },

    // Runtime context (static values, no lazy init needed)
    input: config.input ?? {},
    record: config.record,
    id: config.id,
    user: config.user,
    org: config.org,

    // Integration layer methods
    integrate,
    getIntegration,
    setFetch,
  } as ExtendedContext<T>

  // Define lazy-initialized properties using getters
  Object.defineProperties(context, {
    // Database operations - lazy initialized
    db: {
      get() {
        if (!cachedDb) {
          cachedDb = createDbProxy(nouns)
        }
        return cachedDb
      },
      enumerable: true,
      configurable: true,
    },

    // AI template literal - lazy initialized
    ai: {
      get() {
        if (!cachedAi) {
          cachedAi = createAiFunction()
        }
        return cachedAi
      },
      enumerable: true,
      configurable: true,
    },

    // Agent registry - lazy initialized
    agents: {
      get() {
        if (!cachedAgents) {
          cachedAgents = createAgentsProxy()
        }
        return cachedAgents
      },
      enumerable: true,
      configurable: true,
    },

    // Human-in-the-loop - lazy initialized
    human: {
      get() {
        if (!cachedHuman) {
          cachedHuman = createHumanHandlers()
        }
        return cachedHuman
      },
      enumerable: true,
      configurable: true,
    },

    // Integration access - lazy initialized
    api: {
      get() {
        if (!cachedApi) {
          cachedApi = createApiProxy(integrations, () => customFetch)
        }
        return cachedApi
      },
      enumerable: true,
      configurable: true,
    },

    // Environment variables - lazy initialized
    env: {
      get() {
        if (!cachedEnv) {
          cachedEnv = createEnvProxy()
        }
        return cachedEnv
      },
      enumerable: true,
      configurable: true,
    },

    // Time helpers - lazy initialized
    time: {
      get() {
        if (!cachedTime) {
          cachedTime = createTimeHelpers()
        }
        return cachedTime
      },
      enumerable: true,
      configurable: true,
    },

    // Event handlers - lazy initialized
    on: {
      get() {
        if (!cachedOn) {
          cachedOn = createOnProxy(nouns, config.verbs)
        }
        return cachedOn
      },
      enumerable: true,
      configurable: true,
    },

    // Schedule registration - lazy initialized
    every: {
      get() {
        if (!cachedEvery) {
          cachedEvery = createEveryProxy()
        }
        return cachedEvery
      },
      enumerable: true,
      configurable: true,
    },

    // Billing integration - lazy initialized
    billing: {
      get() {
        if (!cachedBilling) {
          cachedBilling = createBilling(() => customFetch)
        }
        return cachedBilling
      },
      enumerable: true,
      configurable: true,
    },
  })

  return context
}
