/**
 * Example: CRM SaaS App
 *
 * Demonstrates the headless SaaS builder pattern.
 */

import { SaaS } from '../src'

export const CRM = SaaS('crm', {
  // ============================================================================
  // Contact - a person
  // ============================================================================
  Contact: {
    // Properties (strings = type definitions)
    email: 'string!', // required
    name: 'string',
    phone: 'string',
    title: 'string',

    // Relations
    company: '-> Company', // forward relation to Company
    deals: '<- Deal.contact[]', // backward relation from Deal
    activities: '<- Activity.contact[]',

    // Custom actions (functions = verbs)
    merge: (target, $) => {
      // Merge two contacts
      const { sourceId } = $.args as { sourceId: string }
      // ... merge logic
      return $.Contact.update(target.id, { ...$.args })
    },

    enrich: async (contact, $) => {
      // Enrich contact data from external source
      // ... call clearbit, etc.
      return contact
    },

    // Custom events (past tense = react to something)
    scored: (contact, $) => {
      // React to contact being scored
      if ((contact as any).score > 80) {
        $.emit('contact.high-value', contact)
      }
    },

    // Block standard action
    delete: null, // Contacts cannot be deleted, only archived
  },

  // ============================================================================
  // Company - an organization
  // ============================================================================
  Company: {
    name: 'string!',
    domain: 'string#', // indexed for lookup
    industry: 'string',
    size: 'string', // 'startup' | 'smb' | 'enterprise'
    website: 'string',

    // Relations
    contacts: '<- Contact.company[]',
    deals: '<- Deal.company[]',
    parent: '-> Company', // for subsidiaries
    subsidiaries: '<- Company.parent[]',
  },

  // ============================================================================
  // Deal - a sales opportunity
  // ============================================================================
  Deal: {
    name: 'string!',
    value: 'decimal',
    stage: 'string', // 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost'
    probability: 'int',
    closeDate: 'date',

    // Relations
    contact: '-> Contact',
    company: '-> Company',
    owner: '-> User',
    activities: '<- Activity.deal[]',

    // Custom actions
    advance: (deal, $) => {
      // Move to next stage
      const stages = ['lead', 'qualified', 'proposal', 'negotiation', 'closed-won']
      const currentIndex = stages.indexOf((deal as any).stage)
      if (currentIndex < stages.length - 1) {
        return $.Deal.update((deal as any).id, { stage: stages[currentIndex + 1] })
      }
      return deal
    },

    close: (deal, $) => {
      const { won } = $.args as { won: boolean }
      return $.Deal.update((deal as any).id, {
        stage: won ? 'closed-won' : 'closed-lost',
      })
    },

    // Conditional block - only admins can delete deals
    // delete: (deal, $) => $.actor?.type === 'admin' ? deal : null,
  },

  // ============================================================================
  // Activity - a logged interaction
  // ============================================================================
  Activity: {
    type: 'string!', // 'call' | 'email' | 'meeting' | 'note'
    subject: 'string',
    body: 'text',
    date: 'datetime',

    // Relations
    contact: '-> Contact',
    deal: '-> Deal',
    owner: '-> User',
  },

  // ============================================================================
  // User - a CRM user (sales rep, admin, etc.)
  // ============================================================================
  User: {
    email: 'string!',
    name: 'string!',
    role: 'string', // 'admin' | 'sales' | 'manager'

    // Relations
    deals: '<- Deal.owner[]',
    activities: '<- Activity.owner[]',
  },
})

// ============================================================================
// Usage
// ============================================================================

// The CRM app automatically has:
console.log('CRM App:', CRM.name)
console.log('Nouns:', Object.keys(CRM.nouns))

// Each noun has:
// - Properties, relations, actions, events, blocked
console.log('Contact properties:', Object.keys(CRM.nouns.Contact.properties))
console.log('Contact relations:', Object.keys(CRM.nouns.Contact.relations))
console.log('Contact actions:', CRM.actions.Contact)
console.log('Contact triggers:', CRM.triggers.Contact)

// Zapier-style interface:
// - triggers: ['created', 'updated', 'merged', 'enriched', 'scored']
// - actions: ['create', 'get', 'update', 'find', 'merge', 'enrich']
// - (no 'delete' because it's blocked)
