/**
 * TypeScript SDK Generator
 *
 * Generates a complete TypeScript SDK with types, client, resources, and error handling.
 *
 * @module sdk-generator/typescript
 */

import type {
  SDKConfig,
  TypeScriptSDKConfig,
  GeneratedFiles,
  ParsedNoun,
  ParsedField,
} from './types'

// ============================================================================
// Utilities
// ============================================================================

function toCamelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1)
}

function toPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function fieldTypeToTS(field: ParsedField): string {
  if (field.enumValues) {
    return field.enumValues.map(v => `'${v}'`).join(' | ')
  }

  switch (field.type) {
    case 'string':
      return 'string'
    case 'number':
    case 'integer':
    case 'float':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'date':
    case 'datetime':
      return 'string' // ISO date string
    case 'json':
    case 'object':
      return 'Record<string, unknown>'
    case 'array':
      return 'unknown[]'
    case 'markdown':
      return 'string'
    default:
      return 'string'
  }
}

// ============================================================================
// Type Definitions Generator
// ============================================================================

function generateTypes(nouns: ParsedNoun[], config: SDKConfig): string {
  const interfaces: string[] = []

  // Generate interfaces for each noun
  for (const noun of nouns) {
    // Main interface
    const fields = noun.fields.map(f => {
      const type = fieldTypeToTS(f)
      const optional = f.optional ? '?' : ''
      return `  ${f.name}${optional}: ${type};`
    }).join('\n')

    interfaces.push(`export interface ${noun.name} {\n${fields}\n}`)

    // Create input type (without id)
    const createFields = noun.fields
      .filter(f => f.name !== 'id')
      .map(f => {
        const type = fieldTypeToTS(f)
        const optional = f.optional ? '?' : ''
        return `  ${f.name}${optional}: ${type};`
      }).join('\n')

    interfaces.push(`export interface ${noun.name}CreateInput {\n${createFields}\n}`)

    // Update input type (all fields optional except they exist)
    const updateFields = noun.fields
      .filter(f => f.name !== 'id')
      .map(f => {
        const type = fieldTypeToTS(f)
        return `  ${f.name}?: ${type};`
      }).join('\n')

    interfaces.push(`export interface ${noun.name}UpdateInput {\n${updateFields}\n}`)

    // Event types for subscriptions
    interfaces.push(`export interface ${noun.name}CreatedEvent {\n  type: '${toCamelCase(noun.name)}.created';\n  data: ${noun.name};\n  timestamp: string;\n}`)
    interfaces.push(`export interface ${noun.name}UpdatedEvent {\n  type: '${toCamelCase(noun.name)}.updated';\n  data: ${noun.name};\n  timestamp: string;\n}`)
    interfaces.push(`export interface ${noun.name}DeletedEvent {\n  type: '${toCamelCase(noun.name)}.deleted';\n  data: { id: string };\n  timestamp: string;\n}`)

    // Custom verb event types
    for (const verb of noun.verbs) {
      const eventName = `${noun.name}${toPascalCase(verb)}Event`
      interfaces.push(`export interface ${eventName} {\n  type: '${toCamelCase(noun.name)}.${verb}';\n  data: ${noun.name};\n  timestamp: string;\n}`)
    }
  }

  // Union type for all events
  const eventTypes = nouns.flatMap(noun => {
    const baseEvents = [
      `${noun.name}CreatedEvent`,
      `${noun.name}UpdatedEvent`,
      `${noun.name}DeletedEvent`,
    ]
    const verbEvents = noun.verbs.map(v => `${noun.name}${toPascalCase(v)}Event`)
    return [...baseEvents, ...verbEvents]
  })

  // Pagination types - supporting multiple strategies
  interfaces.push(`/**
 * Pagination metadata for offset-based pagination
 */
export interface OffsetPaginationMeta {
  strategy: 'offset';
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}`)

  interfaces.push(`/**
 * Pagination metadata for cursor-based pagination
 */
export interface CursorPaginationMeta {
  strategy: 'cursor';
  limit: number;
  cursor: string | null;
  nextCursor: string | null;
  previousCursor: string | null;
  hasMore: boolean;
}`)

  interfaces.push(`/**
 * Pagination metadata for page-based pagination
 */
export interface PagePaginationMeta {
  strategy: 'page';
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
  hasMore: boolean;
}`)

  interfaces.push(`/**
 * Union type for all pagination strategies
 */
export type PaginationMeta = OffsetPaginationMeta | CursorPaginationMeta | PagePaginationMeta;`)

  interfaces.push(`/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}`)

  interfaces.push(`/**
 * List options for offset-based pagination
 */
export interface OffsetListOptions {
  limit?: number;
  offset?: number;
  filter?: Record<string, unknown>;
  sort?: string | string[];
  order?: 'asc' | 'desc';
}`)

  interfaces.push(`/**
 * List options for cursor-based pagination
 */
export interface CursorListOptions {
  limit?: number;
  cursor?: string;
  direction?: 'forward' | 'backward';
  filter?: Record<string, unknown>;
  sort?: string | string[];
}`)

  interfaces.push(`/**
 * List options for page-based pagination
 */
export interface PageListOptions {
  page?: number;
  pageSize?: number;
  filter?: Record<string, unknown>;
  sort?: string | string[];
  order?: 'asc' | 'desc';
}`)

  interfaces.push(`/**
 * Union type for all list options
 */
export type ListOptions = OffsetListOptions | CursorListOptions | PageListOptions;`)

  // Retry and circuit breaker types
  interfaces.push(`/**
 * Retry strategy types
 */
export type RetryStrategy = 'exponential' | 'linear' | 'fixed' | 'decorrelated-jitter';`)

  interfaces.push(`/**
 * Retry configuration options
 */
export interface RetryConfig {
  /** Retry strategy type */
  strategy?: RetryStrategy;
  /** Maximum number of retry attempts */
  maxAttempts?: number;
  /** Base delay in milliseconds */
  baseDelay?: number;
  /** Maximum delay in milliseconds */
  maxDelay?: number;
  /** Jitter factor (0-1) for adding randomness */
  jitter?: number;
  /** HTTP status codes that should trigger a retry */
  retryableStatuses?: number[];
  /** Whether to retry on network errors */
  retryOnNetworkError?: boolean;
}`)

  interfaces.push(`/**
 * Circuit breaker state
 */
export type CircuitState = 'closed' | 'open' | 'half-open';`)

  interfaces.push(`/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Whether to enable circuit breaker */
  enabled?: boolean;
  /** Failure threshold before opening circuit */
  failureThreshold?: number;
  /** Success threshold to close circuit */
  successThreshold?: number;
  /** Time in ms before attempting to close circuit */
  resetTimeout?: number;
}`)

  interfaces.push(`/**
 * Rate limit information
 */
export interface RateLimitInfo {
  /** Number of requests remaining in current window */
  remaining: number;
  /** Total requests allowed in window */
  limit: number;
  /** Unix timestamp when rate limit resets */
  reset: number;
  /** Seconds to wait before retrying (when rate limited) */
  retryAfter?: number;
}`)

  interfaces.push(`/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Whether to automatically retry on rate limit */
  autoRetry?: boolean;
  /** Maximum wait time for rate limit retry (ms) */
  maxWaitTime?: number;
  /** Header name for retry-after value */
  retryAfterHeader?: string;
  /** Header name for rate limit remaining */
  remainingHeader?: string;
  /** Header name for rate limit reset time */
  resetHeader?: string;
}`)

  interfaces.push(`/**
 * Logger interface for custom logging
 */
export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}`)

  interfaces.push(`/**
 * Logging configuration
 */
export interface LoggingConfig {
  /** Enable request logging */
  logRequests?: boolean;
  /** Enable response logging */
  logResponses?: boolean;
  /** Enable error logging */
  logErrors?: boolean;
  /** Log level */
  level?: 'debug' | 'info' | 'warn' | 'error';
  /** Custom logger instance */
  logger?: Logger;
}`)

  interfaces.push(`/**
 * Custom HTTP client interface
 */
export interface HttpClientAdapter {
  request<T>(options: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
    timeout?: number;
    signal?: AbortSignal;
  }): Promise<{
    status: number;
    headers: Record<string, string>;
    data: T;
  }>;
}`)

  // Client config type
  interfaces.push(`/**
 * Client configuration options
 */
export interface ClientConfig {
  /** API key for authentication */
  apiKey: string;
  /** Base URL for API requests */
  baseUrl?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum retry attempts (deprecated: use retry.maxAttempts) */
  maxRetries?: number;
  /** Retry configuration */
  retry?: RetryConfig;
  /** Circuit breaker configuration */
  circuitBreaker?: CircuitBreakerConfig;
  /** Rate limit handling configuration */
  rateLimit?: RateLimitConfig;
  /** Logging configuration */
  logging?: LoggingConfig;
  /** Custom HTTP client adapter */
  httpClient?: HttpClientAdapter;
}`)

  return `/**
 * ${config.packageName} - Type Definitions
 * Generated by SaaSkit SDK Generator
 * @version ${config.version}
 */

${interfaces.join('\n\n')}
`
}

