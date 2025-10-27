/**
 * Retry utility with exponential backoff
 *
 * Useful for retrying failed external API calls (LLM, external services, etc.)
 * Implements exponential backoff to avoid overwhelming failing services.
 */

export interface RetryOptions {
  attempts: number; // Number of retry attempts
  delay: number; // Initial delay in milliseconds
  backoff: number; // Exponential backoff multiplier
  onRetry?: (error: Error, attempt: number) => void; // Callback on retry
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= options.attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      if (attempt < options.attempts) {
        if (options.onRetry) {
          options.onRetry(lastError, attempt);
        }

        // Calculate exponential backoff delay
        const delay = options.delay * Math.pow(options.backoff, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}
