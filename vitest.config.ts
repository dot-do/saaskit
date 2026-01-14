import { defineProject, mergeConfig } from 'vitest/config'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import configShared from '../../vitest.shared'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '../..')

export default mergeConfig(
  configShared,
  defineProject({
    resolve: {
      alias: [
        // Mock emoji-mart related modules to avoid JSON import attribute issues
        // This is a transitive dependency chain:
        // @mdxui/primitives -> @lobehub/icons -> emoji-mart -> @emoji-mart/data
        {
          find: /^@emoji-mart\/data.*$/,
          replacement: resolve(__dirname, 'src/__mocks__/emoji-mart-data.ts'),
        },
        {
          find: /^emoji-mart$/,
          replacement: resolve(__dirname, 'src/__mocks__/emoji-mart.ts'),
        },
        // Also mock @lobehub/icons which imports emoji-mart
        {
          find: /^@lobehub\/icons.*$/,
          replacement: resolve(__dirname, 'src/__mocks__/lobehub-icons.ts'),
        },
        // Resolve @/lib/utils from @mdxui/admin dist files
        // The admin package's dist has unresolved path aliases
        {
          find: /^@\/lib\/utils$/,
          replacement: resolve(rootDir, 'packages/admin/src/lib/utils.ts'),
        },
        {
          find: /^@\/(.*)$/,
          replacement: resolve(rootDir, 'packages/admin/src/$1'),
        },
      ],
    },
    test: {
      name: 'saaskit',
      environment: 'jsdom',
      globals: true,
    },
  })
)
