/**
 * AI Cost Tracking Infrastructure
 *
 * Provides usage tracking and cost estimation for AI operations.
 * Token counting is a placeholder implementation.
 */

// ============================================================================
// Types
// ============================================================================

export interface CostEntry {
  /** Model used for the request */
  model: string
  /** Number of input tokens */
  inputTokens: number
  /** Number of output tokens */
  outputTokens: number
  /** Estimated cost in USD */
  cost: number
  /** When the usage occurred */
  timestamp: Date
  /** Optional operation identifier */
  operationId?: string
  /** Optional tags for categorization */
  tags?: string[]
}

export interface UsageStats {
  /** Total number of requests tracked */
  totalRequests: number
  /** Total input tokens across all requests */
  totalInputTokens: number
  /** Total output tokens across all requests */
  totalOutputTokens: number
  /** Total estimated cost in USD */
  totalCost: number
  /** Usage breakdown by model */
  byModel: Record<
    string,
    {
      requests: number
      inputTokens: number
      outputTokens: number
      cost: number
    }
  >
  /** When tracking started */
  trackingSince: Date
}

export interface CostConfig {
  /** Cost per 1,000 input tokens by model */
  inputCostPer1k: Record<string, number>
  /** Cost per 1,000 output tokens by model */
  outputCostPer1k: Record<string, number>
}

// ============================================================================
// Default Cost Configuration
// ============================================================================

/**
 * Default pricing for common models (in USD per 1,000 tokens)
 * These are placeholder values - in production, load from configuration
 */
const DEFAULT_COST_CONFIG: CostConfig = {
  inputCostPer1k: {
    'gpt-4': 0.03,
    'gpt-4-turbo': 0.01,
    'gpt-3.5-turbo': 0.0005,
    'claude-3-opus': 0.015,
    'claude-3-sonnet': 0.003,
    default: 0.01,
  },
  outputCostPer1k: {
    'gpt-4': 0.06,
    'gpt-4-turbo': 0.03,
    'gpt-3.5-turbo': 0.0015,
    'claude-3-opus': 0.075,
    'claude-3-sonnet': 0.015,
    default: 0.03,
  },
}

// ============================================================================
// Storage
// ============================================================================

/** In-memory usage history */
const usageHistory: CostEntry[] = []

/** When tracking started */
let trackingStarted = new Date()

/** Maximum history entries to keep */
const MAX_HISTORY_ENTRIES = 10000

// ============================================================================
// Token Counting (Placeholder)
// ============================================================================

/**
 * Estimate token count for text
 *
 * This is a placeholder implementation that uses a simple heuristic.
 * In production, use a proper tokenizer (tiktoken for OpenAI, etc.)
 *
 * @param text - The text to count tokens for
 * @returns Estimated token count
 *
 * @example
 * ```ts
 * const tokens = estimateTokens('Hello, how are you?')
 * // Returns ~5 (rough estimate)
 * ```
 */
export function estimateTokens(text: string): number {
  // Simple heuristic: ~4 characters per token on average
  // This is a rough approximation - real tokenization is model-specific
  return Math.ceil(text.length / 4)
}

// ============================================================================
// Cost Calculation
// ============================================================================

/**
 * Calculate cost for a given model and token counts
 *
 * @param model - The model name
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @param config - Optional custom cost configuration
 * @returns Estimated cost in USD
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  config: CostConfig = DEFAULT_COST_CONFIG
): number {
  const inputRate = config.inputCostPer1k[model] ?? config.inputCostPer1k.default
  const outputRate = config.outputCostPer1k[model] ?? config.outputCostPer1k.default

  const inputCost = (inputTokens / 1000) * inputRate
  const outputCost = (outputTokens / 1000) * outputRate

  return inputCost + outputCost
}

// ============================================================================
// Usage Tracking
// ============================================================================

/**
 * Track AI usage for cost monitoring
 *
 * @param model - The model used
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @param options - Additional tracking options
 * @returns The created cost entry
 *
 * @example
 * ```ts
 * // Track usage after an AI call
 * const entry = trackUsage('gpt-4', 150, 50)
 * console.log(`Cost: $${entry.cost.toFixed(4)}`)
 *
 * // Track with tags for categorization
 * trackUsage('gpt-4', 200, 100, {
 *   operationId: 'summarize-123',
 *   tags: ['summarization', 'user-facing'],
 * })
 * ```
 */