// ============================================================================
// Error Classes Generator
// ============================================================================

function generateErrors(config: SDKConfig): string {
  return `/**
 * ${config.packageName} - Error Classes
 * Generated by SaaSkit SDK Generator
 * @version ${config.version}
 */

/**
 * Base API error class
 */
export class APIError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly requestId: string;
  readonly details?: Record<string, unknown>;

  constructor(message: string, statusCode: number, code: string, requestId: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
    Object.setPrototypeOf(this, APIError.prototype);
  }
}

/**
 * Resource not found error (404)
 */
export class NotFoundError extends APIError {
  constructor(resource: string, id: string, requestId: string) {
    super(\`\${resource} with id '\${id}' not found\`, 404, 'NOT_FOUND', requestId);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends APIError {
  readonly validationErrors: Array<{ field: string; message: string }>;

  constructor(message: string, validationErrors: Array<{ field: string; message: string }>, requestId: string) {
    super(message, 400, 'VALIDATION_ERROR', requestId, { errors: validationErrors });
    this.name = 'ValidationError';
    this.validationErrors = validationErrors;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Rate limit exceeded error (429)
 */
export class RateLimitError extends APIError {
  readonly retryAfter: number;

  constructor(retryAfter: number, requestId: string) {
    super(\`Rate limit exceeded. Retry after \${retryAfter} seconds\`, 429, 'RATE_LIMIT_EXCEEDED', requestId);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends APIError {
  constructor(message: string, requestId: string) {
    super(message, 401, 'AUTHENTICATION_ERROR', requestId);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends APIError {
  constructor(message: string, requestId: string) {
    super(message, 403, 'AUTHORIZATION_ERROR', requestId);
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * Server error (5xx)
 */
export class ServerError extends APIError {
  constructor(message: string, statusCode: number, requestId: string) {
    super(message, statusCode, 'SERVER_ERROR', requestId);
    this.name = 'ServerError';
    Object.setPrototypeOf(this, ServerError.prototype);
  }
}

/**
 * Circuit breaker error - thrown when circuit is open
 */
export class CircuitBreakerError extends Error {
  readonly state: 'open' | 'half-open';
  readonly resetIn: number | null;

  constructor(message: string, state: 'open' | 'half-open', resetIn: number | null) {
    super(message);
    this.name = 'CircuitBreakerError';
    this.state = state;
    this.resetIn = resetIn;
    Object.setPrototypeOf(this, CircuitBreakerError.prototype);
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends APIError {
  constructor(message: string, requestId: string) {
    super(message, 408, 'TIMEOUT', requestId);
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Network error
 */
export class NetworkError extends Error {
  readonly isRetryable: boolean;

  constructor(message: string, isRetryable = true) {
    super(message);
    this.name = 'NetworkError';
    this.isRetryable = isRetryable;
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}
`
}

// ============================================================================
// HTTP Layer Generator
// ============================================================================

