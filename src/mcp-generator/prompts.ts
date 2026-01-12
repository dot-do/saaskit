/**
 * MCP Prompt Generation
 *
 * Generates MCP prompts from configuration with support for:
 * - Custom prompts with template substitution
 * - Auto-generated analyze prompts per noun
 * - Workflow prompts for common operations
 * - Context-aware prompts with embedded data
 */

import type { MCPPrompt, MCPPromptArgument, MCPPromptResult } from './types'
import type { DataStore } from './tools'
import { toMCPKey } from './types'

/**
 * Prompt configuration
 */
export interface PromptConfig {
  description: string
  template: string
  arguments?: MCPPromptArgument[]
}

/**
 * Built-in workflow prompt types
 */
export type WorkflowPromptType =
  | 'crud_guide'
  | 'data_analysis'
  | 'bulk_operations'
  | 'data_migration'
  | 'troubleshoot'
  | 'report_generation'

/**
 * Workflow prompt configuration for auto-generation
 */
export interface WorkflowPromptConfig {
  /** Enable specific workflow prompts */
  enabled?: WorkflowPromptType[]
  /** Custom workflow prompts to add */
  custom?: Record<string, PromptConfig>
}

/**
 * Generate default analyze prompt for a noun
 */
export function generateAnalyzePrompt(noun: string): MCPPrompt {
  const nounKey = toMCPKey(noun)
  const nounLower = noun.toLowerCase()

  return {
    name: `analyze_${nounKey}`,
    description: `Analyze ${nounLower} data and provide insights`,
    arguments: [],
  }
}

/**
 * Generate CRUD guide workflow prompt for a noun
 */
export function generateCRUDGuidePrompt(noun: string, _fields: Record<string, string>): MCPPrompt {
  const nounKey = toMCPKey(noun)
  const nounLower = noun.toLowerCase()

  return {
    name: `crud_guide_${nounKey}`,
    description: `Step-by-step guide for ${nounLower} CRUD operations`,
    arguments: [
      {
        name: 'operation',
        description: 'The operation to guide: create, read, update, delete, or list',
        required: false,
      },
    ],
  }
}

/**
 * Generate data analysis workflow prompt for a noun
 */
export function generateDataAnalysisPrompt(noun: string): MCPPrompt {
  const nounKey = toMCPKey(noun)
  const nounLower = noun.toLowerCase()

  return {
    name: `data_analysis_${nounKey}`,
    description: `Comprehensive analysis of ${nounLower} data with statistics and recommendations`,
    arguments: [
      {
        name: 'focus',
        description: 'Analysis focus: trends, outliers, patterns, summary, or all',
        required: false,
      },
      {
        name: 'format',
        description: 'Output format: text, json, or markdown',
        required: false,
      },
    ],
  }
}

/**
 * Generate bulk operations workflow prompt for a noun
 */
export function generateBulkOperationsPrompt(noun: string): MCPPrompt {
  const nounKey = toMCPKey(noun)
  const nounLower = noun.toLowerCase()

  return {
    name: `bulk_operations_${nounKey}`,
    description: `Guide for bulk operations on ${nounLower} records`,
    arguments: [
      {
        name: 'action',
        description: 'Bulk action: create, update, delete, or export',
        required: true,
      },
      {
        name: 'criteria',
        description: 'Filter criteria for selecting records (JSON format)',
        required: false,
      },
    ],
  }
}

/**
 * Generate data migration workflow prompt for a noun
 */
export function generateDataMigrationPrompt(noun: string): MCPPrompt {
  const nounKey = toMCPKey(noun)
  const nounLower = noun.toLowerCase()

  return {
    name: `data_migration_${nounKey}`,
    description: `Guide for migrating ${nounLower} data between systems`,
    arguments: [
      {
        name: 'direction',
        description: 'Migration direction: import or export',
        required: true,
      },
      {
        name: 'format',
        description: 'Data format: json, csv, or yaml',
        required: false,
      },
    ],
  }
}

/**
 * Generate troubleshooting workflow prompt for a noun
 */
