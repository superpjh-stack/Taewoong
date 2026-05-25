---
name: project-confidence-field-naming
description: AI confidence/prediction field is named 3 different ways across the codebase; CLAUDE.md requires a confidence score on all AI predictions
metadata:
  type: project
---

CLAUDE.md mandates every AI prediction include a confidence score field. In practice the field is named three different ways:
- AI Agent response (web): `confidence_score` (number, required)
- Quality inspection: `ai_anomaly_score` (number|null) — `packages/types/src/domain.ts` carries a comment "C-5: confidence_score 대신 이 필드 사용" indicating this rename was an intentional decision, not a bug
- Shipment AI judgement: `ai_confidence` (number|null)

**Why:** Different domains adopted different field names; the C-5 note shows quality's deviation was deliberate.
**How to apply:** When auditing the CLAUDE.md confidence-score requirement, treat all three as satisfying it but flag the naming inconsistency as a Warning. The real gap is that the API `queryAiAgent` returns `unknown` and does not validate the external AI response, so confidence_score presence is not enforced at runtime. See [[feedback-async-handler-gap]] for related API-layer weaknesses.
