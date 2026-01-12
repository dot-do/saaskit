/**
 * UI Components Integration Tests (RED Phase - TDD)
 *
 * Tests that verify generated admin components use @mdxui/admin
 * components instead of raw HTML elements.
 *
 * These tests should FAIL because current generators use raw createElement.
 */

import { describe, it, expect, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// Check if generateAdminPage function exists and what it produces
const generatorsDir = path.join(__dirname, '../../generators/app')

describe('generated UI uses @mdxui/admin components', () => {
  describe('generator file structure', () => {
    it('has page generators that could produce @mdxui/admin imports', () => {
      const pagesDir = path.join(generatorsDir, 'pages')
      expect(fs.existsSync(pagesDir)).toBe(true)

      // Check if list.tsx generator exists
      const listGenerator = path.join(pagesDir, 'list.tsx')
      if (fs.existsSync(listGenerator)) {
        const content = fs.readFileSync(listGenerator, 'utf-8')
        // RED: Should import from @mdxui/admin, currently doesn't
        expect(content).toContain("from '@mdxui/admin'")
      }
    })

    it('list generator uses DataGrid component', () => {
      const listGenerator = path.join(generatorsDir, 'pages/list.tsx')
      if (fs.existsSync(listGenerator)) {
        const content = fs.readFileSync(listGenerator, 'utf-8')
        // RED: Should use DataGrid from @mdxui/admin
        expect(content).toContain('DataGrid')
        expect(content).not.toContain("createElement('table'")
      } else {
        // If no list generator, fail the test
        expect(true).toBe(false)
      }
    })

    it('form generators use SimpleForm component', () => {
      const createGenerator = path.join(generatorsDir, 'pages/create.tsx')
      if (fs.existsSync(createGenerator)) {
        const content = fs.readFileSync(createGenerator, 'utf-8')
        // RED: Should use SimpleForm from @mdxui/admin
        expect(content).toContain('SimpleForm')
      } else {
        expect(true).toBe(false)
      }
    })

    it('generators use Button from @mdxui/primitives', () => {
      const listGenerator = path.join(generatorsDir, 'pages/list.tsx')
      if (fs.existsSync(listGenerator)) {
        const content = fs.readFileSync(listGenerator, 'utf-8')
        // RED: Should use Button from @mdxui/primitives
        expect(content).toContain("from '@mdxui/primitives'")
        expect(content).not.toContain("createElement('button'")
      } else {
        expect(true).toBe(false)
      }
    })

    it('generators use theme variables for styling', () => {
      const listGenerator = path.join(generatorsDir, 'pages/list.tsx')
      if (fs.existsSync(listGenerator)) {
        const content = fs.readFileSync(listGenerator, 'utf-8')
        // RED: Should use Tailwind theme classes
        expect(content).toContain('bg-background')
        expect(content).not.toContain("background: '#")
        expect(content).not.toContain('background: "rgb(')
      } else {
        expect(true).toBe(false)
      }
    })
  })

  describe('generated component output', () => {
    it('uses Card for detail views', () => {
      const showGenerator = path.join(generatorsDir, 'pages/show.tsx')
      if (fs.existsSync(showGenerator)) {
        const content = fs.readFileSync(showGenerator, 'utf-8')
        // RED: Should use Card from @mdxui/primitives
        expect(content).toContain('Card')
      } else {
        expect(true).toBe(false)
      }
    })
  })
})