export function trackUsage(
  model: string,
  inputTokens: number,
  outputTokens: number,
  options?: {
    operationId?: string
    tags?: string[]
  }
): CostEntry {
  const cost = calculateCost(model, inputTokens, outputTokens)

  const entry: CostEntry = {
    model,
    inputTokens,
    outputTokens,
    cost,
    timestamp: new Date(),
    operationId: options?.operationId,
    tags: options?.tags,
  }

  // Enforce max history size
  if (usageHistory.length >= MAX_HISTORY_ENTRIES) {
    usageHistory.shift()
  }

  usageHistory.push(entry)

  return entry
}

/**
 * Get aggregated usage statistics
 *
 * @returns Current usage statistics
 *
 * @example
 * ```ts
 * const stats = getUsageStats()
 * console.log(`Total cost: $${stats.totalCost.toFixed(2)}`)
 * console.log(`Requests: ${stats.totalRequests}`)
 * ```
 */
export function getUsageStats(): UsageStats {
  const byModel: UsageStats['byModel'] = {}

  let totalRequests = 0
  let totalInputTokens = 0
  let totalOutputTokens = 0
  let totalCost = 0

  for (const entry of usageHistory) {
    totalRequests++
    totalInputTokens += entry.inputTokens
    totalOutputTokens += entry.outputTokens
    totalCost += entry.cost

    if (!byModel[entry.model]) {
      byModel[entry.model] = {
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
      }
    }

    byModel[entry.model].requests++
    byModel[entry.model].inputTokens += entry.inputTokens
    byModel[entry.model].outputTokens += entry.outputTokens
    byModel[entry.model].cost += entry.cost
  }

  return {
    totalRequests,
    totalInputTokens,
    totalOutputTokens,
    totalCost,
    byModel,
    trackingSince: trackingStarted,
  }
}

/**
 * Get usage for a specific time period
 *
 * @param since - Start of the time period
 * @param until - End of the time period (optional, defaults to now)
 * @returns Usage statistics for the period
 */
export function getUsageForPeriod(since: Date, until: Date = new Date()): UsageStats {
  const filteredHistory = usageHistory.filter(
    (entry) => entry.timestamp >= since && entry.timestamp <= until
  )

  const byModel: UsageStats['byModel'] = {}

  let totalRequests = 0
  let totalInputTokens = 0
  let totalOutputTokens = 0
  let totalCost = 0

  for (const entry of filteredHistory) {
    totalRequests++
    totalInputTokens += entry.inputTokens
    totalOutputTokens += entry.outputTokens
    totalCost += entry.cost

    if (!byModel[entry.model]) {
      byModel[entry.model] = {
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
      }
    }

    byModel[entry.model].requests++
    byModel[entry.model].inputTokens += entry.inputTokens
    byModel[entry.model].outputTokens += entry.outputTokens
    byModel[entry.model].cost += entry.cost
  }

  return {
    totalRequests,
    totalInputTokens,
    totalOutputTokens,
    totalCost,
    byModel,
    trackingSince: since,
  }
}

/**
 * Get recent usage entries
 *
 * @param limit - Maximum number of entries to return
 * @returns Recent cost entries
 */
export function getRecentUsage(limit: number = 100): CostEntry[] {
  return usageHistory.slice(-limit)
}

/**
 * Clear all usage history
 */
export function clearUsageHistory(): void {
  usageHistory.length = 0
  trackingStarted = new Date()
}

/**
 * Get usage filtered by tags
 *
 * @param tags - Tags to filter by (entries must have all tags)
 * @returns Filtered cost entries
 */
export function getUsageByTags(tags: string[]): CostEntry[] {
  return usageHistory.filter(
    (entry) => entry.tags && tags.every((tag) => entry.tags?.includes(tag))
  )
}
