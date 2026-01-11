# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2024-01-10

### Added

#### Core Framework
- Core DSL for defining SaaS applications with `defineApp()` function
- Nouns system for modeling domain entities (User, Product, Order, Customer, Organization, etc.)
- Verbs system for defining actions on Nouns (create, update, delete, read, custom actions)
- Relationships DSL with directional operators (`->`, `<-`, `<->`) for entity relationships
- Type-safe field definitions with support for primitives, relationships, and enums

#### Event System
- Event emitter pattern with `$.on.Noun.verb()` syntax
- Built-in lifecycle event verbs: `created`, `updated`, `deleted`, `read`
- Custom verb event handling for domain-specific events
- Event handlers with access to full AppContext (`$`)
- Event type inference for type-safe event payloads

#### Schedule System
- DSL for recurring tasks with natural language syntax
- Time-based scheduling: `$.every.day.at('9am')`, `$.every.monday.at('3am')`
- Cron-style scheduling support
- Durable schedule execution with guaranteed delivery
- Access to full AppContext in schedule handlers

#### AI Context Integration
- Template literal AI prompts with `$.ai\`prompt\`` syntax
- AI-powered semantic search on indexed Nouns via `semanticSearch()`
- Full-text search capabilities via `search()`
- Human-in-the-loop workflows with `$.human.approve()`, `$.human.ask()`, `$.human.review()`
- AI agent definition and execution with `$.agent()` and `$.agents[name].run()`

#### Context System
- Comprehensive AppContext (`$`) with access to:
  - Database operations (CRUD, search, semantic search)
  - Integrations (Stripe, Slack, email services, etc.)
  - Workflow primitives (send, do)
  - AI capabilities (prompts, agents, semantic search)
  - User and organization context
  - Environment variables
  - Time utilities
  - Request metadata

#### Built-in Nouns
- **User** - User authentication and profile management
- **Organization** - Multi-tenant organization support
- **Team** - Team management within organizations
- **Plan** - Billing plan definitions
- **APIKey** - API key management for SDK access
- **Webhook** - Webhook endpoint configuration and delivery tracking
- **Invoice** - Billing invoice records
- **Subscription** - Active subscription management
- **PaymentMethod** - Stored payment methods
- **AuditLog** - Comprehensive audit trail

#### Admin Dashboard Components
- React components for SaaS admin interface
- **OrganizationsPage** - Manage organizations and settings
- **UsersPage** - User management with invitations and impersonation
- **TeamsPage** - Team creation and member management
- **APIKeysPage** - API key generation and revocation
- **WebhooksPage** - Webhook configuration and delivery history
- **BillingPage** - Subscription, plan, and invoice management
- **AuditLogPage** - Searchable and filterable audit trail
- **SettingsPage** - Application-wide settings
- **SaaS** and **SaaSAdmin** wrapper components with theming support

#### Providers and Hooks
- **SaaSProvider** - Global context provider for SaaS applications
- **AppProvider** - Application context management
- Hooks for resource management: `useResource()`, `useRealtime()`, `useAuth()`, `usePermission()`, `useOrganization()`
- Real-time subscription support with automatic sync
- Permission and authorization hooks

#### API Generator
- Automatic REST API generation from Noun and Verb definitions
- GraphQL schema generation with mutations and subscriptions
- WebSocket support for real-time subscriptions
- Type-safe generated API clients
- OpenAPI/Swagger documentation generation

#### SDK Generator
- Multi-language SDK generation (TypeScript, Python, Go, more)
- TypeScript client with full type inference
- Python client with pydantic models
- Automatic method generation from Nouns and Verbs
- Built-in authentication and API key handling

#### CLI Generator
- Command-line interface scaffold for all Nouns and Verbs
- CRUD commands: list, show, create, update, delete
- Custom verb commands with argument parsing
- Interactive prompts for complex workflows
- Output formatting (table, JSON, YAML)

#### Documentation Generator
- Automatic API documentation generation
- Getting Started and Authentication guides
- API Reference with endpoint documentation
- Webhook event reference
- SDK usage examples

#### Billing Integration
- Stripe integration scaffold
- Subscription management (create, upgrade, downgrade, cancel)
- Usage-based billing support
- Invoice generation and management
- Payment method management
- Webhook handling for Stripe events
- Billing portal integration

#### Database Utilities
- Efficient query batching
- Automatic indexing for common queries
- Query result caching
- Transaction support
- Full-text search with ranking
- Semantic search with vector embeddings

#### Parser Utilities
- Noun definition parser with field type inference
- Verb definition parser with anatomy generation (base, past tense, participle)
- Relationship parser with operator validation
- Schema validation with helpful error messages
- Support for TypeScript-like type definitions

#### Generators System
- Generator framework for extending SaaSkit
- Built-in generators for App, API, Site, Docs, CLI scaffolds
- Extensible generator registration
- Template-based code generation
- Integration with framework lifecycle

### Developer Experience
- Full TypeScript support with type inference
- React component exports with TypeScript generics
- Comprehensive prop types for all components
- JSDoc documentation for IDE autocomplete
- Example code in README showcasing RecruitKit use case
- Type-safe event and schedule definitions

### Performance
- Query result caching layer
- Efficient batch operations
- Optimized indexing strategies
- Real-time sync with delta updates

### Documentation
- Comprehensive README with problem/solution framing
- Full API reference in source code
- Example SaaS implementation (RecruitKit)
- Architecture overview documenting the cascade
- Getting started guide for quick prototyping
