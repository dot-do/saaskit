# SaaSkit

> **Idea → Profitable SaaS. Wantrepreneur → Entrepreneur.**

```tsx
import { SaaS } from 'saaskit'

export default () => (
  <SaaS name="YourIdea">
    {$ => {
      $.nouns({ Customer: { name: 'string', email: 'string' } })
      $.verbs({ Customer: { notify: $ => $.api.emails.send({ to: $.record.email }) } })
    }}
  </SaaS>
)

// That's it. You now have:
// ✓ App    → yourapp.saas.dev (React admin dashboard)
// ✓ API    → api.yourapp.saas.dev (REST + GraphQL + WebSocket)
// ✓ Site   → yourapp.io.sb (Landing page)
// ✓ Docs   → docs.yourapp.io.sb (API reference)
// ✓ CLI    → npx yourapp customers notify <id>
// ✓ MCP    → Works with Claude, ChatGPT, Cursor
// ✓ SDK    → npm install yourapp (TypeScript client)
// ✓ Zapier → Your app is an integration
// ✓ Stripe → Subscriptions flowing
```

---

## The Problem

You have an idea. You've probably had it for months.

But between your idea and a running business stands:

```
□ Authentication        □ Landing page         □ Legal entity
□ Authorization         □ Documentation        □ Business banking
□ User management       □ API reference        □ Compliance certs
□ Billing integration   □ SDK generation       □ Marketing
□ Subscription logic    □ CLI tooling          □ Sales
□ Admin dashboard       □ Webhook system       □ Support
□ CRUD interfaces       □ Rate limiting        □ Onboarding
□ Audit logging         □ Error handling       □ Analytics
```

That's 6-12 months of work. And you haven't even started on your actual idea.

**SaaSkit deletes all of it.**

---

## The Solution

Define your business in **Nouns** and **Verbs**. Everything else derives.

### Nouns: What Exists

```typescript
$.nouns({
  Customer: {
    name: 'string',
    email: 'string',
    plan: '->Plan',              // Customer owns link to Plan
    orders: ['<-Order'],         // Orders link back to Customer
  },

  Order: {
    items: ['->Product'],
    total: 'number',
    status: 'pending | paid | shipped | delivered',
    customer: '->Customer',
  },

  Product: {
    name: 'string',
    price: 'number',
    inventory: 'number',
  },
})
```

### Verbs: What Happens

```typescript
$.verbs({
  Order: {
    create: $ => $.db.Order.create($.input),

    pay: async $ => {
      await $.api.stripe.charges.create({
        amount: $.record.total,
        customer: $.record.customer.stripeId,
      })
      return $.db.Order.update($.id, { status: 'paid' })
    },

    ship: async $ => {
      const label = await $.api.shippo.labels.create({
        to: $.record.customer.address,
        parcel: $.record.items,
      })
      await $.api.emails.send({
        to: $.record.customer.email,
        subject: 'Your order has shipped!',
        body: `Track it here: ${label.tracking_url}`,
      })
      return $.db.Order.update($.id, { status: 'shipped', trackingUrl: label.tracking_url })
    },
  },

  Product: {
    restock: $ => $.db.Product.update($.id, {
      inventory: $.record.inventory + $.input.quantity
    }),
  },
})
```

### Events: React to Changes

```typescript
$.on.Order.paid(async (order, $) => {
  await $.api.slack.send('#sales', `New order: $${order.total}`)
  await $.db.Metric.increment('revenue', order.total)
})

$.on.Product.updated(async (product, $) => {
  if (product.inventory < 10) {
    await $.api.emails.send({
      to: 'inventory@yourcompany.com',
      subject: `Low stock: ${product.name}`,
    })
  }
})
```

### Schedules: Recurring Tasks

```typescript
$.every.day.at6am(async $ => {
  const unpaid = await $.db.Order.find({
    status: 'pending',
    createdAt: { $lt: $.time.daysAgo(3) },
  })

  for (const order of unpaid) {
    await $.api.emails.send({
      to: order.customer.email,
      subject: 'Complete your order',
      body: await $.ai`Write a friendly reminder about their pending order`,
    })
  }
})

$.every.Monday.at9am(async $ => {
  const revenue = await $.db.Metric.sum('revenue', { period: 'week' })
  await $.api.slack.send('#metrics', `Weekly revenue: $${revenue}`)
})
```

---