function generateHttp(config: SDKConfig): string {
  const headerName = config.auth?.headerName ?? 'Authorization'
  const headerValue = config.auth?.type === 'header' ? '${this.apiKey}' : 'Bearer ${this.apiKey}'

  return `/**
 * ${config.packageName} - HTTP Layer
 * Generated by SaaSkit SDK Generator
 * @version ${config.version}
 */

import {
  APIError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  AuthenticationError,
  AuthorizationError,
  ServerError,
  CircuitBreakerError,
} from './errors';
import type {
  RetryConfig,
  RetryStrategy,
  CircuitBreakerConfig,
  CircuitState,
  RateLimitConfig,
  RateLimitInfo,
  Logger,
  LoggingConfig,
  HttpClientAdapter,
} from './types';

export interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  /** Skip retry logic for this request */
  skipRetry?: boolean;
}

export interface HttpConfig {
  apiKey: string;
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  retry?: RetryConfig;
  circuitBreaker?: CircuitBreakerConfig;
  rateLimit?: RateLimitConfig;
  logging?: LoggingConfig;
  httpClient?: HttpClientAdapter;
}

// ============================================================================
// Retry Strategies
// ============================================================================

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  strategy: 'exponential',
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  jitter: 0.1,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  retryOnNetworkError: true,
};

/**
 * Calculate backoff delay based on strategy
 */
function calculateBackoffDelay(
  attempt: number,
  config: Required<RetryConfig>,
  lastDelay: number = config.baseDelay
): number {
  let delay: number;

  switch (config.strategy) {
    case 'exponential':
      // Standard exponential backoff: baseDelay * 2^attempt
      delay = config.baseDelay * Math.pow(2, attempt);
      break;

    case 'linear':
      // Linear backoff: baseDelay * (attempt + 1)
      delay = config.baseDelay * (attempt + 1);
      break;

    case 'fixed':
      // Fixed delay: always baseDelay
      delay = config.baseDelay;
      break;

    case 'decorrelated-jitter':
      // Decorrelated jitter (AWS-style): random between baseDelay and lastDelay * 3
      delay = Math.random() * (lastDelay * 3 - config.baseDelay) + config.baseDelay;
      break;

    default:
      delay = config.baseDelay * Math.pow(2, attempt);
  }

  // Apply jitter (adds randomness to prevent thundering herd)
  if (config.jitter > 0 && config.strategy !== 'decorrelated-jitter') {
    const jitterRange = delay * config.jitter;
    delay += Math.random() * jitterRange * 2 - jitterRange;
  }

  // Cap at maxDelay
  return Math.min(Math.max(delay, 0), config.maxDelay);
}

/**
 * Determine if a status code is retryable
 */
function isRetryableStatus(status: number, config: Required<RetryConfig>): boolean {
  return config.retryableStatuses.includes(status);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Circuit Breaker
// ============================================================================

/**
 * Default circuit breaker configuration
 */
const DEFAULT_CIRCUIT_BREAKER_CONFIG: Required<CircuitBreakerConfig> = {
  enabled: false,
  failureThreshold: 5,
  successThreshold: 3,
  resetTimeout: 30000,
};

/**
 * Circuit breaker state machine for fault tolerance
 */
class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private lastFailureTime: number | null = null;
  private readonly config: Required<CircuitBreakerConfig>;

  constructor(config: CircuitBreakerConfig = {}) {
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
  }

  /**
   * Check if request is allowed to proceed
   */
  canRequest(): boolean {
    if (!this.config.enabled) return true;

    switch (this.state) {
      case 'closed':
        return true;

      case 'open':
        // Check if reset timeout has elapsed
        if (this.lastFailureTime && Date.now() - this.lastFailureTime >= this.config.resetTimeout) {
          this.state = 'half-open';
          this.successes = 0;
          return true;
        }
        return false;

      case 'half-open':
        return true;

      default:
        return true;
    }
  }

  /**
   * Record a successful request
   */
  recordSuccess(): void {
    if (!this.config.enabled) return;

    if (this.state === 'half-open') {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.state = 'closed';
        this.failures = 0;
        this.successes = 0;
        this.lastFailureTime = null;
      }
    } else if (this.state === 'closed') {
      this.failures = 0;
    }
  }

  /**
   * Record a failed request
   */
  recordFailure(): void {
    if (!this.config.enabled) return;

    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      this.state = 'open';
      this.successes = 0;
    } else if (this.state === 'closed' && this.failures >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get time until circuit attempts reset (ms)
   */
  getTimeUntilReset(): number | null {
    if (this.state !== 'open' || !this.lastFailureTime) return null;
    const elapsed = Date.now() - this.lastFailureTime;
    const remaining = this.config.resetTimeout - elapsed;
    return remaining > 0 ? remaining : 0;
  }
}

// ============================================================================
// Rate Limit Handler
// ============================================================================

/**
 * Default rate limit configuration
 */
const DEFAULT_RATE_LIMIT_CONFIG: Required<RateLimitConfig> = {
  autoRetry: true,
  maxWaitTime: 60000,
  retryAfterHeader: 'Retry-After',
  remainingHeader: 'X-RateLimit-Remaining',
  resetHeader: 'X-RateLimit-Reset',
};

/**
 * Parse rate limit information from response headers
 */
function parseRateLimitInfo(
  headers: Headers,
  config: Required<RateLimitConfig>
): RateLimitInfo | null {
  const remaining = headers.get(config.remainingHeader);
  const limit = headers.get('X-RateLimit-Limit');
  const reset = headers.get(config.resetHeader);
  const retryAfter = headers.get(config.retryAfterHeader);

  if (!remaining && !retryAfter) return null;

  return {
    remaining: remaining ? parseInt(remaining, 10) : 0,
    limit: limit ? parseInt(limit, 10) : 0,
    reset: reset ? parseInt(reset, 10) : 0,
    retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined,
  };
}

// ============================================================================
// Default Logger
// ============================================================================

/**
 * Create a default console logger
 */
function createDefaultLogger(level: LoggingConfig['level'] = 'info'): Logger {
  const levels = ['debug', 'info', 'warn', 'error'] as const;
  const minLevel = levels.indexOf(level || 'info');

  const shouldLog = (logLevel: typeof levels[number]): boolean => {
    return levels.indexOf(logLevel) >= minLevel;
  };

  return {
    debug(message: string, meta?: Record<string, unknown>) {
      if (shouldLog('debug')) console.debug(\`[DEBUG] \${message}\`, meta || '');
    },
    info(message: string, meta?: Record<string, unknown>) {
      if (shouldLog('info')) console.info(\`[INFO] \${message}\`, meta || '');
    },
    warn(message: string, meta?: Record<string, unknown>) {
      if (shouldLog('warn')) console.warn(\`[WARN] \${message}\`, meta || '');
    },
    error(message: string, meta?: Record<string, unknown>) {
      if (shouldLog('error')) console.error(\`[ERROR] \${message}\`, meta || '');
    },
  };
}

// ============================================================================
// HTTP Client
// ============================================================================

/**
 * HTTP client with retry logic, circuit breaker, and error handling
 */
export class HttpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly retryConfig: Required<RetryConfig>;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly rateLimitConfig: Required<RateLimitConfig>;
  private readonly logger: Logger | null;
  private readonly loggingConfig: LoggingConfig;
  private readonly customHttpClient: HttpClientAdapter | null;

  constructor(config: HttpConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout;

    // Merge retry config with defaults
    this.retryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      ...config.retry,
      maxAttempts: config.retry?.maxAttempts ?? config.maxRetries ?? DEFAULT_RETRY_CONFIG.maxAttempts,
    };

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker(config.circuitBreaker);

    // Merge rate limit config with defaults
    this.rateLimitConfig = { ...DEFAULT_RATE_LIMIT_CONFIG, ...config.rateLimit };

    // Setup logging
    this.loggingConfig = config.logging || {};
    this.logger = this.loggingConfig.logRequests || this.loggingConfig.logResponses || this.loggingConfig.logErrors
      ? this.loggingConfig.logger || createDefaultLogger(this.loggingConfig.level)
      : null;

    // Custom HTTP client adapter
    this.customHttpClient = config.httpClient || null;
  }

  async request<T>(options: RequestOptions): Promise<T> {
    const { method, path, body, query, headers, skipRetry } = options;

    // Check circuit breaker
    if (!this.circuitBreaker.canRequest()) {
      const resetTime = this.circuitBreaker.getTimeUntilReset();
      throw new CircuitBreakerError(
        'Circuit breaker is open',
        this.circuitBreaker.getState(),
        resetTime
      );
    }

    // Build URL with query parameters
    let url = \`\${this.baseUrl}\${path}\`;
    if (query) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      }
      const queryString = params.toString();
      if (queryString) {
        url += \`?\${queryString}\`;
      }
    }

    // Build headers
    const requestHeaders: Record<string, string> = {
      '${headerName}': \`${headerValue}\`,
      'Content-Type': 'application/json',
      ...headers,
    };

    // Log request
    if (this.logger && this.loggingConfig.logRequests) {
      this.logger.info(\`Request: \${method} \${url}\`, { method, path, query, headers: requestHeaders });
    }

    // Retry loop
    let lastError: Error | null = null;
    let lastDelay = this.retryConfig.baseDelay;
    const maxAttempts = skipRetry ? 1 : this.retryConfig.maxAttempts;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        let response: Response;
        let responseData: T;

        // Use custom HTTP client if provided
        if (this.customHttpClient) {
          const result = await this.customHttpClient.request<T>({
            method,
            url,
            headers: requestHeaders,
            body,
            timeout: this.timeout,
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          // Convert custom client response to standard format
          if (result.status >= 400) {
            const requestId = result.headers['x-request-id'] || 'unknown';
            throw this.createError(result.status, result.data, requestId);
          }

          this.circuitBreaker.recordSuccess();

          if (this.logger && this.loggingConfig.logResponses) {
            this.logger.info(\`Response: \${result.status}\`, { status: result.status, data: result.data });
          }

          return result.data;
        }

        // Standard fetch
        response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const requestId = response.headers.get('X-Request-ID') || 'unknown';

        if (response.ok) {
          this.circuitBreaker.recordSuccess();

          if (response.status === 204) {
            if (this.logger && this.loggingConfig.logResponses) {
              this.logger.info(\`Response: 204 No Content\`);
            }
            return undefined as T;
          }

          responseData = await response.json();

          if (this.logger && this.loggingConfig.logResponses) {
            this.logger.info(\`Response: \${response.status}\`, { status: response.status });
          }

          return responseData;
        }

        // Handle error responses
        const errorBody = await response.json().catch(() => ({}));
        const error = this.createError(response.status, errorBody, requestId);

        // Handle rate limiting with enhanced config
        if (response.status === 429) {
          const rateLimitInfo = parseRateLimitInfo(response.headers, this.rateLimitConfig);

          if (this.rateLimitConfig.autoRetry && rateLimitInfo?.retryAfter) {
            const waitTime = rateLimitInfo.retryAfter * 1000;
            if (waitTime <= this.rateLimitConfig.maxWaitTime) {
              if (this.logger) {
                this.logger.warn(\`Rate limited, waiting \${rateLimitInfo.retryAfter}s\`, { rateLimitInfo });
              }
              await sleep(waitTime);
              continue;
            }
          }

          this.circuitBreaker.recordFailure();
          throw error;
        }

        // Check if error is retryable
        if (!isRetryableStatus(response.status, this.retryConfig)) {
          this.circuitBreaker.recordFailure();
          throw error;
        }

        // Log retry attempt
        if (this.logger && this.loggingConfig.logErrors) {
          this.logger.warn(\`Request failed (attempt \${attempt + 1}/\${maxAttempts}), retrying...\`, {
            status: response.status,
            error: errorBody,
          });
        }

        lastDelay = calculateBackoffDelay(attempt, this.retryConfig, lastDelay);
        await sleep(lastDelay);
        lastError = error;

      } catch (err) {
        // Handle non-HTTP errors (network, timeout, etc.)
        if (err instanceof APIError || err instanceof CircuitBreakerError) {
          throw err;
        }

        const isNetworkError = err instanceof TypeError || (err as Error).name === 'AbortError';

        if (!this.retryConfig.retryOnNetworkError || !isNetworkError) {
          this.circuitBreaker.recordFailure();
          throw err;
        }

        if (this.logger && this.loggingConfig.logErrors) {
          this.logger.warn(\`Network error (attempt \${attempt + 1}/\${maxAttempts}), retrying...\`, {
            error: (err as Error).message,
          });
        }

        lastError = err as Error;
        lastDelay = calculateBackoffDelay(attempt, this.retryConfig, lastDelay);

        if (attempt < maxAttempts - 1) {
          await sleep(lastDelay);
        }
      }
    }

    this.circuitBreaker.recordFailure();
    throw lastError || new Error('Request failed after all retry attempts');
  }

  private createError(status: number, body: any, requestId: string): APIError {
    const message = body.error || body.message || 'An error occurred';

    switch (status) {
      case 400:
        return new ValidationError(message, body.details || [], requestId);
      case 401:
        return new AuthenticationError(message, requestId);
      case 403:
        return new AuthorizationError(message, requestId);
      case 404:
        return new NotFoundError(body.resource || 'Resource', body.id || 'unknown', requestId);
      case 429:
        return new RateLimitError(body.retryAfter || 60, requestId);
      default:
        if (status >= 500) {
          return new ServerError(message, status, requestId);
        }
        return new APIError(message, status, body.code || 'UNKNOWN_ERROR', requestId, body.details);
    }
  }

  /**
   * Get current circuit breaker state
   */
  getCircuitState(): CircuitState {
    return this.circuitBreaker.getState();
  }
}
`
}

