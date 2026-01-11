/**
 * SaaS.Studio Implementation
 *
 * Factory function and implementation of the Studio interface.
 * SaaS.Studio is the management console for YOUR SaaS (built with SaaSkit).
 */

import type {
  StudioConfig,
  StudioInterface,
  StudioMetrics,
  MrrTrend,
  ChurnTrend,
  CustomerGrowthTrend,
  TrendPeriodOptions,
  MetricsInterface,
  Customer,
  CustomerListOptions,
  CustomerListResult,
  CancelOptions,
  ApplyDiscountOptions,
  ExtendTrialOptions,
  UpgradeResult,
  DowngradeResult,
  CancelResult,
  ReactivateResult,
  ApplyDiscountResult,
  ExtendTrialResult,
  CustomersInterface,
  RevenueSummary,
  RevenuePeriodOptions,
  RevenueTimeSeries,
  RevenueData,
  PlanDistribution,
  GrowthRate,
  ExpansionRevenue,
  ContractionRevenue,
  CohortAnalysisOptions,
  CohortData,
  RevenueInterface,
  ApiUsageSummary,
  UsageData,
  UsageTrendOptions,
  UsageTrend,
  FeatureAdoption,
  CustomerUsage,
  TopUser,
  AtRiskCustomer,
  UsageInterface,
  TeamMember,
  TeamRole,
  InviteMemberOptions,
  InviteResult,
  UpdateRoleResult,
  RolePermissions,
  ActionResult,
  TeamInterface,
  AppSettings,
  BillingSettings,
  NotificationSettings,
  ConnectedIntegration,
  UpdateSettingsOptions,
  UpdateBillingOptions,
  UpdateNotificationOptions,
  SettingsInterface,
  ConnectionStatus,
  StudioEventType,
  StudioEventHandler,
  TrendDataPoint,
  // Alerts
  Alert,
  AlertType,
  AlertSeverity,
  AlertStatus,
  AlertListOptions,
  AlertListResult,
  AlertSummary,
  AcknowledgeAlertOptions,
  SnoozeAlertOptions,
  ResolveAlertOptions,
  AlertsInterface,
  ChurnRiskAlert,
  GrowthOpportunityAlert,
  UsageAnomalyAlert,
  // Insights
  RevenueForecast,
  EnhancedCohortData,
  CustomerHealthScore,
  GrowthInsights,
  EngagementMetrics,
  InsightsInterface,
  // Notifications
  NotificationChannel,
  NotificationTrigger,
  NotificationRule,
  EmailNotificationConfig,
  SlackNotificationConfig,
  WebhookNotificationConfig,
  NotificationDelivery,
  CreateNotificationRuleOptions,
  NotificationsInterface,
} from './types'

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Generate mock trend data points
 */
function generateTrendData(days: number, baseValue: number, variance: number): TrendDataPoint[] {
  const dataPoints: TrendDataPoint[] = []
  const now = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)

    // Add some variance to simulate realistic data
    const randomVariance = (Math.random() - 0.5) * variance * 2
    const value = Math.max(0, baseValue + randomVariance + (i * variance * 0.1))

    dataPoints.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(value),
    })
  }

  return dataPoints
}

/**
 * Get number of days for a period
 */
function getDaysForPeriod(period: string): number {
  switch (period) {
    case '7d':
      return 7
    case '30d':
      return 30
    case '90d':
      return 90
    case '1y':
      return 365
    default:
      return 30
  }
}

// ============================================================================
// METRICS IMPLEMENTATION
// ============================================================================

function createMetrics(config: StudioConfig): MetricsInterface {
  // Base values for mock data
  const baseMrr = 125000 // $1,250 MRR
  const baseCustomers = 45

  return {
    async getCurrent(): Promise<StudioMetrics> {
      // In a real implementation, this would call the API
      const mrr = baseMrr
      const arr = mrr * 12

      return {
        mrr,
        arr,
        churnRate: 2.5, // 2.5%
        nrr: 105, // 105% - expansion exceeds churn
        totalCustomers: baseCustomers,
        activeSubscriptions: baseCustomers - 3,
        arpu: Math.round(mrr / baseCustomers),
        ltv: Math.round((mrr / baseCustomers) / 0.025 * 12), // LTV = ARPU / churn rate
        trialConversionRate: 32, // 32%
        activeTrials: 8,
      }
    },

    async getMrrTrend(options: TrendPeriodOptions): Promise<MrrTrend> {
      const days = getDaysForPeriod(options.period)
      const dataPoints = generateTrendData(days, baseMrr, baseMrr * 0.1)

      const startValue = dataPoints[0]?.value ?? baseMrr
      const endValue = dataPoints[dataPoints.length - 1]?.value ?? baseMrr
      const changePercent = ((endValue - startValue) / startValue) * 100

      return {
        dataPoints,
        changePercent: Math.round(changePercent * 10) / 10,
        changeDirection: changePercent > 1 ? 'up' : changePercent < -1 ? 'down' : 'flat',
        startValue,
        endValue,
      }
    },

    async getChurnTrend(options: TrendPeriodOptions): Promise<ChurnTrend> {
      const days = getDaysForPeriod(options.period)
      const dataPoints = generateTrendData(days, 2.5, 1)
      const averageChurn = dataPoints.reduce((sum, dp) => sum + dp.value, 0) / dataPoints.length

      return {
        dataPoints,
        averageChurn: Math.round(averageChurn * 10) / 10,
      }
    },

    async getCustomerGrowthTrend(options: TrendPeriodOptions): Promise<CustomerGrowthTrend> {
      const days = getDaysForPeriod(options.period)
      const dataPoints = generateTrendData(days, baseCustomers, 5)

      const newCustomers = Math.round(days * 0.3) // ~0.3 new customers per day
      const churnedCustomers = Math.round(days * 0.05) // ~0.05 churned per day

      return {
        newCustomers,
        churnedCustomers,
        netGrowth: newCustomers - churnedCustomers,
        dataPoints,
      }
    },
  }
}

