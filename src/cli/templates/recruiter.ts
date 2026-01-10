/**
 * Recruiter template - AI-powered recruiting platform
 */

import {
  minimalPackageJson,
  minimalTsConfig,
  minimalEnvExample,
  minimalReadme,
  minimalGitignore,
} from './minimal'

export { minimalPackageJson as recruiterPackageJson }
export { minimalTsConfig as recruiterTsConfig }
export { minimalEnvExample as recruiterEnvExample }
export { minimalReadme as recruiterReadme }
export { minimalGitignore as recruiterGitignore }

export const recruiterAppTsx = `/**
 * AI Recruiter Application
 *
 * An intelligent recruiting platform demonstrating:
 * - AI-powered candidate matching
 * - Search and recommendation engine
 * - Complex entity relationships
 * - Workflow automation
 */

import { SaaS } from 'saaskit'

export default function App() {
  return (
    <SaaS name="AI Recruiter">
      {$ => {
        // Define recruiting data models
        $.nouns({
          // Candidate profiles
          Candidate: {
            name: 'string',
            email: 'string',
            phone: 'string?',
            resume: 'string?',
            skills: 'string',
            experience: 'number',
            location: 'string?',
            status: 'string',
            notes: 'string?',
            createdAt: 'date',
            updatedAt: 'date',
          },

          // Job positions
          Job: {
            title: 'string',
            description: 'string',
            requirements: 'string',
            skills: 'string',
            location: 'string?',
            salary: 'string?',
            remote: 'boolean',
            status: 'string',
            createdAt: 'date',
          },

          // Match between candidate and job
          Match: {
            candidate: '-> Candidate',
            job: '-> Job',
            score: 'number',
            status: 'string',
            notes: 'string?',
            matchedAt: 'date',
          },

          // Interview schedules
          Interview: {
            candidate: '-> Candidate',
            job: '-> Job',
            scheduledAt: 'date',
            duration: 'number',
            type: 'string',
            status: 'string',
            notes: 'string?',
          },

          // Search queries for candidate sourcing
          Search: {
            query: 'string',
            filters: 'string?',
            results: 'number',
            createdAt: 'date',
          },
        })

        // Define recruiting workflows
        $.verbs({
          Candidate: {
            create: async (data) => ({
              ...data,
              status: 'new',
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
            update: async (id, data) => ({
              id,
              ...data,
              updatedAt: new Date(),
            }),
            archive: async (id) => ({
              id,
              status: 'archived',
              updatedAt: new Date(),
            }),
          },

          Job: {
            create: async (data) => ({
              ...data,
              status: 'open',
              createdAt: new Date(),
            }),
            update: async (id, data) => ({ id, ...data }),
            close: async (id) => ({
              id,
              status: 'closed',
            }),
          },

          Match: {
            create: async (data) => ({
              ...data,
              status: 'pending',
              matchedAt: new Date(),
            }),
            approve: async (id) => ({
              id,
              status: 'approved',
            }),
            reject: async (id, reason) => ({
              id,
              status: 'rejected',
              notes: reason,
            }),
          },

          Interview: {
            schedule: async (data) => ({
              ...data,
              status: 'scheduled',
            }),
            complete: async (id, feedback) => ({
              id,
              status: 'completed',
              notes: feedback,
            }),
            cancel: async (id) => ({
              id,
              status: 'cancelled',
            }),
          },

          Search: {
            // AI-powered candidate search
            execute: async (query, filters) => {
              console.log(\`Searching candidates: \${query}\`)
              return {
                query,
                filters,
                results: 0,
                createdAt: new Date(),
              }
            },
          },
        })

        // AI-powered features
        $.ai({
          // Match candidates to jobs using AI
          matchCandidates: async (jobId) => {
            console.log(\`AI matching candidates for job: \${jobId}\`)
            return []
          },

          // Analyze resume and extract skills
          analyzeResume: async (resumeText) => {
            console.log('AI analyzing resume...')
            return {
              skills: [],
              experience: 0,
              summary: '',
            }
          },

          // Generate job description
          generateJobDescription: async (title, requirements) => {
            console.log(\`AI generating job description for: \${title}\`)
            return ''
          },

          // Score candidate-job fit
          scoreMatch: async (candidateId, jobId) => {
            console.log(\`AI scoring match: \${candidateId} <-> \${jobId}\`)
            return { score: 0, reasons: [] }
          },
        })

        // Event handlers
        $.on('Candidate:created', async (candidate) => {
          console.log(\`New candidate: \${candidate.name}\`)
          // Could trigger AI resume analysis
        })

        $.on('Match:approved', async (match) => {
          console.log(\`Match approved: \${match.id}\`)
          // Could schedule interview
        })

        $.on('Interview:completed', async (interview) => {
          console.log(\`Interview completed: \${interview.id}\`)
          // Could trigger next steps
        })
      }}
    </SaaS>
  )
}
`