// ============================================================================
// Resource Class Generator
// ============================================================================

function generateResource(noun: ParsedNoun, config: SDKConfig): string {
  const resourceName = noun.pluralName
  const className = `${noun.name}sResource`
  const typeName = noun.name

  // Generate CRUD methods
  const methods: string[] = []

  // List method
  methods.push(`
  /**
   * List all ${resourceName} with pagination support
   *
   * Supports multiple pagination strategies:
   * - Offset: { limit, offset }
   * - Cursor: { limit, cursor, direction }
   * - Page: { page, pageSize }
   */
  async list(options?: ListOptions): Promise<PaginatedResponse<${typeName}>> {
    return this.http.request({
      method: 'GET',
      path: '/${resourceName}',
      query: options as Record<string, unknown>,
    });
  }`)

  // Auto-pagination iterator for offset pagination
  methods.push(`
  /**
   * Iterate over all ${resourceName} with automatic offset-based pagination
   *
   * @example
   * \`\`\`ts
   * for await (const item of client.${resourceName}.iterate({ limit: 50 })) {
   *   console.log(item);
   * }
   * \`\`\`
   */
  async *iterate(options?: Omit<OffsetListOptions, 'offset'>): AsyncIterableIterator<${typeName}> {
    let offset = 0;
    const limit = options?.limit || 100;

    while (true) {
      const response = await this.list({ ...options, limit, offset });
      for (const item of response.data) {
        yield item;
      }
      if (!response.pagination.hasMore) {
        break;
      }
      offset += limit;
    }
  }`)

  // Auto-pagination iterator for cursor pagination
  methods.push(`
  /**
   * Iterate over all ${resourceName} with automatic cursor-based pagination
   *
   * @example
   * \`\`\`ts
   * for await (const item of client.${resourceName}.iterateCursor({ limit: 50 })) {
   *   console.log(item);
   * }
   * \`\`\`
   */
  async *iterateCursor(options?: Omit<CursorListOptions, 'cursor'>): AsyncIterableIterator<${typeName}> {
    let cursor: string | undefined = undefined;
    const limit = options?.limit || 100;

    while (true) {
      const response = await this.list({ ...options, limit, cursor });
      for (const item of response.data) {
        yield item;
      }

      // Type guard for cursor pagination
      const pagination = response.pagination;
      if ('nextCursor' in pagination) {
        if (!pagination.hasMore || !pagination.nextCursor) {
          break;
        }
        cursor = pagination.nextCursor;
      } else {
        break;
      }
    }
  }`)

  // Auto-pagination iterator for page-based pagination
  methods.push(`
  /**
   * Iterate over all ${resourceName} with automatic page-based pagination
   *
   * @example
   * \`\`\`ts
   * for await (const item of client.${resourceName}.iteratePages({ pageSize: 50 })) {
   *   console.log(item);
   * }
   * \`\`\`
   */
  async *iteratePages(options?: Omit<PageListOptions, 'page'>): AsyncIterableIterator<${typeName}> {
    let page = 1;
    const pageSize = options?.pageSize || 100;

    while (true) {
      const response = await this.list({ ...options, page, pageSize });
      for (const item of response.data) {
        yield item;
      }
      if (!response.pagination.hasMore) {
        break;
      }
      page += 1;
    }
  }`)

  // Collect all items
  methods.push(`
  /**
   * Fetch all ${resourceName} into an array (use with caution for large datasets)
   *
   * @param options - List options for filtering/sorting
   * @param maxItems - Maximum number of items to fetch (default: 10000)
   */
  async all(options?: ListOptions, maxItems = 10000): Promise<${typeName}[]> {
    const items: ${typeName}[] = [];
    for await (const item of this.iterate(options as OffsetListOptions)) {
      items.push(item);
      if (items.length >= maxItems) {
        break;
      }
    }
    return items;
  }`)

  // Get method
  methods.push(`
  /**
   * Get a single ${toCamelCase(typeName)} by ID
   */
  async get(id: string): Promise<${typeName}> {
    return this.http.request({
      method: 'GET',
      path: \`/${resourceName}/\${id}\`,
    });
  }`)

  // Create method
  methods.push(`
  /**
   * Create a new ${toCamelCase(typeName)}
   */
  async create(input: ${typeName}CreateInput): Promise<${typeName}> {
    return this.http.request({
      method: 'POST',
      path: '/${resourceName}',
      body: input,
    });
  }`)

  // Update method
  methods.push(`
  /**
   * Update an existing ${toCamelCase(typeName)}
   */
  async update(id: string, input: ${typeName}UpdateInput): Promise<${typeName}> {
    return this.http.request({
      method: 'PUT',
      path: \`/${resourceName}/\${id}\`,
      body: input,
    });
  }`)

  // Delete method
  methods.push(`
  /**
   * Delete a ${toCamelCase(typeName)}
   */
  async delete(id: string): Promise<void> {
    return this.http.request({
      method: 'DELETE',
      path: \`/${resourceName}/\${id}\`,
    });
  }`)

  // Custom verb methods
  for (const verb of noun.verbs) {
    methods.push(`
  /**
   * Execute ${verb} on a ${toCamelCase(typeName)}
   */
  async ${verb}(id: string, input?: Record<string, unknown>): Promise<${typeName}> {
    return this.http.request({
      method: 'POST',
      path: \`/${resourceName}/\${id}/${verb}\`,
      body: input,
    });
  }`)
  }

  return `/**
 * ${config.packageName} - ${noun.name} Resource
 * Generated by SaaSkit SDK Generator
 * @version ${config.version}
 */

import type {
  ${typeName},
  ${typeName}CreateInput,
  ${typeName}UpdateInput,
  PaginatedResponse,
  ListOptions,
  OffsetListOptions,
  CursorListOptions,
  PageListOptions,
} from './types';
import type { HttpClient } from './http';

export class ${className} {
  constructor(private readonly http: HttpClient) {}
${methods.join('')}
}
`
}

