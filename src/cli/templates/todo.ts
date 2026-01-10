/**
 * Todo template - A classic todo app example
 */

import {
  minimalPackageJson,
  minimalTsConfig,
  minimalEnvExample,
  minimalReadme,
  minimalGitignore,
} from './minimal'

export { minimalPackageJson as todoPackageJson }
export { minimalTsConfig as todoTsConfig }
export { minimalEnvExample as todoEnvExample }
export { minimalReadme as todoReadme }
export { minimalGitignore as todoGitignore }

export const todoAppTsx = `/**
 * Todo Application
 *
 * A complete todo list application demonstrating:
 * - Data modeling with nouns
 * - CRUD operations with verbs
 * - Type-safe queries
 */

import { SaaS } from 'saaskit'

export default function App() {
  return (
    <SaaS name="Todo App">
      {$ => {
        // Define the Todo data model
        $.nouns({
          Todo: {
            // Basic properties
            title: 'string',
            description: 'string?',
            completed: 'boolean',
            priority: 'number',

            // Timestamps (auto-managed)
            createdAt: 'date',
            updatedAt: 'date',
          },

          // Categories for organizing todos
          Category: {
            name: 'string',
            color: 'string?',
          },
        })

        // Define actions for Todo management
        $.verbs({
          Todo: {
            // Create a new todo
            create: async (data) => {
              console.log('Creating todo:', data.title)
              return {
                ...data,
                completed: false,
                createdAt: new Date(),
                updatedAt: new Date(),
              }
            },

            // Update an existing todo
            update: async (id, data) => {
              console.log('Updating todo:', id)
              return {
                id,
                ...data,
                updatedAt: new Date(),
              }
            },

            // Mark todo as complete
            complete: async (id) => {
              console.log('Completing todo:', id)
              return {
                id,
                completed: true,
                updatedAt: new Date(),
              }
            },

            // Delete a todo
            delete: async (id) => {
              console.log('Deleting todo:', id)
              return { deleted: true }
            },
          },

          Category: {
            create: async (data) => data,
            update: async (id, data) => ({ id, ...data }),
          },
        })

        // Event handlers for logging
        $.on('Todo:created', (todo) => {
          console.log('Todo created:', todo.title)
        })

        $.on('Todo:completed', (todo) => {
          console.log('Todo completed:', todo.title)
        })
      }}
    </SaaS>
  )
}
`
