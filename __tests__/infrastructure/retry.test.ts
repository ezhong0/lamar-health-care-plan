/**
 * Tests for retry utility with exponential backoff
 *
 * Critical for resilient external API calls (LLM, etc.)
 * Tests verify retry behavior, backoff timing, and eventual failure.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { retry } from '@/lib/infrastructure/retry';

describe('retry utility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe('successful execution', () => {
    it('returns result immediately on first success', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const promise = retry(fn, {
        attempts: 3,
        delay: 100,
        backoff: 2,
      });

      // Fast-forward through any delays
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('retry behavior', () => {
    it('retries on failure until success', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      const promise = retry(fn, {
        attempts: 3,
        delay: 100,
        backoff: 2,
      });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('throws last error when all attempts fail', async () => {
      const lastError = new Error('Final failure');
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockRejectedValue(lastError);

      const promise = retry(fn, {
        attempts: 3,
        delay: 100,
        backoff: 2,
      });

      // Catch to prevent unhandled rejection
      promise.catch(() => {});

      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow('Final failure');
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('exponential backoff', () => {
    it('waits with exponential backoff between retries', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      const promise = retry(fn, {
        attempts: 3,
        delay: 100, // Base delay
        backoff: 2, // 2x multiplier
      });

      // After first call, should wait 100ms (100 * 2^0)
      expect(fn).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(100);
      // After second call, should wait 200ms (100 * 2^1)
      expect(fn).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(200);
      // Third call succeeds
      expect(fn).toHaveBeenCalledTimes(3);

      await vi.runAllTimersAsync();
      const result = await promise;
      expect(result).toBe('success');
    });
  });

  describe('onRetry callback', () => {
    it('calls onRetry callback with error and attempt number', async () => {
      const onRetry = vi.fn();
      const error1 = new Error('Fail 1');
      const error2 = new Error('Fail 2');

      const fn = vi
        .fn()
        .mockRejectedValueOnce(error1)
        .mockRejectedValueOnce(error2)
        .mockResolvedValue('success');

      const promise = retry(fn, {
        attempts: 3,
        delay: 100,
        backoff: 2,
        onRetry,
      });

      await vi.runAllTimersAsync();
      await promise;

      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenCalledWith(error1, 1);
      expect(onRetry).toHaveBeenCalledWith(error2, 2);
    });

    it('does not call onRetry on final failure', async () => {
      const onRetry = vi.fn();
      const fn = vi.fn().mockRejectedValue(new Error('Always fails'));

      const promise = retry(fn, {
        attempts: 3,
        delay: 100,
        backoff: 2,
        onRetry,
      });

      // Catch to prevent unhandled rejection
      promise.catch(() => {});

      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow();
      // Called twice (after attempt 1 and 2, but not after attempt 3)
      expect(onRetry).toHaveBeenCalledTimes(2);
    });
  });

  describe('edge cases', () => {
    it('handles single attempt (no retries)', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const promise = retry(fn, {
        attempts: 1,
        delay: 100,
        backoff: 2,
      });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('handles non-Error thrown values', async () => {
      const fn = vi.fn().mockRejectedValue('string error');

      const promise = retry(fn, {
        attempts: 2,
        delay: 100,
        backoff: 2,
      });

      // Catch to prevent unhandled rejection
      promise.catch(() => {});

      await vi.runAllTimersAsync();

      // Should convert to Error
      await expect(promise).rejects.toThrow('Unknown error');
    });
  });
});
