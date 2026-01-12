/**
 * Type Safety Tests (RED Phase - TDD)
 *
 * These tests verify that no explicit 'any' types exist in public API interfaces.
 * Currently the codebase has 60+ explicit 'any' types that weaken type safety.
 */

import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

const srcDir = path.join(__dirname, '..')

// Helper to count `: any` patterns in a file
function countExplicitAny(filePath: string): number {
  if (!fs.existsSync(filePath)) {
    return 0
  }
  const content = fs.readFileSync(filePath, 'utf-8')
  // Match `: any` but not `: anyFunction` or similar
  const matches = content.match(/:\s*any\b/g) || []
  return matches.length
}

// Helper to count `as any` assertions in a file
function countAsAnyAssertions(filePath: string): number {
  if (!fs.existsSync(filePath)) {
    return 0
  }
  const content = fs.readFileSync(filePath, 'utf-8')
  const matches = content.match(/\bas\s+any\b/g) || []
  return matches.length
}

describe('type safety', () => {
  describe('API interface type files should have no explicit any', () => {
    it('api-generator/types.ts has no explicit any', () => {
      const count = countExplicitAny(path.join(srcDir, 'api-generator/types.ts'))
      expect(count).toBe(0)
    })

    it('database/types.ts has no explicit any', () => {
      const count = countExplicitAny(path.join(srcDir, 'database/types.ts'))
      expect(count).toBe(0)
    })

    it('types/context.ts has no explicit any', () => {
      const count = countExplicitAny(path.join(srcDir, 'types/context.ts'))
      expect(count).toBe(0)
    })

    it('mcp-generator/types.ts has no explicit any', () => {
      const count = countExplicitAny(path.join(srcDir, 'mcp-generator/types.ts'))
      expect(count).toBe(0)
    })

    it('cli/types.ts has no explicit any', () => {
      const count = countExplicitAny(path.join(srcDir, 'cli/types.ts'))
      expect(count).toBe(0)
    })
  })

  describe('core modules should have no "as any" assertions', () => {
    it('core/context.ts has no "as any" assertions', () => {
      const count = countAsAnyAssertions(path.join(srcDir, 'core/context.ts'))
      expect(count).toBe(0)
    })

    it('core/create-saas.ts has no "as any" assertions', () => {
      const count = countAsAnyAssertions(path.join(srcDir, 'core/create-saas.ts'))
      expect(count).toBe(0)
    })

    it('api-generator/index.ts has no "as any" assertions', () => {
      const count = countAsAnyAssertions(path.join(srcDir, 'api-generator/index.ts'))
      expect(count).toBe(0)
    })
  })

  describe('total codebase any count', () => {
    it('has zero "as any" assertions across entire src', () => {
      let count = 0
      try {
        const result = execSync(
          `grep -r "as any" "${srcDir}" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "__tests__" | grep -v "node_modules" | wc -l`,
          { encoding: 'utf-8' }
        )
        count = parseInt(result.trim())
      } catch {
        count = 0
      }
      expect(count).toBe(0)
    })
  })
})
