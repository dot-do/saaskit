/**
 * SaaS.Studio Types
 *
 * Type definitions for the SaaS.Studio management console.
 * SaaS.Studio provides a visual dashboard for managing your SaaS business:
 * - Metrics (MRR, ARR, churn, NRR)
 * - Customer management
 * - Revenue analytics
 * - Usage analytics
 * - Team management
 * - Settings
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Configuration for creating a Studio instance
 */
export interface StudioConfig {
  /** Unique identifier for your SaaS app */
  appId: string
  /** Base URL for your SaaS API */
  apiUrl: string
  /** API key for authentication (optional if using session auth) */
  apiKey?: string
  /** How often to refresh metrics in milliseconds (default: 60000) */
  refreshInterval?: number
  /** Timezone for date calculations (default: UTC) */
  timezone?: string
  /** Default currency for revenue display (default: usd) */
  currency?: string
}

// ============================================================================
// METRICS
// ============================================================================

/**
 * Core SaaS metrics
 */
export interface StudioMetrics {
  /** Monthly Recurring Revenue in cents */
  mrr: number
  /** Annual Recurring Revenue (MRR * 12) in cents */
  arr: number
  /** Churn rate as percentage (0-100) */
  churnRate: number
  /** Net Revenue Retention as percentage */
  nrr: number
  /** Total number of customers */
  totalCustomers: number
  /** Number of active subscriptions */
  activeSubscriptions: number
  /** Average Revenue Per User in cents */
  arpu: number
  /** Lifetime Value in cents */
  ltv: number
  /** Trial conversion rate as percentage (0-100) */
  trialConversionRate: number
  /** Number of customers currently in trial */
  activeTrials: number
}

/**
 * Data point for time-series metrics
 */
export interface TrendDataPoint {
  /** ISO date string */
  date: string
  /** Value at this point */
  value: number
}

/**
 * MRR/ARR trend data
 */
export interface MrrTrend {
  /** Time-series data points */
  dataPoints: TrendDataPoint[]
  /** Percentage change from start to end */
  changePercent: number
  /** Direction of change */
  changeDirection: 'up' | 'down' | 'flat'
  /** Starting value */
  startValue: number
  /** Ending value */
  endValue: number
}

/**
 * Churn trend data
 */
export interface ChurnTrend {
  /** Time-series data points */
  dataPoints: TrendDataPoint[]
  /** Average churn over the period */
  averageChurn: number
}

/**
 * Customer growth trend data
 */
export interface CustomerGrowthTrend {
  /** New customers acquired in period */
  newCustomers: number
  /** Customers lost in period */
  churnedCustomers: number
  /** Net customer growth */
  netGrowth: number
  /** Time-series data points */
  dataPoints: TrendDataPoint[]
}

/**
 * Period options for trend queries
 */
export interface TrendPeriodOptions {
  /** Period to analyze: 7d, 30d, 90d, 1y */
  period: '7d' | '30d' | '90d' | '1y'
}

/**
 * Metrics interface for Studio
 */
export interface MetricsInterface {
  /** Get current metrics snapshot */
  getCurrent: () => Promise<StudioMetrics>
  /** Get MRR trend data */
  getMrrTrend: (options: TrendPeriodOptions) => Promise<MrrTrend>
  /** Get churn trend data */
  getChurnTrend: (options: TrendPeriodOptions) => Promise<ChurnTrend>
  /** Get customer growth trend data */
  getCustomerGrowthTrend: (options: TrendPeriodOptions) => Promise<CustomerGrowthTrend>
}

// ============================================================================
// CUSTOMERS
// ============================================================================

/**
 * Customer status
 */
export type CustomerStatus = 'active' | 'trialing' | 'past_due' | 'churned' | 'canceled'

/**
 * Customer subscription details
 */
export interface CustomerSubscription {
  /** Subscription ID */
  id: string
  /** Plan ID */
  planId: string
  /** Subscription status */
  status: string
  /** Current billing period start */
  currentPeriodStart: Date
  /** Current billing period end */
  currentPeriodEnd: Date
  /** Whether subscription cancels at period end */
  cancelAtPeriodEnd: boolean
  /** Trial end date if trialing */
  trialEnd?: Date
}

/**
 * Billing history entry
 */
export interface BillingHistoryEntry {
  /** Invoice ID */
  id: string
  /** Invoice date */
  date: Date
  /** Amount in cents */
  amount: number
  /** Currency */
  currency: string
  /** Payment status */
  status: 'paid' | 'pending' | 'failed' | 'refunded'
  /** Description */
  description?: string
}

/**
 * Activity timeline entry
 */
