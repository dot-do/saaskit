/**
 * SaaS.Studio - Management Console for YOUR SaaS
 *
 * SaaS.Studio provides a visual dashboard for managing your SaaS business:
 * - Metrics Dashboard: MRR, ARR, churn, NRR, customer counts
 * - Customer Management: List, search, upgrade, downgrade, cancel
 * - Revenue Analytics: Revenue trends, by plan, cohort analysis
 * - Usage Analytics: API usage, feature adoption, at-risk customers
 * - Team Management: Invite members, manage roles
 * - Settings: App settings, billing, notifications, integrations
 *
 * @example
 * ```ts
 * import { createStudio } from 'saaskit/studio'
 *
 * const studio = createStudio({
 *   appId: 'my-saas',
 *   apiUrl: 'https://api.my-saas.saas.dev',
 *   apiKey: 'sk_live_...',
 * })
 *
 * // Get current metrics
 * const metrics = await studio.metrics.getCurrent()
 * console.log(`MRR: $${(metrics.mrr / 100).toFixed(2)}`)
 * console.log(`Churn Rate: ${metrics.churnRate}%`)
 *
 * // List active customers
 * const { customers, total } = await studio.customers.list({
 *   status: 'active',
 *   sortBy: 'mrr',
 *   sortOrder: 'desc',
 * })
 *
 * // Get revenue breakdown by plan
 * const byPlan = await studio.revenue.getByPlan()
 *
 * // Subscribe to real-time metric updates
 * studio.subscribe('metrics', (data) => {
 *   console.log('Metrics updated:', data)
 * })
 * ```
 *
 * @packageDocumentation
 */

// Factory function
export { createStudio } from './studio'

// All types
export type {
  // Configuration
  StudioConfig,

  // Core interface
  StudioInterface,

  // Metrics
  StudioMetrics,
  TrendDataPoint,
  MrrTrend,
  ChurnTrend,
  CustomerGrowthTrend,
  TrendPeriodOptions,
  MetricsInterface,

  // Customers
  CustomerStatus,
  CustomerSubscription,
  BillingHistoryEntry,
  ActivityTimelineEntry,
  Customer,
  CustomerListOptions,
  CustomerListResult,
  CancelOptions,
  ApplyDiscountOptions,
  ExtendTrialOptions,
  ActionResult,
  UpgradeResult,
  DowngradeResult,
  CancelResult,
  ReactivateResult,
  ApplyDiscountResult,
  ExtendTrialResult,
  CustomersInterface,

  // Revenue
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

  // Usage
  ApiUsageSummary,
  UsageData,
  UsageTrendOptions,
  UsageTrend,
  FeatureAdoption,
  CustomerUsage,
  TopUser,
  AtRiskCustomer,
  UsageInterface,

  // Alerts
  AlertSeverity,
  AlertStatus,
  AlertType,
  Alert,
  ChurnRiskAlert,
  GrowthOpportunityAlert,
  UsageAnomalyAlert,
  AlertListOptions,
  AlertListResult,
  AlertSummary,
  AcknowledgeAlertOptions,
  SnoozeAlertOptions,
  ResolveAlertOptions,
  AlertsInterface,

  // Insights
  RevenueForecast,
  ForecastFactor,
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

  // Team
  TeamRole,
  TeamMember,
  InviteMemberOptions,
  InviteResult,
  UpdateRoleResult,
  RolePermissions,
  TeamInterface,

  // Settings
  AppSettings,
  BillingSettings,
  NotificationSettings,
  ConnectedIntegration,
  UpdateSettingsOptions,
  UpdateBillingOptions,
  UpdateNotificationOptions,
  SettingsInterface,

  // Connection
  ConnectionStatus,

  // Events
  StudioEventType,
  StudioEventHandler,
} from './types'
