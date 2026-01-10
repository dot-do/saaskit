/**
 * Minimal template - Basic SaaSKit project starter
 */

export const minimalPackageJson = (name: string) => ({
  name,
  version: '0.1.0',
  private: true,
  type: 'module',
  scripts: {
    dev: 'saaskit dev',
    build: 'saaskit build',
    deploy: 'saaskit deploy',
    start: 'node dist/index.js',
  },
  dependencies: {
    saaskit: '^0.1.0',
    react: '^19.0.0',
    'react-dom': '^19.0.0',
  },
  devDependencies: {
    typescript: '^5.9.0',
    '@types/react': '^19.0.0',
    '@types/node': '^22.0.0',
  },
})

export const minimalTsConfig = {
  compilerOptions: {
    target: 'ES2022',
    module: 'ESNext',
    moduleResolution: 'bundler',
    jsx: 'react-jsx',
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    resolveJsonModule: true,
    declaration: true,
    declarationMap: true,
    outDir: './dist',
    rootDir: './',
    lib: ['ES2022', 'DOM', 'DOM.Iterable'],
  },
  include: ['**/*.ts', '**/*.tsx'],
  exclude: ['node_modules', 'dist'],
}

export const minimalAppTsx = `/**
 * My SaaS Application
 *
 * This is a minimal SaaSKit application template.
 * Define your data models (nouns) and actions (verbs) below.
 */

import { SaaS } from 'saaskit'

export default function App() {
  return (
    <SaaS name="My App">
      {$ => {
        // Define your data models (nouns)
        $.nouns({
          Item: {
            name: 'string',
            description: 'string?',
            active: 'boolean',
          },
        })

        // Define your actions (verbs)
        $.verbs({
          Item: {
            create: async (data) => {
              // Create a new item
              return data
            },
            update: async (id, data) => {
              // Update an existing item
              return { id, ...data }
            },
          },
        })
      }}
    </SaaS>
  )
}
`

export const minimalEnvExample = `# SaaSKit Environment Variables
# Copy this file to .env and fill in your values

# Required for deployment
SAAS_API_KEY=your_api_key_here

# Database connection (auto-configured on SaaS.Dev)
DATABASE_URL=

# Optional integrations
STRIPE_SECRET_KEY=
OPENAI_API_KEY=
`

export const minimalReadme = (name: string) => `# ${name}

A SaaSKit application.

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Start development server
npx saaskit dev

# Build for production
npx saaskit build

# Deploy to SaaS.Dev
npx saaskit deploy
\`\`\`

## Project Structure

- \`app.tsx\` - Main application file defining your nouns and verbs
- \`tsconfig.json\` - TypeScript configuration
- \`.env\` - Environment variables (create from .env.example)

## Learn More

Visit [SaaS.Dev](https://saas.dev) for documentation.
`

export const minimalGitignore = `# Dependencies
node_modules/

# Build output
dist/
.turbo/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
`
