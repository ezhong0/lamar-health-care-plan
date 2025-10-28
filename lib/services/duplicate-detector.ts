/**
 * Duplicate Detection Service
 *
 * Detects duplicate and similar patients/orders using multiple strategies:
 * - Exact matching (MRN, medication+patient)
 * - Fuzzy matching (name similarity, Jaccard similarity for trigrams)
 * - Temporal proximity (recent orders)
 *
 * Why this approach:
 * - Healthcare has frequent duplicates due to manual data entry
 * - Simple exact matching misses typos ("John Smith" vs "Jon Smith")
 * - Weighted scoring allows tuning sensitivity
 *
 * Algorithm:
 * 1. Exact MRN check (hard duplicate)
 * 2. Name similarity using trigram Jaccard index
 * 3. Weighted scoring: firstName (30%) + lastName (50%) + MRN prefix (20%)
 * 4. Threshold: >0.7 = similar, >0.9 = likely duplicate
 *
 * Trade-offs:
 * - ✅ Catches typos and variations
 * - ✅ Explainable (shows similarity score)
 * - ✅ Fast (O(n) database scan, could optimize with indexes)
 * - ❌ May have false positives (common names like "John Smith")
 * - ❌ Doesn't use ML (would need training data)
 *
 * Production improvements:
 * - PostgreSQL pg_trgm extension for trigram similarity in SQL
 * - ML model trained on labeled duplicate pairs
 * - Phonetic matching (Soundex/Metaphone) for pronunciation similarity
 */

import type { Prisma } from '@prisma/client';
import type { PatientId, OrderId } from '@/lib/domain/types';
import type { SimilarPatientWarning, DuplicateOrderWarning } from '@/lib/domain/warnings';
import { logger } from '@/lib/infrastructure/logger';
import { DUPLICATE_DETECTION } from '@/lib/config/constants';

export interface PatientMatchInput {
  firstName: string;
  lastName: string;
  mrn: string;
}

export interface OrderMatchInput {
  patientId: PatientId;
  medicationName: string;
}

/**
 * Duplicate Detector Service
 *
 * Stateless service with no constructor dependencies.
 * Pure functions for testability.
 */
export class DuplicateDetector {
  /**
   * Similarity threshold for "similar patient" warnings
   *
   * - >0.7: Flag as similar (show warning)
   * - >0.9: Likely duplicate (stronger warning)
   *
   * Tune based on false positive/negative rate in production.
   */
  private static readonly SIMILARITY_THRESHOLD = DUPLICATE_DETECTION.SIMILARITY_THRESHOLD;