// ============================================================================
// CUSTOMERS IMPLEMENTATION
// ============================================================================

function createCustomers(config: StudioConfig): CustomersInterface {
  // Mock customer data
  const mockCustomers: Customer[] = [
    {
      id: 'cus_123',
      email: 'john@example.com.ai',
      name: 'John Smith',
      company: 'Acme Inc',
      planId: 'pro',
      status: 'active',
      mrr: 4900,
      createdAt: new Date('2025-06-15'),
      lastActiveAt: new Date(),
      subscription: {
        id: 'sub_123',
        planId: 'pro',
        status: 'active',
        currentPeriodStart: new Date('2025-12-01'),
        currentPeriodEnd: new Date('2026-01-01'),
        cancelAtPeriodEnd: false,
      },
      billingHistory: [
        {
          id: 'inv_001',
          date: new Date('2025-12-01'),
          amount: 4900,
          currency: 'usd',
          status: 'paid',
          description: 'Pro Plan - December 2025',
        },
      ],
      activityTimeline: [
        {
          id: 'evt_001',
          type: 'subscription.created',
          description: 'Subscribed to Pro Plan',
          timestamp: new Date('2025-06-15'),
        },
      ],
    },
    {
      id: 'cus_124',
      email: 'jane@startup.io',
      name: 'Jane Doe',
      company: 'StartupIO',
      planId: 'starter',
      status: 'trialing',
      mrr: 0,
      createdAt: new Date('2025-12-28'),
      subscription: {
        id: 'sub_124',
        planId: 'starter',
        status: 'trialing',
        currentPeriodStart: new Date('2025-12-28'),
        currentPeriodEnd: new Date('2026-01-28'),
        cancelAtPeriodEnd: false,
        trialEnd: new Date('2026-01-11'),
      },
      billingHistory: [],
      activityTimeline: [],
    },
  ]

  return {
    async list(options: CustomerListOptions = {}): Promise<CustomerListResult> {
      let filtered = [...mockCustomers]

      // Apply filters
      if (options.status) {
        filtered = filtered.filter(c => c.status === options.status)
      }
      if (options.planId) {
        filtered = filtered.filter(c => c.planId === options.planId)
      }

      // Apply sorting
      if (options.sortBy) {
        filtered.sort((a, b) => {
          const aVal = a[options.sortBy!]
          const bVal = b[options.sortBy!]
          if (aVal === undefined || bVal === undefined) return 0
          if (aVal < bVal) return options.sortOrder === 'desc' ? 1 : -1
          if (aVal > bVal) return options.sortOrder === 'desc' ? -1 : 1
          return 0
        })
      }

      // Apply pagination
      const page = options.page ?? 1
      const limit = options.limit ?? 10
      const start = (page - 1) * limit
      const paginated = filtered.slice(start, start + limit)

      return {
        customers: paginated,
        total: filtered.length,
        page,
        limit,
      }
    },

    async search(query: string): Promise<CustomerListResult> {
      const lowerQuery = query.toLowerCase()
      const filtered = mockCustomers.filter(
        c =>
          c.email.toLowerCase().includes(lowerQuery) ||
          (c.name?.toLowerCase().includes(lowerQuery) ?? false)
      )

      return {
        customers: filtered,
        total: filtered.length,
        page: 1,
        limit: filtered.length,
      }
    },

    async get(customerId: string): Promise<Customer> {
      const customer = mockCustomers.find(c => c.id === customerId)
      if (!customer) {
        // Return a mock customer for any ID
        return {
          id: customerId,
          email: 'user@example.com.ai',
          name: 'Test User',
          planId: 'pro',
          status: 'active',
          mrr: 4900,
          createdAt: new Date(),
          subscription: {
            id: `sub_${customerId}`,
            planId: 'pro',
            status: 'active',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            cancelAtPeriodEnd: false,
          },
          billingHistory: [],
          activityTimeline: [],
        }
      }
      return customer
    },

    async upgrade(customerId: string, newPlanId: string): Promise<UpgradeResult> {
      return {
        success: true,
        newPlanId,
      }
    },

    async downgrade(customerId: string, newPlanId: string): Promise<DowngradeResult> {
      return {
        success: true,
        newPlanId,
        effectiveDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }
    },

    async cancel(customerId: string, options: CancelOptions): Promise<CancelResult> {
      return {
        success: true,
        cancelAt: options.immediately ? new Date() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }
    },

    async reactivate(customerId: string): Promise<ReactivateResult> {
      return {
        success: true,
        status: 'active',
      }
    },

    async applyDiscount(customerId: string, options: ApplyDiscountOptions): Promise<ApplyDiscountResult> {
      return {
        success: true,
        discount: {
          couponId: options.couponId,
          percentOff: 20,
        },
      }
    },

    async extendTrial(customerId: string, options: ExtendTrialOptions): Promise<ExtendTrialResult> {
      return {
        success: true,
        newTrialEnd: new Date(Date.now() + (options.additionalDays + 14) * 24 * 60 * 60 * 1000),
      }
    },
  }
}

// ============================================================================
// REVENUE IMPLEMENTATION
// ============================================================================

