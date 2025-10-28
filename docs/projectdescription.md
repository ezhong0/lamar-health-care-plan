Technical interview process overview (across 2-3 days)
Test for decomposition (up to 6 hours):
 You will be provided with a small feature or product that you need to deliver to a client with a list of features and the use case.
Ask questions to clarify which features are P0, P1, P2. 
Please schedule a brief 15 min call to go over the specs here: https://calendly.com/eesha-sharma/technical-interview-i
Build a small prototype of the feature. Use of AI coding tools is required and will be reimbursed. Please submit all invoices to bonna@lamarhealth.com.

Test for scenario thinking (up to 3 hours):
Add unit tests to your feature

Test for adaptability and problem-solving (up to 1 hour):
During the interview when we go over the solution, we’ll change something and do pair programming to see if you can resolve it.

Test for team work (30 min):
During the interview when we go over the solution, we’ll change something and do pair programming to see if you can resolve it.
A current Lamar team member will review with you

Meeting with our CTO (30-45 min): 
He’ll talk through your past experiences and the project you worked on in more technical detail to see where the edge of your knowledge gap is.






Test for Decomposition Specifications: 
Customer: A specialty pharmacy 
Use Case: We want to be able to automatically generate care plans based on information (clinicals) found within the patient’s record. 

Why this is urgent: It takes our pharmacists 20-40 min per patient to put these together manually. We are required to do these for compliance reasons and to get reimbursed by Medicare and pharma. We are extremely short-staffed so are backlogged on this task.

What we do today: Our pharmacist will look at the patient’s medical history and generate a care plan. Here are the inputs we require in order to create the output test plan (see below): 

Patient First Name, string
Patient Last Name, string
Referring Provider, string
Referring Provider NPI, 10-digit number
Patient MRN (unique ID), unique 6 digit number
Patient Primary Diagnosis (ICD-10 code) 
Medication Name, string
Additional Diagnosis, list of ICD-10 codes
Medication history, list of strings
Patient Records (see example below), string OR pdf document

What we need the tool to do: 
Allow a medical assistant to input the above information in a webform. The webform must validate the data above. 

Importantly, there should be a warning if orders look like duplicates since we don’t want these to be input twice. In addition, there should be a warning if a patient looks like it is duplicated. 

A patient may have multiple orders but this is more of an exception rather than a rule. 

It is also very important that the provider only be entered once in the system (ie do not enter the provider with different NPI numbers). The user should be warned this is a potential duplicate. This is used for providing data reports to pharma which are a large revenue source. 

Once the data is entered and patient records are entered into a text field, then call an LLM to generate a care plan as a text file they can download and upload into their system. If possible to provide patient records as files that would be nice but the client has preprocessed data available to you. 

As the input information and care plans are added to the system we would want a quick way to export for reporting to pharma. 

1) Example patient records - INPUT
Name: A.B. (Fictional)
 MRN: 00012345 (fictional)
 DOB: 1979-06-08 (Age 46)
 Sex: Female
 Weight: 72 kg
 Allergies: None known to medications (no IgA deficiency)
 Primary diagnosis: Generalized myasthenia gravis (AChR antibody positive), MGFA class IIb
 Secondary diagnoses: Hypertension (well controlled), GERD
 Home meds:
Pyridostigmine 60 mg PO q6h PRN (current avg 3–4 doses/day)


Prednisone 10 mg PO daily


Lisinopril 10 mg PO daily


Omeprazole 20 mg PO daily


Recent history:
Progressive proximal muscle weakness and ptosis over 2 weeks with worsening speech and swallowing fatigue.


Neurology recommends IVIG for rapid symptomatic control (planned course prior to planned thymectomy).


Baseline respiratory status: no stridor; baseline FVC 2.8 L (predicted 4.0 L; ~70% predicted). No current myasthenic crisis but declining strength.
A. Baseline clinic note (pre-infusion)
Date: 2025-10-15


Vitals: BP 128/78, HR 78, RR 16, SpO2 98% RA, Temp 36.7°C


Exam: Ptosis bilateral, fatigable proximal weakness (4/5), speech slurred after repeated counting, no respiratory distress.


Labs: CBC WNL; BMP: Na 138, K 4.1, Cl 101, HCO3 24, BUN 12, SCr 0.78, eGFR >90 mL/min/1.73m².


IgG baseline: 10 g/L (for replacement context; note IVIG for immunomodulation here).


Plan: IVIG 2 g/kg total (144 g for 72 kg) given as 0.4 g/kg/day x 5 days in outpatient infusion center. Premedicate with acetaminophen + diphenhydramine; monitor vitals and FVC daily; continue pyridostigmine and prednisone.
B. Infusion visit note — Day 1
Date: 2025-10-16


IVIG product: Privigen (10% IVIG) — lot #P12345 (fictional)


Dose given: 28.8 g (0.4 g/kg × 72 kg) diluted per manufacturer instructions.


Premeds: Acetaminophen 650 mg PO + Diphenhydramine 25 mg PO 30 minutes pre-infusion.


Infusion start rate: 0.5 mL/kg/hr for first 30 minutes (per institution titration) then increased per tolerance to max manufacturer rate.