## The `$` Context

The `$` is your handle to everything. No configuration. No setup. Just use it.

```typescript
interface $ {
  // Database
  db: {
    [Noun]: {
      create, get, update, delete, list, find,
      search,           // Full-text search
      semanticSearch,   // AI-powered semantic search
    }
  }

  // AI
  ai`prompt`            // AI-generated content
  agents: {             // Named AI workers
    [name]: { run }
  }

  // Human-in-the-loop
  human: {
    approve,            // Requires human approval
    ask,                // Ask human a question
    review,             // Human reviews content
  }

  // Workflows
  send(event, data)     // Fire and forget (durable)
  do(action, data)      // Wait for result (durable)

  // 9000+ Integrations
  api: {
    emails,             // Emails.do
    texts,              // Texts.do
    calls,              // Calls.do
    stripe,             // Payments.do
    slack,              // via APIs.do
    hubspot,            // via APIs.do
    // ...etc
  }

  // Context
  input                 // Verb input payload
  record                // Current noun instance
  id                    // Record ID
  user                  // Authenticated user
  org                   // Current organization
  env                   // Environment variables
  time                  // Time helpers
}
```

---

## AI Built In

### Generative Content

```typescript
$.verbs({
  BlogPost: {
    draft: async $ => {
      const content = await $.ai`
        Write a blog post about: ${$.input.topic}

        Tone: Professional but approachable
        Length: 800-1000 words
        Include: Introduction, 3 main points, conclusion
      `
      return $.db.BlogPost.create({ ...$.input, content, status: 'draft' })
    },
  },

  Customer: {
    summarize: $ => $.ai`
      Summarize this customer's activity:

      Orders: ${$.record.orders.length}
      Total spent: $${$.record.orders.reduce((s, o) => s + o.total, 0)}
      Last order: ${$.record.orders[0]?.createdAt}

      Write 2-3 sentences highlighting key insights.
    `,
  },
})
```

### AI Agents

```typescript
$.agent('support', {
  instructions: `
    You are a helpful customer support agent.
    Be friendly and professional.
    If you can't resolve an issue, escalate to a human.
  `,
  tools: ['getCustomer', 'getOrder', 'refundOrder', 'escalate'],
})

$.verbs({
  Ticket: {
    resolve: $ => $.agents.support.run({
      ticket: $.record,
      customer: $.record.customer,
      history: $.record.messages,
    }),
  },
})
```

### Human-in-the-Loop

```typescript
$.verbs({
  Refund: {
    process: async $ => {
      // Large refunds require approval
      if ($.record.amount > 500) {
        const approved = await $.human.approve(
          `Approve refund of $${$.record.amount} for ${$.record.customer.name}?`
        )
        if (!approved) return $.db.Refund.update($.id, { status: 'rejected' })
      }

      await $.api.stripe.refunds.create({ charge: $.record.chargeId })
      return $.db.Refund.update($.id, { status: 'processed' })
    },
  },
})
```

---

## The Cascade

From `<SaaS nouns={} verbs={} />`, everything derives:

### App

Full React admin dashboard. Automatically.

```
yourapp.saas.dev
├── /dashboard          → Overview with metrics
├── /customers          → CRUD list/create/edit/show
├── /orders             → CRUD + status workflow + actions
├── /products           → CRUD + inventory management
├── /settings           → Organization settings
├── /team               → User management
├── /billing            → Stripe customer portal
├── /api-keys           → Key management
└── /webhooks           → Webhook configuration
```

### API

REST + GraphQL + WebSocket. Automatically.

```
api.yourapp.saas.dev

REST:
GET    /customers              → list
POST   /customers              → create
GET    /customers/:id          → get
PUT    /customers/:id          → update
DELETE /customers/:id          → delete
POST   /orders/:id/pay         → verb
POST   /orders/:id/ship        → verb

GraphQL:
query { customers { id name orders { total } } }
mutation { payOrder(id: "...") { status } }
subscription { orderCreated { id total } }
```

### Site

Landing page with your messaging. Automatically.

```
yourapp.io.sb
├── Hero section (from StoryBrand)
├── Features (from your Nouns + Verbs)
├── Pricing (from your Plans)
├── Testimonials (when you have them)
└── CTA → Sign up
```

### Docs

API reference + guides. Automatically.