export function generateTroubleshootPrompt(noun: string): MCPPrompt {
  const nounKey = toMCPKey(noun)
  const nounLower = noun.toLowerCase()

  return {
    name: `troubleshoot_${nounKey}`,
    description: `Troubleshoot issues with ${nounLower} data or operations`,
    arguments: [
      {
        name: 'issue',
        description: 'Description of the issue to troubleshoot',
        required: true,
      },
      {
        name: 'context',
        description: 'Additional context about the issue',
        required: false,
      },
    ],
  }
}

/**
 * Generate report generation workflow prompt for a noun
 */
export function generateReportPrompt(noun: string): MCPPrompt {
  const nounKey = toMCPKey(noun)
  const nounLower = noun.toLowerCase()

  return {
    name: `report_${nounKey}`,
    description: `Generate a report on ${nounLower} data`,
    arguments: [
      {
        name: 'type',
        description: 'Report type: summary, detailed, comparison, or trend',
        required: false,
      },
      {
        name: 'timeRange',
        description: 'Time range for the report: day, week, month, or custom',
        required: false,
      },
    ],
  }
}

/**
 * Generate workflow prompts for a noun based on enabled types
 */
export function generateWorkflowPrompts(
  noun: string,
  fields: Record<string, string>,
  enabledWorkflows?: WorkflowPromptType[]
): MCPPrompt[] {
  const prompts: MCPPrompt[] = []
  const defaultWorkflows: WorkflowPromptType[] = [
    'crud_guide',
    'data_analysis',
    'bulk_operations',
    'troubleshoot',
  ]

  const workflows = enabledWorkflows || defaultWorkflows

  for (const workflow of workflows) {
    switch (workflow) {
      case 'crud_guide':
        prompts.push(generateCRUDGuidePrompt(noun, fields))
        break
      case 'data_analysis':
        prompts.push(generateDataAnalysisPrompt(noun))
        break
      case 'bulk_operations':
        prompts.push(generateBulkOperationsPrompt(noun))
        break
      case 'data_migration':
        prompts.push(generateDataMigrationPrompt(noun))
        break
      case 'troubleshoot':
        prompts.push(generateTroubleshootPrompt(noun))
        break
      case 'report_generation':
        prompts.push(generateReportPrompt(noun))
        break
    }
  }

  return prompts
}

/**
 * Convert a prompt config to an MCP prompt
 */
export function promptConfigToMCP(name: string, config: PromptConfig): MCPPrompt {
  return {
    name,
    description: config.description,
    arguments: config.arguments,
  }
}

/**
 * Generate all prompts from configuration
 */
export function generatePrompts(config: {
  nouns: Record<string, Record<string, string>>
  prompts?: Record<string, PromptConfig>
  workflows?: WorkflowPromptConfig
}): MCPPrompt[] {
  const prompts: MCPPrompt[] = []

  // Generate analyze prompts for each noun
  for (const noun of Object.keys(config.nouns)) {
    prompts.push(generateAnalyzePrompt(noun))
  }

  // Generate workflow prompts if enabled
  if (config.workflows) {
    for (const [noun, fields] of Object.entries(config.nouns)) {
      prompts.push(...generateWorkflowPrompts(noun, fields, config.workflows.enabled))
    }

    // Add custom workflow prompts
    if (config.workflows.custom) {
      for (const [name, promptConfig] of Object.entries(config.workflows.custom)) {
        prompts.push(promptConfigToMCP(name, promptConfig))
      }
    }
  }

  // Add custom prompts
  if (config.prompts) {
    for (const [name, promptConfig] of Object.entries(config.prompts)) {
      prompts.push(promptConfigToMCP(name, promptConfig))
    }
  }

  return prompts
}

/**
 * Fill template with arguments
 */
function fillTemplate(template: string, args: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(args)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
  }
  return result
}

/**
 * Prompt executor with workflow support
 */
export class PromptExecutor {
  private prompts: Map<string, PromptConfig>
  private nouns: Record<string, Record<string, string>>
  private store: DataStore

