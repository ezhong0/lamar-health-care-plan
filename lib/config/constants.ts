/**
 * Application Constants
 *
 * Central location for all magic numbers and configuration values.
 * Makes it easy to adjust business rules without hunting through code.
 */

/**
 * Duplicate Detection Configuration
 */
export const DUPLICATE_DETECTION = {
  /** Maximum number of recent patients to check for duplicates (performance limit) */
  MAX_PATIENTS_TO_CHECK: 100,

  /** Time window for detecting duplicate orders (in days) */
  DUPLICATE_ORDER_WINDOW_DAYS: 30,

  /** Minimum similarity score (0.0-1.0) to flag as potential duplicate */
  SIMILARITY_THRESHOLD: 0.7,

  /** Weights for calculating patient similarity score */
  NAME_WEIGHTS: {
    /** Weight for first name match (30%) */
    FIRST_NAME: 0.3,

    /** Weight for last name match (50%) - most important */
    LAST_NAME: 0.5,

    /** Weight for MRN prefix match (20%) */
    MRN_PREFIX: 0.2,
  },
} as const;

/**
 * Care Plan Generation Configuration
 */
export const CARE_PLAN = {
  /** Maximum tokens for LLM response (Haiku 4.5: 8192 max, we use 4096 for comprehensive care plans) */
  MAX_TOKENS: 4096,

  /** Timeout for LLM API calls in milliseconds (60s for longer responses) */
  TIMEOUT_MS: 60000,

  /** Maximum number of recent orders to include in care plan prompt */
  MAX_ORDERS_IN_PROMPT: 10,
} as const;

/**
 * Pagination Configuration
 */
export const PAGINATION = {
  /** Default number of patients to return in list view */
  DEFAULT_PATIENT_LIMIT: 50,
} as const;

/**
 * API Configuration
 */
export const API = {
  /** Default timeout for external API calls (milliseconds) */
  DEFAULT_TIMEOUT: 30000,
} as const;
