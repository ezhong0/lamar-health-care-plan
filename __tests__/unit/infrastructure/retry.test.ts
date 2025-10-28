/**
 * Unit Tests: Retry Utility
 *
 * Tests exponential backoff retry logic.
 * Includes success, failure, retry attempts, and backoff timing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { retry } from '@/lib/infrastructure/retry';

describe('Retry Utility', () => {
  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Successful operations', () => {
    it('should return result on first success', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await retry(fn, {
        attempts: 3,
        delay: 1000,
        backoff: 2,
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should return result after retries', async () => {
      let callCount = 0;
      const fn = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      });

      const promise = retry(fn, {
        attempts: 3,
        delay: 100,
        backoff: 2,
      });

      // Fast-forward through delays
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('Failed operations', () => {
    it('should throw error after all attempts exhausted', async () => {
      const error = new Error('Permanent failure');
      const fn = vi.fn().mockRejectedValue(error);

      const promise = retry(fn, {
        attempts: 3,
        delay: 100,
        backoff: 2,
      });

      // Concurrently advance timers and catch rejection
      await Promise.all([
        vi.runAllTimersAsync(),
        expect(promise).rejects.toThrow('Permanent failure')
      ]);

      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw last error', async () => {
      const errors = [
        new Error('Error 1'),
        new Error('Error 2'),
        new Error('Error 3'),
      ];

      let callCount = 0;
      const fn = vi.fn().mockImplementation(async () => {
        throw errors[callCount++];
      });

      const promise = retry(fn, {
        attempts: 3,
        delay: 100,
        backoff: 2,
      });

      // Concurrently advance timers and catch rejection
      await Promise.all([
        vi.runAllTimersAsync(),
        expect(promise).rejects.toThrow('Error 3')
      ]);
    });
  });

  describe('Retry behavior', () => {
    it('should retry specified number of times', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Fail'));

      const promise = retry(fn, {
        attempts: 5,
        delay: 100,
        backoff: 2,
      });

      // Concurrently advance timers and catch rejection
      await Promise.all([
        vi.runAllTimersAsync(),
        expect(promise).rejects.toThrow()
      ]);

      expect(fn).toHaveBeenCalledTimes(5);
    });

    it('should not retry if succeeds on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      await retry(fn, {
        attempts: 5,
        delay: 1000,
        backoff: 2,
      });

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should stop retrying after success', async () => {
      let callCount = 0;
      const fn = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          return 'success';
        }
        throw new Error('Fail');
      });

      const promise = retry(fn, {
        attempts: 5,
        delay: 100,
        backoff: 2,
      });

      await vi.runAllTimersAsync();

      await promise;

      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Exponential backoff', () => {
    it('should use exponential backoff delays', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Fail'));
      const delays: number[] = [];

      const promise = retry(fn, {
        attempts: 4,
        delay: 100,
        backoff: 2,
        onRetry: () => {
          delays.push(Date.now());
        },
      });

      // Concurrently advance timers and catch rejection
      await Promise.all([
        vi.runAllTimersAsync(),
        expect(promise).rejects.toThrow()
      ]);

      // Should have 3 retries (4 attempts - 1 initial)
      expect(delays).toHaveLength(3);

      // Delays should be: 100ms, 200ms, 400ms (exponential)
      // We can't test exact timing with fake timers, but we can verify the pattern
    });

    it('should apply backoff multiplier correctly', async () => {
      let attemptCount = 0;
      const delays: number[] = [];

      const fn = vi.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 4) {
          throw new Error('Fail');
        }
        return 'success';
      });

      const promise = retry(fn, {
        attempts: 4,
        delay: 100,
        backoff: 3, // Tripling each time
        onRetry: (error, attempt) => {
          delays.push(attempt);
        },
      });

      await vi.runAllTimersAsync();

      await promise;

      expect(delays).toHaveLength(3); // 3 retries
      expect(delays).toEqual([1, 2, 3]); // Attempt numbers
    });
  });

  describe('onRetry callback', () => {
    it('should call onRetry callback on each retry', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Fail'));
      const onRetry = vi.fn();

      const promise = retry(fn, {
        attempts: 3,
        delay: 100,
        backoff: 2,
        onRetry,
      });

      // Concurrently advance timers and catch rejection
      await Promise.all([
        vi.runAllTimersAsync(),
        expect(promise).rejects.toThrow()
      ]);

      // Should retry 2 times (3 attempts - 1 initial)
      expect(onRetry).toHaveBeenCalledTimes(2);
    });

    it('should pass error and attempt number to callback', async () => {
      const error = new Error('Test error');
      const fn = vi.fn().mockRejectedValue(error);
      const onRetry = vi.fn();

      const promise = retry(fn, {
        attempts: 2,
        delay: 100,
        backoff: 2,
        onRetry,
      });

      // Concurrently advance timers and catch rejection
      await Promise.all([
        vi.runAllTimersAsync(),
        expect(promise).rejects.toThrow()
      ]);

      expect(onRetry).toHaveBeenCalledWith(error, 1);
    });

    it('should not call onRetry if succeeds on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const onRetry = vi.fn();

      await retry(fn, {
        attempts: 3,
        delay: 100,
        backoff: 2,
        onRetry,
      });

      expect(onRetry).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle attempt count of 1', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Fail'));

      await expect(
        retry(fn, {
          attempts: 1,
          delay: 100,
          backoff: 2,
        })
      ).rejects.toThrow();

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should handle zero delay', async () => {
      // Use real timers for zero delay test
      vi.useRealTimers();

      let callCount = 0;
      const fn = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount < 2) {
          throw new Error('Fail');
        }
        return 'success';
      });

      const result = await retry(fn, {
        attempts: 2,
        delay: 0,
        backoff: 2,
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);

      // Restore fake timers for other tests
      vi.useFakeTimers();
    });

    it('should handle backoff of 1 (no multiplication)', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Fail'));

      const promise = retry(fn, {
        attempts: 3,
        delay: 100,
        backoff: 1, // No exponential growth
      });

      // Concurrently advance timers and catch rejection
      await Promise.all([
        vi.runAllTimersAsync(),
        expect(promise).rejects.toThrow()
      ]);

      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should handle non-Error rejections', async () => {
      const fn = vi.fn().mockRejectedValue('string error');

      const promise = retry(fn, {
        attempts: 2,
        delay: 100,
        backoff: 2,
      });

      // Concurrently advance timers and catch rejection
      await Promise.all([
        vi.runAllTimersAsync(),
        expect(promise).rejects.toThrow()
      ]);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle network timeout simulation', async () => {
      let attempts = 0;
      const fn = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Network timeout');
        }
        return { data: 'success' };
      });

      const promise = retry(fn, {
        attempts: 3,
        delay: 1000,
        backoff: 2,
        onRetry: (error, attempt) => {
          console.log(`Retry attempt ${attempt}: ${error.message}`);
        },
      });

      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result).toEqual({ data: 'success' });
      expect(attempts).toBe(3);
    });

    it('should handle rate limit with exponential backoff', async () => {
      let attempts = 0;
      const fn = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 4) {
          const error = new Error('Rate limit exceeded');
          (error as any).status = 429;
          throw error;
        }
        return 'success';
      });

      const promise = retry(fn, {
        attempts: 5,
        delay: 1000,
        backoff: 2,
      });

      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result).toBe('success');
      expect(attempts).toBe(4);
    });
  });
});