Vitals: q15 minutes first hour then q30 minutes; no fever, transient mild headache at 2 hours (resolved after slowing infusion).


Respiratory: FVC 2.7 L (stable).


Disposition: Completed infusion; observed 60 minutes post-infusion; discharged with plan for days 2–5.


(Monitoring of vitals and slow titration recommended; stop/slow if reaction. 
C. Follow-up — 2 weeks post-course
Date: 2025-10-30


Clinical status: Subjective improvement in speech and proximal strength; fewer fatigability episodes. No thrombotic events or renal issues reported. Next neurology follow-up in 4 weeks to consider repeat course vs. thymectomy timing.


2) Example pharmacist care plan — IVIG for myasthenia gravis (mapped to above records) - OUTPUT
Problem list / Drug therapy problems (DTPs)
Need for rapid immunomodulation to reduce myasthenic symptoms (efficacy).


Risk of infusion-related reactions (headache, chills, fever, rare anaphylaxis).


Risk of renal dysfunction or volume overload in susceptible patients (sucrose-stabilized products, older age, pre-existing renal disease).


Risk of thromboembolic events (rare) — consider risk factors (immobility, prior clot, hypercoagulable state).


Potential drug–drug interactions or dosing timing (pyridostigmine timing around infusion, steroids).


Patient education / adherence gap (understanding infusion process, adverse signs to report).


Goals (SMART)
Primary: Achieve clinically meaningful improvement in muscle strength and reduce fatigability within 2 weeks of completing IVIG course.


Safety goal: No severe infusion reaction, no acute kidney injury (no increase in SCr >0.3 mg/dL within 7 days post-infusion), and no thromboembolic events.


Process: Complete full 2 g/kg course (0.4 g/kg/day × 5 days) with documented vital sign monitoring and infusion logs.


(Typical immunomodulatory dosing is 2 g/kg divided over 2–5 days — e.g., 0.4 g/kg/day × 5 days).
Pharmacist interventions / plan
Dosing & Administration


Verify total dose: 2.0 g/kg total (calculate using actual body weight unless otherwise specified). For 72 kg → 144 g total = 28.8 g/day × 5 days. Document lot number and expiration of product.


Premedication


Recommend acetaminophen 650 mg PO and diphenhydramine 25–50 mg PO 30–60 minutes prior to infusion; consider low-dose corticosteroid premed if prior reactions or severe symptoms (institutional practice varies). (Premeds can reduce minor infusion reactions but are not foolproof).


Infusion rates & titration


Start at a low rate (per product label/manufacturer) — example: 0.5 mL/kg/hr for first 15–30 min, then increase in stepwise fashion with at least three planned rate escalations up to manufacturer maximum as tolerated. If any infusion reactions occur, slow or stop and treat per reaction algorithm. 


Hydration & renal protection


Ensure adequate hydration prior to infusion (e.g., 250–500 mL normal saline if not fluid-overloaded) especially in patients with risk factors for renal dysfunction. Avoid sucrose-containing IVIG products in patients with uncontrolled diabetes or high renal risk. Monitor renal function (SCr, BUN, eGFR) pre-course and within 3–7 days post-completion.


Thrombosis risk mitigation


Assess baseline thrombosis risk. For high-risk patients consider prophylactic measures per institutional protocol (early ambulation, hydration, consider hematology consult if prothrombotic). Educate patient to report chest pain, sudden dyspnea, or unilateral limb swelling immediately.


Concomitant medications


Continue pyridostigmine and prednisone; counsel re: timing of pyridostigmine (may cause increased secretions during infusion — evaluate symptoms). Adjustments to immunosuppression determined by neurology.


Monitoring during infusion


Vitals: BP, HR, RR, SpO₂, Temp q15 min for first hour, then q30–60 min per protocol.


Respiratory: baseline FVC or NIF daily during hospitalization or before each infusion to detect early respiratory compromise.


Document infusion rate changes, premeds, and any adverse events in the infusion log.


Adverse event management


Mild reaction (headache, chills, myalgia): slow infusion, give acetaminophen / antihistamine, observe.


Moderate/severe (wheezing, hypotension, chest pain, anaphylaxis): stop infusion, follow emergency protocol (epinephrine for anaphylaxis, airway support), send labs, notify neurology and ordering prescriber.


Documentation & communication


Enter all interventions, patient education, and monitoring in the EMR. Communicate any dose modifications or adverse events to neurology and the infusion nursing team immediately.


Monitoring plan & lab schedule (example)
Before first infusion: CBC, BMP (including SCr, BUN), baseline vitals, baseline FVC.


During each infusion: Vitals q15–30 min; infusion log.


Within 72 hours of each infusion day (if inpatient/outpatient center monitoring): assess for delayed adverse events (headache, rash, aseptic meningitis).


Post-course (3–7 days): BMP to check renal function; evaluate for thrombotic events if symptomatic.


Clinical follow-up: Neurology & pharmacy clinic at 2 weeks and 6–8 weeks to assess clinical response and need for further therapy.


(Renal monitoring and caution with certain stabilizers/sucrose-containing products recommended in guidelines). 