// ============================================================================
// Subscriptions Generator
// ============================================================================

function generateSubscriptions(nouns: ParsedNoun[], config: SDKConfig): string {
  return `/**
 * ${config.packageName} - WebSocket Subscriptions
 * Generated by SaaSkit SDK Generator
 * @version ${config.version}
 */

export interface SubscriptionOptions {
  filter?: Record<string, unknown>;
  onError?: (error: Error) => void;
  onReconnect?: () => void;
}

export type EventHandler<T> = (event: T) => void;

export class SubscriptionClient {
  private ws: WebSocket | null = null;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly handlers: Map<string, Set<EventHandler<unknown>>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/^http/, 'ws');
    this.apiKey = apiKey;
  }

  /**
   * Connect to the WebSocket server
   */
  connect(): void {
    const wsUrl = \`\${this.baseUrl}/ws?apiKey=\${this.apiKey}\`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const eventType = data.type;
        const handlers = this.handlers.get(eventType);
        if (handlers) {
          for (const handler of handlers) {
            handler(data);
          }
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    this.ws.onclose = () => {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        setTimeout(() => this.connect(), Math.pow(2, this.reconnectAttempts) * 1000);
      }
    };

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
    };
  }

  /**
   * Subscribe to an event type
   */
  subscribe<T>(eventType: string, handler: EventHandler<T>, options?: SubscriptionOptions): () => void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
    }

    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as EventHandler<unknown>);

    // Send subscription message if filters provided
    if (options?.filter && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: 'subscribe',
        event: eventType,
        filter: options.filter,
      }));
    }

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        handlers.delete(handler as EventHandler<unknown>);
        if (handlers.size === 0) {
          this.handlers.delete(eventType);
        }
      }
    };
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.handlers.clear();
  }
}
`
}

