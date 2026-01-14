/**
 * Mock for emoji-mart
 *
 * This mock exists to avoid JSON import attribute issues with Vitest.
 * emoji-mart imports @emoji-mart/data which has JSON import issues.
 *
 * This is a transitive dependency chain:
 * saaskit -> @mdxui/primitives -> @lobehub/icons -> emoji-mart
 */

// Minimal mock for emoji-mart exports
export const Picker = () => null
export const Emoji = () => null
export const init = () => {}
export const getEmojiDataFromNative = () => null
export const getEmojiDataFromShortcode = () => null

export default {
  Picker,
  Emoji,
  init,
  getEmojiDataFromNative,
  getEmojiDataFromShortcode,
}
