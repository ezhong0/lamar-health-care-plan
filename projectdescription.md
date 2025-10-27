# Technical Interview Process Overview

**Timeline:** 2-3 days

## Test for Decomposition (up to 6 hours)

You will be provided with a small feature or product that you need to deliver to a client with a list of features and the use case.

- Ask questions to clarify which features are P0, P1, P2
- Please schedule a brief 15 min call to go over the specs here: https://calendly.com/eesha-sharma/technical-interview-i
- Build a small prototype of the feature
- **Note:** Use of AI coding tools is required and will be reimbursed. Please submit all invoices to bonna@lamarhealth.com

## Test for Scenario Thinking (up to 3 hours)

Add unit tests to your feature

## Test for Adaptability and Problem-Solving (up to 1 hour)

During the interview when we go over the solution, we'll change something and do pair programming to see if you can resolve it.

## Test for Team Work (30 min)

- During the interview when we go over the solution, we'll change something and do pair programming to see if you can resolve it
- A current Lamar team member will review with you

## Meeting with our CTO (30-45 min)

He'll talk through your past experiences and the project you worked on in more technical detail to see where the edge of your knowledge gap is.






---

# Test for Decomposition Specifications

## Customer

A specialty pharmacy

## Use Case

We want to be able to automatically generate care plans based on information (clinicals) found within the patient's record.

## Why This Is Urgent

It takes our pharmacists 20-40 min per patient to put these together manually. We are required to do these for compliance reasons and to get reimbursed by Medicare and pharma. We are extremely short-staffed so are backlogged on this task.

## What We Do Today

Our pharmacist will look at the patient's medical history and generate a care plan. Here are the inputs we require in order to create the output test plan (see below):

### Required Input Fields

- **Patient First Name** - `string`
- **Patient Last Name** - `string`
- **Referring Provider** - `string`
- **Referring Provider NPI** - `10-digit number`
- **Patient MRN** (unique ID) - `unique 6 digit number`
- **Patient Primary Diagnosis** - `ICD-10 code`
- **Medication Name** - `string`
- **Additional Diagnosis** - `list of ICD-10 codes`
- **Medication History** - `list of strings`
- **Patient Records** (see example below) - `string` OR `pdf document`

## What We Need the Tool to Do

Allow a medical assistant to input the above information in a webform. The webform must validate the data above.

### Important Requirements

**Duplicate Detection:**
- There should be a **warning** if orders look like duplicates since we don't want these to be input twice
- There should be a **warning** if a patient looks like it is duplicated
- A patient may have multiple orders but this is more of an exception rather than a rule

**Provider Validation:**
- It is **very important** that the provider only be entered once in the system (i.e., do not enter the provider with different NPI numbers)
- The user should be warned this is a potential duplicate
- This is used for providing data reports to pharma which are a large revenue source

**Care Plan Generation:**
- Once the data is entered and patient records are entered into a text field, call an LLM to generate a care plan as a text file they can download and upload into their system
- If possible to provide patient records as files that would be nice, but the client has preprocessed data available to you

**Export Functionality:**
- As the input information and care plans are added to the system, we would want a quick way to export for reporting to pharma 

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