// ============================================================================
// Client Class Generator
// ============================================================================

function generateClient(nouns: ParsedNoun[], config: SDKConfig): string {
  const resourceImports = nouns.map(n => `${n.name}sResource`).join(', ')
  const resourceFiles = nouns.map(n => n.pluralName)

  const resourceProperties = nouns.map(n => {
    const propName = toCamelCase(n.pluralName)
    return `  readonly ${propName}: ${n.name}sResource;`
  }).join('\n')

  const resourceInitializations = nouns.map(n => {
    const propName = toCamelCase(n.pluralName)
    return `    this.${propName} = new ${n.name}sResource(this.http);`
  }).join('\n')

  return `/**
 * ${config.packageName} - Client
 * Generated by SaaSkit SDK Generator
 * @version ${config.version}
 */

import type { ClientConfig, CircuitState } from './types';
import { HttpClient } from './http';
import { SubscriptionClient } from './subscriptions';
import { WebhookVerifier, type WebhookVerifyOptions } from './webhooks';
${nouns.map(n => `import { ${n.name}sResource } from './resources/${n.pluralName}';`).join('\n')}

const DEFAULT_BASE_URL = '${config.baseUrl || 'https://api.example.com'}';
const DEFAULT_TIMEOUT = ${config.timeout || 30000};
const DEFAULT_MAX_RETRIES = ${config.maxRetries || 3};

/**
 * ${config.packageName} API Client
 *
 * @example
 * \`\`\`ts
 * const client = new Client({
 *   apiKey: 'your-api-key',
 *   retry: {
 *     strategy: 'exponential',
 *     maxAttempts: 5,
 *   },
 *   circuitBreaker: {
 *     enabled: true,
 *     failureThreshold: 5,
 *   },
 * });
 * \`\`\`
 */
export class Client {
  private readonly http: HttpClient;
  private subscriptions: SubscriptionClient | null = null;
  private readonly webhookVerifier: WebhookVerifier;

${resourceProperties}

  constructor(config: ClientConfig) {
    const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    const timeout = config.timeout || DEFAULT_TIMEOUT;
    const maxRetries = config.maxRetries || DEFAULT_MAX_RETRIES;

    this.http = new HttpClient({
      apiKey: config.apiKey,
      baseUrl,
      timeout,
      maxRetries,
      retry: config.retry,
      circuitBreaker: config.circuitBreaker,
      rateLimit: config.rateLimit,
      logging: config.logging,
      httpClient: config.httpClient,
    });

    this.webhookVerifier = new WebhookVerifier();

${resourceInitializations}
  }

  /**
   * Get the subscription client for real-time events
   */
  getSubscriptionClient(): SubscriptionClient {
    if (!this.subscriptions) {
      this.subscriptions = new SubscriptionClient(
        DEFAULT_BASE_URL,
        (this.http as any).apiKey
      );
      this.subscriptions.connect();
    }
    return this.subscriptions;
  }

  /**
   * Subscribe to real-time events
   */
  subscribe<T>(eventType: string, handler: (event: T) => void, options?: { filter?: Record<string, unknown> }): () => void {
    return this.getSubscriptionClient().subscribe(eventType, handler, options);
  }

  /**
   * Disconnect all subscriptions
   */
  disconnect(): void {
    if (this.subscriptions) {
      this.subscriptions.disconnect();
      this.subscriptions = null;
    }
  }

  /**
   * Get the current circuit breaker state
   */
  getCircuitState(): CircuitState {
    return this.http.getCircuitState();
  }

  /**
   * Verify a webhook signature
   *
   * @example
   * \`\`\`ts
   * const isValid = await client.verifyWebhook({
   *   payload: request.body,
   *   signature: request.headers['x-webhook-signature'],
   *   secret: process.env.WEBHOOK_SECRET,
   * });
   * \`\`\`
   */
  async verifyWebhook(options: WebhookVerifyOptions): Promise<boolean> {
    return this.webhookVerifier.verify(options);
  }

  /**
   * Parse and verify a webhook event
   *
   * @example
   * \`\`\`ts
   * const event = await client.parseWebhook<UserCreatedEvent>({
   *   payload: request.body,
   *   signature: request.headers['x-webhook-signature'],
   *   secret: process.env.WEBHOOK_SECRET,
   * });
   * \`\`\`
   */
  async parseWebhook<T>(options: WebhookVerifyOptions): Promise<T> {
    return this.webhookVerifier.parseAndVerify<T>(options);
  }
}
`
}

