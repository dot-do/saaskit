# SaaSkit Design Document

> **Idea → Profitable SaaS. Wantrepreneur → Entrepreneur.**

## Executive Summary

SaaSkit is Business-as-Code. Define your business in Nouns and Verbs, and everything else derives: App, API, Site, Blog, Docs, CLI, MCP, SDK. Plus legal entity, banking, compliance, and AI agents ready to sell.

SaaSkit is the nucleus of the Startups.Studio ecosystem — a complete platform for building profitable SaaS businesses in minutes, not months.

---

## Table of Contents

1. [The Hero's Journey](#the-heros-journey)
2. [Core Abstraction: Nouns + Verbs](#core-abstraction-nouns--verbs)
3. [The $ Context](#the--context)
4. [The Cascade](#the-cascade)
5. [The Ecosystem](#the-ecosystem)
6. [Platform.do Primitives](#platformdo-primitives)
7. [Code Examples](#code-examples)

---

## The Hero's Journey

### The Hero

You have an idea. Maybe it's been simmering for months. Maybe it hit you in the shower this morning. You see a problem that needs solving, a gap in the market, an opportunity others have missed.

You're a **wantrepreneur** — and you're not alone. Millions of people have ideas. But the gap between "I have an idea" and "I run a business" feels impossibly wide.

You might be:
- **The Side-Hustler**: Has a day job, builds nights/weekends. Can't afford 6 months to launch.
- **The Domain Expert**: Knows an industry deeply. Sees the opportunity but can't build the solution.
- **The Builder-Turned-Founder**: Can code, has shipped products. Building apps ≠ building businesses.

It doesn't matter which you are. The transformation is the same:

**Wantrepreneur → Entrepreneur**

Not "someone who built an app." Not "someone with a side project." A real entrepreneur running a **profitable** business with real customers paying real money.

### The Problem

**The External Problem** (the tangible obstacle)

Building a SaaS requires a hundred things that have nothing to do with your idea:
- Authentication, authorization, user management
- Billing, subscriptions, pricing tiers, invoices
- Admin dashboards, CRUD interfaces, audit logs
- Landing pages, documentation, API references
- Legal entity, bank accounts, compliance certifications
- Marketing, sales, customer acquisition

Each one is a rabbit hole. Each one takes weeks. String them together and you're looking at 6-12 months before your first customer — if you even make it that far.

**The Internal Problem** (how it makes them feel)

You feel like a fraud. You tell people you're "working on something" but months pass with nothing to show. The gap between your vision and your reality breeds doubt. *Maybe I'm not cut out for this. Maybe I should just stick with my day job.*

The worst part? You're not even working on your idea. You're working on the *infrastructure* to eventually work on your idea.

**The Philosophical Problem** (why it's wrong)

It shouldn't be this hard. We live in an age of AI, cloud computing, and infinite leverage. The tools exist to build anything. Yet somehow, starting a business still requires the same months of grunt work it did a decade ago.

**The Villain**

Complexity. Not any single tool or competitor — but the accumulated weight of a thousand decisions, integrations, and yak-shaves standing between you and your dream.

### The Guide

**Empathy** (we understand)

We've been there. We've started the projects that never shipped. We've drowned in authentication flows when we should have been talking to customers. We've watched our motivation die in the gap between idea and execution.

**Authority** (we can help)

SaaSkit is built on Startups.Studio — a platform that has systematically deconstructed what it takes to launch a business and rebuilt it as a unified system:

- **Startups.Studio/StartupBuilder** — AI advisors that help you clarify your ICP, positioning, and hypothesis before you write a line of code
- **Startups.Studio/ServiceBuilder** — Turn expertise into AI-delivered Services-as-Software
- **Startups.Studio/SalesBuilder** — Mark (Marketing) and Sally (Sales), AI agents ready to drive demand from day one

The platform handles everything that isn't your unique insight:
- Legal incorporation and registered agent
- Business banking, cards, automatic accounting
- SOC2 and HIPAA compliance (free — because 100% runs on our unified platform)
- 9,000+ pre-integrated triggers, searches, and actions
- Free domains (*.io.sb, *.app.net.ai, *.hq.com.ai)

We didn't just build a framework. We built the entire **Business-as-Code** operating system.

### The Plan

**Three Steps to Your SaaS:**

**Step 1: Define**

Go to Startups.New and describe your idea. Our AI advisors have a conversation. They help you identify your ideal customer, articulate the problem you're solving, discover your unique founder advantage, and crystallize a testable hypothesis.

By the end, you have clarity — a **Noun + Verb schema** that captures exactly what your business does.

**Step 2: Generate**

One line. Everything cascades.

```tsx
export default () => <SaaS name="YourApp" nouns={nouns} verbs={verbs} />
```

From your Nouns and Verbs, SaaSkit derives:
- **App** — Full admin dashboard with auth, CRUD, real-time updates
- **API** — REST + GraphQL, auto-documented, rate-limited
- **Site** — Landing page with your StoryBrand messaging
- **Docs** — API reference, guides, SDK examples
- **CLI** — Command-line interface for power users
- **MCP** — Model Context Protocol server (your SaaS works with AI tools)
- **SDK** — Type-safe client libraries in multiple languages

Plus the business infrastructure:
- Legal entity incorporated
- Business bank account + cards
- Domain registered (free *.io.sb or bring your own)
- Mark & Sally standing by

**Step 3: Validate**

Your hypothesis is testable. Test it.

Launch paid ads and get signal in 24 hours. Or go organic — content, social, cold outbound. The platform tracks everything. You learn what works, what doesn't, and you iterate.

### The Transformation

**Before:** *I have an idea.*
**After:** *I run a PROFITABLE SaaS business.*

---

## Core Abstraction: Nouns + Verbs

Everything is **Nouns + Verbs**. This is Business-as-Code.

### Nouns: Your Domain Entities

Nouns are your domain model. They define WHAT exists in your business.

```typescript
nouns: {
  Recruiter: {
    name: 'string',
    email: 'string',
    company: '->Company',        // forward reference: Recruiter owns link
    searches: ['<-Search'],      // backward reference: Search owns link
  },

  Candidate: {
    name: 'string',
    email: 'string',
    skills: ['~>Skill'],         // fuzzy match to taxonomy
    resume: 'markdown?',
    matches: ['<-Match'],
  },

  Search: {
    title: 'string',
    criteria: 'string',
    recruiter: '->Recruiter',
    matches: ['->Match'],
  },

  Match: {
    score: 'number',
    status: 'new | shortlisted | contacted | rejected | hired',
    search: '->Search',
    candidate: '->Candidate',
  },
}
```

### Relationship Operators

| Operator | Direction | Mode | Behavior |
|----------|-----------|------|----------|
| `->` | Forward | Exact | Insert new, link TO it |
| `~>` | Forward | Fuzzy | Semantic search existing, create if no match |
| `<-` | Backward | Exact | Find existing that link TO this |
| `<~` | Backward | Fuzzy | Semantic search for related |

### Verbs: Your Domain Actions

Verbs are functions. They define WHAT your business DOES.

```typescript
verbs: {
  Search: {
    create: $ => $.db.Search.create($.input),

    run: async $ => {
      const candidates = await $.db.Candidate.semanticSearch($.record.criteria)
      return Promise.all(candidates.map(async c => {
        const score = await $.ai`Score 0-100: ${c.name} for ${$.record.criteria}`
        return $.db.Match.create({
          search: $.record.id,
          candidate: c.id,
          score: parseInt(score),
          status: 'new',
        })
      }))
    },
  },

  Match: {
    shortlist: $ => $.db.Match.update($.id, { status: 'shortlisted' }),

    contact: async $ => {
      const email = await $.ai`
        Write recruiting email to ${$.record.candidate.name}
        for: ${$.record.search.title}
      `
      await $.api.emails.send({
        to: $.record.candidate.email,
        subject: `Opportunity: ${$.record.search.title}`,
        body: email,
      })
      return $.db.Match.update($.id, { status: 'contacted' })
    },

    reject: async $ => {
      if (await $.human.approve(`Reject ${$.record.candidate.name}?`)) {
        return $.db.Match.update($.id, { status: 'rejected' })
      }
    },

    hire: async $ => {
      await $.db.Match.update($.id, { status: 'hired' })
      await $.db.Metric.increment('hires')
    },
  },
}
```

### Verb Types

The type of verb is determined by what you call on `$`:

| Call | Type | Description |
|------|------|-------------|
| `$.db.*` | Code | Deterministic database operations |
| `$.ai\`...\`` | Generative | AI-generated content |
| `$.agents.*.run()` | Agentic | AI agent with tools |
| `$.human.approve()` | Human | Requires human approval |
| `$.workflows.*.start()` | Workflow | Durable state machine |
| `$.api.*` | Integration | External service call |

### Verb Anatomy

Every verb has a complete action signature:

```typescript
// Verb: 'create'
{
  action: 'create',        // imperative
  activity: 'creating',    // present participle
  event: 'created',        // past (for events)
  reverse: 'createdBy',    // inverse relationship
  inverse: 'delete',       // opposite action
}

// Enables semantic triples:
// Recruiter → creates → Search
// Search → createdBy → Recruiter
```

---

## The $ Context

The `$` is your handle to the entire Platform.do infrastructure.

```typescript
interface $ {
  // ─────────────────────────────────────────────────────────────────
  // DATABASE (Database.do)
  // ─────────────────────────────────────────────────────────────────
  db: {
    [Noun: string]: {
      create: (input: Input<T>) => Promise<T>
      get: (id: string) => Promise<T>
      update: (id: string, input: Partial<Input<T>>) => Promise<T>
      delete: (id: string) => Promise<void>
      list: (options?: ListOptions) => Promise<T[]>
      find: (query: Query) => Promise<T[]>
      search: (text: string) => Promise<T[]>
      semanticSearch: (text: string) => Promise<T[]>
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // AI (Functions.do + Agents.do)
  // ─────────────────────────────────────────────────────────────────
  ai: TemplateLiteral                    // $.ai`prompt` → string
  agents: {
    [name: string]: {
      run: (input: unknown) => Promise<unknown>
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // HUMAN-IN-THE-LOOP
  // ─────────────────────────────────────────────────────────────────
  human: {
    approve: (request: string) => Promise<boolean>
    ask: (question: string) => Promise<string>
    review: (content: string) => Promise<string>
  }

  // ─────────────────────────────────────────────────────────────────
  // WORKFLOWS (Workflows.do)
  // ─────────────────────────────────────────────────────────────────
  send: (event: string, data: unknown) => Promise<void>   // fire and forget
  do: (action: string, data: unknown) => Promise<unknown> // wait for result
  workflows: {
    [name: string]: {
      start: (input: unknown) => Promise<string>  // returns workflow ID
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // INTEGRATIONS (APIs.do + Communication Primitives)
  // ─────────────────────────────────────────────────────────────────
  api: {
    // Communication
    emails: EmailsAPI        // Emails.do
    texts: TextsAPI          // Texts.do
    calls: CallsAPI          // Calls.do

    // Payments
    stripe: StripeAPI        // Payments.do

    // 9000+ integrations via APIs.do
    slack: SlackAPI
    apollo: ApolloAPI
    hubspot: HubspotAPI
    // ...etc
  }

  // ─────────────────────────────────────────────────────────────────
  // CONTEXT
  // ─────────────────────────────────────────────────────────────────
  input: Record<string, unknown>   // verb input payload
  record: T                         // current noun instance
  id: string                        // record ID
  user: User                        // authenticated user
  org: Organization                 // current organization
  env: Record<string, string>       // environment variables

  // ─────────────────────────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────────────────────────
  time: {
    now: () => Date
    daysAgo: (n: number) => Date
    hoursAgo: (n: number) => Date
  }
  crypto: {
    sign: (data: unknown, secret: string) => string
    verify: (signature: string, data: unknown, secret: string) => boolean
  }
  log: (message: string, data?: unknown) => void
}
```

---

## The Cascade

From one definition, everything derives:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    <SaaS nouns={...} verbs={...} />                         │
│                                                                              │
│                            Source of Truth                                   │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      │  DERIVED
                                      ▼
┌──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────────────┐
│ App  │ API  │ Site │ Blog │ Docs │ CLI  │ MCP  │ SDK  │Zapier│   Stripe     │
└──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────────────┘
   │      │      │      │      │      │      │      │      │          │
   │      │      │      │      │      │      │      │      │          │
   ▼      ▼      ▼      ▼      ▼      ▼      ▼      ▼      ▼          ▼
 React  REST   Landing  SEO   API   Shell  AI    TS/Py  Your      Products
 Admin  +GQL   Page    Content Ref  Cmds   Tools  /Go   SaaS is   Prices
 Dash   +WS                                       Client an        Subs
                                                        integration
```

### What Gets Generated

#### App (Apps.do)
- Full React admin dashboard
- Authentication + authorization
- CRUD for every Noun
- Action buttons for every Verb
- Real-time updates via WebSocket
- Role-based access control

#### API (APIs.do)
- REST endpoints for every Noun
- GraphQL schema derived from Nouns
- WebSocket subscriptions for events
- Rate limiting + API key auth
- OpenAPI spec auto-generated

#### Site (Sites.do)
- Landing page with StoryBrand messaging
- Hero, Features, Pricing sections
- Powered by @mdxui/beacon components

#### Docs
- API reference (every endpoint documented)
- SDK quickstart guides
- Webhook event reference
- Powered by Fumadocs

#### CLI
- `yourapp <noun> <verb>` pattern
- `yourapp matches list --search <id>`
- `yourapp searches run <id>`

#### MCP (Model Context Protocol)
- Your SaaS works with Claude, ChatGPT, Cursor
- Tools derived from Verbs
- Resources derived from Nouns

#### SDK
- Type-safe clients in TypeScript, Python, Go
- Auto-published to npm, PyPI, Go modules

#### Zapier
- Your SaaS auto-publishes as a Zapier app
- Triggers: every `$.on.*` event
- Actions: every Verb
- Searches: every Noun list/find

#### Stripe
- Products and Prices from your Plans
- Checkout flows
- Customer portal
- Subscription management
- Usage-based billing

---

## The Ecosystem

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Startups.Studio                                    │
│                      "Build your startup in minutes"                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Startups.Studio/StartupBuilder        Startups.Studio/ServiceBuilder       │
│  npm: startup-builder                  npm: service-builder                 │
│                                                                              │
│  Build startups in minutes             Build AI-delivered                   │
│  (SaaS startups use SaaSkit)           Services-as-Software                 │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Startups.Studio/SalesBuilder                                               │
│  npm: sales-builder                                                         │
│                                                                              │
│  Mark (Marketing) + Sally (Sales)                                           │
│  AI agents ready to drive demand                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
           │                                     │
           ▼                                     ▼
┌─────────────────────────┐         ┌─────────────────────────┐
│       SaaSkit           │         │    Services.Studio      │
│    npm: saaskit         │         │                         │
│                         │         │    Managed offer for    │
│    <SaaS                │         │    AI-delivered         │
│      nouns={...}        │         │    Services-as-Software │
│      verbs={...}        │         │                         │
│    />                   │         │                         │
└───────────┬─────────────┘         └─────────────────────────┘
            │
            ├─────────────────────────────┐
            ▼                             ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│       SaaS.Dev          │  │      SaaS.Studio        │
│                         │  │                         │
│  SaaSkit-as-a-Service   │  │  Management console     │
│  Managed hosting        │  │  for YOUR SaaS          │
│                         │  │                         │
│  yourapp.saas.dev       │  │  MRR, ARR, Churn        │
│  or custom domain       │  │  Customers, Revenue     │
│                         │  │  Usage, Team, Billing   │
└─────────────────────────┘  └─────────────────────────┘
```

### Entry Points

| Entry Point | Purpose |
|-------------|---------|
| **Startups.New** | "Vibe code" your startup in minutes. AI conversation → running business. |
| **Startup.Games** | Gamify your journey from idea to one-person unicorn. |

### Managed Platforms

| Framework | Managed Hosting | Management Console |
|-----------|-----------------|-------------------|
| SaaSkit | SaaS.Dev | SaaS.Studio |
| ServiceBuilder | Services.Studio | — |

### Domain Patterns

**Free subdomains:**
- `*.io.sb` — Apps
- `*.hq.sb` — HQs
- `*.studio.sb` — Studios
- `*.app.net.ai` — Apps
- `*.api.net.ai` — APIs
- `*.hq.com.ai` — HQs

**Or register any .tld via Builder.Domains**

---

## Platform.do Primitives

Platform.do is the PaaS for Business-as-Code. Every primitive is a `.do` domain.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Platform.do                                       │
│                     The PaaS for Business-as-Code                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  COMPUTE               COMMUNICATION         BUSINESS          DELIVERY     │
│  ───────────────────   ──────────────────   ────────────────   ──────────── │
│  Agents.do             Emails.do            Payments.do        Sites.do     │
│  Functions.do          Texts.do             Bank.Accounts.do   Apps.do      │
│  Workflows.do          Calls.do             Mailing.Address.do APIs.do      │
│  Database.do           Phone.Number.do      Services.do        Startups.do  │
│                        Domain.Name.do                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Compute Primitives

| Primitive | What It Does |
|-----------|--------------|
| **Agents.do** | AI workers with instructions + tools |
| **Functions.do** | Serverless execution (code, generative, agentic, human) |
| **Workflows.do** | Durable state machines, scheduled tasks |
| **Database.do** | Schema-first database with relationships |

### Communication Primitives

| Primitive | What It Does |
|-----------|--------------|
| **Emails.do** | Transactional + marketing email |
| **Texts.do** | SMS messaging |
| **Calls.do** | Voice calls + AI receptionist |
| **Phone.Number.do** | Provision numbers for your business |
| **Domain.Name.do** | Free subdomains or any .tld |

### Business Primitives

| Primitive | What It Does |
|-----------|--------------|
| **Payments.do** | Stripe Connect integration |
| **Bank.Accounts.do** | Business banking + virtual/physical cards |
| **Mailing.Address.do** | Registered agent + business address |
| **Services.do** | AI-delivered professional services |

### Delivery Primitives

| Primitive | What It Does |
|-----------|--------------|
| **Sites.do** | Marketing landing pages |
| **Apps.do** | React admin dashboards |
| **APIs.do** | REST + GraphQL + WebSocket |
| **Startups.do** | Incorporate + configure entire business stack |

### Compliance

Because 100% of Business-as-Code runs on Platform.do:
- **SOC2** — Free (rubber stamp)
- **HIPAA** — Free (rubber stamp)

---

## Code Examples

### Minimal SaaS

```tsx
import { SaaS } from 'saaskit'

export default () => (
  <SaaS name="TodoApp">
    {$ => {
      $.nouns({
        Todo: {
          title: 'string',
          completed: 'boolean',
          user: '->User',
        },
      })

      $.verbs({
        Todo: {
          create: $ => $.db.Todo.create($.input),
          complete: $ => $.db.Todo.update($.id, { completed: true }),
          delete: $ => $.db.Todo.delete($.id),
        },
      })
    }}
  </SaaS>
)
```

### Full SaaS with AI

```tsx
import { SaaS } from 'saaskit'

export default () => (
  <SaaS name="RecruitKit">
    {$ => {
      // ─────────────────────────────────────────────────────────────
      // NOUNS
      // ─────────────────────────────────────────────────────────────
      $.nouns({
        Recruiter: {
          name: 'string',
          company: '->Company',
          searches: ['<-Search'],
        },
        Candidate: {
          name: 'string',
          email: 'string',
          skills: ['~>Skill'],
          resume: 'markdown?',
          matches: ['<-Match'],
        },
        Search: {
          title: 'string',
          criteria: 'string',
          recruiter: '->Recruiter',
          matches: ['->Match'],
        },
        Match: {
          score: 'number',
          status: 'new | shortlisted | contacted | rejected | hired',
          search: '->Search',
          candidate: '->Candidate',
        },
      })

      // ─────────────────────────────────────────────────────────────
      // VERBS
      // ─────────────────────────────────────────────────────────────
      $.verbs({
        Search: {
          create: $ => $.db.Search.create($.input),

          run: async $ => {
            const candidates = await $.db.Candidate.semanticSearch($.record.criteria)
            return Promise.all(candidates.map(async c => {
              const score = await $.ai`
                Score 0-100 how well this candidate matches:

                Candidate: ${c.name}
                Skills: ${c.skills.join(', ')}
                Resume: ${c.resume}

                Criteria: ${$.record.criteria}
              `
              return $.db.Match.create({
                search: $.record.id,
                candidate: c.id,
                score: parseInt(score),
                status: 'new',
              })
            }))
          },
        },

        Match: {
          shortlist: $ => $.db.Match.update($.id, { status: 'shortlisted' }),

          contact: async $ => {
            const email = await $.ai`
              Write a recruiting email to ${$.record.candidate.name}
              for the role: ${$.record.search.title}

              Be professional but warm. Mention their skills:
              ${$.record.candidate.skills.join(', ')}
            `

            await $.api.emails.send({
              to: $.record.candidate.email,
              subject: `Opportunity: ${$.record.search.title}`,
              body: email,
            })

            return $.db.Match.update($.id, { status: 'contacted' })
          },

          reject: async $ => {
            if (await $.human.approve(`Reject ${$.record.candidate.name}?`)) {
              return $.db.Match.update($.id, { status: 'rejected' })
            }
          },

          hire: async $ => {
            await $.db.Match.update($.id, { status: 'hired' })
            await $.db.Metric.increment('hires')
            await $.api.slack.send('#wins', `Hired ${$.record.candidate.name}!`)
          },
        },

        Candidate: {
          enrich: async $ => {
            const data = await $.api.apollo.people.enrich({
              email: $.record.email
            })
            return $.db.Candidate.update($.id, {
              name: data.name || $.record.name,
              skills: data.skills || $.record.skills,
            })
          },

          summarize: $ => $.ai`
            Write a 2-paragraph summary of this candidate:

            Name: ${$.record.name}
            Skills: ${$.record.skills.join(', ')}
            Resume: ${$.record.resume}
          `,
        },
      })

      // ─────────────────────────────────────────────────────────────
      // EVENTS
      // ─────────────────────────────────────────────────────────────
      $.on.Match.created(async (match, $) => {
        await $.api.emails.send({
          to: match.search.recruiter.email,
          subject: `New match: ${match.candidate.name}`,
          body: `Score: ${match.score}`,
        })
      })

      $.on.Match.hired(async (match, $) => {
        await $.api.emails.send({
          to: match.candidate.email,
          subject: 'Congratulations!',
          body: await $.ai`Write a warm congratulations email`,
        })
      })

      // ─────────────────────────────────────────────────────────────
      // SCHEDULES
      // ─────────────────────────────────────────────────────────────
      $.every.day.at9am(async $ => {
        const stale = await $.db.Match.find({
          status: 'new',
          createdAt: { $lt: $.time.daysAgo(7) },
        })

        for (const match of stale) {
          await $.api.emails.send({
            to: match.search.recruiter.email,
            subject: `Reminder: Review ${match.candidate.name}`,
          })
        }
      })

      $.every.Monday.at9am(async $ => {
        const stats = await $.db.Match.aggregate({
          hired: { status: 'hired' },
          rejected: { status: 'rejected' },
          pending: { status: 'new' },
        })

        await $.api.slack.send('#metrics', `
          Weekly Report:
          - Hired: ${stats.hired}
          - Rejected: ${stats.rejected}
          - Pending: ${stats.pending}
        `)
      })

      // ─────────────────────────────────────────────────────────────
      // AGENTS
      // ─────────────────────────────────────────────────────────────
      $.agent('sourcer', {
        instructions: `
          You are a technical recruiter. Find candidates that match search criteria.
          Be thorough but prioritize quality over quantity.
          Always explain why a candidate is a good match.
        `,
        tools: ['searchCandidates', 'scoreMatch', 'enrichProfile'],
      })

      $.agent('outreach', {
        instructions: `
          Write personalized recruiting emails.
          Be warm but professional.
          Reference specific skills and experience.
        `,
        tools: ['getCandidate', 'getSearch', 'sendEmail'],
      })

      // ─────────────────────────────────────────────────────────────
      // INTEGRATIONS
      // ─────────────────────────────────────────────────────────────
      $.integrate('apollo', { apiKey: $.env.APOLLO_API_KEY })
      $.integrate('linkedin', { oauth: true })
      $.integrate('slack', { webhook: $.env.SLACK_WEBHOOK })
    }}
  </SaaS>
)
```

---

## The Promise

> Define your business in Nouns and Verbs.
> We generate everything else — App, API, Site, Blog, Docs, CLI, MCP, SDK.
> Plus legal entity, banking, compliance, and AI agents ready to sell.
>
> **Idea → Profitable SaaS. Wantrepreneur → Entrepreneur.**