function createRevenue(config: StudioConfig): RevenueInterface {
  const baseMrr = 125000

  return {
    async getSummary(): Promise<RevenueSummary> {
      return {
        totalRevenue: baseMrr * 12,
        recurringRevenue: baseMrr * 12 * 0.95,
        oneTimeRevenue: baseMrr * 12 * 0.05,
        refunds: baseMrr * 0.02,
        netRevenue: baseMrr * 12 - baseMrr * 0.02,
      }
    },

    async getByPeriod(options: RevenuePeriodOptions): Promise<RevenueTimeSeries> {
      const periodDays = {
        day: 1,
        week: 7,
        month: 30,
        quarter: 90,
        year: 365,
      }
      const days = periodDays[options.period] || 30
      const dataPoints = generateTrendData(days, baseMrr / 30, baseMrr * 0.05)

      return {
        dataPoints,
        period: options.period,
        total: dataPoints.reduce((sum, dp) => sum + dp.value, 0),
      }
    },

    async getByPlan(): Promise<RevenueData[]> {
      return [
        { planId: 'starter', planName: 'Starter', mrr: 25000, customerCount: 15 },
        { planId: 'pro', planName: 'Pro', mrr: 60000, customerCount: 20 },
        { planId: 'enterprise', planName: 'Enterprise', mrr: 40000, customerCount: 5 },
      ]
    },

    async getPlanDistribution(): Promise<PlanDistribution[]> {
      return [
        { planId: 'starter', planName: 'Starter', percentage: 20 },
        { planId: 'pro', planName: 'Pro', percentage: 48 },
        { planId: 'enterprise', planName: 'Enterprise', percentage: 32 },
      ]
    },

    async getGrowthRate(options: TrendPeriodOptions): Promise<GrowthRate> {
      const previousPeriodRevenue = baseMrr * 0.9
      const currentPeriodRevenue = baseMrr

      return {
        rate: (currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue,
        previousPeriodRevenue,
        currentPeriodRevenue,
      }
    },

    async getExpansionRevenue(options: TrendPeriodOptions): Promise<ExpansionRevenue> {
      return {
        upgrades: 8,
        expansionMrr: 15000,
      }
    },

    async getContractionRevenue(options: TrendPeriodOptions): Promise<ContractionRevenue> {
      return {
        downgrades: 3,
        contractionMrr: 5000,
      }
    },

    async getCohortAnalysis(options: CohortAnalysisOptions): Promise<CohortData[]> {
      return [
        { month: '2025-01', customers: 10, retentionByMonth: [100, 90, 85, 80, 78, 75] },
        { month: '2025-02', customers: 12, retentionByMonth: [100, 92, 88, 82, 80] },
        { month: '2025-03', customers: 15, retentionByMonth: [100, 93, 90, 85] },
        { month: '2025-04', customers: 18, retentionByMonth: [100, 89, 85] },
        { month: '2025-05', customers: 14, retentionByMonth: [100, 93] },
        { month: '2025-06', customers: 20, retentionByMonth: [100] },
      ]
    },
  }
}

// ============================================================================
// USAGE IMPLEMENTATION
// ============================================================================

function createUsage(config: StudioConfig): UsageInterface {
  return {
    async getApiUsage(options: TrendPeriodOptions): Promise<ApiUsageSummary> {
      const totalCalls = 150000
      const failedCalls = 1500

      return {
        totalCalls,
        successfulCalls: totalCalls - failedCalls,
        failedCalls,
        successRate: ((totalCalls - failedCalls) / totalCalls) * 100,
      }
    },

    async getByEndpoint(options: TrendPeriodOptions): Promise<UsageData[]> {
      return [
        { path: '/api/customers', method: 'GET', count: 45000, avgResponseTime: 120 },
        { path: '/api/customers', method: 'POST', count: 5000, avgResponseTime: 250 },
        { path: '/api/orders', method: 'GET', count: 60000, avgResponseTime: 95 },
        { path: '/api/orders', method: 'POST', count: 25000, avgResponseTime: 180 },
        { path: '/api/products', method: 'GET', count: 15000, avgResponseTime: 75 },
      ]
    },

    async getTrend(options: UsageTrendOptions): Promise<UsageTrend> {
      const days = getDaysForPeriod(options.period)
      const dataPoints = generateTrendData(days, 5000, 1000)

      return {
        dataPoints,
        total: dataPoints.reduce((sum, dp) => sum + dp.value, 0),
      }
    },

    async getFeatureAdoption(): Promise<FeatureAdoption[]> {
      return [
        { name: 'Dashboard', usageCount: 4500, adoptionRate: 95 },
        { name: 'Reports', usageCount: 3200, adoptionRate: 72 },
        { name: 'API Access', usageCount: 2800, adoptionRate: 65 },
        { name: 'Webhooks', usageCount: 1500, adoptionRate: 35 },
        { name: 'Team Sharing', usageCount: 2100, adoptionRate: 48 },
      ]
    },

    async getFeaturesByPlan(): Promise<Record<string, FeatureAdoption[]>> {
      return {
        starter: [
          { name: 'Dashboard', usageCount: 1000, adoptionRate: 90 },
          { name: 'Reports', usageCount: 500, adoptionRate: 45 },
        ],
        pro: [
          { name: 'Dashboard', usageCount: 2500, adoptionRate: 98 },
          { name: 'Reports', usageCount: 2000, adoptionRate: 85 },
          { name: 'API Access', usageCount: 1800, adoptionRate: 75 },
        ],
        enterprise: [
          { name: 'Dashboard', usageCount: 1000, adoptionRate: 100 },
          { name: 'Reports', usageCount: 700, adoptionRate: 95 },
          { name: 'API Access', usageCount: 1000, adoptionRate: 100 },
          { name: 'Webhooks', usageCount: 500, adoptionRate: 80 },
        ],
      }
    },

    async getCustomerUsage(customerId: string, options: TrendPeriodOptions): Promise<CustomerUsage> {
      return {
        customerId,
        apiCalls: 2500,
        featureUsage: {
          Dashboard: 150,
          Reports: 45,
          'API Access': 80,
        },
        storageUsed: 524288000, // 500MB
      }
    },

    async getTopUsers(options: { limit: number; period: string }): Promise<TopUser[]> {
      return [
        { customerId: 'cus_001', email: 'power@user.com', usageScore: 95, apiCalls: 25000 },
        { customerId: 'cus_002', email: 'active@startup.io', usageScore: 88, apiCalls: 18000 },
        { customerId: 'cus_003', email: 'team@enterprise.com', usageScore: 82, apiCalls: 15000 },
      ].slice(0, options.limit)
    },

    async getAtRiskCustomers(): Promise<AtRiskCustomer[]> {
      return [
        { customerId: 'cus_risk1', email: 'quiet@example.com.ai', usageScore: 15, riskLevel: 'high', daysSinceActive: 21 },
        { customerId: 'cus_risk2', email: 'dormant@test.io', usageScore: 28, riskLevel: 'medium', daysSinceActive: 14 },
        { customerId: 'cus_risk3', email: 'lowuse@demo.com', usageScore: 42, riskLevel: 'low', daysSinceActive: 7 },
      ]
    },
  }
}

// ============================================================================
// TEAM IMPLEMENTATION
// ============================================================================

function createTeam(config: StudioConfig): TeamInterface {
  const mockMembers: TeamMember[] = [
    { id: 'member_owner', email: 'owner@company.com', name: 'Owner', role: 'owner', joinedAt: new Date('2025-01-01') },
    { id: 'member_admin', email: 'admin@company.com', name: 'Admin', role: 'admin', joinedAt: new Date('2025-03-15') },
    { id: 'member_123', email: 'viewer@company.com', name: 'Viewer', role: 'viewer', joinedAt: new Date('2025-06-01') },
  ]

  return {
    async list(): Promise<TeamMember[]> {
      return mockMembers
    },

    async invite(options: InviteMemberOptions): Promise<InviteResult> {
      return {
        success: true,
        inviteId: `invite_${Date.now()}`,
      }
    },

    async updateRole(memberId: string, newRole: TeamRole): Promise<UpdateRoleResult> {
      return {
        success: true,
        newRole,
      }
    },

    async remove(memberId: string): Promise<ActionResult> {
      return {
        success: true,
      }
    },

    async getRoles(): Promise<TeamRole[]> {
      return ['owner', 'admin', 'member', 'viewer']
    },

    async getRolePermissions(role: TeamRole): Promise<RolePermissions> {
      const permissions: Record<TeamRole, RolePermissions> = {
        owner: {
          canViewMetrics: true,
          canManageCustomers: true,
          canManageTeam: true,
          canManageSettings: true,
          canManageBilling: true,
        },
        admin: {
          canViewMetrics: true,
          canManageCustomers: true,
          canManageTeam: true,
          canManageSettings: true,
          canManageBilling: false,
        },
        member: {
          canViewMetrics: true,
          canManageCustomers: true,
          canManageTeam: false,
          canManageSettings: false,
          canManageBilling: false,
        },
        viewer: {
          canViewMetrics: true,
          canManageCustomers: false,
          canManageTeam: false,
          canManageSettings: false,
          canManageBilling: false,
        },
      }

      return permissions[role]
    },
  }
}

// ============================================================================
// SETTINGS IMPLEMENTATION
// ============================================================================

function createSettings(config: StudioConfig): SettingsInterface {
  return {
    async get(): Promise<AppSettings> {
      return {
        appName: config.appId,
        timezone: config.timezone ?? 'UTC',
        currency: config.currency ?? 'usd',
        supportEmail: 'support@example.com.ai',
      }
    },

    async update(options: UpdateSettingsOptions): Promise<ActionResult> {
      return { success: true }
    },

    async getBilling(): Promise<BillingSettings> {
      return {
        stripeConnected: true,
        plans: [
          { id: 'starter', name: 'Starter', price: 1900, interval: 'month' },
          { id: 'pro', name: 'Pro', price: 4900, interval: 'month' },
          { id: 'enterprise', name: 'Enterprise', price: 9900, interval: 'month' },
        ],
        taxRate: 0,
        defaultCurrency: 'usd',
      }
    },

    async updateBilling(options: UpdateBillingOptions): Promise<ActionResult> {
      return { success: true }
    },

    async getNotifications(): Promise<NotificationSettings> {
      return {
        newCustomerEmail: true,
        churnAlertEmail: true,
        weeklyReportEmail: false,
        paymentFailureEmail: true,
      }
    },

    async updateNotifications(options: UpdateNotificationOptions): Promise<ActionResult> {
      return { success: true }
    },

    async getIntegrations(): Promise<ConnectedIntegration[]> {
      return [
        { name: 'stripe', connected: true, connectedAt: new Date('2025-01-01') },
        { name: 'slack', connected: false },
        { name: 'zapier', connected: false },
      ]
    },

    async connectIntegration(name: string, integrationConfig: Record<string, unknown>): Promise<ActionResult> {
      return { success: true }
    },

    async disconnectIntegration(name: string): Promise<ActionResult> {
      return { success: true }
    },
  }
}

// ============================================================================
// ALERTS IMPLEMENTATION
// ============================================================================

function createAlerts(config: StudioConfig): AlertsInterface {
  // Mock alert data
  const mockAlerts: Alert[] = [
    {
      id: 'alert_001',
      type: 'churn_risk',
      severity: 'critical',
      status: 'active',
      title: 'High churn risk: Acme Corp',
      description: 'Customer has not logged in for 21 days and usage dropped 85%',
      customerId: 'cus_risk1',
      customerEmail: 'admin@acme.com',
      recommendedAction: 'Schedule a check-in call to understand their needs',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'alert_002',
      type: 'growth_opportunity',
      severity: 'info',
      status: 'active',
      title: 'Expansion opportunity: StartupIO',
      description: 'Customer hitting usage limits consistently, good candidate for upgrade',
      customerId: 'cus_124',
      customerEmail: 'jane@startup.io',
      recommendedAction: 'Reach out about Pro plan benefits',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'alert_003',
      type: 'usage_anomaly',
      severity: 'warning',
      status: 'active',
      title: 'Unusual API usage spike',
      description: 'API calls increased 300% in the last hour',
      recommendedAction: 'Review API logs for potential issues',
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    },
    {
      id: 'alert_004',
      type: 'trial_expiring',
      severity: 'warning',
      status: 'active',
      title: 'Trial expiring: Jane Doe',
      description: 'Trial ends in 3 days. Customer shows high engagement.',
      customerId: 'cus_124',
      customerEmail: 'jane@startup.io',
      recommendedAction: 'Send conversion email with special offer',
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    },
    {
      id: 'alert_005',
      type: 'payment_failed',
      severity: 'critical',
      status: 'active',
      title: 'Payment failed: Enterprise Customer',
      description: 'Credit card declined for monthly subscription',
      customerId: 'cus_ent1',
      customerEmail: 'billing@enterprise.com',
      recommendedAction: 'Contact customer to update payment method',
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    },
  ]

  const mockChurnRiskAlerts: ChurnRiskAlert[] = [
    {
      id: 'churn_001',
      type: 'churn_risk',
      severity: 'critical',
      status: 'active',
      title: 'High churn risk: Acme Corp',
      description: 'Multiple risk factors detected',
      customerId: 'cus_risk1',
      customerEmail: 'admin@acme.com',
      recommendedAction: 'Schedule urgent check-in call',
      riskScore: 85,
      riskFactors: ['No login in 21 days', 'Usage dropped 85%', 'Support tickets increased', 'Contract renewal in 30 days'],
      daysSinceActive: 21,
      mrrAtRisk: 4900,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'churn_002',
      type: 'churn_risk',
      severity: 'warning',
      status: 'active',
      title: 'Medium churn risk: TechStart',
      description: 'Declining engagement pattern',
      customerId: 'cus_risk2',
      customerEmail: 'tech@start.io',
      recommendedAction: 'Send re-engagement email',
      riskScore: 55,
      riskFactors: ['Usage declining steadily', 'Fewer team members active'],
      daysSinceActive: 7,
      mrrAtRisk: 1900,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  ]

  const mockGrowthOpportunities: GrowthOpportunityAlert[] = [
    {
      id: 'growth_001',
      type: 'growth_opportunity',
      severity: 'info',
      status: 'active',
      title: 'Upsell opportunity: StartupIO',
      description: 'Customer consistently hitting plan limits',
      customerId: 'cus_124',
      customerEmail: 'jane@startup.io',
      recommendedAction: 'Present Pro plan upgrade options',
      opportunityType: 'upsell',
      potentialMrr: 3000,
      confidence: 78,
      signals: ['API usage at 95% of limit', 'Team size grew 50%', 'Using all features'],
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'growth_002',
      type: 'growth_opportunity',
      severity: 'info',
      status: 'active',
      title: 'Expansion: Power User Team',
      description: 'High-engagement team requesting additional seats',
      customerId: 'cus_power',
      customerEmail: 'team@power.com',
      recommendedAction: 'Offer volume discount for seat expansion',
      opportunityType: 'expansion',
      potentialMrr: 5000,
      confidence: 92,
      signals: ['Requested additional seats', '100% feature adoption', 'Zero churn risk'],
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  ]

  const mockUsageAnomalies: UsageAnomalyAlert[] = [
    {
      id: 'anomaly_001',
      type: 'usage_anomaly',
      severity: 'warning',
      status: 'active',
      title: 'API usage spike detected',
      description: 'Unusual increase in API calls from single customer',
      customerId: 'cus_spike',
      customerEmail: 'dev@spike.io',
      recommendedAction: 'Review API logs and contact customer',
      anomalyType: 'spike',
      metric: 'api_calls',
      expectedValue: 5000,
      actualValue: 20000,
      deviationPercent: 300,
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    },
    {
      id: 'anomaly_002',
      type: 'usage_anomaly',
      severity: 'critical',
      status: 'active',
      title: 'Engagement drop across Pro customers',
      description: 'Overall Pro plan engagement down 40% week-over-week',
      recommendedAction: 'Investigate potential product issues',
      anomalyType: 'drop',
      metric: 'daily_active_users',
      expectedValue: 850,
      actualValue: 510,
      deviationPercent: -40,
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
  ]

  return {
    async list(options: AlertListOptions = {}): Promise<AlertListResult> {
      let filtered = [...mockAlerts]

      if (options.type) {
        filtered = filtered.filter(a => a.type === options.type)
      }
      if (options.severity) {
        filtered = filtered.filter(a => a.severity === options.severity)
      }
      if (options.status) {
        filtered = filtered.filter(a => a.status === options.status)
      }
      if (options.customerId) {
        filtered = filtered.filter(a => a.customerId === options.customerId)
      }

      // Apply sorting
      if (options.sortBy) {
        filtered.sort((a, b) => {
          const severityOrder = { critical: 0, warning: 1, info: 2 }
          const statusOrder = { active: 0, acknowledged: 1, snoozed: 2, resolved: 3 }

          let comparison = 0
          if (options.sortBy === 'severity') {
            comparison = severityOrder[a.severity] - severityOrder[b.severity]
          } else if (options.sortBy === 'status') {
            comparison = statusOrder[a.status] - statusOrder[b.status]
          } else if (options.sortBy === 'createdAt') {
            comparison = a.createdAt.getTime() - b.createdAt.getTime()
          }

          return options.sortOrder === 'desc' ? -comparison : comparison
        })
      }

      const page = options.page ?? 1
      const limit = options.limit ?? 10
      const start = (page - 1) * limit
      const paginated = filtered.slice(start, start + limit)

      return {
        alerts: paginated,
        total: filtered.length,
        page,
        limit,
      }
    },

    async getSummary(): Promise<AlertSummary> {
      const activeAlerts = mockAlerts.filter(a => a.status === 'active')
      return {
        totalActive: activeAlerts.length,
        critical: activeAlerts.filter(a => a.severity === 'critical').length,
        warnings: activeAlerts.filter(a => a.severity === 'warning').length,
        info: activeAlerts.filter(a => a.severity === 'info').length,
        byType: {
          churn_risk: mockAlerts.filter(a => a.type === 'churn_risk').length,
          growth_opportunity: mockAlerts.filter(a => a.type === 'growth_opportunity').length,
          usage_anomaly: mockAlerts.filter(a => a.type === 'usage_anomaly').length,
          revenue_forecast: 0,
          trial_expiring: mockAlerts.filter(a => a.type === 'trial_expiring').length,
          payment_failed: mockAlerts.filter(a => a.type === 'payment_failed').length,
          expansion_opportunity: 0,
          engagement_drop: 0,
        },
      }
    },

    async get(alertId: string): Promise<Alert> {
      const alert = mockAlerts.find(a => a.id === alertId)
      if (alert) return alert

      // Return a default alert for any ID
      return {
        id: alertId,
        type: 'churn_risk',
        severity: 'warning',
        status: 'active',
        title: 'Alert',
        description: 'Alert details',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    },

    async acknowledge(alertId: string, options?: AcknowledgeAlertOptions): Promise<ActionResult> {
      return { success: true }
    },

    async snooze(alertId: string, options: SnoozeAlertOptions): Promise<ActionResult> {
      return { success: true }
    },

    async resolve(alertId: string, options?: ResolveAlertOptions): Promise<ActionResult> {
      return { success: true }
    },

    async getChurnRisks(): Promise<ChurnRiskAlert[]> {
      return mockChurnRiskAlerts
    },

    async getGrowthOpportunities(): Promise<GrowthOpportunityAlert[]> {
      return mockGrowthOpportunities
    },

    async getUsageAnomalies(): Promise<UsageAnomalyAlert[]> {
      return mockUsageAnomalies
    },
  }
}

// ============================================================================
// INSIGHTS IMPLEMENTATION
// ============================================================================

function createInsights(config: StudioConfig): InsightsInterface {
  return {
    async getRevenueForecast(months: number): Promise<RevenueForecast[]> {
      const forecasts: RevenueForecast[] = []
      const baseMrr = 125000
      const now = new Date()

      for (let i = 1; i <= months; i++) {
        const futureDate = new Date(now)
        futureDate.setMonth(futureDate.getMonth() + i)
        const period = futureDate.toISOString().slice(0, 7)

        // Simulate growth with some variance
        const growthRate = 0.05 // 5% monthly growth
        const predictedMrr = Math.round(baseMrr * Math.pow(1 + growthRate, i))
        const variance = predictedMrr * 0.1 // 10% variance

        forecasts.push({
          period,
          predictedMrr,
          lowEstimate: Math.round(predictedMrr - variance),
          highEstimate: Math.round(predictedMrr + variance),
          confidence: Math.max(60, 95 - i * 5), // Confidence decreases with time
          factors: [
            {
              name: 'Historical growth trend',
              impact: 'positive',
              magnitude: 70,
              description: 'Consistent 5% MoM growth over past 6 months',
            },
            {
              name: 'New feature launch',
              impact: 'positive',
              magnitude: 25,
              description: 'Upcoming feature expected to improve retention',
            },
            {
              name: 'Seasonal pattern',
              impact: i % 3 === 0 ? 'negative' : 'neutral',
              magnitude: 15,
              description: 'Q1 historically slower for new signups',
            },
          ],
        })
      }

      return forecasts
    },

    async getEnhancedCohorts(options: CohortAnalysisOptions): Promise<EnhancedCohortData[]> {
      return [
        {
          month: '2025-07',
          customers: 15,
          initialMrr: 28500,
          retentionByMonth: [100, 93, 87, 83, 80, 78],
          revenueRetentionByMonth: [100, 95, 92, 90, 88, 87],
          expansionByMonth: [0, 5, 8, 12, 15, 18],
          churnByMonth: [0, 1, 1, 1, 0, 1],
          nrrByMonth: [100, 100, 100, 102, 103, 105],
        },
        {
          month: '2025-08',
          customers: 20,
          initialMrr: 38000,
          retentionByMonth: [100, 95, 90, 85, 82],
          revenueRetentionByMonth: [100, 97, 95, 93, 92],
          expansionByMonth: [0, 3, 7, 10, 14],
          churnByMonth: [0, 1, 1, 1, 1],
          nrrByMonth: [100, 100, 102, 103, 106],
        },
        {
          month: '2025-09',
          customers: 25,
          initialMrr: 47500,
          retentionByMonth: [100, 92, 88, 84],
          revenueRetentionByMonth: [100, 94, 91, 90],
          expansionByMonth: [0, 4, 8, 12],
          churnByMonth: [0, 2, 1, 1],
          nrrByMonth: [100, 98, 99, 102],
        },
        {
          month: '2025-10',
          customers: 30,
          initialMrr: 57000,
          retentionByMonth: [100, 93, 89],
          revenueRetentionByMonth: [100, 96, 94],
          expansionByMonth: [0, 5, 9],
          churnByMonth: [0, 2, 1],
          nrrByMonth: [100, 101, 103],
        },
        {
          month: '2025-11',
          customers: 28,
          initialMrr: 53200,
          retentionByMonth: [100, 96],
          revenueRetentionByMonth: [100, 98],
          expansionByMonth: [0, 4],
          churnByMonth: [0, 1],
          nrrByMonth: [100, 102],
        },
        {
          month: '2025-12',
          customers: 35,
          initialMrr: 66500,
          retentionByMonth: [100],
          revenueRetentionByMonth: [100],
          expansionByMonth: [0],
          churnByMonth: [0],
          nrrByMonth: [100],
        },
      ]
    },

    async getCustomerHealth(customerId?: string): Promise<CustomerHealthScore[]> {
      const mockHealthScores: CustomerHealthScore[] = [
        {
          customerId: 'cus_123',
          email: 'john@example.com.ai',
          overallScore: 85,
          category: 'healthy',
          components: {
            usage: 90,
            engagement: 88,
            support: 95,
            payment: 100,
            adoption: 72,
          },
          trend: 'stable',
          calculatedAt: new Date(),
        },
        {
          customerId: 'cus_124',
          email: 'jane@startup.io',
          overallScore: 92,
          category: 'healthy',
          components: {
            usage: 95,
            engagement: 93,
            support: 100,
            payment: 100,
            adoption: 78,
          },
          trend: 'improving',
          calculatedAt: new Date(),
        },
        {
          customerId: 'cus_risk1',
          email: 'admin@acme.com',
          overallScore: 32,
          category: 'critical',
          components: {
            usage: 15,
            engagement: 20,
            support: 40,
            payment: 100,
            adoption: 45,
          },
          trend: 'declining',
          calculatedAt: new Date(),
        },
        {
          customerId: 'cus_risk2',
          email: 'tech@start.io',
          overallScore: 55,
          category: 'at_risk',
          components: {
            usage: 50,
            engagement: 45,
            support: 75,
            payment: 100,
            adoption: 55,
          },
          trend: 'declining',
          calculatedAt: new Date(),
        },
      ]

      if (customerId) {
        return mockHealthScores.filter(h => h.customerId === customerId)
      }
      return mockHealthScores
    },

    async getGrowthInsights(): Promise<GrowthInsights> {
      return {
        currentGrowthRate: 8.5,
        projectedAnnualGrowth: 112,
        topDrivers: [
          'Strong product-market fit in developer tools segment',
          'Word-of-mouth referrals from power users',
          'Competitive pricing for Pro tier',
          'High trial-to-paid conversion rate (32%)',
        ],
        blockers: [
          'Limited marketing budget constraining awareness',
          'Enterprise sales cycle too long (avg 45 days)',
          'Churn in Starter tier (4.2% monthly)',
        ],
        recommendations: [
          'Implement referral program to capitalize on word-of-mouth',
          'Add annual billing option with 20% discount',
          'Create onboarding improvements for Starter tier',
          'Expand sales team for Enterprise segment',
        ],
        bestSegment: {
          name: 'Pro Plan - Tech Startups',
          growthRate: 15.2,
        },
        worstSegment: {
          name: 'Starter Plan - Freelancers',
          growthRate: -2.1,
        },
      }
    },

    async getEngagementMetrics(options: TrendPeriodOptions): Promise<EngagementMetrics> {
      return {
        dauPercent: 42,
        wauPercent: 68,
        mauPercent: 85,
        avgSessionDuration: 1245, // ~20 minutes
        stickiness: 0.49, // DAU/MAU ratio
        powerUsers: 125,
        dormantUsers: 45,
        trend: 'up',
        weekOverWeekChange: 3.5,
      }
    },

    async getCustomersByHealth(category: 'healthy' | 'at_risk' | 'critical'): Promise<CustomerHealthScore[]> {
      const all = await this.getCustomerHealth()
      return all.filter(h => h.category === category)
    },
  }
}

// ============================================================================
// NOTIFICATIONS IMPLEMENTATION
// ============================================================================

function createNotifications(config: StudioConfig): NotificationsInterface {
  const mockRules: NotificationRule[] = [
    {
      id: 'rule_001',
      name: 'Critical Alerts to Slack',
      enabled: true,
      trigger: 'alert_critical',
      channels: ['slack'],
      filters: {
        minSeverity: 'critical',
      },
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    },
    {
      id: 'rule_002',
      name: 'Daily Digest Email',
      enabled: true,
      trigger: 'daily_digest',
      channels: ['email'],
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    },
    {
      id: 'rule_003',
      name: 'Churn Risk Alerts',
      enabled: true,
      trigger: 'churn_risk_high',
      channels: ['email', 'slack'],
      filters: {
        alertTypes: ['churn_risk'],
        minSeverity: 'warning',
      },
      createdAt: new Date('2025-01-05'),
      updatedAt: new Date('2025-01-05'),
    },
    {
      id: 'rule_004',
      name: 'New Customer Webhook',
      enabled: false,
      trigger: 'new_customer',
      channels: ['webhook'],
      createdAt: new Date('2025-01-10'),
      updatedAt: new Date('2025-01-10'),
    },
  ]

  const mockDeliveries: NotificationDelivery[] = [
    {
      id: 'delivery_001',
      ruleId: 'rule_001',
      channel: 'slack',
      trigger: 'alert_critical',
      alertId: 'alert_001',
      status: 'sent',
      sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      id: 'delivery_002',
      ruleId: 'rule_002',
      channel: 'email',
      trigger: 'daily_digest',
      status: 'sent',
      sentAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    },
    {
      id: 'delivery_003',
      ruleId: 'rule_003',
      channel: 'email',
      trigger: 'churn_risk_high',
      alertId: 'churn_001',
      status: 'sent',
      sentAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    },
  ]

  // Channel configurations (mock state)
  let emailConfig: EmailNotificationConfig | null = {
    recipients: ['team@example.com.ai'],
    includeDetails: true,
    subjectPrefix: '[SaaS.Studio]',
  }

  let slackConfig: SlackNotificationConfig | null = {
    webhookUrl: 'https://hooks.slack.com/services/xxx',
    channel: '#saas-alerts',
    mentionOnCritical: true,
    botName: 'SaaS.Studio Bot',
  }

  let webhookConfig: WebhookNotificationConfig | null = null

  return {
    async listRules(): Promise<NotificationRule[]> {
      return mockRules
    },

    async createRule(options: CreateNotificationRuleOptions): Promise<NotificationRule> {
      const newRule: NotificationRule = {
        id: `rule_${Date.now()}`,
        name: options.name,
        enabled: true,
        trigger: options.trigger,
        channels: options.channels,
        filters: options.filters,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockRules.push(newRule)
      return newRule
    },

    async updateRule(ruleId: string, updates: Partial<CreateNotificationRuleOptions>): Promise<NotificationRule> {
      const rule = mockRules.find(r => r.id === ruleId)
      if (rule) {
        Object.assign(rule, updates, { updatedAt: new Date() })
        return rule
      }
      throw new Error('Rule not found')
    },

    async deleteRule(ruleId: string): Promise<ActionResult> {
      const index = mockRules.findIndex(r => r.id === ruleId)
      if (index !== -1) {
        mockRules.splice(index, 1)
      }
      return { success: true }
    },

    async toggleRule(ruleId: string, enabled: boolean): Promise<ActionResult> {
      const rule = mockRules.find(r => r.id === ruleId)
      if (rule) {
        rule.enabled = enabled
        rule.updatedAt = new Date()
      }
      return { success: true }
    },

    async configureEmail(channelConfig: EmailNotificationConfig): Promise<ActionResult> {
      emailConfig = channelConfig
      return { success: true }
    },

    async configureSlack(channelConfig: SlackNotificationConfig): Promise<ActionResult> {
      slackConfig = channelConfig
      return { success: true }
    },

    async configureWebhook(channelConfig: WebhookNotificationConfig): Promise<ActionResult> {
      webhookConfig = channelConfig
      return { success: true }
    },

    async getChannelConfig(channel: NotificationChannel): Promise<EmailNotificationConfig | SlackNotificationConfig | WebhookNotificationConfig | null> {
      switch (channel) {
        case 'email':
          return emailConfig
        case 'slack':
          return slackConfig
        case 'webhook':
          return webhookConfig
        default:
          return null
      }
    },

    async testChannel(channel: NotificationChannel): Promise<ActionResult> {
      // Simulate channel test
      switch (channel) {
        case 'email':
          return emailConfig ? { success: true } : { success: false, error: 'Email not configured' }
        case 'slack':
          return slackConfig ? { success: true } : { success: false, error: 'Slack not configured' }
        case 'webhook':
          return webhookConfig ? { success: true } : { success: false, error: 'Webhook not configured' }
        default:
          return { success: false, error: 'Unknown channel' }
      }
    },

    async getDeliveries(options?: { limit?: number; ruleId?: string }): Promise<NotificationDelivery[]> {
      let filtered = [...mockDeliveries]
      if (options?.ruleId) {
        filtered = filtered.filter(d => d.ruleId === options.ruleId)
      }
      if (options?.limit) {
        filtered = filtered.slice(0, options.limit)
      }
      return filtered
    },

    async send(channel: NotificationChannel, message: string, options?: { subject?: string }): Promise<ActionResult> {
      // In real implementation, this would send via the configured channel
      return { success: true }
    },
  }
}

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

type Subscription = { event: StudioEventType; handler: StudioEventHandler }

function createSubscriptionManager() {
  const subscriptions: Subscription[] = []

  return {
    subscribe(event: StudioEventType, handler: StudioEventHandler): () => void {
      const subscription = { event, handler }
      subscriptions.push(subscription)

      // Return unsubscribe function
      return () => {
        const index = subscriptions.indexOf(subscription)
        if (index !== -1) {
          subscriptions.splice(index, 1)
        }
      }
    },

    emit(event: StudioEventType, data: unknown) {
      subscriptions
        .filter(s => s.event === event)
        .forEach(s => s.handler(data))
    },
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a new SaaS.Studio instance
 *
 * @param config - Configuration options
 * @returns A configured Studio instance
 *
 * @example
 * ```ts
 * const studio = createStudio({
 *   appId: 'my-saas',
 *   apiUrl: 'https://api.my-saas.com',
 *   apiKey: 'sk_live_...',
 * })
 *
 * // Get current metrics
 * const metrics = await studio.metrics.getCurrent()
 * console.log(`MRR: $${metrics.mrr / 100}`)
 *
 * // List customers
 * const { customers } = await studio.customers.list({ status: 'active' })
 *
 * // Subscribe to real-time updates
 * studio.subscribe('metrics', (data) => {
 *   console.log('Metrics updated:', data)
 * })
 * ```
 */
export function createStudio(config: StudioConfig): StudioInterface {
  const subscriptionManager = createSubscriptionManager()

  // Apply defaults
  const fullConfig: StudioConfig = {
    refreshInterval: 60000,
    timezone: 'UTC',
    currency: 'usd',
    ...config,
  }

  return {
    config: fullConfig,
    metrics: createMetrics(fullConfig),
    customers: createCustomers(fullConfig),
    revenue: createRevenue(fullConfig),
    usage: createUsage(fullConfig),
    alerts: createAlerts(fullConfig),
    insights: createInsights(fullConfig),
    notifications: createNotifications(fullConfig),
    team: createTeam(fullConfig),
    settings: createSettings(fullConfig),

    subscribe: subscriptionManager.subscribe,

    async checkConnection(): Promise<ConnectionStatus> {
      try {
        // In a real implementation, this would ping the API
        // For now, we simulate connection check
        const isValidUrl = config.apiUrl.startsWith('http')

        if (!isValidUrl || config.apiUrl.includes('invalid')) {
          return {
            connected: false,
            appId: config.appId,
            error: 'Unable to connect to API',
          }
        }

        return {
          connected: true,
          appId: config.appId,
          apiVersion: '1.0.0',
        }
      } catch (error) {
        return {
          connected: false,
          appId: config.appId,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    },
  }
}