```
docs.yourapp.io.sb
├── Getting Started
│   ├── Quick Start
│   ├── Authentication
│   └── Your First Request
├── API Reference
│   ├── Customers
│   ├── Orders
│   └── Products
├── Webhooks
│   └── Event Reference
└── SDKs
    ├── JavaScript
    ├── Python
    └── Go
```

### CLI

Command-line interface. Automatically.

```bash
$ npm install -g yourapp-cli

$ yourapp login
$ yourapp customers list
$ yourapp orders create --customer cus_123 --items prod_456
$ yourapp orders pay ord_789
$ yourapp orders ship ord_789
```

### MCP

Your SaaS works with AI tools. Automatically.

```typescript
// In Claude, ChatGPT, Cursor, etc:
"Use yourapp to list my customers"
"Create a new order for customer John Smith"
"Ship order #789"
```

### SDK

Type-safe client libraries. Automatically.

```typescript
import { YourApp } from 'yourapp'

const client = new YourApp({ apiKey: '...' })

// Typed CRUD
const customer = await client.customers.create({
  name: 'John Smith',
  email: 'john@example.com.ai',
})

// Typed verbs
await client.orders.pay('ord_123')
await client.orders.ship('ord_123')

// Real-time subscriptions
client.orders.on('created', (order) => {
  console.log('New order:', order.total)
})
```

### Zapier

Your SaaS is an integration. Automatically.

```
Your app auto-publishes to Zapier with:
├── Triggers (every event)
│   ├── Order Created
│   ├── Order Paid
│   ├── Customer Created
│   └── ...
├── Actions (every verb)
│   ├── Create Order
│   ├── Pay Order
│   ├── Ship Order
│   └── ...
└── Searches (every noun)
    ├── Find Customer
    ├── Find Order
    └── ...
```

---

## Full Example: RecruitKit

A complete SaaS for recruiters, in one file:

