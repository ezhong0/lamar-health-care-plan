/**
 * Database Seed Script
 *
 * Populates the database with example patient data for:
 * - Demo purposes
 * - Manual testing
 * - Development
 *
 * Run with: npm run db:seed
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Clear existing data (in correct order due to relations)
  console.log('Clearing existing data...');
  await prisma.carePlan.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.patient.deleteMany({});
  await prisma.provider.deleteMany({});
  console.log('✓ Existing data cleared\n');

  // Create Providers
  console.log('Creating providers...');
  const providers = await Promise.all([
    prisma.provider.create({
      data: {
        name: 'Dr. Sarah Mitchell',
        npi: '1234567893',
      },
    }),
    prisma.provider.create({
      data: {
        name: 'Dr. James Chen',
        npi: '1245319599',
      },
    }),
    prisma.provider.create({
      data: {
        name: 'Dr. Maria Rodriguez',
        npi: '1679576722',
      },
    }),
  ]);
  console.log(`✓ Created ${providers.length} providers\n`);

  // Patient 1: Myasthenia Gravis - Complete with care plan
  console.log('Creating Patient 1: Robert Johnson (Myasthenia Gravis)...');
  const patient1 = await prisma.patient.create({
    data: {
      firstName: 'Robert',
      lastName: 'Johnson',
      mrn: 'MRN001234',
      additionalDiagnoses: ['E11.9', 'I10'], // Type 2 diabetes, Essential hypertension
      medicationHistory: ['Prednisone', 'Pyridostigmine'],
      patientRecords: `Patient is a 58-year-old male with generalized myasthenia gravis diagnosed 3 years ago. Currently experiencing increased fatigue and diplopia despite oral medications. Previous treatments include pyridostigmine 60mg TID and prednisone 40mg daily with partial response. Recent EMG shows decremental response consistent with MG. Patient has good insurance coverage and is motivated for treatment. No history of thymoma on recent CT chest.`,
    },
  });

  await prisma.order.create({
    data: {
      patientId: patient1.id,
      providerId: providers[0].id,
      medicationName: 'IVIG (Intravenous Immunoglobulin)',
      primaryDiagnosis: 'G70.00',
      status: 'approved',
    },
  });

  await prisma.carePlan.create({
    data: {
      patientId: patient1.id,
      generatedBy: 'Claude AI',
      content: `# Care Plan for Robert Johnson

## Patient Overview
- **Name:** Robert Johnson
- **MRN:** MRN001234
- **Primary Diagnosis:** G70.00 - Myasthenia Gravis without (acute) exacerbation
- **Comorbidities:** Type 2 Diabetes Mellitus (E11.9), Essential Hypertension (I10)

## Treatment Plan

### IVIG Therapy
- **Medication:** Intravenous Immunoglobulin (IVIG)
- **Dosing:** 2 g/kg divided over 2-5 days (based on tolerance)
- **Administration:** Infusion center, start at 0.5 mg/kg/hr, increase gradually as tolerated
- **Frequency:** Initial course, then assess for maintenance schedule (typically every 3-4 weeks)

### Monitoring Parameters
1. **Pre-infusion:**
   - Vital signs baseline
   - IgA levels (contraindication if IgA deficient)
   - Renal function (BUN, Creatinine)
   - Complete blood count

2. **During infusion:**
   - Vital signs every 30 minutes
   - Watch for infusion reactions (headache, fever, chills)
   - Monitor for signs of volume overload

3. **Post-infusion:**
   - Symptom assessment (strength, diplopia, dysphagia)
   - MG-ADL score at each visit
   - Renal function 24-48 hours post-infusion

### Concurrent Medications
- Continue pyridostigmine 60mg TID
- Taper prednisone slowly once IVIG shows benefit (over 3-6 months)
- Continue metformin and lisinopril for comorbidities

### Follow-up Schedule
- Week 2: Phone call to assess response and side effects
- Week 4: In-person evaluation, repeat MG-ADL score
- Month 2: Neurology follow-up, consider maintenance schedule
- Ongoing: Coordinate with infusion center for regular treatments

## Safety Considerations
- **Contraindications:** IgA deficiency, hyperprolinemia
- **Risk factors:** Diabetes (increase thromboembolic risk), require adequate hydration
- **Precautions:** Slow infusion rate due to cardiovascular disease risk factors

## Goals of Therapy
1. Improve muscle strength and reduce fatigue (target MG-ADL score <3)
2. Eliminate diplopia and dysphagia
3. Allow for steroid taper to minimize long-term side effects
4. Improve quality of life and functional independence

## Patient Education
- Recognize signs of myasthenic crisis (difficulty breathing, swallowing)
- Importance of medication compliance
- When to seek emergency care
- Expected timeline for improvement (typically 2-4 weeks)`,
    },
  });
  console.log('✓ Created patient with order and care plan\n');

  // Patient 2: Severe Asthma - Approved order, no care plan yet
  console.log('Creating Patient 2: Emily Chen (Severe Asthma)...');
  const patient2 = await prisma.patient.create({
    data: {
      firstName: 'Emily',
      lastName: 'Chen',
      mrn: 'MRN002567',
      additionalDiagnoses: ['J30.1', 'L20.9'], // Allergic rhinitis, Atopic dermatitis
      medicationHistory: ['Albuterol', 'Fluticasone', 'Montelukast', 'Prednisone'],
      patientRecords: `45-year-old female with severe persistent asthma, poorly controlled despite maximal inhaled therapy. Multiple hospitalizations in past year (4 admissions), frequent oral steroid bursts. High IgE levels (850 IU/mL). Recent pulmonary function tests show FEV1 55% predicted with significant bronchodilator response. History of allergic rhinitis and atopic dermatitis. Non-smoker. Works as a teacher, missing significant work time due to exacerbations.`,
    },
  });

  await prisma.order.create({
    data: {
      patientId: patient2.id,
      providerId: providers[1].id,
      medicationName: 'Omalizumab (Xolair)',
      primaryDiagnosis: 'J45.50',
      status: 'approved',
    },
  });
  console.log('✓ Created patient with approved order\n');

  // Patient 3: Rheumatoid Arthritis - Pending order
  console.log('Creating Patient 3: Michael Williams (Rheumatoid Arthritis)...');
  const patient3 = await prisma.patient.create({
    data: {
      firstName: 'Michael',
      lastName: 'Williams',
      mrn: 'MRN003891',
      additionalDiagnoses: ['M79.3', 'Z87.891'], // Panniculitis, Personal history of nicotine dependence
      medicationHistory: ['Methotrexate', 'Prednisone', 'Naproxen'],
      patientRecords: `62-year-old male with seropositive rheumatoid arthritis diagnosed 5 years ago. Disease activity remains moderate-to-severe (DAS28 = 5.2) despite methotrexate 25mg weekly and prednisone 10mg daily. RF positive (120 IU/mL), anti-CCP positive (>250). Multiple swollen and tender joints bilaterally (MCPs, PIPs, wrists, knees). Morning stiffness lasting >2 hours. X-rays show early erosive changes in hands. Patient has failed adequate trial of MTX monotherapy. Former smoker (quit 2 years ago). Good medication compliance. Requesting biologic therapy for better disease control.`,
    },
  });

  await prisma.order.create({
    data: {
      patientId: patient3.id,
      providerId: providers[2].id,
      medicationName: 'Rituximab (Rituxan)',
      primaryDiagnosis: 'M05.79',
      status: 'pending',
    },
  });
  console.log('✓ Created patient with pending order\n');

  // Patient 4: Multiple Sclerosis - Recent patient, just submitted
  console.log('Creating Patient 4: Jennifer Martinez (Multiple Sclerosis)...');
  const patient4 = await prisma.patient.create({
    data: {
      firstName: 'Jennifer',
      lastName: 'Martinez',
      mrn: 'MRN004523',
      additionalDiagnoses: ['G62.81', 'F41.9'], // Chronic inflammatory demyelinating polyneuritis, Anxiety disorder
      medicationHistory: ['Glatiramer', 'Gabapentin', 'Vitamin D3'],
      patientRecords: `38-year-old female with relapsing-remitting multiple sclerosis diagnosed 2 years ago. Initial presentation with optic neuritis and sensory symptoms. MRI brain shows multiple periventricular white matter lesions consistent with MS. Currently on glatiramer acetate with suboptimal response - 2 relapses in past year requiring IV methylprednisolone. Recent MRI shows new T2 lesions. EDSS score 3.0. Patient experiencing significant fatigue and anxiety about disease progression. Neuropsychological testing shows mild cognitive impairment. Seeking more effective disease-modifying therapy.`,
    },
  });

  await prisma.order.create({
    data: {
      patientId: patient4.id,
      providerId: providers[0].id,
      medicationName: 'Natalizumab (Tysabri)',
      primaryDiagnosis: 'G35',
      status: 'pending',
    },
  });
  console.log('✓ Created patient with pending order\n');

  // Patient 5: ITP (Immune Thrombocytopenic Purpura) - Pending, needs review
  console.log('Creating Patient 5: David Thompson (ITP)...');
  const patient5 = await prisma.patient.create({
    data: {
      firstName: 'David',
      lastName: 'Thompson',
      mrn: 'MRN005678',
      additionalDiagnoses: ['D68.9', 'K29.70'], // Coagulation defect, Gastritis
      medicationHistory: ['Prednisone', 'Romiplostim', 'Omeprazole'],
      patientRecords: `52-year-old male with chronic immune thrombocytopenic purpura (ITP) for 4 years. Platelet counts chronically low (15,000-30,000) despite multiple treatment attempts. Previous therapies include corticosteroids (partial response with significant side effects), romiplostim (lost efficacy after 18 months), and dapsone (discontinued due to hemolysis). Currently experiencing increased bruising and petechiae. No active bleeding. Patient is splenectomy candidate but prefers medical management. Recent bone marrow biopsy shows adequate megakaryocytes, ruling out production defect. Requesting IVIG trial for platelet support.`,
    },
  });

  await prisma.order.create({
    data: {
      patientId: patient5.id,
      providerId: providers[1].id,
      medicationName: 'IVIG (Intravenous Immunoglobulin)',
      primaryDiagnosis: 'D69.3',
      status: 'pending',
    },
  });
  console.log('✓ Created patient with pending order\n');

  // Summary
  console.log('📊 Seed Summary:');
  console.log(`   • ${providers.length} providers created`);

  const patientCount = await prisma.patient.count();
  const orderCount = await prisma.order.count();
  const carePlanCount = await prisma.carePlan.count();

  console.log(`   • ${patientCount} patients created`);
  console.log(`   • ${orderCount} orders created`);
  console.log(`   • ${carePlanCount} care plans created`);

  console.log('\n✅ Database seed completed successfully!');
  console.log('\n💡 You can now:');
  console.log('   - Start the dev server: npm run dev');
  console.log('   - View patients at: http://localhost:3000');
  console.log('   - Generate care plans for patients without them');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