  /**
   * Find similar patients using fuzzy name matching
   *
   * Returns patients with similarity score > threshold.
   * Excludes exact MRN matches (those are handled as hard errors upstream).
   *
   * Performance note: Currently checks last 100 patients (O(100)).
   * For production with 10k+ patients, migrate to PostgreSQL pg_trgm
   * extension for server-side fuzzy matching with GIN indexes (O(log n)).
   *
   * @param input - Patient name and MRN to check
   * @param tx - Prisma transaction client
   * @returns Array of similar patient warnings
   *
   * @example
   * const warnings = await detector.findSimilarPatients({
   *   firstName: 'John',
   *   lastName: 'Smith',
   *   mrn: 'MRN12345'
   * }, tx);
   * // Returns warnings for "Jon Smith", "John Smyth", etc.
   */
  async findSimilarPatients(
    input: PatientMatchInput,
    tx: Prisma.TransactionClient
  ): Promise<SimilarPatientWarning[]> {
    const startTime = Date.now();

    logger.debug('Checking for similar patients', {
      firstName: input.firstName,
      lastName: input.lastName,
      mrn: input.mrn,
    });

    // Fetch recent patients only for comparison (performance optimization)
    // Duplicates are most likely to be recent entries
    // Production: Use PostgreSQL pg_trgm for server-side fuzzy matching:
    // SELECT * FROM patients WHERE similarity(first_name || ' ' || last_name, $1) > 0.7
    const allPatients = await tx.patient.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        mrn: true,
      },
      orderBy: { createdAt: 'desc' },
      take: DUPLICATE_DETECTION.MAX_PATIENTS_TO_CHECK,
    });

    const warnings: SimilarPatientWarning[] = [];

    for (const patient of allPatients) {
      // Skip exact MRN match (handled upstream as hard duplicate)
      if (patient.mrn === input.mrn) {
        continue;
      }

      // Calculate similarity score
      const score = this.calculatePatientSimilarity(
        input,
        {
          firstName: patient.firstName,
          lastName: patient.lastName,
          mrn: patient.mrn,
        }
      );

      // Add warning if above threshold
      if (score >= DuplicateDetector.SIMILARITY_THRESHOLD) {
        warnings.push({
          type: 'SIMILAR_PATIENT',
          severity: 'medium',
          message: `Similar patient found: ${patient.firstName} ${patient.lastName} (MRN: ${patient.mrn}) - ${Math.round(score * 100)}% match`,
          similarPatient: {
            id: patient.id as PatientId,
            mrn: patient.mrn,
            name: `${patient.firstName} ${patient.lastName}`,
          },
          similarityScore: score,
        });
      }
    }

    const duration = Date.now() - startTime;
    logger.debug('Similar patient check complete', {
      checked: allPatients.length,
      found: warnings.length,
      duration,
    });

    return warnings;
  }

  /**
   * Check for duplicate orders (same patient + medication recently)
   *
   * Duplicate order = same patient + same medication within 30 days.
   * This catches accidental re-submissions.
   *
   * @param input - Patient ID and medication name
   * @param tx - Prisma transaction client
   * @returns Array of duplicate order warnings
   *
   * @example
   * const warnings = await detector.findDuplicateOrders({
   *   patientId: 'patient_123',
   *   medicationName: 'IVIG'
   * }, tx);
   */
  async findDuplicateOrders(
    input: OrderMatchInput,
    tx: Prisma.TransactionClient
  ): Promise<DuplicateOrderWarning[]> {
    const orderWindowStart = new Date();
    orderWindowStart.setDate(orderWindowStart.getDate() - DUPLICATE_DETECTION.DUPLICATE_ORDER_WINDOW_DAYS);

    logger.debug('Checking for duplicate orders', {
      patientId: input.patientId,
      medicationName: input.medicationName,
    });

    // Find recent orders for same patient + medication
    const existingOrders = await tx.order.findMany({
      where: {
        patientId: input.patientId,
        medicationName: {
          equals: input.medicationName,
          mode: 'insensitive', // Case-insensitive match
        },
        createdAt: {
          gte: orderWindowStart,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Warn if there are any existing orders (prevents duplicates)
    // This check runs BEFORE creating a new order to check if it would be a duplicate
    if (existingOrders.length === 0) {
      return [];
    }

    logger.info('Duplicate orders detected', {
      patientId: input.patientId,
      medicationName: input.medicationName,
      count: existingOrders.length,
    });

    return existingOrders.map((order) => ({
      type: 'DUPLICATE_ORDER',
      severity: 'high',
      message: `Order for ${order.medicationName} already exists for this patient (created ${this.formatDate(order.createdAt)})`,
      existingOrder: {
        id: order.id as OrderId,
        medicationName: order.medicationName,
        createdAt: order.createdAt,
      },
    }));
  }

  /**
   * Calculate patient similarity score
   *
   * Weighted scoring:
   * - First name: 30% (less weight, common names)
   * - Last name: 50% (more weight, more distinctive)
   * - MRN prefix: 20% (catches typos in MRN entry)
   *
   * Uses Jaccard similarity on character trigrams:
   * "John" → ["Joh", "ohn"]
   * "Jon"  → ["Jon", "on"]
   * Similarity = intersection / union
   *
   * @param p1 - First patient
   * @param p2 - Second patient
   * @returns Similarity score (0.0 to 1.0)
   *
   * @example
   * calculatePatientSimilarity(
   *   { firstName: 'John', lastName: 'Smith', mrn: 'MRN12345' },
   *   { firstName: 'Jon', lastName: 'Smyth', mrn: 'MRN12346' }
   * ) // Returns ~0.75
   */
  private calculatePatientSimilarity(
    p1: PatientMatchInput,
    p2: PatientMatchInput
  ): number {
    // Weight factors (must sum to 1.0)
    const FIRST_NAME_WEIGHT = DUPLICATE_DETECTION.NAME_WEIGHTS.FIRST_NAME;
    const LAST_NAME_WEIGHT = DUPLICATE_DETECTION.NAME_WEIGHTS.LAST_NAME;
    const MRN_WEIGHT = DUPLICATE_DETECTION.NAME_WEIGHTS.MRN_PREFIX;

    const firstNameScore = this.jaccardSimilarity(
      p1.firstName.toLowerCase(),
      p2.firstName.toLowerCase()
    );

    const lastNameScore = this.jaccardSimilarity(
      p1.lastName.toLowerCase(),
      p2.lastName.toLowerCase()
    );

    // MRN similarity (prefix matching, useful for typos)
    // Only use first 6 characters to avoid being too strict
    const mrnScore = this.jaccardSimilarity(
      p1.mrn.toLowerCase().slice(0, 6),
      p2.mrn.toLowerCase().slice(0, 6)
    );

    const totalScore =
      firstNameScore * FIRST_NAME_WEIGHT +
      lastNameScore * LAST_NAME_WEIGHT +
      mrnScore * MRN_WEIGHT;

    return totalScore;
  }

  /**
   * Calculate Jaccard similarity using character trigrams
   *
   * Trigram: sequence of 3 consecutive characters
   * "hello" → ["hel", "ell", "llo"]
   *
   * Jaccard similarity = |A ∩ B| / |A ∪ B|
   *
   * Why trigrams:
   * - More robust than character-by-character (handles transpositions)
   * - Less sensitive to length differences than full string matching
   * - Standard in fuzzy text matching (PostgreSQL pg_trgm uses this)
   *
   * @param s1 - First string
   * @param s2 - Second string
   * @returns Jaccard similarity score (0.0 to 1.0)
   *
   * @example
   * jaccardSimilarity('hello', 'hallo') // ~0.6 (trigrams overlap)
   * jaccardSimilarity('abc', 'xyz')     // 0.0 (no overlap)
   * jaccardSimilarity('test', 'test')   // 1.0 (identical)
   */
  private jaccardSimilarity(s1: string, s2: string): number {
    // Handle edge cases - check equality FIRST (includes empty string case)
    if (s1 === s2) return 1.0; // Identical strings (including '', '') = perfect match
    if (s1.length === 0 || s2.length === 0) return 0.0;

    const trigrams1 = this.getTrigrams(s1);
    const trigrams2 = this.getTrigrams(s2);

    // Convert to Sets first to avoid counting duplicates
    // This ensures mathematically correct Jaccard similarity
    const set1 = new Set(trigrams1);
    const set2 = new Set(trigrams2);

    // Calculate intersection (elements in both sets)
    const intersection = [...set1].filter((t) => set2.has(t));

    // Calculate union (all unique elements)
    const union = new Set([...set1, ...set2]);

    return intersection.length / union.size;
  }

  /**
   * Generate character trigrams from string
   *
   * Adds padding to ensure short strings have trigrams:
   * "ab" → "  ab  " → ["  a", " ab", "ab ", "b  "]
   *
   * @param str - Input string
   * @returns Array of trigrams
   *
   * @example
   * getTrigrams('cat') // ['  c', ' ca', 'cat', 'at ', 't  ']
   */
  private getTrigrams(str: string): string[] {
    // Pad with spaces for edge trigrams
    const padded = `  ${str}  `;
    const trigrams: string[] = [];

    for (let i = 0; i < padded.length - 2; i++) {
      trigrams.push(padded.slice(i, i + 3));
    }

    return trigrams;
  }

  /**
   * Format date for user display
   *
   * @param date - Date object
   * @returns Formatted string (e.g., "Oct 27, 2024")
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