// ============================================================================
// Webhook Verification Generator
// ============================================================================

function generateWebhooks(config: SDKConfig): string {
  return `/**
 * ${config.packageName} - Webhook Verification
 * Generated by SaaSkit SDK Generator
 * @version ${config.version}
 */

/**
 * Webhook verification options
 */
export interface WebhookVerifyOptions {
  /** Raw request payload (string or Buffer) */
  payload: string | ArrayBuffer;
  /** Signature from the X-Webhook-Signature header */
  signature: string;
  /** Your webhook signing secret */
  secret: string;
  /** Timestamp from the X-Webhook-Timestamp header (optional, for replay attack prevention) */
  timestamp?: string;
  /** Maximum age of webhook in seconds (default: 300 = 5 minutes) */
  maxAge?: number;
  /** Signature algorithm (default: 'sha256') */
  algorithm?: 'sha256' | 'sha512';
}

/**
 * Webhook verification error
 */
export class WebhookVerificationError extends Error {
  readonly code: 'INVALID_SIGNATURE' | 'EXPIRED' | 'INVALID_PAYLOAD' | 'MISSING_SIGNATURE';

  constructor(message: string, code: WebhookVerificationError['code']) {
    super(message);
    this.name = 'WebhookVerificationError';
    this.code = code;
    Object.setPrototypeOf(this, WebhookVerificationError.prototype);
  }
}

/**
 * Convert various payload types to Uint8Array
 */
function payloadToBytes(payload: string | ArrayBuffer): Uint8Array {
  if (typeof payload === 'string') {
    return new TextEncoder().encode(payload);
  }
  return new Uint8Array(payload);
}

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Timing-safe comparison of two strings
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Webhook signature verifier
 *
 * Supports HMAC-SHA256 and HMAC-SHA512 signature verification with
 * optional timestamp validation for replay attack prevention.
 *
 * @example
 * \`\`\`ts
 * const verifier = new WebhookVerifier();
 *
 * // Verify signature
 * const isValid = await verifier.verify({
 *   payload: request.body,
 *   signature: request.headers['x-webhook-signature'],
 *   secret: process.env.WEBHOOK_SECRET,
 *   timestamp: request.headers['x-webhook-timestamp'],
 * });
 *
 * // Parse and verify in one step
 * const event = await verifier.parseAndVerify<MyEventType>({
 *   payload: request.body,
 *   signature: request.headers['x-webhook-signature'],
 *   secret: process.env.WEBHOOK_SECRET,
 * });
 * \`\`\`
 */
export class WebhookVerifier {
  /**
   * Verify a webhook signature
   *
   * @param options - Verification options
   * @returns true if signature is valid
   * @throws WebhookVerificationError if verification fails
   */
  async verify(options: WebhookVerifyOptions): Promise<boolean> {
    const {
      payload,
      signature,
      secret,
      timestamp,
      maxAge = 300,
      algorithm = 'sha256',
    } = options;

    if (!signature) {
      throw new WebhookVerificationError(
        'Missing webhook signature',
        'MISSING_SIGNATURE'
      );
    }

    // Validate timestamp if provided (prevents replay attacks)
    if (timestamp) {
      const webhookTime = parseInt(timestamp, 10);
      const now = Math.floor(Date.now() / 1000);
      const age = now - webhookTime;

      if (isNaN(webhookTime) || age < 0 || age > maxAge) {
        throw new WebhookVerificationError(
          \`Webhook timestamp is too old or invalid (age: \${age}s, max: \${maxAge}s)\`,
          'EXPIRED'
        );
      }
    }

    // Compute expected signature
    const payloadBytes = payloadToBytes(payload);
    const signedPayload = timestamp
      ? new Uint8Array([...new TextEncoder().encode(\`\${timestamp}.\`), ...payloadBytes])
      : payloadBytes;

    const expectedSignature = await this.computeSignature(signedPayload, secret, algorithm);

    // Parse provided signature (handle "sha256=" prefix if present)
    const providedSignature = signature.includes('=')
      ? signature.split('=')[1]
      : signature;

    // Timing-safe comparison
    if (!timingSafeEqual(expectedSignature, providedSignature.toLowerCase())) {
      throw new WebhookVerificationError(
        'Invalid webhook signature',
        'INVALID_SIGNATURE'
      );
    }

    return true;
  }

  /**
   * Parse and verify a webhook payload
   *
   * @param options - Verification options
   * @returns Parsed webhook event
   * @throws WebhookVerificationError if verification fails
   */
  async parseAndVerify<T>(options: WebhookVerifyOptions): Promise<T> {
    await this.verify(options);

    try {
      const payloadString = typeof options.payload === 'string'
        ? options.payload
        : new TextDecoder().decode(options.payload);

      return JSON.parse(payloadString) as T;
    } catch (err) {
      throw new WebhookVerificationError(
        'Invalid webhook payload: ' + (err as Error).message,
        'INVALID_PAYLOAD'
      );
    }
  }

  /**
   * Compute HMAC signature using Web Crypto API
   */
  private async computeSignature(
    data: Uint8Array,
    secret: string,
    algorithm: 'sha256' | 'sha512'
  ): Promise<string> {
    const cryptoAlgorithm = algorithm === 'sha256' ? 'SHA-256' : 'SHA-512';

    // Import secret key
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: cryptoAlgorithm },
      false,
      ['sign']
    );

    // Sign data
    const signature = await crypto.subtle.sign('HMAC', key, data);

    // Convert to hex
    return bytesToHex(new Uint8Array(signature));
  }

  /**
   * Generate a webhook signature (useful for testing)
   *
   * @param payload - Payload to sign
   * @param secret - Signing secret
   * @param timestamp - Optional timestamp
   * @param algorithm - Hash algorithm
   * @returns Signature string
   */
  async sign(
    payload: string,
    secret: string,
    timestamp?: number,
    algorithm: 'sha256' | 'sha512' = 'sha256'
  ): Promise<string> {
    const payloadBytes = new TextEncoder().encode(payload);
    const signedPayload = timestamp
      ? new Uint8Array([...new TextEncoder().encode(\`\${timestamp}.\`), ...payloadBytes])
      : payloadBytes;

    const signature = await this.computeSignature(signedPayload, secret, algorithm);
    return \`\${algorithm}=\${signature}\`;
  }
}
`
}