```tsx
import { SaaS } from 'saaskit'

export default () => (
  <SaaS name="RecruitKit">
    {$ => {
      // ════════════════════════════════════════════════════════════════
      // NOUNS: Define what exists
      // ════════════════════════════════════════════════════════════════

      $.nouns({
        Recruiter: {
          name: 'string',
          email: 'string',
          company: '->Company',
          searches: ['<-Search'],
        },

        Candidate: {
          name: 'string',
          email: 'string',
          skills: ['~>Skill'],        // Fuzzy match to skill taxonomy
          resume: 'markdown?',
          linkedin: 'url?',
          matches: ['<-Match'],
        },

        Search: {
          title: 'string',
          criteria: 'string',
          recruiter: '->Recruiter',
          matches: ['->Match'],
          status: 'active | paused | closed',
        },

        Match: {
          score: 'number',
          status: 'new | shortlisted | contacted | interviewing | rejected | hired',
          search: '->Search',
          candidate: '->Candidate',
          notes: 'markdown?',
        },
      })

      // ════════════════════════════════════════════════════════════════
      // VERBS: Define what happens
      // ════════════════════════════════════════════════════════════════

      $.verbs({
        Search: {
          create: $ => $.db.Search.create({ ...$.input, status: 'active' }),

          run: async $ => {
            // AI-powered candidate matching
            const candidates = await $.db.Candidate.semanticSearch($.record.criteria)

            const matches = await Promise.all(
              candidates.slice(0, 50).map(async candidate => {
                const score = await $.ai`
                  Score 0-100 how well this candidate matches the search criteria.
                  Return ONLY a number.

                  Search: ${$.record.title}
                  Criteria: ${$.record.criteria}

                  Candidate: ${candidate.name}
                  Skills: ${candidate.skills.join(', ')}
                  Resume: ${candidate.resume || 'Not provided'}
                `

                return $.db.Match.create({
                  search: $.record.id,
                  candidate: candidate.id,
                  score: parseInt(score),
                  status: 'new',
                })
              })
            )

            await $.send('Search.completed', {
              search: $.record,
              matchCount: matches.length,
            })

            return matches
          },

          pause: $ => $.db.Search.update($.id, { status: 'paused' }),
          close: $ => $.db.Search.update($.id, { status: 'closed' }),
        },

        Match: {
          shortlist: $ => $.db.Match.update($.id, { status: 'shortlisted' }),

          contact: async $ => {
            const candidate = await $.record.candidate
            const search = await $.record.search

            // AI writes personalized outreach
            const email = await $.ai`
              Write a recruiting outreach email.

              Candidate: ${candidate.name}
              Role: ${search.title}
              Their skills: ${candidate.skills.join(', ')}

              Be warm and professional. Mention specific skills.
              Keep it under 200 words.
            `

            await $.api.emails.send({
              to: candidate.email,
              subject: `Exciting opportunity: ${search.title}`,
              body: email,
            })

            return $.db.Match.update($.id, { status: 'contacted' })
          },

          schedule: async $ => {
            // Human picks interview time
            const time = await $.human.ask(
              `When should we schedule the interview with ${$.record.candidate.name}?`
            )

            await $.api.calendar.create({
              title: `Interview: ${$.record.candidate.name}`,
              time,
              attendees: [$.record.candidate.email, $.record.search.recruiter.email],
            })

            return $.db.Match.update($.id, { status: 'interviewing' })
          },

          reject: async $ => {
            // Requires confirmation for candidates in interview stage
            if ($.record.status === 'interviewing') {
              const confirmed = await $.human.approve(
                `Reject ${$.record.candidate.name}? They are in the interview stage.`
              )
              if (!confirmed) return
            }

            await $.api.emails.send({
              to: $.record.candidate.email,
              subject: `Update on your application`,
              body: await $.ai`
                Write a kind rejection email for ${$.record.candidate.name}
                who applied for ${$.record.search.title}.
                Be respectful and encouraging.
              `,
            })

            return $.db.Match.update($.id, { status: 'rejected' })
          },

          hire: async $ => {
            await $.db.Match.update($.id, { status: 'hired' })
            await $.db.Search.update($.record.search.id, { status: 'closed' })
            await $.db.Metric.increment('hires')

            // Celebrate!
            await $.api.slack.send('#wins', `
              🎉 ${$.record.candidate.name} hired for ${$.record.search.title}!
            `)
          },
        },

        Candidate: {
          enrich: async $ => {
            // Pull data from Apollo
            const data = await $.api.apollo.people.enrich({
              email: $.record.email,
            })

            return $.db.Candidate.update($.id, {
              name: data.name || $.record.name,
              linkedin: data.linkedin_url || $.record.linkedin,
              skills: data.skills || $.record.skills,
            })
          },

          import: async $ => {
            // Import from LinkedIn URL
            const data = await $.api.proxycurl.linkedin.get({
              url: $.input.linkedinUrl,
            })

            return $.db.Candidate.create({
              name: data.full_name,
              email: data.email,
              linkedin: $.input.linkedinUrl,
              skills: data.skills?.map(s => s.name) || [],
              resume: data.summary,
            })
          },
        },
      })

      // ════════════════════════════════════════════════════════════════
      // EVENTS: React to changes
      // ════════════════════════════════════════════════════════════════

      $.on.Match.created(async (match, $) => {
        if (match.score >= 80) {
          await $.api.emails.send({
            to: match.search.recruiter.email,
            subject: `High-quality match: ${match.candidate.name} (${match.score}/100)`,
            body: `${match.candidate.name} scored ${match.score}/100 for "${match.search.title}"`,
          })
        }
      })

      $.on.Search.completed(async ({ search, matchCount }, $) => {
        await $.api.emails.send({
          to: search.recruiter.email,
          subject: `Search complete: ${matchCount} candidates found`,
          body: `Your search "${search.title}" found ${matchCount} candidates. Review them now.`,
        })
      })

      $.on.Match.hired(async (match, $) => {
        // Send offer letter
        await $.api.emails.send({
          to: match.candidate.email,
          subject: `Offer Letter: ${match.search.title}`,
          body: await $.ai`
            Write a professional offer letter for ${match.candidate.name}
            for the role of ${match.search.title}.
          `,
        })
      })

      // ════════════════════════════════════════════════════════════════
      // SCHEDULES: Recurring tasks
      // ════════════════════════════════════════════════════════════════

      $.every.day.at9am(async $ => {
        // Remind recruiters about stale matches
        const stale = await $.db.Match.find({
          status: 'new',
          createdAt: { $lt: $.time.daysAgo(7) },
        })

        const byRecruiter = groupBy(stale, m => m.search.recruiter.id)

        for (const [recruiterId, matches] of Object.entries(byRecruiter)) {
          const recruiter = await $.db.Recruiter.get(recruiterId)
          await $.api.emails.send({
            to: recruiter.email,
            subject: `${matches.length} candidates awaiting review`,
            body: `You have ${matches.length} candidates that haven't been reviewed in 7+ days.`,
          })
        }
      })

      $.every.Monday.at9am(async $ => {
        // Weekly metrics
        const hired = await $.db.Match.count({
          status: 'hired',
          updatedAt: { $gte: $.time.daysAgo(7) },
        })
        const contacted = await $.db.Match.count({
          status: 'contacted',
          updatedAt: { $gte: $.time.daysAgo(7) },
        })

        await $.api.slack.send('#metrics', `
          📊 Weekly Recruiting Report
          • Hired: ${hired}
          • Contacted: ${contacted}
          • Conversion: ${((hired / contacted) * 100).toFixed(1)}%
        `)
      })

      // ════════════════════════════════════════════════════════════════
      // AGENTS: AI workers
      // ════════════════════════════════════════════════════════════════

      $.agent('sourcer', {
        instructions: `
          You are a technical recruiter specialized in sourcing candidates.

          Your job:
          1. Understand the role requirements
          2. Find candidates that match
          3. Score candidates based on fit
          4. Explain why each candidate is a good match

          Be thorough but prioritize quality over quantity.
          A great match is better than 10 mediocre ones.
        `,
        tools: ['searchCandidates', 'enrichCandidate', 'scoreMatch'],
      })

      $.agent('outreach', {
        instructions: `
          You are a recruiting outreach specialist.

          Your job:
          1. Write personalized emails to candidates
          2. Reference their specific skills and experience
          3. Explain why this role is a good fit for them
          4. Be warm but professional

          Never be generic. Every email should feel personal.
        `,
        tools: ['getCandidate', 'getSearch', 'sendEmail'],
      })

      // ════════════════════════════════════════════════════════════════
      // INTEGRATIONS
      // ════════════════════════════════════════════════════════════════

      $.integrate('apollo', { apiKey: $.env.APOLLO_API_KEY })
      $.integrate('proxycurl', { apiKey: $.env.PROXYCURL_API_KEY })
      $.integrate('slack', { webhook: $.env.SLACK_WEBHOOK })
      $.integrate('calendar', { provider: 'google', oauth: true })
    }}
  </SaaS>
)
```

**That's a complete recruiting SaaS.** App, API, landing page, docs, CLI, SDK, webhooks, billing — all derived from 250 lines of business logic.

---

## The Ecosystem

SaaSkit is part of Startups.Studio:

```
Startups.Studio
├── Startups.Studio/StartupBuilder   → Build startups in minutes
├── Startups.Studio/ServiceBuilder   → AI-delivered Services-as-Software
└── Startups.Studio/SalesBuilder     → Mark (Marketing) + Sally (Sales)

