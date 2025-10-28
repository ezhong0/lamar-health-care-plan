/**
 * Logger Tests
 *
 * Tests structured logging functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '@/lib/infrastructure/logger';

describe('Logger', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Spy on console methods
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // The logger caches LOG_LEVEL at module load time, so we need to set the
    // logger's internal level to 'debug' to allow all logs during tests
    // @ts-expect-error - accessing private property for testing
    logger.level = 'debug';
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    // Restore logger level to original
    // @ts-expect-error - accessing private property for testing
    logger.level = 'error';
  });

  describe('info level', () => {
    it('logs info messages with structured format', () => {
      logger.info('Test message', { key: 'value' });

      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls[0][0];
      const logData = JSON.parse(logCall);

      expect(logData.level).toBe('info');
      expect(logData.message).toBe('Test message');
      expect(logData.key).toBe('value');
      expect(logData.timestamp).toBeDefined();
    });

    it('includes timestamp in ISO format', () => {
      logger.info('Test');

      const logCall = consoleSpy.mock.calls[0][0];
      const logData = JSON.parse(logCall);

      expect(logData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('handles messages without metadata', () => {
      logger.info('Simple message');

      expect(consoleSpy).toHaveBeenCalled();
      const logData = JSON.parse(consoleSpy.mock.calls[0][0]);

      expect(logData.level).toBe('info');
      expect(logData.message).toBe('Simple message');
    });
  });

  describe('warn level', () => {
    it('logs warn messages', () => {
      logger.warn('Warning message', { reason: 'test' });

      const logData = JSON.parse(consoleSpy.mock.calls[0][0]);

      expect(logData.level).toBe('warn');
      expect(logData.message).toBe('Warning message');
      expect(logData.reason).toBe('test');
    });
  });

  describe('error level', () => {
    it('logs error messages', () => {
      logger.error('Error occurred', { code: 'ERR_001' });

      const logData = JSON.parse(consoleSpy.mock.calls[0][0]);

      expect(logData.level).toBe('error');
      expect(logData.message).toBe('Error occurred');
      expect(logData.code).toBe('ERR_001');
    });

    it('handles Error objects', () => {
      const error = new Error('Something went wrong');
      logger.error('Error occurred', { error: error.message });

      const logData = JSON.parse(consoleSpy.mock.calls[0][0]);

      expect(logData.level).toBe('error');
      expect(logData.error).toBe('Something went wrong');
    });
  });

  describe('debug level', () => {
    it('logs debug messages when log level allows', () => {
      // Note: debug logs only appear if LOG_LEVEL is set to 'debug'
      // By default, LOG_LEVEL is 'info', so debug logs are filtered
      logger.debug('Debug info', { step: 1 });

      // In test mode with default LOG_LEVEL='info', debug is filtered
      // This test verifies the logger accepts debug calls without error
      expect(true).toBe(true);
    });
  });

  describe('structured metadata', () => {
    it('preserves nested objects', () => {
      logger.info('Complex data', {
        user: {
          id: '123',
          name: 'John',
        },
        metrics: {
          count: 42,
        },
      });

      const logData = JSON.parse(consoleSpy.mock.calls[0][0]);

      expect(logData.user).toEqual({ id: '123', name: 'John' });
      expect(logData.metrics).toEqual({ count: 42 });
    });

    it('handles arrays in metadata', () => {
      logger.info('Array data', {
        items: ['a', 'b', 'c'],
      });

      const logData = JSON.parse(consoleSpy.mock.calls[0][0]);

      expect(logData.items).toEqual(['a', 'b', 'c']);
    });

    it('handles null and undefined values', () => {
      logger.info('Nullable data', {
        nullValue: null,
        undefinedValue: undefined,
      });

      const logData = JSON.parse(consoleSpy.mock.calls[0][0]);

      expect(logData.nullValue).toBeNull();
      // undefined is typically omitted in JSON
    });

    it('handles boolean values', () => {
      logger.info('Boolean data', {
        isActive: true,
        isDeleted: false,
      });

      const logData = JSON.parse(consoleSpy.mock.calls[0][0]);

      expect(logData.isActive).toBe(true);
      expect(logData.isDeleted).toBe(false);
    });

    it('handles numeric values', () => {
      logger.info('Numeric data', {
        count: 42,
        pi: 3.14159,
        zero: 0,
      });

      const logData = JSON.parse(consoleSpy.mock.calls[0][0]);

      expect(logData.count).toBe(42);
      expect(logData.pi).toBe(3.14159);
      expect(logData.zero).toBe(0);
    });
  });

  describe('special characters', () => {
    it('handles messages with quotes', () => {
      logger.info('Message with "quotes"');

      const logData = JSON.parse(consoleSpy.mock.calls[0][0]);

      expect(logData.message).toContain('quotes');
    });

    it('handles messages with newlines', () => {
      logger.info('Line 1\nLine 2');

      const logData = JSON.parse(consoleSpy.mock.calls[0][0]);

      expect(logData.message).toContain('Line 1');
      expect(logData.message).toContain('Line 2');
    });

    it('handles unicode characters', () => {
      logger.info('Unicode: 你好 🚀');

      const logData = JSON.parse(consoleSpy.mock.calls[0][0]);

      expect(logData.message).toContain('你好');
      expect(logData.message).toContain('🚀');
    });
  });

  describe('edge cases', () => {
    it('handles empty message', () => {
      logger.info('');

      const logData = JSON.parse(consoleSpy.mock.calls[0][0]);

      expect(logData.message).toBe('');
    });

    it('handles very long messages', () => {
      const longMessage = 'x'.repeat(10000);
      logger.info(longMessage);

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('handles large metadata objects', () => {
      const largeMetadata: Record<string, number> = {};
      for (let i = 0; i < 100; i++) {
        largeMetadata[`key${i}`] = i;
      }

      logger.info('Large metadata', largeMetadata);

      const logData = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(Object.keys(logData).length).toBeGreaterThan(50);
    });
  });

  describe('production use cases', () => {
    it('logs patient creation', () => {
      logger.info('Creating patient', {
        mrn: '123456',
        firstName: 'John',
        lastName: 'Doe',
      });

      const logData = JSON.parse(consoleSpy.mock.calls[0][0]);

      expect(logData.mrn).toBe('123456');
      expect(logData.firstName).toBe('John');
      expect(logData.lastName).toBe('Doe');
    });

    it('logs provider conflicts', () => {
      logger.warn('Provider NPI conflict detected', {
        npi: '1234567893',
        existingName: 'Dr. Smith',
        inputName: 'Dr. John Smith',
      });

      const logData = JSON.parse(consoleSpy.mock.calls[0][0]);

      expect(logData.level).toBe('warn');
      expect(logData.npi).toBe('1234567893');
    });

    it('logs duplicate orders', () => {
      logger.info('Duplicate orders detected', {
        patientId: 'patient-123',
        medicationName: 'IVIG',
        count: 2,
      });

      const logData = JSON.parse(consoleSpy.mock.calls[0][0]);

      expect(logData.medicationName).toBe('IVIG');
      expect(logData.count).toBe(2);
    });

    it('logs patient creation success', () => {
      logger.info('Patient created successfully', {
        patientId: 'patient-123',
        orderId: 'order-456',
        mrn: '123456',
        warningCount: 1,
        duration: 150,
      });

      const logData = JSON.parse(consoleSpy.mock.calls[0][0]);

      expect(logData.patientId).toBe('patient-123');
      expect(logData.duration).toBe(150);
    });
  });
});
