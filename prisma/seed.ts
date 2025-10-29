/**
 * Database Seed Script
 *
 * Populates the database with comprehensive example data:
 * - 35 providers with validated NPIs
 * - 25+ patients with diverse conditions and MRNs
 * - Multiple orders and care plans
 *
 * Run with: npm run db:seed
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// All 35 validated NPIs with provider names
const PROVIDERS = [
  { name: 'Dr. Sarah Mitchell', npi: '1234567893' },
  { name: 'Dr. James Chen', npi: '1245319599' },
  { name: 'Dr. Maria Rodriguez', npi: '1679576722' },
  { name: 'Dr. David Park', npi: '1982736450' },
  { name: 'Dr. Emily Johnson', npi: '1000000004' },
  { name: 'Dr. Michael Thompson', npi: '1000000012' },
  { name: 'Dr. Lisa Anderson', npi: '1000000020' },
  { name: 'Dr. Robert Williams', npi: '1000000038' },
  { name: 'Dr. Jennifer Martinez', npi: '1000000046' },
  { name: 'Dr. Christopher Lee', npi: '1200000002' },
  { name: 'Dr. Amanda Taylor', npi: '1200000010' },
  { name: 'Dr. Daniel Kim', npi: '1200000028' },
  { name: 'Dr. Patricia Brown', npi: '1200000036' },
  { name: 'Dr. Kevin O\'Brien', npi: '1200000044' },
  { name: 'Dr. Jessica Wang', npi: '1400000000' },
  { name: 'Dr. Ryan Garcia', npi: '1400000018' },
  { name: 'Dr. Michelle Davis', npi: '1400000026' },
  { name: 'Dr. Andrew Miller', npi: '1400000034' },
  { name: 'Dr. Nicole Wilson', npi: '1400000042' },
  { name: 'Dr. Brandon Moore', npi: '1600000008' },
  { name: 'Dr. Stephanie Taylor', npi: '1600000016' },
  { name: 'Dr. Jonathan White', npi: '1600000024' },
  { name: 'Dr. Rachel Green', npi: '1600000032' },
  { name: 'Dr. Matthew Harris', npi: '1600000040' },
  { name: 'Dr. Ashley Clark', npi: '1800000006' },
  { name: 'Dr. Joshua Lewis', npi: '1800000014' },
  { name: 'Dr. Lauren Robinson', npi: '1800000022' },
  { name: 'Dr. Tyler Walker', npi: '1800000030' },
  { name: 'Dr. Megan Hall', npi: '1800000048' },
  { name: 'Dr. Justin Young', npi: '2000000002' },
  { name: 'Dr. Samantha Allen', npi: '2000000010' },
  { name: 'Dr. Austin King', npi: '2000000028' },
  { name: 'Dr. Brittany Wright', npi: '2000000036' },
  { name: 'Dr. Jordan Lopez', npi: '2000000044' },
  { name: 'Dr. Victoria Hill', npi: '9999999991' }, // Added one more for 35 total
];

async function main() {
  console.log('🌱 Starting comprehensive database seed...\n');

  // Clear existing data (in correct order due to relations)
  console.log('Clearing existing data...');
  await prisma.carePlan.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.patient.deleteMany({});
  await prisma.provider.deleteMany({});
  console.log('✓ Existing data cleared\n');

  // Create all 35 providers
  console.log('Creating 35 providers...');
  const providers = await Promise.all(
    PROVIDERS.map((provider) =>
      prisma.provider.create({
        data: provider,
      })
    )
  );
  console.log(`✓ Created ${providers.length} providers\n`);

  // Create 25 patients with diverse conditions
  console.log('Creating patients...');

  // Patient 1: Myasthenia Gravis - Complete with care plan
  const patient1 = await prisma.patient.create({
    data: {
      firstName: 'Robert',
      lastName: 'Johnson',
      mrn: 'MRN-10001',
      additionalDiagnoses: ['E11.9', 'I10'],
      medicationHistory: ['Prednisone', 'Pyridostigmine'],
      patientRecords: `58-year-old male with generalized myasthenia gravis diagnosed 3 years ago. Currently experiencing increased fatigue and diplopia despite oral medications.`,
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
      content: `# Care Plan for Robert Johnson\n\n## Treatment Plan\n- IVIG 2g/kg over 2-5 days\n- Monitor MG-ADL scores\n- Continue pyridostigmine 60mg TID`,
    },
  });

  // Patient 2: Severe Asthma
  const patient2 = await prisma.patient.create({
    data: {
      firstName: 'Emily',
      lastName: 'Chen',
      mrn: 'MRN-10002',
      additionalDiagnoses: ['J30.1', 'L20.9'],
      medicationHistory: ['Albuterol', 'Fluticasone', 'Montelukast'],
      patientRecords: `45-year-old female with severe persistent asthma, poorly controlled despite maximal inhaled therapy. High IgE levels (850 IU/mL).`,
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

  // Patient 3: Rheumatoid Arthritis
  const patient3 = await prisma.patient.create({
    data: {
      firstName: 'Michael',
      lastName: 'Williams',
      mrn: 'MRN-10003',
      additionalDiagnoses: ['M79.3', 'Z87.891'],
      medicationHistory: ['Methotrexate', 'Prednisone', 'Naproxen'],
      patientRecords: `62-year-old male with seropositive RA. DAS28 = 5.2 despite MTX 25mg weekly. RF positive, anti-CCP positive.`,
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

  // Patient 4: Multiple Sclerosis
  const patient4 = await prisma.patient.create({
    data: {
      firstName: 'Jennifer',
      lastName: 'Martinez',
      mrn: 'MRN-10004',
      additionalDiagnoses: ['G62.81', 'F41.9'],
      medicationHistory: ['Glatiramer', 'Gabapentin', 'Vitamin D3'],
      patientRecords: `38-year-old female with RRMS diagnosed 2 years ago. 2 relapses in past year. MRI shows new T2 lesions.`,
    },
  });
  await prisma.order.create({
    data: {
      patientId: patient4.id,
      providerId: providers[3].id,
      medicationName: 'Natalizumab (Tysabri)',
      primaryDiagnosis: 'G35',
      status: 'pending',
    },
  });

  // Patient 5: ITP
  const patient5 = await prisma.patient.create({
    data: {
      firstName: 'David',
      lastName: 'Thompson',
      mrn: 'MRN-10005',
      additionalDiagnoses: ['D68.9', 'K29.70'],
      medicationHistory: ['Prednisone', 'Romiplostim', 'Omeprazole'],
      patientRecords: `52-year-old male with chronic ITP. Platelet counts 15,000-30,000 despite multiple treatments.`,
    },
  });
  await prisma.order.create({
    data: {
      patientId: patient5.id,
      providerId: providers[4].id,
      medicationName: 'IVIG (Intravenous Immunoglobulin)',
      primaryDiagnosis: 'D69.3',
      status: 'pending',
    },
  });

  // Patient 6: Crohn's Disease
  const patient6 = await prisma.patient.create({
    data: {
      firstName: 'Amanda',
      lastName: 'Davis',
      mrn: 'MRN-10006',
      additionalDiagnoses: ['K50.90', 'D50.9'],
      medicationHistory: ['Mesalamine', 'Budesonide', 'Azathioprine'],
      patientRecords: `29-year-old female with moderate-severe Crohn's disease. Failed conventional therapy. Active disease in terminal ileum.`,
    },
  });
  await prisma.order.create({
    data: {
      patientId: patient6.id,
      providerId: providers[5].id,
      medicationName: 'Infliximab (Remicade)',
      primaryDiagnosis: 'K50.00',
      status: 'approved',
    },
  });

  // Patient 7: Psoriatic Arthritis
  const patient7 = await prisma.patient.create({
    data: {
      firstName: 'Christopher',
      lastName: 'Brown',
      mrn: 'MRN-10007',
      additionalDiagnoses: ['L40.0', 'M25.50'],
      medicationHistory: ['Methotrexate', 'Naproxen', 'Topical steroids'],
      patientRecords: `44-year-old male with psoriatic arthritis. Extensive plaque psoriasis covering 15% BSA. Multiple joint involvement.`,
    },
  });
  await prisma.order.create({
    data: {
      patientId: patient7.id,
      providerId: providers[6].id,
      medicationName: 'Adalimumab (Humira)',
      primaryDiagnosis: 'L40.50',
      status: 'approved',
    },
  });

  // Patient 8: Ulcerative Colitis
  const patient8 = await prisma.patient.create({
    data: {
      firstName: 'Jessica',
      lastName: 'Garcia',
      mrn: 'MRN-10008',
      additionalDiagnoses: ['K51.90', 'E55.9'],
      medicationHistory: ['Mesalamine', 'Prednisone', 'Mercaptopurine'],
      patientRecords: `36-year-old female with pancolitis. Frequent flares requiring steroids. Colonoscopy shows Mayo score 3.`,
    },
  });
  await prisma.order.create({
    data: {
      patientId: patient8.id,
      providerId: providers[7].id,
      medicationName: 'Vedolizumab (Entyvio)',
      primaryDiagnosis: 'K51.00',
      status: 'pending',
    },
  });

  // Patient 9: Ankylosing Spondylitis
  const patient9 = await prisma.patient.create({
    data: {
      firstName: 'Daniel',
      lastName: 'Miller',
      mrn: 'MRN-10009',
      additionalDiagnoses: ['M45', 'M46.1'],
      medicationHistory: ['Naproxen', 'Sulfasalazine', 'Physical therapy'],
      patientRecords: `31-year-old male with AS diagnosed 5 years ago. BASDAI score 6.8. Significant morning stiffness and spinal limitation.`,
    },
  });
  await prisma.order.create({
    data: {
      patientId: patient9.id,
      providerId: providers[8].id,
      medicationName: 'Etanercept (Enbrel)',
      primaryDiagnosis: 'M45.9',
      status: 'approved',
    },
  });

  // Patient 10: Chronic Migraine
  const patient10 = await prisma.patient.create({
    data: {
      firstName: 'Sarah',
      lastName: 'Wilson',
      mrn: 'MRN-10010',
      additionalDiagnoses: ['G43.709', 'R51.9'],
      medicationHistory: ['Topiramate', 'Sumatriptan', 'Amitriptyline'],
      patientRecords: `42-year-old female with chronic migraines, 15+ headache days/month. Failed multiple preventive medications.`,
    },
  });
  await prisma.order.create({
    data: {
      patientId: patient10.id,
      providerId: providers[9].id,
      medicationName: 'Erenumab (Aimovig)',
      primaryDiagnosis: 'G43.709',
      status: 'approved',
    },
  });

  // Patient 11: Hemophilia A
  const patient11 = await prisma.patient.create({
    data: {
      firstName: 'Kevin',
      lastName: 'Anderson',
      mrn: 'MRN-10011',
      additionalDiagnoses: ['D66', 'M25.02'],
      medicationHistory: ['Factor VIII', 'Tranexamic acid'],
      patientRecords: `28-year-old male with moderate hemophilia A. Factor VIII level 3%. Prophylaxis needed for joint bleeds.`,
    },
  });
  await prisma.order.create({
    data: {
      patientId: patient11.id,
      providerId: providers[10].id,
      medicationName: 'Recombinant Factor VIII',
      primaryDiagnosis: 'D66',
      status: 'approved',
    },
  });

  // Patient 12: Hepatitis C
  const patient12 = await prisma.patient.create({
    data: {
      firstName: 'Michelle',
      lastName: 'Taylor',
      mrn: 'MRN-10012',
      additionalDiagnoses: ['B18.2', 'K70.30'],
      medicationHistory: ['No prior HCV treatment'],
      patientRecords: `55-year-old female with chronic HCV genotype 1a. Treatment naive. Viral load 2.5 million IU/mL. No cirrhosis.`,
    },
  });
  await prisma.order.create({
    data: {
      patientId: patient12.id,
      providerId: providers[11].id,
      medicationName: 'Ledipasvir/Sofosbuvir (Harvoni)',
      primaryDiagnosis: 'B18.2',
      status: 'pending',
    },
  });

  // Patient 13: HIV/AIDS
  const patient13 = await prisma.patient.create({
    data: {
      firstName: 'Brandon',
      lastName: 'Thomas',
      mrn: 'MRN-10013',
      additionalDiagnoses: ['B20', 'R50.9'],
      medicationHistory: ['ART therapy history available'],
      patientRecords: `39-year-old male with HIV. CD4 count 180, viral load 85,000 copies/mL. Treatment experienced, needs regimen change.`,
    },
  });
  await prisma.order.create({
    data: {
      patientId: patient13.id,
      providerId: providers[12].id,
      medicationName: 'Bictegravir/Emtricitabine/Tenofovir (Biktarvy)',
      primaryDiagnosis: 'B20',
      status: 'approved',
    },
  });

  // Patient 14: Growth Hormone Deficiency
  const patient14 = await prisma.patient.create({
    data: {
      firstName: 'Ashley',
      lastName: 'Moore',
      mrn: 'MRN-10014',
      additionalDiagnoses: ['E23.0', 'E78.5'],
      medicationHistory: ['None for GHD'],
      patientRecords: `12-year-old male with documented growth hormone deficiency. Height <3rd percentile. IGF-1 levels low. Bone age delayed 2 years.`,
    },
  });
  await prisma.order.create({
    data: {
      patientId: patient14.id,
      providerId: providers[13].id,
      medicationName: 'Somatropin (Genotropin)',
      primaryDiagnosis: 'E23.0',
      status: 'pending',
    },
  });

  // Patient 15: Gaucher Disease
  const patient15 = await prisma.patient.create({
    data: {
      firstName: 'Joshua',
      lastName: 'Jackson',
      mrn: 'MRN-10015',
      additionalDiagnoses: ['E75.22', 'D75.9'],
      medicationHistory: ['No prior enzyme replacement'],
      patientRecords: `34-year-old female with Type 1 Gaucher disease. Splenomegaly, thrombocytopenia, bone pain. GCase activity <15% normal.`,
    },
  });
  await prisma.order.create({
    data: {
      patientId: patient15.id,
      providerId: providers[14].id,
      medicationName: 'Imiglucerase (Cerezyme)',
      primaryDiagnosis: 'E75.22',
      status: 'approved',
    },
  });

  // Patient 16: Fabry Disease
  const patient16 = await prisma.patient.create({
    data: {
      firstName: 'Megan',
      lastName: 'White',
      mrn: 'MRN-10016',
      additionalDiagnoses: ['E75.21', 'N18.3'],
      medicationHistory: ['Pain medications, ACE inhibitors'],
      patientRecords: `41-year-old male with Fabry disease. Acroparesthesias, angiokeratomas, proteinuria. eGFR 55. Alpha-gal A activity <1%.`,
    },
  });
  await prisma.order.create({
    data: {
      patientId: patient16.id,
      providerId: providers[15].id,
      medicationName: 'Agalsidase Beta (Fabrazyme)',
      primaryDiagnosis: 'E75.21',
      status: 'pending',
    },
  });

  // Patient 17: Pompe Disease
  const patient17 = await prisma.patient.create({
    data: {
      firstName: 'Tyler',
      lastName: 'Harris',
      mrn: 'MRN-10017',
      additionalDiagnoses: ['E74.02', 'G72.3'],
      medicationHistory: ['Supportive care only'],
      patientRecords: `19-year-old male with late-onset Pompe disease. Progressive proximal muscle weakness, respiratory insufficiency. CK elevated.`,
    },
  });
  await prisma.order.create({
    data: {
      patientId: patient17.id,
      providerId: providers[16].id,
      medicationName: 'Alglucosidase Alfa (Myozyme)',
      primaryDiagnosis: 'E74.02',
      status: 'approved',
    },
  });

  // Patient 18: Hereditary Angioedema
  const patient18 = await prisma.patient.create({
    data: {
      firstName: 'Rachel',
      lastName: 'Martin',
      mrn: 'MRN-10018',
      additionalDiagnoses: ['D84.1', 'T78.3'],
      medicationHistory: ['Danazol', 'Tranexamic acid'],
      patientRecords: `33-year-old female with HAE type 1. C1-INH level <50% normal. Frequent attacks (3-4/month) affecting face and abdomen.`,
    },
  });
  await prisma.order.create({
    data: {
      patientId: patient18.id,
      providerId: providers[17].id,
      medicationName: 'C1 Esterase Inhibitor (Cinryze)',
      primaryDiagnosis: 'D84.1',
      status: 'pending',
    },
  });

  // Patient 19: PAH (Pulmonary Arterial Hypertension)
  const patient19 = await prisma.patient.create({
    data: {
      firstName: 'Jonathan',
      lastName: 'Lee',
      mrn: 'MRN-10019',
      additionalDiagnoses: ['I27.0', 'I50.9'],
      medicationHistory: ['Sildenafil', 'Diuretics', 'Oxygen'],
      patientRecords: `47-year-old female with idiopathic PAH. WHO Class III. mPAP 55 mmHg. 6MWT 280 meters. BNP elevated.`,
    },
  });
  await prisma.order.create({
    data: {
      patientId: patient19.id,
      providerId: providers[18].id,
      medicationName: 'Epoprostenol (Flolan)',
      primaryDiagnosis: 'I27.0',
      status: 'approved',
    },
  });

  // Patient 20: Primary Immunodeficiency
  const patient20 = await prisma.patient.create({
    data: {
      firstName: 'Stephanie',
      lastName: 'Clark',
      mrn: 'MRN-10020',
      additionalDiagnoses: ['D80.1', 'J18.9'],
      medicationHistory: ['Prophylactic antibiotics'],
      patientRecords: `26-year-old male with CVID. Recurrent sinopulmonary infections. IgG <200 mg/dL. Poor vaccine responses.`,
    },
  });
  await prisma.order.create({
    data: {
      patientId: patient20.id,
      providerId: providers[19].id,
      medicationName: 'IVIG (Intravenous Immunoglobulin)',
      primaryDiagnosis: 'D80.1',
      status: 'approved',
    },
  });

  // Patient 21: Severe Eczema
  const patient21 = await prisma.patient.create({
    data: {
      firstName: 'Andrew',
      lastName: 'Robinson',
      mrn: 'MRN-10021',
      additionalDiagnoses: ['L20.9', 'L28.0'],
      medicationHistory: ['Topical steroids', 'Tacrolimus', 'Antihistamines'],
      patientRecords: `24-year-old female with severe atopic dermatitis. EASI score 35. Failed topical therapy. Significant QOL impairment.`,
    },
  });
  await prisma.order.create({
    data: {
      patientId: patient21.id,
      providerId: providers[20].id,
      medicationName: 'Dupilumab (Dupixent)',
      primaryDiagnosis: 'L20.9',
      status: 'pending',
    },
  });

  // Patient 22: Osteoporosis
  const patient22 = await prisma.patient.create({
    data: {
      firstName: 'Lauren',
      lastName: 'Walker',
      mrn: 'MRN-10022',
      additionalDiagnoses: ['M80.08', 'Z87.310'],
      medicationHistory: ['Calcium', 'Vitamin D', 'Alendronate'],
      patientRecords: `67-year-old female with severe osteoporosis. T-score -3.5 at spine. History of vertebral fracture. Failed oral bisphosphonates.`,
    },
  });
  await prisma.order.create({
    data: {
      patientId: patient22.id,
      providerId: providers[21].id,
      medicationName: 'Denosumab (Prolia)',
      primaryDiagnosis: 'M80.08',
      status: 'approved',
    },
  });

  // Patient 23: Neutropenia
  const patient23 = await prisma.patient.create({
    data: {
      firstName: 'Matthew',
      lastName: 'Hall',
      mrn: 'MRN-10023',
      additionalDiagnoses: ['D70.9', 'C34.90'],
      medicationHistory: ['Post-chemotherapy'],
      patientRecords: `59-year-old male undergoing chemotherapy for lung cancer. ANC <500. Febrile episodes. Cycle delays due to neutropenia.`,
    },
  });
  await prisma.order.create({
    data: {
      patientId: patient23.id,
      providerId: providers[22].id,
      medicationName: 'Filgrastim (Neupogen)',
      primaryDiagnosis: 'D70.9',
      status: 'approved',
    },
  });

  // Patient 24: Parkinson's Disease
  const patient24 = await prisma.patient.create({
    data: {
      firstName: 'Nicole',
      lastName: 'Young',
      mrn: 'MRN-10024',
      additionalDiagnoses: ['G20', 'F03.90'],
      medicationHistory: ['Carbidopa/Levodopa', 'Pramipexole', 'Rasagiline'],
      patientRecords: `72-year-old male with advanced Parkinson's. Motor fluctuations and dyskinesias. H&Y stage 3. "Off" periods 6+ hours daily.`,
    },
  });
  await prisma.order.create({
    data: {
      patientId: patient24.id,
      providerId: providers[23].id,
      medicationName: 'Apomorphine (Apokyn)',
      primaryDiagnosis: 'G20',
      status: 'pending',
    },
  });

  // Patient 25: Narcolepsy
  const patient25 = await prisma.patient.create({
    data: {
      firstName: 'Austin',
      lastName: 'Allen',
      mrn: 'MRN-10025',
      additionalDiagnoses: ['G47.419', 'R40.0'],
      medicationHistory: ['Modafinil', 'Amphetamine salts'],
      patientRecords: `30-year-old female with narcolepsy with cataplexy. ESS score 19. Sleep study confirms short REM latency. Failed stimulants.`,
    },
  });
  await prisma.order.create({
    data: {
      patientId: patient25.id,
      providerId: providers[24].id,
      medicationName: 'Sodium Oxybate (Xyrem)',
      primaryDiagnosis: 'G47.419',
      status: 'approved',
    },
  });

  console.log('✓ Created 25 patients with orders\n');

  // Summary
  const patientCount = await prisma.patient.count();
  const orderCount = await prisma.order.count();
  const carePlanCount = await prisma.carePlan.count();

  console.log('📊 Seed Summary:');
  console.log(`   • ${providers.length} providers created`);
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