SaaSkit (npm: saaskit)
├── SaaS.Dev         → SaaSkit-as-a-Service (managed hosting)
└── SaaS.Studio      → Manage your SaaS (MRR, customers, revenue)

Services.Studio      → Managed Services-as-Software

Platform.do          → The PaaS for Business-as-Code
├── Agents.do        → AI workers with tools
├── Database.do      → Schema-first database
├── Functions.do     → Serverless execution
├── Workflows.do     → Durable state machines
├── Payments.do      → Stripe Connect
├── Bank.Accounts.do → Business banking + cards
├── Emails.do        → Transactional + marketing
├── Texts.do         → SMS
├── Calls.do         → Voice + AI receptionist
└── ...              → 20+ more primitives

Builder.Domains
├── *.io.sb          → Free app domains
├── *.app.net.ai     → Free app domains
├── *.api.net.ai     → Free API domains
└── Any .tld         → Register any domain
```

---

## Entry Points

| Where | What |
|-------|------|
| **Startups.New** | "Vibe code" your startup. AI conversation → running business in minutes. |
| **Startup.Games** | Gamify your journey from idea to one-person unicorn. |
| **SaaS.Dev** | Deploy your SaaSkit app. Managed hosting. |
| **SaaS.Studio** | Manage your SaaS. MRR, ARR, churn, customers, revenue. |

---

## Requirements

### Runtime Environment

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Node.js** | `>=18.0.0` | Required for native fetch, ES modules |
| **React** | `^18.0.0` or `^19.0.0` | Peer dependency for UI components |

### Environment Variables

SaaSkit uses environment variables for authentication and configuration:

| Variable | Required | Description |
|----------|----------|-------------|
| `SAASKIT_API_TOKEN` | **Yes** (production) | API token for Platform.do services (Emails.do, Texts.do, etc.). Development mode uses a fallback token with a console warning. |
| `SAAS_API_KEY` | For deployment | Required when running `saaskit deploy` to authenticate with SaaS.Dev hosting. |
| `NODE_ENV` | No | Set to `test` to suppress development warnings. |

**Integration-specific variables** (optional, used via `$.env`):
- `STRIPE_API_KEY` / `STRIPE_SECRET_KEY` - For Stripe payments
- `APOLLO_API_KEY` - For Apollo enrichment
- `SLACK_WEBHOOK` - For Slack notifications
- Any custom variables your app needs via `$.env.YOUR_VAR`

### Platform Services

SaaSkit connects to the **Platform.do** ecosystem for backend services:

| Service | URL | Purpose |
|---------|-----|---------|
| Emails.do | `emails.do` | Transactional & marketing email |
| Texts.do | `texts.do` | SMS messaging |
| Calls.do | `calls.do` | Voice calls & AI receptionist |
| Payments.do | `payments.do` | Stripe integration |
| APIs.do | `apis.do` | 9000+ third-party integrations |

**Note:** These services require a `SAASKIT_API_TOKEN`. During development, a fallback token is used automatically.

### Optional Dependencies

```json
{
  "optionalDependencies": {
    "@dotdo/react": "^0.1.0"  // Enhanced React integration
  }
}
```

### Development Setup

1. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

2. Add your API token:
   ```bash
   # .env
   SAASKIT_API_TOKEN=your-token-here
   ```

3. For deployment, also add:
   ```bash
   SAAS_API_KEY=your-deployment-key
   ```

---

## Get Started

### Install

```bash
npm install saaskit
```

### Create

```tsx
// app.tsx
import { SaaS } from 'saaskit'