// ============================================================================
// Index File Generator
// ============================================================================

function generateIndex(nouns: ParsedNoun[], config: SDKConfig): string {
  const typeExports = nouns.flatMap(n => [
    n.name,
    `${n.name}CreateInput`,
    `${n.name}UpdateInput`,
    `${n.name}CreatedEvent`,
    `${n.name}UpdatedEvent`,
    `${n.name}DeletedEvent`,
    ...n.verbs.map(v => `${n.name}${toPascalCase(v)}Event`),
  ])

  return `/**
 * ${config.packageName}
 * Generated by SaaSkit SDK Generator
 * @version ${config.version}
 */

// Client
export { Client } from './client';

// Types
export type {
  ${typeExports.join(',\n  ')},
  // Pagination types
  PaginationMeta,
  OffsetPaginationMeta,
  CursorPaginationMeta,
  PagePaginationMeta,
  PaginatedResponse,
  ListOptions,
  OffsetListOptions,
  CursorListOptions,
  PageListOptions,
  // Config types
  ClientConfig,
  RetryConfig,
  RetryStrategy,
  CircuitBreakerConfig,
  CircuitState,
  RateLimitConfig,
  RateLimitInfo,
  LoggingConfig,
  Logger,
  HttpClientAdapter,
} from './types';

// Errors
export {
  APIError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  AuthenticationError,
  AuthorizationError,
  ServerError,
  CircuitBreakerError,
  TimeoutError,
  NetworkError,
} from './errors';

// Resources
${nouns.map(n => `export { ${n.name}sResource } from './resources/${n.pluralName}';`).join('\n')}

// Subscriptions
export { SubscriptionClient } from './subscriptions';
export type { SubscriptionOptions, EventHandler } from './subscriptions';

// Webhooks
export { WebhookVerifier, WebhookVerificationError } from './webhooks';
export type { WebhookVerifyOptions } from './webhooks';
`
}

// ============================================================================
// Package Files Generator
// ============================================================================

function generatePackageJson(config: SDKConfig): string {
  return JSON.stringify({
    name: config.packageName,
    version: config.version,
    description: `${config.packageName} SDK - Generated by SaaSkit`,
    main: 'dist/index.js',
    module: 'dist/index.mjs',
    types: 'dist/index.d.ts',
    exports: {
      '.': {
        import: './dist/index.mjs',
        require: './dist/index.js',
        types: './dist/index.d.ts',
      },
    },
    files: ['dist'],
    scripts: {
      build: 'tsup',
      typecheck: 'tsc --noEmit',
      prepublishOnly: 'npm run build',
    },
    devDependencies: {
      tsup: '^8.0.0',
      typescript: '^5.0.0',
    },
    engines: {
      node: '>=18',
    },
    license: 'MIT',
  }, null, 2)
}

function generateTsConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'bundler',
      lib: ['ES2022', 'DOM'],
      strict: true,
      declaration: true,
      declarationMap: true,
      sourceMap: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      outDir: 'dist',
      rootDir: 'src',
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist'],
  }, null, 2)
}

function generateTsupConfig(): string {
  return `import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
})
`
}

// ============================================================================
// Main Generator Function
// ============================================================================

export function generateTypeScriptFiles(
  config: SDKConfig,
  nouns: ParsedNoun[],
  tsConfig?: TypeScriptSDKConfig
): GeneratedFiles {
  const files: GeneratedFiles = {}

  // Generate type definitions
  files['src/types.ts'] = generateTypes(nouns, config)

  // Generate error classes
  files['src/errors.ts'] = generateErrors(config)

  // Generate HTTP layer
  files['src/http.ts'] = generateHttp(config)

  // Generate subscriptions
  files['src/subscriptions.ts'] = generateSubscriptions(nouns, config)

  // Generate webhook verification
  files['src/webhooks.ts'] = generateWebhooks(config)

  // Generate resource classes
  for (const noun of nouns) {
    files[`src/resources/${noun.pluralName}.ts`] = generateResource(noun, config)
  }

  // Generate client class
  files['src/client.ts'] = generateClient(nouns, config)

  // Generate index file
  files['src/index.ts'] = generateIndex(nouns, config)

  // Generate package files
  files['package.json'] = generatePackageJson(config)
  files['tsconfig.json'] = generateTsConfig()
  files['tsup.config.ts'] = generateTsupConfig()

  return files
}
