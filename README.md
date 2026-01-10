# saaskit

> Full-stack SaaS admin framework with dotdo primitives and TanStack ecosystem.

## Overview

saaskit provides a batteries-included admin dashboard using modern TanStack libraries and dotdo's edge-native infrastructure. Define your domain model with Nouns, Verbs, and Relationships, and get a complete admin UI with Organizations, Users, API Keys, Billing, and more.

## Installation

```bash
npm install saaskit
```

## Quick Start

```tsx
import { SaaS, defineApp } from 'saaskit'

const app = defineApp({
  nouns: ['User', 'Product', 'Order', 'Customer'],
  verbs: {
    User: ['create', 'update', 'delete', 'invite'],
    Order: ['create', 'fulfill', 'cancel', 'refund'],
  },
  relationships: [
    { from: 'Order', to: 'Customer', verb: 'belongsTo', reverse: 'hasMany' },
    { from: 'Order', to: 'Product', verb: 'contains', reverse: 'appearsIn' },
  ],
})

export default () => <SaaS app={app} />
```

That's it. You now have a full admin dashboard with CRUD for all resources.

## defineApp Configuration

### Nouns (PascalCase)

Define your domain entities:

```tsx
nouns: ['User', 'Product', 'Order', 'Customer', 'Organization', 'Team']
```

### Verbs (camelCase)

Define allowed actions per noun:

```tsx
verbs: {
  User: ['create', 'update', 'delete', 'invite', 'impersonate', 'suspend'],
  Order: ['create', 'fulfill', 'cancel', 'refund', 'archive'],
  Product: ['create', 'update', 'delete', 'publish', 'unpublish'],
}
```

### Relationships

Define how nouns relate to each other:

```tsx
relationships: [
  { from: 'Order', to: 'Customer', verb: 'belongsTo', reverse: 'hasMany' },
  { from: 'Order', to: 'Product', verb: 'contains', reverse: 'appearsIn' },
  { from: 'User', to: 'Organization', verb: 'memberOf', reverse: 'hasMembers' },
  { from: 'User', to: 'Team', verb: 'belongsTo', reverse: 'hasMembers' },
]
```

### Events

React to domain events:

```tsx
events: {
  'Order.created': async ($, event) => {
    await $.notify(event.data.customerId, 'Your order has been placed')
  },
  'User.invited': async ($, event) => {
    await $.email.send({ to: event.data.email, template: 'invite' })
  },
  'Payment.failed': async ($, event) => {
    await $.slack.send('#billing', `Payment failed for ${event.data.customerId}`)
  },
}
```

### Schedules (PascalCase)

Define recurring tasks:

```tsx
schedules: {
  DailyReport: $.every.day.at('9am'),
  WeeklyCleanup: $.every.sunday.at('3am'),
  MonthlyBilling: $.every('first monday').at('6am'),
  HourlySync: $.every.hour,
}
```

## Built-in Pages

The `<SaaS>` component includes everything a SaaS needs:

```tsx
<SaaS>
  {/* Multi-tenancy */}
  <Organizations />
  <Teams />
  <Members />

  {/* User management */}
  <Users />
  <Roles />
  <Permissions />

  {/* Developer experience */}
  <APIKeys />
  <Webhooks />
  <Usage />

  {/* Integrations */}
  <Integrations />
  <SSOProviders />

  {/* Billing (Stripe) */}
  <Billing />
  <Subscriptions />

  {/* Activity */}
  <AuditLog />
  <ActivityFeed />
</SaaS>
```

## Customization

### Custom Dashboard

```tsx
<SaaS app={app} dashboard={<MyDashboard />} />
```

### Custom Resources

```tsx
<SaaS
  app={app}
  resources={[
    { name: 'products', list: ProductList, create: ProductCreate, edit: ProductEdit },
    { name: 'orders', list: OrderList, show: OrderShow },
  ]}
/>
```

### Custom Sidebar

```tsx
<SaaS app={app} sidebar={<MySidebar />} />
```

## Hooks

### useResource

CRUD operations for any noun:

```tsx
import { useResource } from 'saaskit'

const { data, isLoading, create, update, remove } = useResource('Product')

await create({ name: 'New Product', price: 99 })
await update(id, { price: 149 })
await remove(id)
```

### useRealtime

Subscribe to live updates via DO change streams:

```tsx
import { useRealtime } from 'saaskit'

const { data } = useRealtime('Order', { filter: { status: 'pending' } })
```

### useAuth

Authentication and authorization:

```tsx
import { useAuth } from 'saaskit'

const { user, login, logout, hasPermission } = useAuth()

if (hasPermission('Order.refund')) {
  // show refund button
}
```

## Tech Stack

- **@tanstack/react-query** — Data fetching and caching
- **@tanstack/react-table** — Headless table
- **@tanstack/react-form** — Form state
- **@tanstack/db** — Database abstraction
- **@mdxui/admin** — UI components
- **dotdo** — Edge-native backend (Durable Objects + SQLite + R2)

## Backend

saaskit is DO-native. DB and Auth are automatic — you only configure the endpoint and namespace:

```tsx
import { SaaS, defineApp } from 'saaskit'

const app = defineApp({
  do: 'https://api.your-app.do',  // endpoint
  ns: 'tenant-123',               // namespace/context

  nouns: ['User', 'Product', 'Order'],
  // ...
})

// DB and Auth are built-in. No providers to configure.
export default () => <SaaS app={app} />
```

## Related Packages

- `@mdxui/admin` — Pure UI components
- `shadmin` — react-admin compatible alternative
- `@dotdo/types` — TypeScript types for dotdo