export interface ActivityTimelineEntry {
  /** Event ID */
  id: string
  /** Event type */
  type: string
  /** Event description */
  description: string
  /** When event occurred */
  timestamp: Date
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Full customer entity
 */
export interface Customer {
  /** Customer ID */
  id: string
  /** Email address */
  email: string
  /** Display name */
  name?: string
  /** Company name */
  company?: string
  /** Current plan ID */
  planId?: string
  /** Customer status */
  status: CustomerStatus
  /** Monthly recurring revenue in cents */
  mrr: number
  /** Account creation date */
  createdAt: Date
  /** Last activity date */
  lastActiveAt?: Date
  /** Subscription details */
  subscription?: CustomerSubscription
  /** Billing history */
  billingHistory?: BillingHistoryEntry[]
  /** Activity timeline */
  activityTimeline?: ActivityTimelineEntry[]
  /** Custom metadata */
  metadata?: Record<string, unknown>
}

/**
 * Customer list options
 */
export interface CustomerListOptions {
  /** Page number (1-indexed) */
  page?: number
  /** Items per page */
  limit?: number
  /** Filter by status */
  status?: CustomerStatus
  /** Filter by plan ID */
  planId?: string
  /** Sort field */
  sortBy?: 'mrr' | 'createdAt' | 'name' | 'email'
  /** Sort order */
  sortOrder?: 'asc' | 'desc'
}

/**
 * Paginated customer list result
 */
export interface CustomerListResult {
  /** Customers in this page */
  customers: Customer[]
  /** Total number of customers */
  total: number
  /** Current page */
  page: number
  /** Items per page */
  limit: number
}

/**
 * Cancel subscription options
 */
export interface CancelOptions {
  /** Cancel immediately or at period end */
  immediately: boolean
  /** Cancellation reason */
  reason?: string
  /** Additional feedback */
  feedback?: string
}

/**
 * Apply discount options
 */
export interface ApplyDiscountOptions {
  /** Coupon ID to apply */
  couponId: string
}

/**
 * Extend trial options
 */
export interface ExtendTrialOptions {
  /** Additional days to add */
  additionalDays: number
  /** Reason for extension */
  reason?: string
}

/**
 * Action result with success flag
 */
export interface ActionResult {
  /** Whether action succeeded */
  success: boolean
  /** Error message if failed */
  error?: string
}

/**
 * Upgrade result
 */
export interface UpgradeResult extends ActionResult {
  /** New plan ID */
  newPlanId?: string
}

/**
 * Downgrade result
 */
export interface DowngradeResult extends ActionResult {
  /** New plan ID */
  newPlanId?: string
  /** Date downgrade takes effect */
  effectiveDate?: Date
}

/**
 * Cancel result
 */
export interface CancelResult extends ActionResult {
  /** Date subscription will be canceled */
  cancelAt?: Date
}

/**
 * Reactivate result
 */
export interface ReactivateResult extends ActionResult {
  /** New subscription status */
  status?: string
}

/**
 * Apply discount result
 */
export interface ApplyDiscountResult extends ActionResult {
  /** Applied discount details */
  discount?: {
    couponId: string
    percentOff?: number
    amountOff?: number
  }
}

/**
 * Extend trial result
 */
export interface ExtendTrialResult extends ActionResult {
  /** New trial end date */
  newTrialEnd?: Date
}

/**
 * Customers interface for Studio
 */
export interface CustomersInterface {
  /** List customers with pagination and filters */
  list: (options?: CustomerListOptions) => Promise<CustomerListResult>
  /** Search customers by name or email */
  search: (query: string) => Promise<CustomerListResult>
  /** Get full customer details by ID */
  get: (customerId: string) => Promise<Customer>
  /** Upgrade customer to higher plan */
  upgrade: (customerId: string, newPlanId: string) => Promise<UpgradeResult>
  /** Downgrade customer to lower plan */
  downgrade: (customerId: string, newPlanId: string) => Promise<DowngradeResult>
  /** Cancel customer subscription */
  cancel: (customerId: string, options: CancelOptions) => Promise<CancelResult>
  /** Reactivate canceled subscription */
  reactivate: (customerId: string) => Promise<ReactivateResult>
  /** Apply discount to customer */
  applyDiscount: (customerId: string, options: ApplyDiscountOptions) => Promise<ApplyDiscountResult>
  /** Extend customer's trial period */
  extendTrial: (customerId: string, options: ExtendTrialOptions) => Promise<ExtendTrialResult>
}

// ============================================================================
// REVENUE ANALYTICS
// ============================================================================

/**
 * Revenue summary
 */
export interface RevenueSummary {
  /** Total revenue in cents */
  totalRevenue: number
  /** Recurring revenue in cents */
  recurringRevenue: number
  /** One-time revenue in cents */
  oneTimeRevenue: number
  /** Refunds in cents */
  refunds: number
  /** Net revenue in cents */
  netRevenue: number
}

/**
 * Revenue by period options
 */
export interface RevenuePeriodOptions {
  /** Period granularity */
  period: 'day' | 'week' | 'month' | 'quarter' | 'year'
}

/**
 * Revenue time series result
 */
export interface RevenueTimeSeries {
  /** Data points */
  dataPoints: TrendDataPoint[]
  /** Period granularity */
  period: string
  /** Total for period */
  total: number
}

/**
 * Revenue by plan data
 */
export interface RevenueData {
  /** Plan ID */
  planId: string
  /** Plan name */
  planName: string
  /** MRR for this plan in cents */
  mrr: number
  /** Number of customers on this plan */
  customerCount: number
  /** Percentage of total MRR */
  percentage?: number
}

/**
 * Plan distribution entry
 */
export interface PlanDistribution {
  /** Plan ID */
  planId: string
  /** Plan name */
  planName: string
  /** Percentage of total MRR */
  percentage: number
}

/**
 * Growth rate result
 */
export interface GrowthRate {
  /** Growth rate as decimal (0.15 = 15%) */
  rate: number
  /** Previous period revenue in cents */
  previousPeriodRevenue: number
  /** Current period revenue in cents */
  currentPeriodRevenue: number
}

/**
 * Expansion revenue result
 */
export interface ExpansionRevenue {
  /** Number of upgrades */
  upgrades: number
  /** Expansion MRR in cents */
  expansionMrr: number
}

/**
 * Contraction revenue result
 */
export interface ContractionRevenue {
  /** Number of downgrades */
  downgrades: number
  /** Contraction MRR in cents */
  contractionMrr: number
}

/**
 * Cohort analysis options
 */
export interface CohortAnalysisOptions {
  /** Start month (YYYY-MM) */
  startMonth: string
  /** End month (YYYY-MM) */
  endMonth: string
}

/**
 * Cohort data
 */
export interface CohortData {
  /** Cohort month (YYYY-MM) */
  month: string
  /** Number of customers in cohort */
  customers: number
  /** Retention by month index */
  retentionByMonth: number[]
}

/**
 * Revenue interface for Studio
 */
export interface RevenueInterface {
  /** Get revenue summary */
  getSummary: () => Promise<RevenueSummary>
  /** Get revenue by period */
  getByPeriod: (options: RevenuePeriodOptions) => Promise<RevenueTimeSeries>
  /** Get revenue breakdown by plan */
  getByPlan: () => Promise<RevenueData[]>
  /** Get plan distribution percentages */
  getPlanDistribution: () => Promise<PlanDistribution[]>
  /** Get revenue growth rate */
  getGrowthRate: (options: TrendPeriodOptions) => Promise<GrowthRate>
  /** Get expansion revenue (upgrades) */
  getExpansionRevenue: (options: TrendPeriodOptions) => Promise<ExpansionRevenue>
  /** Get contraction revenue (downgrades) */
  getContractionRevenue: (options: TrendPeriodOptions) => Promise<ContractionRevenue>
  /** Get cohort retention analysis */
  getCohortAnalysis: (options: CohortAnalysisOptions) => Promise<CohortData[]>
}

// ============================================================================
// USAGE ANALYTICS
// ============================================================================

/**
 * API usage summary
 */
export interface ApiUsageSummary {
  /** Total API calls */
  totalCalls: number
  /** Successful calls */
  successfulCalls: number
  /** Failed calls */
  failedCalls: number
  /** Success rate as percentage */
  successRate: number
}

/**
 * Usage by endpoint data
 */
export interface UsageData {
  /** API path */
  path: string
  /** HTTP method */
  method: string
  /** Number of calls */
  count: number
  /** Average response time in ms */
  avgResponseTime?: number
  /** Error rate */
  errorRate?: number
}

/**
 * Usage trend options
 */
export interface UsageTrendOptions {
  /** Period to analyze */
  period: '7d' | '30d' | '90d'
  /** Granularity of data points */
  granularity?: 'hour' | 'day' | 'week'
}

/**
 * Usage trend result
 */
export interface UsageTrend {
  /** Data points */
  dataPoints: TrendDataPoint[]
  /** Total usage in period */
  total: number
}

/**
 * Feature adoption data
 */
export interface FeatureAdoption {
  /** Feature name */
  name: string
  /** Number of times used */
  usageCount: number
  /** Percentage of customers using feature */
  adoptionRate: number
}

/**
 * Customer usage data
 */
export interface CustomerUsage {
  /** Customer ID */
  customerId: string
  /** API call count */
  apiCalls: number
  /** Feature usage breakdown */
  featureUsage: Record<string, number>
  /** Storage used in bytes */
  storageUsed: number
}

/**
 * Top user data
 */
export interface TopUser {
  /** Customer ID */
  customerId: string
  /** Customer email */
  email: string
  /** Usage score */
  usageScore: number
  /** API calls */
  apiCalls: number
}

/**
 * At-risk customer data
 */
export interface AtRiskCustomer {
  /** Customer ID */
  customerId: string
  /** Customer email */
  email: string
  /** Usage score (lower is worse) */
  usageScore: number
  /** Risk level */
  riskLevel: 'low' | 'medium' | 'high'
  /** Days since last activity */
  daysSinceActive: number
}

/**
 * Usage interface for Studio
 */
export interface UsageInterface {
  /** Get API usage summary */
  getApiUsage: (options: TrendPeriodOptions) => Promise<ApiUsageSummary>
  /** Get usage by endpoint */
  getByEndpoint: (options: TrendPeriodOptions) => Promise<UsageData[]>
  /** Get usage trend over time */
  getTrend: (options: UsageTrendOptions) => Promise<UsageTrend>
  /** Get feature adoption metrics */
  getFeatureAdoption: () => Promise<FeatureAdoption[]>
  /** Get feature usage by plan */
  getFeaturesByPlan: () => Promise<Record<string, FeatureAdoption[]>>
  /** Get usage for specific customer */
  getCustomerUsage: (customerId: string, options: TrendPeriodOptions) => Promise<CustomerUsage>
  /** Get top users by usage */
  getTopUsers: (options: { limit: number; period: string }) => Promise<TopUser[]>
  /** Get customers with low usage (churn risk) */
  getAtRiskCustomers: () => Promise<AtRiskCustomer[]>
}

// ============================================================================
// TEAM MANAGEMENT
// ============================================================================

/**
 * Team member role
 */
export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer'

/**
 * Team member entity
 */
export interface TeamMember {
  /** Member ID */
  id: string
  /** Email address */
  email: string
  /** Display name */
  name?: string
  /** Member role */
  role: TeamRole
  /** Date joined */
  joinedAt: Date
  /** Last active */
  lastActiveAt?: Date
  /** Avatar URL */
  avatarUrl?: string
}

/**
 * Invite member options
 */
export interface InviteMemberOptions {
  /** Email to invite */
  email: string
  /** Role to assign */
  role: TeamRole
}

/**
 * Invite result
 */
export interface InviteResult extends ActionResult {
  /** Invite ID */
  inviteId?: string
}

/**
 * Update role result
 */
export interface UpdateRoleResult extends ActionResult {
  /** New role */
  newRole?: TeamRole
}

/**
 * Role permissions
 */
export interface RolePermissions {
  /** Can view metrics dashboard */
  canViewMetrics: boolean
  /** Can manage customers */
  canManageCustomers: boolean
  /** Can manage team */
  canManageTeam: boolean
  /** Can manage settings */
  canManageSettings: boolean
  /** Can manage billing */
  canManageBilling: boolean
}

/**
 * Team interface for Studio
 */
export interface TeamInterface {
  /** List team members */
  list: () => Promise<TeamMember[]>
  /** Invite new team member */
  invite: (options: InviteMemberOptions) => Promise<InviteResult>
  /** Update team member role */
  updateRole: (memberId: string, newRole: TeamRole) => Promise<UpdateRoleResult>
  /** Remove team member */
  remove: (memberId: string) => Promise<ActionResult>
  /** Get available roles */
  getRoles: () => Promise<TeamRole[]>
  /** Get permissions for a role */
  getRolePermissions: (role: TeamRole) => Promise<RolePermissions>
}

// ============================================================================
// SETTINGS
// ============================================================================

/**
 * General app settings
 */
export interface AppSettings {
  /** App display name */
  appName: string
  /** Timezone */
  timezone: string
  /** Default currency */
  currency: string
  /** Logo URL */
  logoUrl?: string
  /** Support email */
  supportEmail?: string
}

/**
 * Billing settings
 */
export interface BillingSettings {
  /** Whether Stripe is connected */
  stripeConnected: boolean
  /** Available plans */
  plans: Array<{
    id: string
    name: string
    price: number
    interval: 'month' | 'year'
  }>
  /** Tax rate percentage */
  taxRate?: number
  /** Default currency */
  defaultCurrency: string
}

/**
 * Notification settings
 */
export interface NotificationSettings {
  /** Email on new customer */
  newCustomerEmail: boolean
  /** Email on churn */
  churnAlertEmail: boolean
  /** Weekly summary email */
  weeklyReportEmail: boolean
  /** Payment failure alert */
  paymentFailureEmail: boolean
}

/**
 * Connected integration
 */
export interface ConnectedIntegration {
  /** Integration name */
  name: string
  /** Whether connected */
  connected: boolean
  /** When connected */
  connectedAt?: Date
  /** Integration-specific config */
  config?: Record<string, unknown>
}

/**
 * Update settings options
 */
export interface UpdateSettingsOptions {
  /** Timezone */
  timezone?: string
  /** Currency */
  currency?: string
  /** Logo URL */
  logoUrl?: string
  /** Support email */
  supportEmail?: string
}

/**
 * Update billing options
 */
export interface UpdateBillingOptions {
  /** Tax rate percentage */
  taxRate?: number
  /** Default currency */
  defaultCurrency?: string
}

/**
 * Update notification options
 */
export interface UpdateNotificationOptions {
  /** Email on new customer */
  newCustomerEmail?: boolean
  /** Email on churn */
  churnAlertEmail?: boolean
  /** Weekly summary email */
  weeklyReportEmail?: boolean
  /** Payment failure alert */
  paymentFailureEmail?: boolean
}

/**
 * Settings interface for Studio
 */
export interface SettingsInterface {
  /** Get current settings */
  get: () => Promise<AppSettings>
  /** Update settings */
  update: (options: UpdateSettingsOptions) => Promise<ActionResult>
  /** Get billing settings */
  getBilling: () => Promise<BillingSettings>
  /** Update billing settings */
  updateBilling: (options: UpdateBillingOptions) => Promise<ActionResult>
  /** Get notification settings */
  getNotifications: () => Promise<NotificationSettings>
  /** Update notification settings */
  updateNotifications: (options: UpdateNotificationOptions) => Promise<ActionResult>
  /** Get connected integrations */
  getIntegrations: () => Promise<ConnectedIntegration[]>
  /** Connect an integration */
  connectIntegration: (name: string, config: Record<string, unknown>) => Promise<ActionResult>
  /** Disconnect an integration */
  disconnectIntegration: (name: string) => Promise<ActionResult>
}

// ============================================================================
// CONNECTION STATUS
// ============================================================================

/**
 * Connection status result
 */
export interface ConnectionStatus {
  /** Whether connected to API */
  connected: boolean
  /** App ID */
  appId: string
  /** Error message if not connected */
  error?: string
  /** API version */
  apiVersion?: string
}

// ============================================================================
// ALERTS
// ============================================================================

/**
 * Alert severity levels
 */
export type AlertSeverity = 'info' | 'warning' | 'critical'

/**
 * Alert status
 */
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'snoozed'

/**
 * Alert types for different insights
 */
export type AlertType =
  | 'churn_risk'
  | 'growth_opportunity'
  | 'usage_anomaly'
  | 'revenue_forecast'
  | 'trial_expiring'
  | 'payment_failed'
  | 'expansion_opportunity'
  | 'engagement_drop'

/**
 * Base alert entity
 */
export interface Alert {
  /** Unique alert ID */
  id: string
  /** Type of alert */
  type: AlertType
  /** Severity level */
  severity: AlertSeverity
  /** Current status */
  status: AlertStatus
  /** Alert title */
  title: string
  /** Detailed description */
  description: string
  /** Related customer ID (if applicable) */
  customerId?: string
  /** Related customer email (if applicable) */
  customerEmail?: string
  /** Recommended action */
  recommendedAction?: string
  /** Alert metadata */
  metadata?: Record<string, unknown>
  /** When alert was created */
  createdAt: Date
  /** When alert was last updated */
  updatedAt: Date
  /** When alert was acknowledged (if acknowledged) */
  acknowledgedAt?: Date
  /** Who acknowledged the alert */
  acknowledgedBy?: string
  /** When alert was resolved (if resolved) */
  resolvedAt?: Date
  /** Snooze until timestamp (if snoozed) */
  snoozeUntil?: Date
}

/**
 * Churn risk alert with specific details
 */
export interface ChurnRiskAlert extends Alert {
  type: 'churn_risk'
  /** Risk score (0-100) */
  riskScore: number
  /** Risk factors identified */
  riskFactors: string[]
  /** Days since last activity */
  daysSinceActive: number
  /** MRR at risk in cents */
  mrrAtRisk: number
}

/**
 * Growth opportunity alert
 */
export interface GrowthOpportunityAlert extends Alert {
  type: 'growth_opportunity'
  /** Type of growth opportunity */
  opportunityType: 'upsell' | 'cross_sell' | 'expansion' | 'referral'
  /** Potential MRR increase in cents */
  potentialMrr: number
  /** Confidence score (0-100) */
  confidence: number
  /** Signals that indicate this opportunity */
  signals: string[]
}

/**
 * Usage anomaly alert
 */
export interface UsageAnomalyAlert extends Alert {
  type: 'usage_anomaly'
  /** Type of anomaly */
  anomalyType: 'spike' | 'drop' | 'pattern_change'
  /** Metric affected */
  metric: string
  /** Expected value */
  expectedValue: number
  /** Actual value */
  actualValue: number
  /** Deviation percentage */
  deviationPercent: number
}

/**
 * Alert list options
 */
export interface AlertListOptions {
  /** Filter by type */
  type?: AlertType
  /** Filter by severity */
  severity?: AlertSeverity
  /** Filter by status */
  status?: AlertStatus
  /** Filter by customer ID */
  customerId?: string
  /** Page number */
  page?: number
  /** Items per page */
  limit?: number
  /** Sort by field */
  sortBy?: 'createdAt' | 'severity' | 'status'
  /** Sort order */
  sortOrder?: 'asc' | 'desc'
}

/**
 * Paginated alert list result
 */
export interface AlertListResult {
  /** Alerts in this page */
  alerts: Alert[]
  /** Total number of alerts */
  total: number
  /** Current page */
  page: number
  /** Items per page */
  limit: number
}

/**
 * Alert summary by type
 */
export interface AlertSummary {
  /** Total active alerts */
  totalActive: number
  /** Critical alerts count */
  critical: number
  /** Warning alerts count */
  warnings: number
  /** Info alerts count */
  info: number
  /** Breakdown by type */
  byType: Record<AlertType, number>
}

/**
 * Acknowledge alert options
 */
export interface AcknowledgeAlertOptions {
  /** Note for acknowledgement */
  note?: string
}

/**
 * Snooze alert options
 */
export interface SnoozeAlertOptions {
  /** Duration in hours */
  hours: number
  /** Reason for snoozing */
  reason?: string
}

/**
 * Resolve alert options
 */
export interface ResolveAlertOptions {
  /** Resolution notes */
  resolution?: string
  /** Action taken */
  actionTaken?: string
}

/**
 * Alerts interface for Studio
 */
export interface AlertsInterface {
  /** List alerts with filters */
  list: (options?: AlertListOptions) => Promise<AlertListResult>
  /** Get alert summary */
  getSummary: () => Promise<AlertSummary>
  /** Get single alert by ID */
  get: (alertId: string) => Promise<Alert>
  /** Acknowledge an alert */
  acknowledge: (alertId: string, options?: AcknowledgeAlertOptions) => Promise<ActionResult>
  /** Snooze an alert */
  snooze: (alertId: string, options: SnoozeAlertOptions) => Promise<ActionResult>
  /** Resolve an alert */
  resolve: (alertId: string, options?: ResolveAlertOptions) => Promise<ActionResult>
  /** Get churn risk alerts */
  getChurnRisks: () => Promise<ChurnRiskAlert[]>
  /** Get growth opportunities */
  getGrowthOpportunities: () => Promise<GrowthOpportunityAlert[]>
  /** Get usage anomalies */
  getUsageAnomalies: () => Promise<UsageAnomalyAlert[]>
}

// ============================================================================
// INSIGHTS & FORECASTING
// ============================================================================

/**
 * Revenue forecast data
 */
export interface RevenueForecast {
  /** Forecast period (e.g., '2026-02') */
  period: string
  /** Predicted MRR in cents */
  predictedMrr: number
  /** Low estimate (confidence interval) */
  lowEstimate: number
  /** High estimate (confidence interval) */
  highEstimate: number
  /** Confidence percentage (0-100) */
  confidence: number
  /** Factors affecting forecast */
  factors: ForecastFactor[]
}

/**
 * Factor affecting revenue forecast
 */
export interface ForecastFactor {
  /** Factor name */
  name: string
  /** Impact direction */
  impact: 'positive' | 'negative' | 'neutral'
  /** Impact magnitude (0-100) */
  magnitude: number
  /** Description */
  description: string
}

/**
 * Enhanced cohort analysis with revenue tracking
 */
export interface EnhancedCohortData {
  /** Cohort month (YYYY-MM) */
  month: string
  /** Number of customers in cohort */
  customers: number
  /** Initial MRR of cohort in cents */
  initialMrr: number
  /** Retention by month index (percentage) */
  retentionByMonth: number[]
  /** Revenue retention by month (percentage) */
  revenueRetentionByMonth: number[]
  /** Expansion by month (percentage) */
  expansionByMonth: number[]
  /** Churn by month (count) */
  churnByMonth: number[]
  /** Net revenue retention by month */
  nrrByMonth: number[]
}

/**
 * Customer health score breakdown
 */
export interface CustomerHealthScore {
  /** Customer ID */
  customerId: string
  /** Customer email */
  email: string
  /** Overall health score (0-100) */
  overallScore: number
  /** Score category */
  category: 'healthy' | 'at_risk' | 'critical'
  /** Component scores */
  components: {
    /** Usage activity score */
    usage: number
    /** Engagement score */
    engagement: number
    /** Support ticket score */
    support: number
    /** Payment history score */
    payment: number
    /** Feature adoption score */
    adoption: number
  }
  /** Trend direction */
  trend: 'improving' | 'stable' | 'declining'
  /** Last calculated */
  calculatedAt: Date
}

/**
 * Growth insights summary
 */
export interface GrowthInsights {
  /** Current growth rate (percentage) */
  currentGrowthRate: number
  /** Projected annual growth */
  projectedAnnualGrowth: number
  /** Top growth drivers */
  topDrivers: string[]
  /** Growth blockers */
  blockers: string[]
  /** Recommended actions */
  recommendations: string[]
  /** Best performing segment */
  bestSegment?: {
    name: string
    growthRate: number
  }
  /** Worst performing segment */
  worstSegment?: {
    name: string
    growthRate: number
  }
}

/**
 * Engagement metrics for insights
 */
export interface EngagementMetrics {
  /** Daily active users percentage */
  dauPercent: number
  /** Weekly active users percentage */
  wauPercent: number
  /** Monthly active users percentage */
  mauPercent: number
  /** Average session duration in seconds */
  avgSessionDuration: number
  /** Feature stickiness (DAU/MAU ratio) */
  stickiness: number
  /** Power users count */
  powerUsers: number
  /** Dormant users count (no activity 14+ days) */
  dormantUsers: number
  /** Engagement trend */
  trend: 'up' | 'down' | 'flat'
  /** Week-over-week change */
  weekOverWeekChange: number
}

/**
 * Insights interface for Studio
 */
export interface InsightsInterface {
  /** Get revenue forecast */
  getRevenueForecast: (months: number) => Promise<RevenueForecast[]>
  /** Get enhanced cohort analysis */
  getEnhancedCohorts: (options: CohortAnalysisOptions) => Promise<EnhancedCohortData[]>
  /** Get customer health scores */
  getCustomerHealth: (customerId?: string) => Promise<CustomerHealthScore[]>
  /** Get growth insights */
  getGrowthInsights: () => Promise<GrowthInsights>
  /** Get engagement metrics */
  getEngagementMetrics: (options: TrendPeriodOptions) => Promise<EngagementMetrics>
  /** Get customers by health category */
  getCustomersByHealth: (category: 'healthy' | 'at_risk' | 'critical') => Promise<CustomerHealthScore[]>
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

/**
 * Notification channel types
 */
export type NotificationChannel = 'email' | 'slack' | 'webhook'

/**
 * Notification trigger types
 */
export type NotificationTrigger =
  | 'alert_created'
  | 'alert_critical'
  | 'churn_risk_high'
  | 'growth_opportunity'
  | 'usage_anomaly'
  | 'trial_expiring_soon'
  | 'payment_failed'
  | 'new_customer'
  | 'customer_upgraded'
  | 'customer_churned'
  | 'daily_digest'
  | 'weekly_report'

/**
 * Notification rule configuration
 */
export interface NotificationRule {
  /** Rule ID */
  id: string
  /** Rule name */
  name: string
  /** Whether rule is enabled */
  enabled: boolean
  /** Trigger for this rule */
  trigger: NotificationTrigger
  /** Channels to notify */
  channels: NotificationChannel[]
  /** Additional filters */
  filters?: {
    /** Minimum severity */
    minSeverity?: AlertSeverity
    /** Specific alert types */
    alertTypes?: AlertType[]
    /** Customer segments */
    segments?: string[]
  }
  /** Created timestamp */
  createdAt: Date
  /** Last updated */
  updatedAt: Date
}

/**
 * Email notification configuration
 */
export interface EmailNotificationConfig {
  /** Recipient email addresses */
  recipients: string[]
  /** Whether to include detailed report */
  includeDetails: boolean
  /** Custom subject prefix */
  subjectPrefix?: string
}

/**
 * Slack notification configuration
 */
export interface SlackNotificationConfig {
  /** Slack webhook URL */
  webhookUrl: string
  /** Channel to post to */
  channel: string
  /** Whether to mention @channel for critical alerts */
  mentionOnCritical: boolean
  /** Custom bot name */
  botName?: string
  /** Custom bot icon */
  botIcon?: string
}

/**
 * Webhook notification configuration
 */
export interface WebhookNotificationConfig {
  /** Webhook URL */
  url: string
  /** HTTP method */
  method: 'POST' | 'PUT'
  /** Custom headers */
  headers?: Record<string, string>
  /** Secret for signature verification */
  secret?: string
}

/**
 * Notification delivery record
 */
export interface NotificationDelivery {
  /** Delivery ID */
  id: string
  /** Rule that triggered this */
  ruleId: string
  /** Channel used */
  channel: NotificationChannel
  /** Trigger event */
  trigger: NotificationTrigger
  /** Related alert ID (if applicable) */
  alertId?: string
  /** Delivery status */
  status: 'pending' | 'sent' | 'failed'
  /** Error message if failed */
  error?: string
  /** Sent timestamp */
  sentAt?: Date
  /** Created timestamp */
  createdAt: Date
}

/**
 * Notification rule creation options
 */
export interface CreateNotificationRuleOptions {
  /** Rule name */
  name: string
  /** Trigger for this rule */
  trigger: NotificationTrigger
  /** Channels to notify */
  channels: NotificationChannel[]
  /** Additional filters */
  filters?: NotificationRule['filters']
}

/**
 * Notifications interface for Studio
 */
export interface NotificationsInterface {
  /** List notification rules */
  listRules: () => Promise<NotificationRule[]>
  /** Create notification rule */
  createRule: (options: CreateNotificationRuleOptions) => Promise<NotificationRule>
  /** Update notification rule */
  updateRule: (ruleId: string, updates: Partial<CreateNotificationRuleOptions>) => Promise<NotificationRule>
  /** Delete notification rule */
  deleteRule: (ruleId: string) => Promise<ActionResult>
  /** Enable/disable rule */
  toggleRule: (ruleId: string, enabled: boolean) => Promise<ActionResult>
  /** Configure email channel */
  configureEmail: (config: EmailNotificationConfig) => Promise<ActionResult>
  /** Configure Slack channel */
  configureSlack: (config: SlackNotificationConfig) => Promise<ActionResult>
  /** Configure webhook */
  configureWebhook: (config: WebhookNotificationConfig) => Promise<ActionResult>
  /** Get channel configuration */
  getChannelConfig: (channel: NotificationChannel) => Promise<EmailNotificationConfig | SlackNotificationConfig | WebhookNotificationConfig | null>
  /** Test notification channel */
  testChannel: (channel: NotificationChannel) => Promise<ActionResult>
  /** Get recent deliveries */
  getDeliveries: (options?: { limit?: number; ruleId?: string }) => Promise<NotificationDelivery[]>
  /** Send manual notification */
  send: (channel: NotificationChannel, message: string, options?: { subject?: string }) => Promise<ActionResult>
}

// ============================================================================
// MAIN STUDIO INTERFACE
// ============================================================================

/**
 * Event types for subscriptions
 */
export type StudioEventType = 'metrics' | 'customers' | 'revenue' | 'usage' | 'alerts' | 'insights'

/**
 * Event handler function
 */
export type StudioEventHandler<T = unknown> = (data: T) => void

/**
 * The main Studio interface
 *
 * Provides access to all Studio functionality:
 * - metrics: Real-time SaaS metrics
 * - customers: Customer management
 * - revenue: Revenue analytics
 * - usage: Usage analytics
 * - alerts: Churn risk, growth opportunities, anomalies
 * - insights: Forecasting, cohort analysis, health scores
 * - notifications: Email/Slack/Webhook notifications
 * - team: Team management
 * - settings: App settings
 */
export interface StudioInterface {
  /** Configuration */
  config: StudioConfig
  /** Metrics dashboard */
  metrics: MetricsInterface
  /** Customer management */
  customers: CustomersInterface
  /** Revenue analytics */
  revenue: RevenueInterface
  /** Usage analytics */
  usage: UsageInterface
  /** Alerts - churn risk, growth opportunities, anomalies */
  alerts: AlertsInterface
  /** Insights - forecasting, cohort analysis, health scores */
  insights: InsightsInterface
  /** Notifications - email, Slack, webhook */
  notifications: NotificationsInterface
  /** Team management */
  team: TeamInterface
  /** Settings */
  settings: SettingsInterface
  /** Subscribe to real-time updates */
  subscribe: (event: StudioEventType, handler: StudioEventHandler) => () => void
  /** Check API connection */
  checkConnection: () => Promise<ConnectionStatus>
}