export default () => (
  <SaaS name="MyApp">
    {$ => {
      $.nouns({
        Todo: { title: 'string', done: 'boolean' },
      })
      $.verbs({
        Todo: {
          create: $ => $.db.Todo.create($.input),
          complete: $ => $.db.Todo.update($.id, { done: true }),
        },
      })
    }}
  </SaaS>
)
```

### Deploy

```bash
npx saaskit deploy
```

### Done

Your SaaS is live at `myapp.saas.dev`.

---

## The Promise

You have an idea. Stop letting infrastructure stand between you and your dream.

Define your business in Nouns and Verbs. We generate everything else.

**Idea → Profitable SaaS. Wantrepreneur → Entrepreneur.**

---

<p align="center">
  <a href="https://startups.new">Start Building →</a>
</p>

---

## Architecture

SaaSkit sits at the **generation layer** - it takes DSL definitions (Nouns + Verbs) and generates code that uses mdxui components.

```
┌─────────────────────────────────────────────────────────────────┐
│                      mdxui (interfaces)                          │
│   SiteComponents, AppComponents, AdminComponents, DataProvider   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ implements
┌─────────────────────────────────────────────────────────────────┐
│             @mdxui/neo + @mdxui/cockpit (templates)              │
│   Site sections, App dashboards, Auth flows                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓ generates to
┌─────────────────────────────────────────────────────────────────┐
│               ★ saaskit (generation) ← YOU ARE HERE              │
│   DSL (Nouns + Verbs) → App, API, Site, Docs, CLI, SDK, MCP      │
│   Generates code that uses @mdxui components                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓ optionally uses
┌─────────────────────────────────────────────────────────────────┐
│                    @dotdo/react (platform)                       │
│   TanStack DB binding for real-time data sync                    │
└─────────────────────────────────────────────────────────────────┘
```

### What SaaSkit Generates

| Output | Using |
|--------|-------|
| **App** | React components (raw + @mdxui/cockpit) |
| **Site** | @mdxui/neo section components |
| **API** | Self-contained REST/GraphQL/WebSocket |
| **Docs** | MDX documentation |
| **CLI** | Command-line interface |
| **SDK** | TypeScript/Python/Go clients |
| **MCP** | Model Context Protocol server |

### Key Principle

SaaSkit is **generation, not runtime**. It produces code that uses mdxui abstractions. The generated code is self-contained and can be ejected.

When `@dotdo/react` is available, SaaSkit wires generated code to real backends with durable workflows.
