# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - navigation [ref=e2]:
    - generic [ref=e4]:
      - generic [ref=e5]:
        - link "Lamar Health" [ref=e6] [cursor=pointer]:
          - /url: /
        - link "New Patient" [ref=e7] [cursor=pointer]:
          - /url: /patients/new
      - button "Toggle theme" [ref=e8]:
        - img [ref=e9]
  - main [ref=e11]:
    - generic [ref=e13]:
      - heading "AI-Powered Care Plan Generation" [level=1] [ref=e14]
      - paragraph [ref=e15]: Streamline your workflow with intelligent pharmacist care plans. Generate comprehensive, validated care plans in minutes, not hours.
      - generic [ref=e16]:
        - link "Create New Patient" [ref=e17] [cursor=pointer]:
          - /url: /patients/new
          - button "Create New Patient" [ref=e18]
        - link "View All Patients" [ref=e19] [cursor=pointer]:
          - /url: /patients
          - button "View All Patients" [ref=e20]
      - generic [ref=e21]:
        - paragraph [ref=e22]: "Want to explore the features? Load realistic demo data:"
        - button "Load Demo Data" [ref=e24]
  - button "Open Next.js Dev Tools" [ref=e30] [cursor=pointer]:
    - img [ref=e31]
  - alert [ref=e34]
```