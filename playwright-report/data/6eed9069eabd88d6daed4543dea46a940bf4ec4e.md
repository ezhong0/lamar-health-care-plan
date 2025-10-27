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
      - generic [ref=e14]:
        - heading "New Patient" [level=1] [ref=e15]
        - paragraph [ref=e16]: Enter patient information to create a new record and generate a care plan.
      - generic [ref=e18]:
        - generic [ref=e19]:
          - heading "Review Warnings" [level=1] [ref=e20]
          - paragraph [ref=e21]: We found 1 potential issue that require your attention. Please review and decide how to proceed.
        - generic [ref=e25]:
          - img [ref=e27]
          - generic [ref=e29]:
            - paragraph [ref=e30]: Duplicate Order
            - paragraph [ref=e31]: Order for IVIG already exists for this patient (created Oct 27, 2025)
            - generic [ref=e32]: "Existing Order: IVIG (10/27/2025)"
        - generic [ref=e33]:
          - button "Cancel" [ref=e34]
          - button "Proceed Anyway" [ref=e35]
  - button "Open Next.js Dev Tools" [ref=e41] [cursor=pointer]:
    - img [ref=e42]
  - alert [ref=e45]
```