  constructor(
    promptConfigs: Record<string, PromptConfig>,
    nouns: Record<string, Record<string, string>>,
    store: DataStore
  ) {
    this.prompts = new Map(Object.entries(promptConfigs))
    this.nouns = nouns
    this.store = store
  }

  /**
   * Get a prompt with arguments filled
   */
  async getPrompt(name: string, args: Record<string, string>): Promise<MCPPromptResult> {
    // Check for default analyze prompt
    const analyzeMatch = name.match(/^analyze_(.+)$/)
    if (analyzeMatch) {
      const nounKey = analyzeMatch[1]
      const noun = Object.keys(this.nouns).find((n) => toMCPKey(n) === nounKey)
      if (noun) {
        return this.getAnalyzePrompt(noun)
      }
    }

    // Check for workflow prompts
    const workflowMatch = name.match(/^(crud_guide|data_analysis|bulk_operations|data_migration|troubleshoot|report)_(.+)$/)
    if (workflowMatch) {
      const [, workflowType, nounKey] = workflowMatch
      const noun = Object.keys(this.nouns).find((n) => toMCPKey(n) === nounKey)
      if (noun) {
        return this.getWorkflowPrompt(workflowType as WorkflowPromptType, noun, args)
      }
    }

    // Check for custom prompt
    const promptConfig = this.prompts.get(name)
    if (!promptConfig) {
      return {
        messages: [],
        error: `Prompt not found: ${name}`,
      }
    }

    // Check required arguments
    if (promptConfig.arguments) {
      for (const arg of promptConfig.arguments) {
        if (arg.required && !(arg.name in args)) {
          return {
            messages: [],
            error: `Missing required argument: ${arg.name}`,
          }
        }
      }
    }

    // Fill template
    const text = fillTemplate(promptConfig.template, args)

    return {
      description: promptConfig.description,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text,
          },
        },
      ],
    }
  }

  /**
   * Get analyze prompt with embedded data
   */
  private getAnalyzePrompt(noun: string): MCPPromptResult {
    const items = this.store.list(noun)
    const nounLower = noun.toLowerCase()

    const text = `Please analyze the following ${nounLower} data and provide insights:

${JSON.stringify(items, null, 2)}

Consider:
1. Patterns and trends in the data
2. Any notable observations
3. Suggestions for improvements or actions`

    return {
      description: `Analysis of ${nounLower} data`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text,
          },
        },
      ],
    }
  }

  /**
   * Get workflow prompt with context
   */
  private getWorkflowPrompt(
    workflowType: string,
    noun: string,
    args: Record<string, string>
  ): MCPPromptResult {
    const nounLower = noun.toLowerCase()
    const fields = this.nouns[noun]
    const items = this.store.list(noun)

    let text: string
    let description: string

    switch (workflowType) {
      case 'crud_guide':
        text = this.buildCRUDGuideText(noun, nounLower, fields, args.operation)
        description = `CRUD guide for ${nounLower}`
        break

      case 'data_analysis':
        text = this.buildDataAnalysisText(noun, nounLower, items, args.focus, args.format)
        description = `Data analysis for ${nounLower}`
        break

      case 'bulk_operations':
        text = this.buildBulkOperationsText(noun, nounLower, items, args.action, args.criteria)
        description = `Bulk operations guide for ${nounLower}`
        break

      case 'data_migration':
        text = this.buildDataMigrationText(noun, nounLower, fields, items, args.direction, args.format)
        description = `Data migration guide for ${nounLower}`
        break

      case 'troubleshoot':
        text = this.buildTroubleshootText(noun, nounLower, items, args.issue, args.context)
        description = `Troubleshooting for ${nounLower}`
        break

      case 'report':
        text = this.buildReportText(noun, nounLower, items, args.type, args.timeRange)
        description = `Report for ${nounLower}`
        break

      default:
        return {
          messages: [],
          error: `Unknown workflow type: ${workflowType}`,
        }
    }

    return {
      description,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text,
          },
        },
      ],
    }
  }

  private buildCRUDGuideText(
    noun: string,
    _nounLower: string,
    fields: Record<string, string>,
    operation?: string
  ): string {
    const fieldList = Object.entries(fields)
      .map(([name, type]) => `  - ${name}: ${type}`)
      .join('\n')

    const operationGuide = operation
      ? `Focus on the "${operation}" operation.`
      : 'Cover all CRUD operations.'

    return `# CRUD Operations Guide for ${noun}

## Schema
${fieldList}

## Instructions
${operationGuide}

Please provide:
1. Step-by-step instructions for each operation
2. Example API calls or tool invocations
3. Common patterns and best practices
4. Error handling recommendations`
  }

  private buildDataAnalysisText(
    noun: string,
    _nounLower: string,
    items: Record<string, unknown>[],
    focus?: string,
    format?: string
  ): string {
    const focusArea = focus || 'all aspects'
    const outputFormat = format || 'markdown'

    return `# Data Analysis: ${noun}

## Current Data (${items.length} records)
${JSON.stringify(items, null, 2)}

## Analysis Focus: ${focusArea}

Please provide a comprehensive analysis including:
1. Summary statistics
2. ${focus === 'trends' ? 'Trend analysis over time' : 'Data distribution patterns'}
3. ${focus === 'outliers' ? 'Outlier detection and anomalies' : 'Notable observations'}
4. Actionable recommendations

Output format: ${outputFormat}`
  }

  private buildBulkOperationsText(
    noun: string,
    _nounLower: string,
    items: Record<string, unknown>[],
    action?: string,
    criteria?: string
  ): string {
    // parsedCriteria reserved for future filter enhancement
    void (criteria ? JSON.parse(criteria) : null)

    return `# Bulk Operations: ${noun}

## Action: ${action || 'Not specified'}
## Current Records: ${items.length}
${criteria ? `## Filter Criteria: ${criteria}` : ''}

## Current Data
${JSON.stringify(items, null, 2)}

Please provide:
1. Step-by-step bulk operation workflow
2. Safety checks and validation steps
3. Rollback strategy if needed
4. Expected outcomes and verification steps`
  }

  private buildDataMigrationText(
    noun: string,
    _nounLower: string,
    fields: Record<string, string>,
    items: Record<string, unknown>[],
    direction?: string,
    format?: string
  ): string {
    const fieldList = Object.entries(fields)
      .map(([name, type]) => `  - ${name}: ${type}`)
      .join('\n')

    return `# Data Migration: ${noun}

## Direction: ${direction || 'export'}
## Format: ${format || 'json'}

## Schema
${fieldList}

## Sample Data (${items.length} records)
${JSON.stringify(items.slice(0, 5), null, 2)}

Please provide:
1. ${direction === 'import' ? 'Import validation and mapping guide' : 'Export format and structure'}
2. Data transformation requirements
3. Validation checks
4. Migration script template`
  }

  private buildTroubleshootText(
    noun: string,
    _nounLower: string,
    items: Record<string, unknown>[],
    issue?: string,
    context?: string
  ): string {
    return `# Troubleshooting: ${noun}

## Issue
${issue || 'General troubleshooting requested'}

${context ? `## Additional Context\n${context}` : ''}

## Current State
- Total records: ${items.length}
- Sample data: ${JSON.stringify(items.slice(0, 3), null, 2)}

Please help diagnose:
1. Root cause analysis
2. Common issues and solutions
3. Diagnostic steps
4. Resolution recommendations`
  }

  private buildReportText(
    noun: string,
    _nounLower: string,
    items: Record<string, unknown>[],
    reportType?: string,
    timeRange?: string
  ): string {
    return `# Report: ${noun}

## Report Type: ${reportType || 'summary'}
## Time Range: ${timeRange || 'all time'}

## Data (${items.length} records)
${JSON.stringify(items, null, 2)}

Please generate a ${reportType || 'summary'} report including:
1. Executive summary
2. Key metrics and statistics
3. ${reportType === 'trend' ? 'Trend analysis and projections' : 'Current state overview'}
4. Recommendations and action items`
  }
}
