/**
 * TypeScript Hygiene Tests (RED Phase - TDD)
 *
 * These tests verify that the codebase compiles with zero TypeScript errors.
 * Currently the codebase has 200+ unused variable/parameter errors.
 */

import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'

describe('TypeScript hygiene', () => {
  // Note: These tests run the actual TypeScript compiler
  // They may take 10-30 seconds to run

  it('compiles with zero errors', () => {
    let errorOutput = ''
    try {
      execSync('npx tsc --noEmit 2>&1', {
        cwd: '/Users/nathanclevenger/projects/ui/packages/saaskit',
        encoding: 'utf-8',
        timeout: 60000
      })
    } catch (error: unknown) {
      errorOutput = (error as { stdout?: string; stderr?: string }).stdout || (error as { stdout?: string; stderr?: string }).stderr || ''
    }

    // Count actual errors (not warnings)
    const errorCount = (errorOutput.match(/error TS\d+/g) || []).length
    expect(errorCount).toBe(0)
  })

  it('has no unused parameters (TS6133)', () => {
    let output = ''
    try {
      output = execSync('npx tsc --noEmit 2>&1', {
        cwd: '/Users/nathanclevenger/projects/ui/packages/saaskit',
        encoding: 'utf-8',
        timeout: 60000
      })
    } catch (error: unknown) {
      output = (error as { stdout?: string; stderr?: string }).stdout || (error as { stdout?: string; stderr?: string }).stderr || ''
    }

    const ts6133Count = (output.match(/TS6133/g) || []).length
    expect(ts6133Count).toBe(0)
  })

  it('has no unused local variables (TS6196)', () => {
    let output = ''
    try {
      output = execSync('npx tsc --noEmit 2>&1', {
        cwd: '/Users/nathanclevenger/projects/ui/packages/saaskit',
        encoding: 'utf-8',
        timeout: 60000
      })
    } catch (error: unknown) {
      output = (error as { stdout?: string; stderr?: string }).stdout || (error as { stdout?: string; stderr?: string }).stderr || ''
    }

    const ts6196Count = (output.match(/TS6196/g) || []).length
    expect(ts6196Count).toBe(0)
  })
})
