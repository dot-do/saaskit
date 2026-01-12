import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('API generator module structure', () => {
  const apiDir = path.join(__dirname, '../../api-generator')

  it('has separate REST module', () => {
    expect(fs.existsSync(path.join(apiDir, 'rest.ts'))).toBe(true)
  })

  it('has separate GraphQL module', () => {
    expect(fs.existsSync(path.join(apiDir, 'graphql.ts'))).toBe(true)
  })

  it('has separate OpenAPI module', () => {
    expect(fs.existsSync(path.join(apiDir, 'openapi.ts'))).toBe(true)
  })

  it('has separate rate limiting module', () => {
    expect(fs.existsSync(path.join(apiDir, 'ratelimit.ts'))).toBe(true)
  })

  it('has separate auth module', () => {
    expect(fs.existsSync(path.join(apiDir, 'auth.ts'))).toBe(true)
  })

  it('index.ts is coordinator only (< 200 LOC)', () => {
    const content = fs.readFileSync(path.join(apiDir, 'index.ts'), 'utf-8')
    const lineCount = content.split('\n').length
    expect(lineCount).toBeLessThan(200)
  })
})
