/**
 * SaaS.Studio Tests
 *
 * Tests for the SaaS.Studio management console that provides:
 * - Visual dashboard for SaaS management
 * - Analytics and metrics (MRR, ARR, churn)
 * - Customer management interface
 * - Revenue analytics
 * - Usage analytics
 * - Team and billing settings
 *
 * SaaS.Studio is the management console for YOUR SaaS (built with SaaSkit).
 * It's dogfooded - built using SaaSkit itself.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Import from the studio module we're about to create
import {
  createStudio,
  type StudioConfig,
  type StudioMetrics,
  type Customer,
  type RevenueData,
  type UsageData,
  type TeamMember,
  type StudioInterface,
} from '../studio'

describe('SaaS.Studio - Management Console', () => {
  describe('createStudio() - Factory Function', () => {
    it('creates a studio instance with required config', () => {
      const studio = createStudio({
        appId: 'my-saas',
        apiUrl: 'https://api.my-saas.com',
      })

      expect(studio).toBeDefined()
      expect(studio.metrics).toBeDefined()
      expect(studio.customers).toBeDefined()
      expect(studio.revenue).toBeDefined()
      expect(studio.usage).toBeDefined()
      expect(studio.team).toBeDefined()
      expect(studio.settings).toBeDefined()
    })

    it('accepts optional configuration', () => {
      const studio = createStudio({
        appId: 'my-saas',
        apiUrl: 'https://api.my-saas.com',
        refreshInterval: 30000,
        timezone: 'America/New_York',
        currency: 'usd',
      })

      expect(studio.config.refreshInterval).toBe(30000)
      expect(studio.config.timezone).toBe('America/New_York')
      expect(studio.config.currency).toBe('usd')
    })
  })

  describe('Metrics Dashboard', () => {
    let studio: StudioInterface

    beforeEach(() => {
      studio = createStudio({
        appId: 'test-app',
        apiUrl: 'https://api.test.com',
      })
    })

    describe('MRR/ARR Metrics', () => {
      it('calculates current MRR', async () => {
        const metrics = await studio.metrics.getCurrent()

        expect(metrics.mrr).toBeDefined()
        expect(typeof metrics.mrr).toBe('number')
        expect(metrics.mrr).toBeGreaterThanOrEqual(0)
      })

      it('calculates ARR from MRR', async () => {
        const metrics = await studio.metrics.getCurrent()

        expect(metrics.arr).toBeDefined()
        expect(metrics.arr).toBe(metrics.mrr * 12)
      })

      it('provides MRR trend data', async () => {
        const trend = await studio.metrics.getMrrTrend({ period: '30d' })

        expect(trend).toBeDefined()
        expect(Array.isArray(trend.dataPoints)).toBe(true)
        expect(trend.dataPoints.length).toBeGreaterThan(0)
        expect(trend.dataPoints[0]).toHaveProperty('date')
        expect(trend.dataPoints[0]).toHaveProperty('value')
        expect(trend.changePercent).toBeDefined()
        expect(trend.changeDirection).toMatch(/^(up|down|flat)$/)
      })

      it('supports different trend periods', async () => {
        const trend7d = await studio.metrics.getMrrTrend({ period: '7d' })
        const trend30d = await studio.metrics.getMrrTrend({ period: '30d' })
        const trend90d = await studio.metrics.getMrrTrend({ period: '90d' })

        expect(trend7d.dataPoints.length).toBeLessThanOrEqual(7)
        expect(trend30d.dataPoints.length).toBeLessThanOrEqual(30)
        expect(trend90d.dataPoints.length).toBeLessThanOrEqual(90)
      })
    })

    describe('Churn Metrics', () => {
      it('calculates churn rate', async () => {
        const metrics = await studio.metrics.getCurrent()

        expect(metrics.churnRate).toBeDefined()
        expect(typeof metrics.churnRate).toBe('number')
        expect(metrics.churnRate).toBeGreaterThanOrEqual(0)
        expect(metrics.churnRate).toBeLessThanOrEqual(100)
      })

      it('provides churn trend data', async () => {
        const trend = await studio.metrics.getChurnTrend({ period: '30d' })

        expect(trend).toBeDefined()
        expect(Array.isArray(trend.dataPoints)).toBe(true)
        expect(trend.averageChurn).toBeDefined()
      })

      it('calculates net revenue retention (NRR)', async () => {
        const metrics = await studio.metrics.getCurrent()

        expect(metrics.nrr).toBeDefined()
        expect(typeof metrics.nrr).toBe('number')
        // NRR > 100% means expansion revenue exceeds churn
      })
    })

    describe('Customer Metrics', () => {
      it('provides total customer count', async () => {
        const metrics = await studio.metrics.getCurrent()

        expect(metrics.totalCustomers).toBeDefined()
        expect(typeof metrics.totalCustomers).toBe('number')
        expect(metrics.totalCustomers).toBeGreaterThanOrEqual(0)
      })

      it('provides active subscription count', async () => {
        const metrics = await studio.metrics.getCurrent()

        expect(metrics.activeSubscriptions).toBeDefined()
        expect(typeof metrics.activeSubscriptions).toBe('number')
      })

      it('provides ARPU (Average Revenue Per User)', async () => {
        const metrics = await studio.metrics.getCurrent()

        expect(metrics.arpu).toBeDefined()
        expect(typeof metrics.arpu).toBe('number')
      })

      it('provides LTV (Lifetime Value)', async () => {
        const metrics = await studio.metrics.getCurrent()

        expect(metrics.ltv).toBeDefined()
        expect(typeof metrics.ltv).toBe('number')
      })

      it('provides customer growth trend', async () => {
        const trend = await studio.metrics.getCustomerGrowthTrend({ period: '30d' })

        expect(trend).toBeDefined()
        expect(trend.newCustomers).toBeDefined()
        expect(trend.churnedCustomers).toBeDefined()
        expect(trend.netGrowth).toBe(trend.newCustomers - trend.churnedCustomers)
      })
    })

    describe('Trial Metrics', () => {
      it('provides trial conversion rate', async () => {
        const metrics = await studio.metrics.getCurrent()

        expect(metrics.trialConversionRate).toBeDefined()
        expect(typeof metrics.trialConversionRate).toBe('number')
        expect(metrics.trialConversionRate).toBeGreaterThanOrEqual(0)
        expect(metrics.trialConversionRate).toBeLessThanOrEqual(100)
      })

      it('provides active trial count', async () => {
        const metrics = await studio.metrics.getCurrent()

        expect(metrics.activeTrials).toBeDefined()
        expect(typeof metrics.activeTrials).toBe('number')
      })
    })
  })

  describe('Customer Management', () => {
    let studio: StudioInterface

    beforeEach(() => {
      studio = createStudio({
        appId: 'test-app',
        apiUrl: 'https://api.test.com',
      })
    })

    describe('List Customers', () => {
      it('lists all customers with pagination', async () => {
        const result = await studio.customers.list({ page: 1, limit: 10 })

        expect(result.customers).toBeDefined()
        expect(Array.isArray(result.customers)).toBe(true)
        expect(result.total).toBeDefined()
        expect(result.page).toBe(1)
        expect(result.limit).toBe(10)
      })

      it('filters customers by status', async () => {
        const active = await studio.customers.list({ status: 'active' })
        const churned = await studio.customers.list({ status: 'churned' })
        const trialing = await studio.customers.list({ status: 'trialing' })

        expect(active.customers).toBeDefined()
        expect(churned.customers).toBeDefined()
        expect(trialing.customers).toBeDefined()
      })

      it('filters customers by plan', async () => {
        const result = await studio.customers.list({ planId: 'pro' })

        expect(result.customers).toBeDefined()
        result.customers.forEach((customer: Customer) => {
          expect(customer.planId).toBe('pro')
        })
      })

      it('searches customers by name or email', async () => {
        const result = await studio.customers.search('john@example.com')

        expect(result.customers).toBeDefined()
        expect(Array.isArray(result.customers)).toBe(true)
      })

      it('sorts customers by different fields', async () => {
        const byMrr = await studio.customers.list({ sortBy: 'mrr', sortOrder: 'desc' })
        const byCreated = await studio.customers.list({ sortBy: 'createdAt', sortOrder: 'desc' })

        expect(byMrr.customers).toBeDefined()
        expect(byCreated.customers).toBeDefined()
      })
    })

    describe('Get Customer Details', () => {
      it('returns full customer details by ID', async () => {
        const customer = await studio.customers.get('cus_123')

        expect(customer).toBeDefined()
        expect(customer.id).toBe('cus_123')
        expect(customer.email).toBeDefined()
        expect(customer.name).toBeDefined()
        expect(customer.planId).toBeDefined()
        expect(customer.status).toBeDefined()
        expect(customer.mrr).toBeDefined()
        expect(customer.createdAt).toBeDefined()
      })

      it('includes subscription details', async () => {
        const customer = await studio.customers.get('cus_123')

        expect(customer.subscription).toBeDefined()
        expect(customer.subscription?.status).toBeDefined()
        expect(customer.subscription?.currentPeriodEnd).toBeDefined()
      })

      it('includes billing history', async () => {
        const customer = await studio.customers.get('cus_123')

        expect(customer.billingHistory).toBeDefined()
        expect(Array.isArray(customer.billingHistory)).toBe(true)
      })

      it('includes activity timeline', async () => {
        const customer = await studio.customers.get('cus_123')

        expect(customer.activityTimeline).toBeDefined()
        expect(Array.isArray(customer.activityTimeline)).toBe(true)
      })
    })

    describe('Customer Actions', () => {
      it('upgrades customer to higher plan', async () => {
        const result = await studio.customers.upgrade('cus_123', 'enterprise')

        expect(result.success).toBe(true)
        expect(result.newPlanId).toBe('enterprise')
      })

      it('downgrades customer to lower plan', async () => {
        const result = await studio.customers.downgrade('cus_123', 'starter')

        expect(result.success).toBe(true)
        expect(result.newPlanId).toBe('starter')
        expect(result.effectiveDate).toBeDefined()
      })

      it('cancels customer subscription', async () => {
        const result = await studio.customers.cancel('cus_123', {
          immediately: false,
          reason: 'customer_request',
        })

        expect(result.success).toBe(true)
        expect(result.cancelAt).toBeDefined()
      })

      it('reactivates canceled subscription', async () => {
        const result = await studio.customers.reactivate('cus_123')

        expect(result.success).toBe(true)
        expect(result.status).toBe('active')
      })

      it('applies discount to customer', async () => {
        const result = await studio.customers.applyDiscount('cus_123', {
          couponId: 'SAVE20',
        })

        expect(result.success).toBe(true)
        expect(result.discount).toBeDefined()
      })

      it('extends customer trial', async () => {
        const result = await studio.customers.extendTrial('cus_123', {
          additionalDays: 14,
          reason: 'evaluation needed',
        })

        expect(result.success).toBe(true)
        expect(result.newTrialEnd).toBeDefined()
      })
    })
  })

  describe('Revenue Analytics', () => {
    let studio: StudioInterface

    beforeEach(() => {
      studio = createStudio({
        appId: 'test-app',
        apiUrl: 'https://api.test.com',
      })
    })

    describe('Revenue Overview', () => {
      it('provides revenue summary', async () => {
        const summary = await studio.revenue.getSummary()

        expect(summary.totalRevenue).toBeDefined()
        expect(summary.recurringRevenue).toBeDefined()
        expect(summary.oneTimeRevenue).toBeDefined()
        expect(summary.refunds).toBeDefined()
        expect(summary.netRevenue).toBeDefined()
      })

      it('provides revenue by period', async () => {
        const monthly = await studio.revenue.getByPeriod({ period: 'month' })
        const quarterly = await studio.revenue.getByPeriod({ period: 'quarter' })
        const yearly = await studio.revenue.getByPeriod({ period: 'year' })

        expect(monthly.dataPoints).toBeDefined()
        expect(quarterly.dataPoints).toBeDefined()
        expect(yearly.dataPoints).toBeDefined()
      })
    })

    describe('Revenue by Plan', () => {
      it('breaks down revenue by plan', async () => {
        const byPlan = await studio.revenue.getByPlan()

        expect(byPlan).toBeDefined()
        expect(Array.isArray(byPlan)).toBe(true)
        byPlan.forEach((plan: RevenueData) => {
          expect(plan.planId).toBeDefined()
          expect(plan.planName).toBeDefined()
          expect(plan.mrr).toBeDefined()
          expect(plan.customerCount).toBeDefined()
        })
      })

      it('calculates plan distribution percentages', async () => {
        const distribution = await studio.revenue.getPlanDistribution()

        expect(distribution).toBeDefined()
        const totalPercentage = distribution.reduce((sum: number, p: { percentage: number }) => sum + p.percentage, 0)
        expect(Math.round(totalPercentage)).toBe(100)
      })
    })

    describe('Revenue Growth', () => {
      it('calculates revenue growth rate', async () => {
        const growth = await studio.revenue.getGrowthRate({ period: '30d' })

        expect(growth.rate).toBeDefined()
        expect(growth.previousPeriodRevenue).toBeDefined()
        expect(growth.currentPeriodRevenue).toBeDefined()
      })

      it('calculates expansion revenue', async () => {
        const expansion = await studio.revenue.getExpansionRevenue({ period: '30d' })

        expect(expansion.upgrades).toBeDefined()
        expect(expansion.expansionMrr).toBeDefined()
      })

      it('calculates contraction revenue', async () => {
        const contraction = await studio.revenue.getContractionRevenue({ period: '30d' })

        expect(contraction.downgrades).toBeDefined()
        expect(contraction.contractionMrr).toBeDefined()
      })
    })

    describe('Cohort Analysis', () => {
      it('provides cohort revenue analysis', async () => {
        const cohorts = await studio.revenue.getCohortAnalysis({
          startMonth: '2025-01',
          endMonth: '2025-12',
        })

        expect(cohorts).toBeDefined()
        expect(Array.isArray(cohorts)).toBe(true)
        cohorts.forEach((cohort: { month: string; customers: number; retentionByMonth: number[] }) => {
          expect(cohort.month).toBeDefined()
          expect(cohort.customers).toBeDefined()
          expect(cohort.retentionByMonth).toBeDefined()
        })
      })
    })
  })

  describe('Usage Analytics', () => {
    let studio: StudioInterface

    beforeEach(() => {
      studio = createStudio({
        appId: 'test-app',
        apiUrl: 'https://api.test.com',
      })
    })

    describe('API Usage', () => {
      it('provides API call counts', async () => {
        const usage = await studio.usage.getApiUsage({ period: '30d' })

        expect(usage.totalCalls).toBeDefined()
        expect(usage.successfulCalls).toBeDefined()
        expect(usage.failedCalls).toBeDefined()
        expect(usage.successRate).toBeDefined()
      })

      it('breaks down usage by endpoint', async () => {
        const byEndpoint = await studio.usage.getByEndpoint({ period: '30d' })

        expect(Array.isArray(byEndpoint)).toBe(true)
        byEndpoint.forEach((endpoint: UsageData) => {
          expect(endpoint.path).toBeDefined()
          expect(endpoint.method).toBeDefined()
          expect(endpoint.count).toBeDefined()
        })
      })

      it('provides usage trend over time', async () => {
        const trend = await studio.usage.getTrend({ period: '30d', granularity: 'day' })

        expect(trend.dataPoints).toBeDefined()
        expect(Array.isArray(trend.dataPoints)).toBe(true)
      })
    })

    describe('Feature Usage', () => {
      it('tracks feature adoption', async () => {
        const features = await studio.usage.getFeatureAdoption()

        expect(Array.isArray(features)).toBe(true)
        features.forEach((feature: { name: string; usageCount: number; adoptionRate: number }) => {
          expect(feature.name).toBeDefined()
          expect(feature.usageCount).toBeDefined()
          expect(feature.adoptionRate).toBeDefined()
        })
      })

      it('provides feature usage by plan', async () => {
        const byPlan = await studio.usage.getFeaturesByPlan()

        expect(byPlan).toBeDefined()
      })
    })

    describe('Customer Usage', () => {
      it('provides usage for specific customer', async () => {
        const usage = await studio.usage.getCustomerUsage('cus_123', { period: '30d' })

        expect(usage.customerId).toBe('cus_123')
        expect(usage.apiCalls).toBeDefined()
        expect(usage.featureUsage).toBeDefined()
        expect(usage.storageUsed).toBeDefined()
      })

      it('identifies high-usage customers', async () => {
        const topUsers = await studio.usage.getTopUsers({ limit: 10, period: '30d' })

        expect(Array.isArray(topUsers)).toBe(true)
        expect(topUsers.length).toBeLessThanOrEqual(10)
      })

      it('identifies at-risk customers (low usage)', async () => {
        const atRisk = await studio.usage.getAtRiskCustomers()

        expect(Array.isArray(atRisk)).toBe(true)
        atRisk.forEach((customer: { customerId: string; usageScore: number; riskLevel: string }) => {
          expect(customer.customerId).toBeDefined()
          expect(customer.usageScore).toBeDefined()
          expect(customer.riskLevel).toMatch(/^(low|medium|high)$/)
        })
      })
    })
  })

  describe('Team Management', () => {
    let studio: StudioInterface

    beforeEach(() => {
      studio = createStudio({
        appId: 'test-app',
        apiUrl: 'https://api.test.com',
      })
    })

    describe('Team Members', () => {
      it('lists team members', async () => {
        const members = await studio.team.list()

        expect(Array.isArray(members)).toBe(true)
        members.forEach((member: TeamMember) => {
          expect(member.id).toBeDefined()
          expect(member.email).toBeDefined()
          expect(member.role).toBeDefined()
        })
      })

      it('invites new team member', async () => {
        const result = await studio.team.invite({
          email: 'new@example.com',
          role: 'admin',
        })

        expect(result.success).toBe(true)
        expect(result.inviteId).toBeDefined()
      })

      it('updates team member role', async () => {
        const result = await studio.team.updateRole('member_123', 'viewer')

        expect(result.success).toBe(true)
        expect(result.newRole).toBe('viewer')
      })

      it('removes team member', async () => {
        const result = await studio.team.remove('member_123')

        expect(result.success).toBe(true)
      })
    })

    describe('Roles and Permissions', () => {
      it('lists available roles', async () => {
        const roles = await studio.team.getRoles()

        expect(Array.isArray(roles)).toBe(true)
        expect(roles).toContain('owner')
        expect(roles).toContain('admin')
        expect(roles).toContain('viewer')
      })

      it('gets role permissions', async () => {
        const permissions = await studio.team.getRolePermissions('admin')

        expect(permissions).toBeDefined()
        expect(permissions.canViewMetrics).toBe(true)
        expect(permissions.canManageCustomers).toBe(true)
      })
    })
  })

  describe('Settings', () => {
    let studio: StudioInterface

    beforeEach(() => {
      studio = createStudio({
        appId: 'test-app',
        apiUrl: 'https://api.test.com',
      })
    })

    describe('General Settings', () => {
      it('gets current settings', async () => {
        const settings = await studio.settings.get()

        expect(settings).toBeDefined()
        expect(settings.appName).toBeDefined()
        expect(settings.timezone).toBeDefined()
        expect(settings.currency).toBeDefined()
      })

      it('updates settings', async () => {
        const result = await studio.settings.update({
          timezone: 'Europe/London',
          currency: 'gbp',
        })

        expect(result.success).toBe(true)
      })
    })

    describe('Billing Settings', () => {
      it('gets billing configuration', async () => {
        const billing = await studio.settings.getBilling()

        expect(billing).toBeDefined()
        expect(billing.stripeConnected).toBeDefined()
        expect(billing.plans).toBeDefined()
      })

      it('updates billing configuration', async () => {
        const result = await studio.settings.updateBilling({
          taxRate: 20,
          defaultCurrency: 'eur',
        })

        expect(result.success).toBe(true)
      })
    })

    describe('Notification Settings', () => {
      it('gets notification preferences', async () => {
        const notifications = await studio.settings.getNotifications()

        expect(notifications).toBeDefined()
        expect(notifications.newCustomerEmail).toBeDefined()
        expect(notifications.churnAlertEmail).toBeDefined()
        expect(notifications.weeklyReportEmail).toBeDefined()
      })

      it('updates notification preferences', async () => {
        const result = await studio.settings.updateNotifications({
          churnAlertEmail: true,
          weeklyReportEmail: true,
        })

        expect(result.success).toBe(true)
      })
    })

    describe('Integration Settings', () => {
      it('lists connected integrations', async () => {
        const integrations = await studio.settings.getIntegrations()

        expect(Array.isArray(integrations)).toBe(true)
      })

      it('connects an integration', async () => {
        const result = await studio.settings.connectIntegration('slack', {
          webhookUrl: 'https://hooks.slack.com/...',
        })

        expect(result.success).toBe(true)
      })

      it('disconnects an integration', async () => {
        const result = await studio.settings.disconnectIntegration('slack')

        expect(result.success).toBe(true)
      })
    })
  })

  describe('Real-time Updates', () => {
    let studio: StudioInterface

    beforeEach(() => {
      studio = createStudio({
        appId: 'test-app',
        apiUrl: 'https://api.test.com',
      })
    })

    it('subscribes to metric updates', () => {
      const unsubscribe = studio.subscribe('metrics', (_data) => {
        // Handler receives metric updates
      })

      expect(typeof unsubscribe).toBe('function')
    })

    it('subscribes to customer events', () => {
      const unsubscribe = studio.subscribe('customers', (_data) => {
        // Handler receives customer events
      })

      expect(typeof unsubscribe).toBe('function')
    })

    it('unsubscribes cleanly', () => {
      const handler = vi.fn()
      const unsubscribe = studio.subscribe('metrics', handler)

      unsubscribe()
      // Should not throw after unsubscribe
      expect(() => unsubscribe()).not.toThrow()
    })
  })

  describe('API Connection', () => {
    it('connects to SaaSkit app API', async () => {
      const studio = createStudio({
        appId: 'test-app',
        apiUrl: 'https://api.test.com',
        apiKey: 'sk_test_123',
      })

      const status = await studio.checkConnection()

      expect(status.connected).toBeDefined()
      expect(status.appId).toBe('test-app')
    })

    it('handles API errors gracefully', async () => {
      const studio = createStudio({
        appId: 'test-app',
        apiUrl: 'https://invalid-url.test',
      })

      await expect(studio.checkConnection()).resolves.toHaveProperty('connected', false)
    })
  })

  describe('Alerts - Churn Risk & Growth Opportunities', () => {
    let studio: StudioInterface

    beforeEach(() => {
      studio = createStudio({
        appId: 'test-app',
        apiUrl: 'https://api.test.com',
      })
    })

    describe('Alert Listing', () => {
      it('lists all alerts with pagination', async () => {
        const result = await studio.alerts.list({ page: 1, limit: 10 })

        expect(result.alerts).toBeDefined()
        expect(Array.isArray(result.alerts)).toBe(true)
        expect(result.total).toBeDefined()
        expect(result.page).toBe(1)
        expect(result.limit).toBe(10)
      })

      it('filters alerts by type', async () => {
        const churnAlerts = await studio.alerts.list({ type: 'churn_risk' })
        const growthAlerts = await studio.alerts.list({ type: 'growth_opportunity' })

        expect(churnAlerts.alerts).toBeDefined()
        expect(growthAlerts.alerts).toBeDefined()
      })

      it('filters alerts by severity', async () => {
        const criticalAlerts = await studio.alerts.list({ severity: 'critical' })
        const warningAlerts = await studio.alerts.list({ severity: 'warning' })

        expect(criticalAlerts.alerts).toBeDefined()
        expect(warningAlerts.alerts).toBeDefined()
      })

      it('filters alerts by status', async () => {
        const activeAlerts = await studio.alerts.list({ status: 'active' })

        expect(activeAlerts.alerts).toBeDefined()
        activeAlerts.alerts.forEach((alert) => {
          expect(alert.status).toBe('active')
        })
      })
    })

    describe('Alert Summary', () => {
      it('provides alert summary by severity', async () => {
        const summary = await studio.alerts.getSummary()

        expect(summary.totalActive).toBeDefined()
        expect(summary.critical).toBeDefined()
        expect(summary.warnings).toBeDefined()
        expect(summary.info).toBeDefined()
        expect(summary.byType).toBeDefined()
      })
    })

    describe('Alert Actions', () => {
      it('acknowledges an alert', async () => {
        const result = await studio.alerts.acknowledge('alert_001', { note: 'Looking into it' })

        expect(result.success).toBe(true)
      })

      it('snoozes an alert', async () => {
        const result = await studio.alerts.snooze('alert_001', { hours: 24, reason: 'Will address tomorrow' })

        expect(result.success).toBe(true)
      })

      it('resolves an alert', async () => {
        const result = await studio.alerts.resolve('alert_001', { resolution: 'Customer contacted successfully' })

        expect(result.success).toBe(true)
      })
    })

    describe('Churn Risk Alerts', () => {
      it('gets churn risk alerts with risk scores', async () => {
        const risks = await studio.alerts.getChurnRisks()

        expect(Array.isArray(risks)).toBe(true)
        risks.forEach((risk) => {
          expect(risk.type).toBe('churn_risk')
          expect(risk.riskScore).toBeDefined()
          expect(risk.riskScore).toBeGreaterThanOrEqual(0)
          expect(risk.riskScore).toBeLessThanOrEqual(100)
          expect(risk.riskFactors).toBeDefined()
          expect(Array.isArray(risk.riskFactors)).toBe(true)
          expect(risk.mrrAtRisk).toBeDefined()
        })
      })
    })

    describe('Growth Opportunities', () => {
      it('gets growth opportunity alerts', async () => {
        const opportunities = await studio.alerts.getGrowthOpportunities()

        expect(Array.isArray(opportunities)).toBe(true)
        opportunities.forEach((opp) => {
          expect(opp.type).toBe('growth_opportunity')
          expect(opp.opportunityType).toBeDefined()
          expect(['upsell', 'cross_sell', 'expansion', 'referral']).toContain(opp.opportunityType)
          expect(opp.potentialMrr).toBeDefined()
          expect(opp.confidence).toBeDefined()
          expect(opp.signals).toBeDefined()
        })
      })
    })

    describe('Usage Anomalies', () => {
      it('gets usage anomaly alerts', async () => {
        const anomalies = await studio.alerts.getUsageAnomalies()

        expect(Array.isArray(anomalies)).toBe(true)
        anomalies.forEach((anomaly) => {
          expect(anomaly.type).toBe('usage_anomaly')
          expect(anomaly.anomalyType).toBeDefined()
          expect(['spike', 'drop', 'pattern_change']).toContain(anomaly.anomalyType)
          expect(anomaly.metric).toBeDefined()
          expect(anomaly.expectedValue).toBeDefined()
          expect(anomaly.actualValue).toBeDefined()
          expect(anomaly.deviationPercent).toBeDefined()
        })
      })
    })
  })

  describe('Insights - Forecasting & Cohort Analysis', () => {
    let studio: StudioInterface

    beforeEach(() => {
      studio = createStudio({
        appId: 'test-app',
        apiUrl: 'https://api.test.com',
      })
    })

    describe('Revenue Forecasting', () => {
      it('provides revenue forecast for multiple months', async () => {
        const forecast = await studio.insights.getRevenueForecast(6)

        expect(Array.isArray(forecast)).toBe(true)
        expect(forecast.length).toBe(6)
        forecast.forEach((month) => {
          expect(month.period).toBeDefined()
          expect(month.predictedMrr).toBeDefined()
          expect(month.lowEstimate).toBeDefined()
          expect(month.highEstimate).toBeDefined()
          expect(month.confidence).toBeDefined()
          expect(month.confidence).toBeGreaterThanOrEqual(0)
          expect(month.confidence).toBeLessThanOrEqual(100)
          expect(month.factors).toBeDefined()
          expect(Array.isArray(month.factors)).toBe(true)
        })
      })

      it('includes forecast factors with impact', async () => {
        const forecast = await studio.insights.getRevenueForecast(3)

        forecast.forEach((month) => {
          month.factors.forEach((factor) => {
            expect(factor.name).toBeDefined()
            expect(['positive', 'negative', 'neutral']).toContain(factor.impact)
            expect(factor.magnitude).toBeDefined()
            expect(factor.description).toBeDefined()
          })
        })
      })
    })

    describe('Enhanced Cohort Analysis', () => {
      it('provides enhanced cohort data with revenue retention', async () => {
        const cohorts = await studio.insights.getEnhancedCohorts({
          startMonth: '2025-07',
          endMonth: '2025-12',
        })

        expect(Array.isArray(cohorts)).toBe(true)
        cohorts.forEach((cohort) => {
          expect(cohort.month).toBeDefined()
          expect(cohort.customers).toBeDefined()
          expect(cohort.initialMrr).toBeDefined()
          expect(cohort.retentionByMonth).toBeDefined()
          expect(cohort.revenueRetentionByMonth).toBeDefined()
          expect(cohort.expansionByMonth).toBeDefined()
          expect(cohort.churnByMonth).toBeDefined()
          expect(cohort.nrrByMonth).toBeDefined()
        })
      })
    })

    describe('Customer Health Scores', () => {
      it('provides customer health scores', async () => {
        const healthScores = await studio.insights.getCustomerHealth()

        expect(Array.isArray(healthScores)).toBe(true)
        healthScores.forEach((score) => {
          expect(score.customerId).toBeDefined()
          expect(score.email).toBeDefined()
          expect(score.overallScore).toBeDefined()
          expect(score.overallScore).toBeGreaterThanOrEqual(0)
          expect(score.overallScore).toBeLessThanOrEqual(100)
          expect(['healthy', 'at_risk', 'critical']).toContain(score.category)
          expect(score.components).toBeDefined()
          expect(score.components.usage).toBeDefined()
          expect(score.components.engagement).toBeDefined()
          expect(score.components.support).toBeDefined()
          expect(score.components.payment).toBeDefined()
          expect(score.components.adoption).toBeDefined()
          expect(['improving', 'stable', 'declining']).toContain(score.trend)
        })
      })

      it('filters health scores by customer ID', async () => {
        const healthScores = await studio.insights.getCustomerHealth('cus_123')

        expect(Array.isArray(healthScores)).toBe(true)
        healthScores.forEach((score) => {
          expect(score.customerId).toBe('cus_123')
        })
      })

      it('gets customers by health category', async () => {
        const atRisk = await studio.insights.getCustomersByHealth('at_risk')
        const critical = await studio.insights.getCustomersByHealth('critical')
        const healthy = await studio.insights.getCustomersByHealth('healthy')

        expect(Array.isArray(atRisk)).toBe(true)
        expect(Array.isArray(critical)).toBe(true)
        expect(Array.isArray(healthy)).toBe(true)

        atRisk.forEach((c) => expect(c.category).toBe('at_risk'))
        critical.forEach((c) => expect(c.category).toBe('critical'))
        healthy.forEach((c) => expect(c.category).toBe('healthy'))
      })
    })

    describe('Growth Insights', () => {
      it('provides growth insights summary', async () => {
        const insights = await studio.insights.getGrowthInsights()

        expect(insights.currentGrowthRate).toBeDefined()
        expect(insights.projectedAnnualGrowth).toBeDefined()
        expect(insights.topDrivers).toBeDefined()
        expect(Array.isArray(insights.topDrivers)).toBe(true)
        expect(insights.blockers).toBeDefined()
        expect(Array.isArray(insights.blockers)).toBe(true)
        expect(insights.recommendations).toBeDefined()
        expect(Array.isArray(insights.recommendations)).toBe(true)
      })

      it('includes segment performance data', async () => {
        const insights = await studio.insights.getGrowthInsights()

        expect(insights.bestSegment).toBeDefined()
        expect(insights.bestSegment?.name).toBeDefined()
        expect(insights.bestSegment?.growthRate).toBeDefined()
        expect(insights.worstSegment).toBeDefined()
        expect(insights.worstSegment?.name).toBeDefined()
        expect(insights.worstSegment?.growthRate).toBeDefined()
      })
    })

    describe('Engagement Metrics', () => {
      it('provides engagement metrics', async () => {
        const metrics = await studio.insights.getEngagementMetrics({ period: '30d' })

        expect(metrics.dauPercent).toBeDefined()
        expect(metrics.wauPercent).toBeDefined()
        expect(metrics.mauPercent).toBeDefined()
        expect(metrics.avgSessionDuration).toBeDefined()
        expect(metrics.stickiness).toBeDefined()
        expect(metrics.powerUsers).toBeDefined()
        expect(metrics.dormantUsers).toBeDefined()
        expect(['up', 'down', 'flat']).toContain(metrics.trend)
        expect(metrics.weekOverWeekChange).toBeDefined()
      })
    })
  })

  describe('Notifications - Email/Slack Channels', () => {
    let studio: StudioInterface

    beforeEach(() => {
      studio = createStudio({
        appId: 'test-app',
        apiUrl: 'https://api.test.com',
      })
    })

    describe('Notification Rules', () => {
      it('lists notification rules', async () => {
        const rules = await studio.notifications.listRules()

        expect(Array.isArray(rules)).toBe(true)
        rules.forEach((rule) => {
          expect(rule.id).toBeDefined()
          expect(rule.name).toBeDefined()
          expect(rule.enabled).toBeDefined()
          expect(rule.trigger).toBeDefined()
          expect(rule.channels).toBeDefined()
          expect(Array.isArray(rule.channels)).toBe(true)
        })
      })

      it('creates a notification rule', async () => {
        const rule = await studio.notifications.createRule({
          name: 'Test Alert Rule',
          trigger: 'alert_critical',
          channels: ['email', 'slack'],
          filters: {
            minSeverity: 'critical',
          },
        })

        expect(rule.id).toBeDefined()
        expect(rule.name).toBe('Test Alert Rule')
        expect(rule.trigger).toBe('alert_critical')
        expect(rule.channels).toEqual(['email', 'slack'])
        expect(rule.enabled).toBe(true)
      })

      it('updates a notification rule', async () => {
        const updated = await studio.notifications.updateRule('rule_001', {
          name: 'Updated Rule Name',
        })

        expect(updated.name).toBe('Updated Rule Name')
      })

      it('deletes a notification rule', async () => {
        const result = await studio.notifications.deleteRule('rule_001')

        expect(result.success).toBe(true)
      })

      it('toggles rule enabled state', async () => {
        const result = await studio.notifications.toggleRule('rule_001', false)

        expect(result.success).toBe(true)
      })
    })

    describe('Email Channel', () => {
      it('configures email notifications', async () => {
        const result = await studio.notifications.configureEmail({
          recipients: ['team@example.com', 'alerts@example.com'],
          includeDetails: true,
          subjectPrefix: '[Alert]',
        })

        expect(result.success).toBe(true)
      })

      it('gets email configuration', async () => {
        const config = await studio.notifications.getChannelConfig('email')

        expect(config).toBeDefined()
        if (config && 'recipients' in config) {
          expect(config.recipients).toBeDefined()
          expect(Array.isArray(config.recipients)).toBe(true)
        }
      })

      it('tests email channel', async () => {
        const result = await studio.notifications.testChannel('email')

        expect(result.success).toBeDefined()
      })
    })

    describe('Slack Channel', () => {
      it('configures Slack notifications', async () => {
        const result = await studio.notifications.configureSlack({
          webhookUrl: 'https://hooks.slack.com/services/xxx',
          channel: '#saas-alerts',
          mentionOnCritical: true,
          botName: 'SaaS Bot',
        })

        expect(result.success).toBe(true)
      })

      it('gets Slack configuration', async () => {
        const config = await studio.notifications.getChannelConfig('slack')

        expect(config).toBeDefined()
        if (config && 'webhookUrl' in config) {
          expect(config.webhookUrl).toBeDefined()
          expect(config.channel).toBeDefined()
        }
      })

      it('tests Slack channel', async () => {
        const result = await studio.notifications.testChannel('slack')

        expect(result.success).toBeDefined()
      })
    })

    describe('Webhook Channel', () => {
      it('configures webhook notifications', async () => {
        const result = await studio.notifications.configureWebhook({
          url: 'https://my-app.com/webhooks/saas-alerts',
          method: 'POST',
          headers: { 'X-API-Key': 'secret123' },
          secret: 'webhook-secret',
        })

        expect(result.success).toBe(true)
      })

      it('tests unconfigured webhook returns error', async () => {
        // Reset the webhook config by creating a fresh studio
        const freshStudio = createStudio({
          appId: 'test-app',
          apiUrl: 'https://api.test.com',
        })

        // Webhook is not configured by default
        const config = await freshStudio.notifications.getChannelConfig('webhook')
        if (config === null) {
          const result = await freshStudio.notifications.testChannel('webhook')
          expect(result.success).toBe(false)
          expect(result.error).toBeDefined()
        }
      })
    })

    describe('Notification Deliveries', () => {
      it('gets recent deliveries', async () => {
        const deliveries = await studio.notifications.getDeliveries({ limit: 10 })

        expect(Array.isArray(deliveries)).toBe(true)
        deliveries.forEach((delivery) => {
          expect(delivery.id).toBeDefined()
          expect(delivery.ruleId).toBeDefined()
          expect(delivery.channel).toBeDefined()
          expect(delivery.trigger).toBeDefined()
          expect(['pending', 'sent', 'failed']).toContain(delivery.status)
        })
      })

      it('filters deliveries by rule ID', async () => {
        const deliveries = await studio.notifications.getDeliveries({ ruleId: 'rule_001' })

        expect(Array.isArray(deliveries)).toBe(true)
        deliveries.forEach((delivery) => {
          expect(delivery.ruleId).toBe('rule_001')
        })
      })
    })

    describe('Manual Notifications', () => {
      it('sends manual notification', async () => {
        const result = await studio.notifications.send('email', 'Test notification message', {
          subject: 'Test Subject',
        })

        expect(result.success).toBe(true)
      })
    })
  })
})
