/**
 * AI Model Selection Infrastructure
 *
 * Provides smart model selection based on task requirements.
 * Currently a placeholder implementation that returns default models.
 */

import type { AIOptions } from './index'

// ============================================================================
// Types
// ============================================================================

export interface ModelConfig {
  /** Model identifier (e.g., 'gpt-4', 'claude-3-opus') */
  name: string
  /** Maximum context window in tokens */
  contextWindow: number
  /** Cost per 1,000 input tokens in USD */
  costPer1kInputTokens: number
  /** Cost per 1,000 output tokens in USD */
  costPer1kOutputTokens: number
  /** Model capabilities */
  capabilities?: {
    streaming?: boolean
    json?: boolean
    vision?: boolean
    functionCalling?: boolean
  }
}

export interface ModelSelectionOptions extends AIOptions {
  /** Estimated input size in tokens */
  estimatedInputTokens?: number
  /** Estimated output size in tokens */
  estimatedOutputTokens?: number
  /** Prefer lower cost models */
  preferLowCost?: boolean
  /** Require specific capabilities */
  requiredCapabilities?: Array<'streaming' | 'json' | 'vision' | 'functionCalling'>
}

// ============================================================================
// Default Models
// ============================================================================

/**
 * Default model configurations
 * These are placeholder values - in production, these would be
 * loaded from configuration or environment variables
 */
export const DEFAULT_MODELS: Record<string, ModelConfig> = {
  'gpt-4': {
    name: 'gpt-4',
    contextWindow: 8192,
    costPer1kInputTokens: 0.03,
    costPer1kOutputTokens: 0.06,
    capabilities: {
      streaming: true,
      json: true,
      vision: false,
      functionCalling: true,
    },
  },
  'gpt-4-turbo': {
    name: 'gpt-4-turbo',
    contextWindow: 128000,
    costPer1kInputTokens: 0.01,
    costPer1kOutputTokens: 0.03,
    capabilities: {
      streaming: true,
      json: true,
      vision: true,
      functionCalling: true,
    },
  },
  'gpt-3.5-turbo': {
    name: 'gpt-3.5-turbo',
    contextWindow: 16385,
    costPer1kInputTokens: 0.0005,
    costPer1kOutputTokens: 0.0015,
    capabilities: {
      streaming: true,
      json: true,
      vision: false,
      functionCalling: true,
    },
  },
  'claude-3-opus': {
    name: 'claude-3-opus',
    contextWindow: 200000,
    costPer1kInputTokens: 0.015,
    costPer1kOutputTokens: 0.075,
    capabilities: {
      streaming: true,
      json: true,
      vision: true,
      functionCalling: true,
    },
  },
  'claude-3-sonnet': {
    name: 'claude-3-sonnet',
    contextWindow: 200000,
    costPer1kInputTokens: 0.003,
    costPer1kOutputTokens: 0.015,
    capabilities: {
      streaming: true,
      json: true,
      vision: true,
      functionCalling: true,
    },
  },
}

/** Default model to use when no specific model is requested */
export const DEFAULT_MODEL = 'gpt-4-turbo'

// ============================================================================
// Model Selection
// ============================================================================

/**
 * Select the best model for a given task
 *
 * Currently a placeholder implementation that returns the default model
 * or a specified model from options. In production, this would analyze
 * the task and options to select the optimal model.
 *
 * @param task - Description of the task (for future smart selection)
 * @param options - Model selection options
 * @returns The selected model configuration
 *
 * @example
 * ```ts
 * // Use default model
 * const model = selectModel('Generate a summary')
 *
 * // Use specific model
 * const model = selectModel('Generate a summary', { model: 'gpt-4' })
 *
 * // Future: Smart selection based on requirements
 * const model = selectModel('Analyze image', {
 *   requiredCapabilities: ['vision'],
 *   preferLowCost: true,
 * })
 * ```
 */
export function selectModel(task: string, options?: ModelSelectionOptions): ModelConfig {
  // If a specific model is requested, use it
  if (options?.model && DEFAULT_MODELS[options.model]) {
    return DEFAULT_MODELS[options.model]
  }

  // If a specific model is requested but not found, still return it
  // (might be a custom model or new model not in our list)
  if (options?.model) {
    return {
      name: options.model,
      contextWindow: 8192, // Conservative default
      costPer1kInputTokens: 0.01,
      costPer1kOutputTokens: 0.03,
      capabilities: {
        streaming: true,
        json: true,
        vision: false,
        functionCalling: true,
      },
    }
  }

  // Future: Implement smart selection based on:
  // - Task analysis (sentiment, classification, generation, etc.)
  // - Required capabilities
  // - Cost preferences
  // - Token estimates

  // For now, return the default model
  return DEFAULT_MODELS[DEFAULT_MODEL]
}

/**
 * Get a model configuration by name
 *
 * @param modelName - The model name to look up
 * @returns The model configuration or undefined if not found
 */
export function getModel(modelName: string): ModelConfig | undefined {
  return DEFAULT_MODELS[modelName]
}

/**
 * List all available models
 *
 * @returns Array of all model configurations
 */
export function listModels(): ModelConfig[] {
  return Object.values(DEFAULT_MODELS)
}

/**
 * Check if a model supports specific capabilities
 *
 * @param modelName - The model to check
 * @param capabilities - Required capabilities
 * @returns true if the model supports all required capabilities
 */
export function modelSupports(
  modelName: string,
  capabilities: Array<'streaming' | 'json' | 'vision' | 'functionCalling'>
): boolean {
  const model = DEFAULT_MODELS[modelName]
  if (!model?.capabilities) return false

  return capabilities.every((cap) => model.capabilities?.[cap])
}
