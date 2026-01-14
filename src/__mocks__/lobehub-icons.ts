/**
 * Mock for @lobehub/icons
 *
 * This mock exists to avoid JSON import attribute issues with Vitest.
 * @lobehub/icons imports emoji-mart which imports @emoji-mart/data,
 * and that package has JSON files that require import attributes.
 *
 * This is a transitive dependency chain:
 * saaskit -> @mdxui/primitives -> @lobehub/icons
 */

// Minimal mock icon components for testing
const createMockIcon = (name: string) => {
  const Component = () => null
  Component.displayName = name
  return Component
}

// Export commonly used icons from the library
export const Claude = createMockIcon('Claude')
export const Grok = createMockIcon('Grok')
export const OpenAI = createMockIcon('OpenAI')
export const Perplexity = createMockIcon('Perplexity')
export const ChatGPT = createMockIcon('ChatGPT')
export const Anthropic = createMockIcon('Anthropic')
export const Google = createMockIcon('Google')
export const Meta = createMockIcon('Meta')
export const Microsoft = createMockIcon('Microsoft')
export const Apple = createMockIcon('Apple')

// Default export
export default {
  Claude,
  Grok,
  OpenAI,
  Perplexity,
  ChatGPT,
  Anthropic,
  Google,
  Meta,
  Microsoft,
  Apple,
}
