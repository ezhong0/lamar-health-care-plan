/**
 * Test Care Plan Generation Locally
 *
 * Quickly test care plan generation without clicking through UI.
 * Useful for:
 * - Testing different prompts
 * - Comparing AI models
 * - Measuring generation time
 * - Debugging output format
 *
 * Usage:
 *   npx tsx scripts/test-care-plan-locally.ts
 *
 * Requirements:
 *   - DATABASE_URL set in .env.local
 *   - ANTHROPIC_API_KEY set in .env.local
 *   - At least one patient with order in database
 */

import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCarePlanGeneration() {
  console.log('🧪 Testing Care Plan Generation\n');

  // Check environment variables
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY not set in .env.local');
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set in .env.local');
    process.exit(1);
  }

  try {
    // Find a test patient with orders
    console.log('1. Finding test patient...');
    const patient = await prisma.patient.findFirst({
      include: {
        orders: {
          include: { provider: true },
          take: 1,
        },
      },
      where: {
        orders: { some: {} }, // Has at least one order
      },
    });

    if (!patient || patient.orders.length === 0) {
      console.error('❌ No patients with orders found in database');
      console.log('💡 Create a patient first through the UI or seed script');
      process.exit(1);
    }

    console.log(`✅ Found patient: ${patient.firstName} ${patient.lastName} (MRN: ${patient.mrn})`);
    console.log(`   Order: ${patient.orders[0].medicationName}`);
    console.log('');

    // Build prompt (simplified version)
    const order = patient.orders[0];
    const prompt = `You are a clinical pharmacist creating a care plan for specialty medication.

## Patient Information
Name: ${patient.firstName} ${patient.lastName}
MRN: ${patient.mrn}
Medication: ${order.medicationName}
Diagnosis: ${order.primaryDiagnosis}

${patient.patientRecords || 'No additional records provided.'}

## Task
Generate a comprehensive care plan with these sections:
1. Problem list / Drug therapy problems (4-6 bullets, 1-2 sentences each)
2. Goals (SMART): Primary, Safety goal, Process (1-2 sentences each)
3. Pharmacist interventions (9 subsections: dosing, premedication, infusion rates, hydration, thrombosis, concomitant meds, monitoring, adverse events, documentation)
4. Monitoring plan

Keep total length 1500-2000 words. Be concise and clinically accurate.

Generate the care plan:`;

    // Call Claude AI
    console.log('2. Calling Claude AI (Haiku 4.5)...');
    const startTime = Date.now();

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3500,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const duration = Date.now() - startTime;

    // Extract content
    const content = response.content[0];
    if (content.type !== 'text') {
      console.error('❌ Unexpected response type from AI');
      process.exit(1);
    }

    const carePlanContent = content.text;

    // Display results
    console.log('✅ Care plan generated successfully\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 METRICS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`⏱️  Generation time: ${duration}ms (${(duration / 1000).toFixed(1)}s)`);
    console.log(`📝 Content length: ${carePlanContent.length} characters`);
    console.log(`📄 Word count: ~${Math.round(carePlanContent.split(/\s+/).length)} words`);
    console.log(`🔢 Input tokens: ${response.usage.input_tokens}`);
    console.log(`🔢 Output tokens: ${response.usage.output_tokens}`);
    console.log(
      `💰 Cost: ~$${((response.usage.input_tokens / 1000000) * 0.8 + (response.usage.output_tokens / 1000000) * 4).toFixed(4)}`
    );
    console.log('');

    // Show preview
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📄 CONTENT PREVIEW (first 500 chars)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(carePlanContent.substring(0, 500));
    console.log('...\n');

    // Validate structure
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ STRUCTURE VALIDATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const requiredSections = [
      'Problem list',
      'Goals',
      'Pharmacist interventions',
      'Monitoring',
    ];

    for (const section of requiredSections) {
      const hasSection = carePlanContent.toLowerCase().includes(section.toLowerCase());
      console.log(`${hasSection ? '✅' : '❌'} ${section}: ${hasSection ? 'Found' : 'MISSING'}`);
    }
    console.log('');

    // Optional: Save to database
    console.log('💡 To save this care plan, uncomment the code below');
    console.log('');

    // Uncomment to save to database:
    // const saved = await prisma.carePlan.create({
    //   data: {
    //     patientId: patient.id,
    //     orderId: order.id,
    //     content: carePlanContent,
    //     generatedBy: 'claude-haiku-4-5-20251001',
    //   },
    // });
    // console.log(`✅ Saved to database (ID: ${saved.id})`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ TEST COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (error) {
    console.error('\n❌ ERROR:', error instanceof Error ? error.message : error);

    if (error instanceof Error && 'status' in error) {
      const apiError = error as { status: number };
      if (apiError.status === 401) {
        console.error('💡 Check your ANTHROPIC_API_KEY in .env.local');
      } else if (apiError.status === 429) {
        console.error('💡 Rate limit exceeded. Wait 60 seconds and try again.');
      }
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testCarePlanGeneration();
