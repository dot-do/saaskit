/**
 * Dotdo Compiler - Verb to Function
 *
 * Compiles SaaSKit verb definitions to dotdo Function definitions.
 * Handles category detection (code, generative, human) and schema passthrough.
 */

interface VerbDefinition {
  noun: string
  name: string
  handler?: unknown
  usesAI?: boolean
  usesHumanApproval?: boolean
  inputSchema?: Record<string, unknown>
  outputSchema?: Record<string, unknown>
  category?: string
}

interface CompiledFunction {
  name: string
  verb: string
  category: 'code' | 'generative' | 'human'
  runtime: string
  inputSchema?: Record<string, unknown>
  outputSchema?: Record<string, unknown>
  generationType?: string
  approvalRequired?: boolean
}

/**
 * Compiles a verb definition to a dotdo Function definition.
 *
 * Category detection:
 * - Default: 'code' with runtime 'workers'
 * - If usesAI: true → 'generative' with runtime 'workers-ai'
 * - If usesHumanApproval: true → 'human' with approvalRequired: true
 *
 * @param verb - The verb definition to compile
 * @returns A compiled Function definition
 */
export function compileVerbToFunction(verb: VerbDefinition): CompiledFunction {
  // Detect category based on verb properties
  let category: 'code' | 'generative' | 'human' = 'code'
  let runtime = 'workers'

  if (verb.usesAI) {
    category = 'generative'
    runtime = 'workers-ai'
  } else if (verb.usesHumanApproval) {
    category = 'human'
  }

  const result: CompiledFunction = {
    name: `${verb.noun}.${verb.name}`,
    verb: verb.name,
    category,
    runtime,
  }

  // Add schemas if provided
  if (verb.inputSchema) {
    result.inputSchema = verb.inputSchema
  }
  if (verb.outputSchema) {
    result.outputSchema = verb.outputSchema
  }

  // Add category-specific fields
  if (category === 'generative') {
    result.generationType = 'text'
  }
  if (category === 'human') {
    result.approvalRequired = true
  }

  return result
}
