# Meeting Notes - Clarifications with Eesha

**Date:** Meeting with founder regarding project requirements

---

## Duplicate Detection Logic

### Duplicate Orders
- **Definition:** Same medication for a given patient = duplicate order
- **Handling:** Display as warning (not blocking)

### Duplicate Patients
- **Detection Method:** Fuzzy matching algorithm
- **Edge Cases to Handle:**
  - Middle name vs middle initial variations
  - Last name with hyphen vs space (e.g., "Smith-Jones" vs "Smith Jones")
- **Handling:** Display as warning (not blocking)

### Multiple Orders
- **Valid Case:** Same patient can have multiple orders with different medication names
- **This is acceptable and should not trigger a warning**

### Provider Validation
- **NPI Number:** One-to-one relationship with a provider
- **Rule:** Same provider should always have the same NPI number
- **Handling:** Warn if provider name appears with different NPI numbers

### Important Note
**All duplicate/validation checks should be WARNINGS, not blocking errors.** Users should be able to proceed after reviewing the warning.

---

## Care Plan Generation

### Approach
- Use LLMs (Language Learning Models) to generate care plans
- No complex rule-based logic needed for this prototype

### Output Format
- **Format:** Plain text file (downloadable)
- **Quality:** Clean but doesn't need to be highly formatted
- Output should be suitable for copying into their existing systems

---

## Export Functionality

### Two Types of Exports Required

1. **Care Plan Export**
   - Format: Text file
   - Content: Generated care plan text
   - Purpose: For pharmacist review and upload to their system

2. **Data Report Export**
   - Format: Tabulated data (Excel-compatible)
   - Content: All input data + generated care plans
   - Purpose: Reporting to pharmaceutical companies
   - **Requirement:** Should be easy to manage in Excel

---

## Feature Priorities

### P0 (Must Have) - End-to-End Functionality
- Complete workflow from data input to care plan generation
- Core features working end-to-end
- **This is the minimum viable product**

### P1 (Should Have) - Validation
- Duplicate detection (orders, patients, providers)
- Input field validation
- Warning system

### P2 (Nice to Have) - Tabulated Data Export
- Excel-compatible export functionality
- Comprehensive data reporting

---

## Code Quality Expectations

### Priority Order
1. **Speed** - Get it working quickly
2. **Legibility** - Code should be understandable

### Philosophy
- **Understandable** > Extendable
- Focus on clear, readable code over complex abstractions
- Pragmatic approach for this prototype/interview assignment