# Technical Interview Process Overview

**Timeline:** 2-3 days

## Interview Phases

### Phase 1: Decomposition (up to 6 hours)
**What they're testing:** Can you break down a problem, prioritize, and deliver?

**Your task:**
1. Ask questions to clarify which features are P0, P1, P2
2. Schedule 15 min call to clarify specs: https://calendly.com/eesha-sharma/technical-interview-i
3. Build a small prototype of the feature
4. **AI coding tools required** - will be reimbursed (submit invoices to bonna@lamarhealth.com)

**What they want to see:**
- Clear prioritization (don't build everything)
- Thoughtful questions (show you understand the business context)
- Working prototype (P0 features fully functional)

---

### Phase 2: Scenario Thinking (up to 3 hours)
**What they're testing:** Can you write tests and think about edge cases?

**Your task:** Add unit tests to your feature

**What they want to see:**
- Coverage of critical paths (services, validation)
- Not just happy path - test error cases
- Demonstrates you think about failure modes

---

### Phase 3: Adaptability & Problem-Solving (up to 1 hour)
**What they're testing:** Can you adapt when requirements change?

**Your task:** During interview, they'll change something and do pair programming

**What they want to see:**
- Navigate your codebase confidently
- Explain your architecture while coding
- Handle requirement changes gracefully
- Follow existing patterns

**Likely scenarios:**
- "Add a new validation rule"
- "Change how duplicate detection works"
- "Add a new field to the form"
- "Fix a bug in the service layer"

---

### Phase 4: Team Work (30 min)
**What they're testing:** Can you collaborate and communicate?

**Your task:** Current Lamar team member reviews with you

**What they want to see:**
- Clear code explanations
- Receptive to feedback
- Ask clarifying questions
- Discuss trade-offs openly

---

### Phase 5: CTO Discussion (30-45 min)
**What they're testing:** Depth of technical knowledge and self-awareness

**Topics:**
- Past experiences (be ready with 2-3 technical stories)
- Architecture decisions in this project
- **Where is the edge of your knowledge?** (This is key - they want honest self-assessment)

**What they want to see:**
- Technical depth on specific topics
- Awareness of what you don't know
- Growth mindset (how you learn new things)
- Systems thinking (not just code-level)






---

# Project Requirements Deep Dive

## The Business Context (CRITICAL TO UNDERSTAND)

### Customer
**A specialty pharmacy** - handles complex/expensive medications (IVIG, biologics, specialty drugs)

### The Problem
**Pharmacists spend 20-40 min per patient creating care plans manually**

### Why It Matters
1. **Compliance requirement** - legally required for Medicare reimbursement
2. **Revenue requirement** - needed to get paid by pharmaceutical companies
3. **Capacity crisis** - extremely short-staffed, backlogged

**Translation:** This isn't a "nice to have" - it's blocking revenue and compliance. Speed and accuracy matter.

---

## What You Need to Know About the Domain

### Specialty Pharmacy Operations
- **Not retail pharmacy** (CVS, Walgreens) - these are high-touch, clinical programs
- **High-value medications** - IVIG costs $3,000-10,000+ per dose
- **Reimbursement complexity** - multiple payers (Medicare, pharma manufacturers, insurance)
- **Regulatory oversight** - strict documentation requirements

### Why Duplicate Detection Is Critical
- **Financial risk:** Duplicate orders = duplicate billing = fraud risk
- **Patient safety:** Double-dosing expensive medications can be harmful
- **Provider data quality:** Pharma reports require accurate provider mapping
  - If NPI mapping is wrong, the entire pharma report is invalid
  - Pharma reports = major revenue source (rebates, support payments)

### Why Care Plans Matter
- **Compliance documentation** - proves clinical oversight for audits
- **Reimbursement justification** - shows medical necessity
- **Quality metrics** - tracked for accreditation (URAC, ACHC)

**Key insight:** This isn't just a form—it's the audit trail that protects the pharmacy from compliance violations and ensures payment.

## Current Manual Workflow

Pharmacist reviews patient medical history → creates care plan manually (20-40 min)

---

## Required Input Fields

| Field | Type | Validation | Why It Matters |
|-------|------|------------|----------------|
| **Patient First Name** | `string` | Required, non-empty | Patient identification |
| **Patient Last Name** | `string` | Required, non-empty | Patient identification |
| **Patient MRN** | `unique 6-digit number` | **Unique**, exactly 6 digits | Primary patient identifier - duplicate detection key |
| **Referring Provider** | `string` | Required, non-empty | Legal requirement, pharma reporting |
| **Referring Provider NPI** | `10-digit number` | **Valid NPI** (Luhn check), unique per provider | Legal requirement, pharma reporting key |
| **Patient Primary Diagnosis** | `ICD-10 code` | Valid ICD-10 format | Medical necessity, reimbursement |
| **Medication Name** | `string` | Required, non-empty | Duplicate order detection key |
| **Additional Diagnoses** | `list of ICD-10 codes` | Each valid ICD-10 format (optional) | Clinical context for care plan |
| **Medication History** | `list of strings` | Optional | Clinical context for care plan |
| **Patient Records** | `string` or `pdf` | Required, non-empty | LLM input for care plan generation |

### Validation Priorities

**P0 (Must Have - Blocks Submission):**
- MRN is exactly 6 digits and unique
- NPI is exactly 10 digits and passes Luhn check
- Primary diagnosis is valid ICD-10 format
- All required fields are non-empty

**P1 (Should Have - Shows Warnings):**
- Duplicate patient detection (fuzzy matching on name + MRN)
- Duplicate order detection (same patient + same medication)
- Provider conflict detection (same NPI with different name)

**P2 (Nice to Have):**
- ICD-10 code validation against real database
- Medication name autocomplete
- PDF upload for patient records

## Functional Requirements Breakdown

### 1. Patient Data Entry Form (P0)

**What:** Web form for medical assistant to input patient information

**Must have:**
- All required fields from table above
- Real-time validation (client-side for UX, server-side for security)
- Clear error messages for validation failures
- Form submission only when all P0 validations pass

**User flow:**
1. Medical assistant opens form
2. Fills in patient information
3. Sees validation errors in real-time
4. Sees warnings for duplicates (doesn't block, just alerts)
5. Submits form
6. Receives confirmation or error

---

### 2. Duplicate Detection (P1)

**Critical business requirement** - prevents fraud, billing errors, and data quality issues

#### A. Duplicate Patient Detection
**Trigger:** When MRN or name matches existing patient

**Logic:**
- Exact match on MRN → **High severity warning**
- Fuzzy match on first name + last name → **Medium severity warning**
  - Example: "John Smith" vs "Jon Smith" (typo)
  - Example: "Mary Johnson" vs "Mary Johnston" (similar)

**User experience:**
- Show warning: "Similar patient found: [Name] (MRN: [123456])"
- User can proceed but must acknowledge warning
- Don't block submission (pharmacy confirms this is intentional multiple order)

#### B. Duplicate Order Detection
**Trigger:** When same patient + same medication exists

**Logic:**
- Patient already has order for this medication → **High severity warning**

**User experience:**
- Show warning: "Patient already has order for [Medication] created on [Date]"
- User can proceed but must acknowledge
- Business rule: Same patient CAN have multiple orders (exception, not rule)

#### C. Provider Conflict Detection
**Trigger:** When NPI exists with different provider name

**Logic:**
- NPI found in database with different name → **Critical warning**
- Example: NPI 1234567890 is "Dr. Jane Smith" but user enters "Dr. J. Smith"

**User experience:**
- Show warning: "NPI [1234567890] is registered to [Dr. Jane Smith]. You entered [Dr. J. Smith]."
- User must acknowledge conflict
- **Very important** - pharma reports depend on correct NPI mapping

**Why this matters:** If provider data is inconsistent, pharma reports are invalid → revenue loss

---

### 3. Care Plan Generation (P0)

**What:** LLM generates pharmacist care plan from patient data

**Input:**
- All patient data fields
- Patient records (text or preprocessed from PDF)

**Process:**
1. User submits form successfully
2. System calls LLM (Claude) with structured prompt
3. LLM generates care plan (see example below)
4. Care plan saved to database, linked to patient

**Output format:**
- Markdown text file
- Includes: Problem List, SMART Goals, Interventions, Monitoring Plan
- Downloadable for upload to pharmacy system

**User experience:**
- Show loading state during generation (may take 10-30 seconds)
- Display generated care plan on screen
- Download button for text/markdown file

**Edge cases to handle:**
- LLM timeout (retry logic)
- LLM error (show user-friendly error)
- Network failure (graceful degradation)

---

### 4. Export Functionality (P1-P2)

**What:** Export patient data + care plans for pharma reporting

**Why:** Pharma manufacturers require regular reports to process rebates and support payments

**Format:** CSV or Excel with columns:
- Patient info (name, MRN, diagnosis)
- Provider info (name, NPI)
- Medication
- Care plan summary
- Dates

**Priority:** P1-P2 depending on time (nice to have, but important for production use) 

---

## Example 1: Patient Records

**Name:** A.B. (Fictional)
**MRN:** 00012345 (fictional)
**DOB:** 1979-06-08 (Age 46)
**Sex:** Female
**Weight:** 72 kg
**Allergies:** None known to medications (no IgA deficiency)
**Primary diagnosis:** Generalized myasthenia gravis (AChR antibody positive), MGFA class IIb
**Secondary diagnoses:** Hypertension (well controlled), GERD

### Home Medications
- Pyridostigmine 60 mg PO q6h PRN (current avg 3–4 doses/day)
- Prednisone 10 mg PO daily
- Lisinopril 10 mg PO daily
- Omeprazole 20 mg PO daily

### Recent History
- Progressive proximal muscle weakness and ptosis over 2 weeks with worsening speech and swallowing fatigue
- Neurology recommends IVIG for rapid symptomatic control (planned course prior to planned thymectomy)
- Baseline respiratory status: no stridor; baseline FVC 2.8 L (predicted 4.0 L; ~70% predicted). No current myasthenic crisis but declining strength
### A. Baseline Clinic Note (Pre-Infusion)

**Date:** 2025-10-15

**Vitals:**
- BP 128/78, HR 78, RR 16, SpO2 98% RA, Temp 36.7°C

**Exam:**
- Ptosis bilateral, fatigable proximal weakness (4/5), speech slurred after repeated counting, no respiratory distress

**Labs:**
- CBC WNL
- BMP: Na 138, K 4.1, Cl 101, HCO3 24, BUN 12, SCr 0.78, eGFR >90 mL/min/1.73m²
- IgG baseline: 10 g/L (for replacement context; note IVIG for immunomodulation here)

**Plan:**
- IVIG 2 g/kg total (144 g for 72 kg) given as 0.4 g/kg/day x 5 days in outpatient infusion center
- Premedicate with acetaminophen + diphenhydramine
- Monitor vitals and FVC daily
- Continue pyridostigmine and prednisone
### B. Infusion Visit Note — Day 1

**Date:** 2025-10-16

**IVIG Product:**
- Privigen (10% IVIG) — lot #P12345 (fictional)

**Dose Given:**
- 28.8 g (0.4 g/kg × 72 kg) diluted per manufacturer instructions

**Premeds:**
- Acetaminophen 650 mg PO + Diphenhydramine 25 mg PO 30 minutes pre-infusion

**Infusion Start Rate:**
- 0.5 mL/kg/hr for first 30 minutes (per institution titration) then increased per tolerance to max manufacturer rate

**Vitals:**
- q15 minutes first hour then q30 minutes
- No fever, transient mild headache at 2 hours (resolved after slowing infusion)

**Respiratory:**
- FVC 2.7 L (stable)

**Disposition:**
- Completed infusion
- Observed 60 minutes post-infusion
- Discharged with plan for days 2–5

*Note: Monitoring of vitals and slow titration recommended; stop/slow if reaction.* 
### C. Follow-up — 2 Weeks Post-Course

**Date:** 2025-10-30

**Clinical Status:**
- Subjective improvement in speech and proximal strength
- Fewer fatigability episodes
- No thrombotic events or renal issues reported
- Next neurology follow-up in 4 weeks to consider repeat course vs. thymectomy timing

---

## Example 2: Pharmacist Care Plan — IVIG for Myasthenia Gravis

*(Mapped to above patient records)*
### Problem List / Drug Therapy Problems (DTPs)

1. Need for rapid immunomodulation to reduce myasthenic symptoms (efficacy)
2. Risk of infusion-related reactions (headache, chills, fever, rare anaphylaxis)
3. Risk of renal dysfunction or volume overload in susceptible patients (sucrose-stabilized products, older age, pre-existing renal disease)
4. Risk of thromboembolic events (rare) — consider risk factors (immobility, prior clot, hypercoagulable state)
5. Potential drug–drug interactions or dosing timing (pyridostigmine timing around infusion, steroids)
6. Patient education / adherence gap (understanding infusion process, adverse signs to report)


### Goals (SMART)

**Primary Goal:**
- Achieve clinically meaningful improvement in muscle strength and reduce fatigability within 2 weeks of completing IVIG course

**Safety Goal:**
- No severe infusion reaction
- No acute kidney injury (no increase in SCr >0.3 mg/dL within 7 days post-infusion)
- No thromboembolic events

**Process Goal:**
- Complete full 2 g/kg course (0.4 g/kg/day × 5 days) with documented vital sign monitoring and infusion logs

*Note: Typical immunomodulatory dosing is 2 g/kg divided over 2–5 days — e.g., 0.4 g/kg/day × 5 days.*
### Pharmacist Interventions / Plan

#### 1. Dosing & Administration

Verify total dose: 2.0 g/kg total (calculate using actual body weight unless otherwise specified). For 72 kg → 144 g total = 28.8 g/day × 5 days. Document lot number and expiration of product.

#### 2. Premedication

Recommend acetaminophen 650 mg PO and diphenhydramine 25–50 mg PO 30–60 minutes prior to infusion; consider low-dose corticosteroid premed if prior reactions or severe symptoms (institutional practice varies).

*Note: Premeds can reduce minor infusion reactions but are not foolproof.*

#### 3. Infusion Rates & Titration

Start at a low rate (per product label/manufacturer) — example: 0.5 mL/kg/hr for first 15–30 min, then increase in stepwise fashion with at least three planned rate escalations up to manufacturer maximum as tolerated. If any infusion reactions occur, slow or stop and treat per reaction algorithm.

#### 4. Hydration & Renal Protection

Ensure adequate hydration prior to infusion (e.g., 250–500 mL normal saline if not fluid-overloaded) especially in patients with risk factors for renal dysfunction. Avoid sucrose-containing IVIG products in patients with uncontrolled diabetes or high renal risk. Monitor renal function (SCr, BUN, eGFR) pre-course and within 3–7 days post-completion.

#### 5. Thrombosis Risk Mitigation

Assess baseline thrombosis risk. For high-risk patients consider prophylactic measures per institutional protocol (early ambulation, hydration, consider hematology consult if prothrombotic). Educate patient to report chest pain, sudden dyspnea, or unilateral limb swelling immediately.

#### 6. Concomitant Medications

Continue pyridostigmine and prednisone; counsel re: timing of pyridostigmine (may cause increased secretions during infusion — evaluate symptoms). Adjustments to immunosuppression determined by neurology.


#### 7. Monitoring During Infusion

**Vitals:**
- BP, HR, RR, SpO₂, Temp q15 min for first hour, then q30–60 min per protocol

**Respiratory:**
- Baseline FVC or NIF daily during hospitalization or before each infusion to detect early respiratory compromise

**Documentation:**
- Document infusion rate changes, premeds, and any adverse events in the infusion log

#### 8. Adverse Event Management

**Mild Reaction** (headache, chills, myalgia):
- Slow infusion, give acetaminophen / antihistamine, observe

**Moderate/Severe** (wheezing, hypotension, chest pain, anaphylaxis):
- Stop infusion
- Follow emergency protocol (epinephrine for anaphylaxis, airway support)
- Send labs
- Notify neurology and ordering prescriber

#### 9. Documentation & Communication

Enter all interventions, patient education, and monitoring in the EMR. Communicate any dose modifications or adverse events to neurology and the infusion nursing team immediately.


### Monitoring Plan & Lab Schedule

**Before First Infusion:**
- CBC, BMP (including SCr, BUN)
- Baseline vitals
- Baseline FVC

**During Each Infusion:**
- Vitals q15–30 min
- Infusion log

**Within 72 Hours of Each Infusion Day** (if inpatient/outpatient center monitoring):
- Assess for delayed adverse events (headache, rash, aseptic meningitis)

**Post-Course (3–7 days):**
- BMP to check renal function
- Evaluate for thrombotic events if symptomatic

**Clinical Follow-up:**
- Neurology & pharmacy clinic at 2 weeks and 6–8 weeks to assess clinical response and need for further therapy

*Note: Renal monitoring and caution with certain stabilizers/sucrose-containing products recommended in guidelines.*

---

# Interview Preparation: What You REALLY Need to Know

## Questions You Should Ask During Initial Call

### About Prioritization
1. "For duplicate detection - should it block submission or just warn? I see it says warning, but want to confirm user can proceed."
2. "For NPI validation - is Luhn algorithm check sufficient, or do you need real-time NPI registry lookup?"
3. "For patient records - text input is P0, PDF upload is P2, correct?"
4. "For export - what's the minimum viable export? Just patient list, or need care plans too?"

### About Business Logic
1. "When you say 'patient may have multiple orders but exception not rule' - should the duplicate order warning be high or medium severity?"
2. "For provider conflicts - should we auto-update provider name if NPI matches, or always warn?"
3. "For care plan generation - who reviews/approves before it's final? Medical assistant or pharmacist?"

### About Technical Constraints
1. "Any existing systems to integrate with, or is this greenfield?"
2. "Expected volume? 10 patients/day? 100? 1000?"
3. "Any data privacy requirements beyond standard HIPAA compliance?"

**Why ask these:** Shows you understand the problem deeply and think about edge cases BEFORE coding.

---

## Key Business Concepts to Understand

### 1. NPI (National Provider Identifier)
- **What it is:** 10-digit unique ID for healthcare providers (assigned by CMS)
- **Why it matters:** Legal requirement for Medicare billing, used for pharma reporting
- **Validation:** Luhn check algorithm (like credit cards)
- **Critical requirement:** One provider = one NPI (never duplicate with different names)

### 2. ICD-10 Codes
- **What it is:** International Classification of Diseases, 10th revision
- **Format:** 3-7 alphanumeric characters (e.g., G70.00 for myasthenia gravis)
- **Why it matters:** Justifies medical necessity for expensive medications
- **Validation level:** Format check is P0, actual code lookup is P2

### 3. MRN (Medical Record Number)
- **What it is:** Patient's unique identifier within this pharmacy system
- **Format:** 6 digits (as specified by requirements)
- **Why it matters:** Primary key for duplicate detection
- **Business rule:** Should be unique per patient

### 4. Specialty Pharmacy vs Retail
- **Retail:** Walgreens, CVS - high volume, low touch
- **Specialty:** Low volume, high touch, expensive drugs, clinical oversight
- **Why it matters:** Explains why care plans are required (not typical in retail)

---

## Technical Decisions You'll Need to Defend

### 1. Why Layered Architecture?
**They might ask:** "This seems complex for a simple form. Why not just API routes?"

**Your answer:**
> "The business requirements have complexity that needs structure:
> - Duplicate detection has fuzzy matching logic → separate service
> - LLM calls need retry/timeout handling → infrastructure layer
> - Provider NPI validation has business rules → domain layer
> - Future: This will scale to multiple pharmacies, more validations
>
> Layered architecture makes this maintainable as complexity grows. For a truly simple CRUD form, I'd agree it's overkill. But duplicate detection + LLM integration + compliance requirements justify the structure."

### 2. Why PostgreSQL Fuzzy Matching?
**They might ask:** "Why not just exact matching?"

**Your answer:**
> "Fuzzy matching prevents duplicate patients from typos:
> - 'Jon' vs 'John'
> - 'Mary Johnston' vs 'Mary Johnson'
>
> Specialty pharmacy context: same patient submitting orders from different providers can have name variations. Exact matching would miss these. Using PostgreSQL pg_trgm extension gives us similarity scoring without external service dependency."

### 3. Why Result Types Instead of Throwing?
**They might ask:** "Why not just use try/catch?"

**Your answer:**
> "Duplicate detection isn't an error - it's expected behavior. Result types let me return warnings alongside success. Try/catch is for unexpected failures (DB down). Result types are for expected business outcomes (duplicate found, validation failed). Makes error handling explicit in the type system."

### 4. Why Separate Domain Types?
**They might ask:** "Why not just use Prisma types everywhere?"

**Your answer:**
> "Decoupling domain from database schema. If we add a computed field like 'fullName' or 'age', it goes in domain type without database migration. Also makes testing easier - pure domain logic doesn't need database mocks."

---

## Common Pair Programming Scenarios (What to Expect)

### Scenario 1: "Add a new required field"
**Example:** "We need to capture patient date of birth"

**Your approach:**
1. Add to domain type (`lib/domain/types.ts`)
2. Add to Zod schema (`lib/validation/schemas.ts`)
3. Add to Prisma schema (`prisma/schema.prisma`)
4. Add to form component (`components/PatientForm.tsx`)
5. Update API contract (`lib/api/contracts.ts`)
6. Run migration

**What they want to see:** You follow the existing patterns and touch all the right layers.

---

### Scenario 2: "Change validation rule"
**Example:** "MRN should be 8 digits now, not 6"

**Your approach:**
1. Update Zod schema in `lib/validation/schemas.ts`
2. Update Prisma schema if needed
3. Update tests
4. Explain impact: existing data with 6-digit MRNs

**What they want to see:** You think about data migration and backward compatibility.

---

### Scenario 3: "Fix a bug in duplicate detection"
**Example:** "Fuzzy matching is too sensitive, matches 'John' and 'Jane'"

**Your approach:**
1. Check `lib/services/duplicate-detector.ts`
2. Adjust similarity threshold (e.g., 0.7 → 0.85)
3. Add test case to prove fix
4. Explain trade-off: higher threshold = fewer false positives but might miss real duplicates

**What they want to see:** You understand the algorithm and can tune it based on business requirements.

---

### Scenario 4: "Add new warning type"
**Example:** "Warn if patient is under 18"

**Your approach:**
1. Add `AgeWarning` to discriminated union in `lib/domain/warnings.ts`
2. Add logic in service layer to check DOB
3. Update UI to display new warning type
4. Add test case

**What they want to see:** You extend the type-safe warning system correctly.

---

## Red Flags to Avoid

### ❌ Don't Say
- "I used AI to build all of this" (downplays your contribution)
- "This is production-ready" (it's a prototype, be honest)
- "I don't know why I made that choice" (shows lack of ownership)
- "The requirements were unclear so I guessed" (should have asked)

### ✅ Do Say
- "I architected this using AI agents for parallel development" (shows intentionality)
- "This demonstrates production patterns - in production I'd add X, Y, Z" (shows awareness)
- "I chose X because of trade-off Y" (shows thoughtfulness)
- "I would ask the stakeholder about Z before implementing" (shows communication)

---

## Final Checklist Before Interview

**Can you explain:**
- [ ] Why specialty pharmacy needs care plans (compliance + revenue)
- [ ] Why duplicate detection is critical (fraud prevention + billing accuracy)
- [ ] Why provider NPI validation matters (pharma reporting revenue)
- [ ] Why you chose each layer in your architecture
- [ ] How you would add a new field end-to-end
- [ ] How you would change a validation rule
- [ ] What trade-offs you made (and would make differently at scale)

**Can you demo:**
- [ ] Form validation (show errors, show success)
- [ ] Duplicate warnings (show all three types)
- [ ] Care plan generation (show loading, show result)
- [ ] Navigate your codebase confidently
- [ ] Run tests and explain coverage

**Can you discuss:**
- [ ] 2-3 past technical experiences in depth
- [ ] Where the edge of your knowledge is (be honest!)
- [ ] How you learn new technologies
- [ ] How you would scale this to 1000x traffic

**Are you ready to:**
- [ ] Pair program and explain your thinking out loud
- [ ] Accept feedback gracefully
- [ ] Ask clarifying questions before coding
- [ ] Admit when you don't know something

---

## The Most Important Thing

**They're not looking for perfection. They're looking for:**
1. **Clear thinking** - can you break down a problem?
2. **Communication** - can you explain your decisions?
3. **Collaboration** - can you work with others?
4. **Growth mindset** - can you learn and adapt?

Your architecture demonstrates senior-level thinking. Your preparation shows you take this seriously. You're ready.

**Now go show them what you've built.** 🚀

