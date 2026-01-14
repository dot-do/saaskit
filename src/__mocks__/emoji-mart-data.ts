/**
 * Mock for @emoji-mart/data
 *
 * This mock exists to avoid JSON import attribute issues with Vitest.
 * The @emoji-mart/data package imports JSON files without `type: 'json'`
 * attribute, which causes module resolution errors in ESM environments.
 *
 * This is a transitive dependency chain:
 * saaskit -> @mdxui/primitives -> @lobehub/icons -> emoji-mart -> @emoji-mart/data
 */

// Minimal mock data structure for emoji-mart
export default {
  categories: [],
  emojis: {},
  aliases: {},
  sheet: { cols: 0, rows: 0 },
}
