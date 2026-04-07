# Bloom Pipeline — OpenSpec v1.0

**Project:** Bloom Pipeline  
**Owner:** Jackie / Bloom  
**Status:** Pre-build  
**Date:** 2026-04-06

---

## 1. Problem Statement

Digital marketing consultants spend hours manually translating client intake data into brand systems, copy, and page structures. This pipeline eliminates that gap — intake → brand + copy + SEO + Webflow publish, orchestrated by Claude.

---

## 2. System Overview

```
Airtable Intake Form
       ↓
  Orchestrator Agent
       ↓
  ┌────────────────────────────────────┐
  │  Brand Agent  │  Copy Agent        │
  │  SEO Agent    │  Structure Agent   │
  └────────────────────────────────────┘
       ↓
  Webflow Publisher Agent
       ↓
  Live Webflow CMS Site
```

**Trigger:** Jackie manually sets Pipeline Status → `ready` in Airtable after reviewing client intake  
**Output:** Published Webflow CMS collection items + page structure

---

## 3. Agent Definitions

### 3.1 Orchestrator Agent
**Role:** Coordinates the pipeline, passes context between agents, handles errors.

**Inputs:**
- Airtable record (full intake JSON)

**Outputs:**
- Aggregated payload → Webflow Publisher Agent

**Responsibilities:**
- Validate intake completeness
- Spawn sub-agents in correct order
- Merge outputs into unified `SiteSpec`
- Log status to Airtable (status field update)

**Error handling:**
- On agent failure: log error, update Airtable status to `failed`, halt pipeline
- Retry once on timeout

---

### 3.2 Brand Agent
**Role:** Generate brand identity from intake signals.

**Inputs:**
- Business name, industry, tone descriptors, target audience, adjectives, competitors (from intake)

**Outputs (BrandSpec):**
```json
{
  "primary_color": "#hex",
  "secondary_color": "#hex",
  "accent_color": "#hex",
  "font_heading": "Font Name",
  "font_body": "Font Name",
  "tone": "adjective list",
  "logo_direction": "brief description"
}
```

**Constraints:**
- Colors must be WCAG AA compliant (contrast ratio ≥ 4.5:1)
- Fonts must be available in Google Fonts OR Webflow's built-in library
- Return colors as hex OR HSL only — no color names (HSL preferred for opacity/lightness flexibility in CSS)
- Validate color format before passing to next agent — fail fast with descriptive error if invalid

---

### 3.3 Copy Agent
**Role:** Generate conversion-focused website copy.

**Inputs:**
- BrandSpec (tone, voice)
- Intake: services, USP, target audience, CTA goals, testimonials (if any)

**Outputs (CopySpec):**
```json
{
  "hero_headline": "",
  "hero_subheadline": "",
  "hero_cta": "",
  "about_headline": "",
  "about_body": "",
  "services": [
    { "name": "", "tagline": "", "description": "" }
  ],
  "social_proof_headline": "",
  "cta_section_headline": "",
  "cta_section_body": "",
  "cta_button": ""
}
```

**Constraints:**
- Hero headline ≤ 8 words
- All copy must reflect BrandSpec tone
- No placeholder text (Lorem Ipsum etc.) — generate real copy or flag missing data
- CTA verbs must be action-oriented (Get, Start, Book, Discover)

---

### 3.4 SEO Agent
**Role:** Generate SEO metadata and keyword strategy.

**Inputs:**
- CopySpec (headlines, descriptions)
- Intake: business location, primary services, target search intent

**Outputs (SEOSpec):**
```json
{
  "page_title": "",
  "meta_description": "",
  "h1": "",
  "focus_keyword": "",
  "secondary_keywords": [],
  "og_title": "",
  "og_description": ""
}
```

**Constraints:**
- `page_title` ≤ 60 characters
- `meta_description` ≤ 155 characters
- `og_title` ≤ 60 characters
- `og_description` ≤ 200 characters
- Focus keyword must appear naturally in H1 and meta description

---

### 3.5 Structure Agent
**Role:** Define page layout and section order.

**Inputs:**
- CopySpec
- Intake: number of services, has testimonials (bool), has portfolio (bool), CTA goal

**Outputs (StructureSpec):**
```json
{
  "sections": [
    {
      "type": "hero | about | services | testimonials | portfolio | cta | footer",
      "order": 1,
      "layout_hint": "full-width | split | grid-3",
      "content_ref": "CopySpec field key"
    }
  ]
}
```

**Constraints:**
- Hero always first, CTA + footer always last
- No orphan sections (testimonials requires ≥ 1 testimonial in intake)
- Maximum 8 sections for MVP

---

### 3.6 Webflow Publisher Agent
**Role:** Publish the aggregated SiteSpec to Webflow via API.

**Inputs:**
- SiteSpec (merged BrandSpec + CopySpec + SEOSpec + StructureSpec)
- Webflow Site ID, Collection IDs (from env)

**Outputs:**
- Published CMS items
- Webflow item IDs logged back to Airtable

**API Targets:**
- `POST /collections/{collection_id}/items` — create CMS items
- `PUT /sites/{site_id}/publish` — publish site

**Constraints:**
- Publish only after all CMS items successfully created
- On publish failure: items remain in draft, log error to Airtable
- Rate limit: Webflow API = 60 req/min — add delay if >10 items

---

## 4. Data Model

### 4.1 Airtable Intake Fields (required)
| Field | Type | Notes |
|---|---|---|
| Business Name | Text | Required |
| Industry | Single Select | Required |
| Target Audience | Long Text | Required |
| Services (1-5) | Long Text | Required |
| USP | Long Text | Required |
| Brand Tone | Multi-Select | e.g. Modern, Warm, Bold |
| Competitors | Text | Optional |
| Has Testimonials | Checkbox | |
| Has Portfolio | Checkbox | |
| Primary CTA Goal | Single Select | Book, Contact, Buy, Learn |
| Pipeline Status | Single Select | pending / running / done / failed |
| Webflow Item IDs | Long Text | Written by Publisher Agent |
| Error Log | Long Text | Written by Orchestrator |

### 4.2 SiteSpec (internal pipeline object)
Merged JSON passed from Orchestrator to Publisher:
```json
{
  "intake": {},
  "brand": {},
  "copy": {},
  "seo": {},
  "structure": {}
}
```

---

## 5. Environment & Credentials

| Variable | Value Source |
|---|---|
| `ANTHROPIC_API_KEY` | Saved as "Bloom Pipeline" in Claude.ai |
| `AIRTABLE_API_KEY` | Airtable account |
| `AIRTABLE_BASE_ID` | Specific base ID |
| `WEBFLOW_API_TOKEN` | Webflow CMS plan token |
| `WEBFLOW_SITE_ID` | Target site ID |
| `WEBFLOW_COLLECTION_ID` | Target CMS collection ID |

Store in `.env` — never commit to repo.

---

## 6. Tech Stack

| Layer | Tool |
|---|---|
| Intake | Airtable (form + base) |
| Trigger | Airtable native automation → webhook on Pipeline Status = ready |
| Agent Runtime | Claude Code (Node.js) |
| LLM | Claude claude-sonnet-4-20250514 via Anthropic API |
| CMS Publish | Webflow REST API v2 |
| Logging | Airtable (status field write-back) |

---

## 7. File Structure (Claude Code)

```
bloom-pipeline/
├── .env
├── package.json
├── README.md
├── agents/
│   ├── orchestrator.js
│   ├── brand.js
│   ├── copy.js
│   ├── seo.js
│   ├── structure.js
│   └── publisher.js
├── lib/
│   ├── airtable.js       # Airtable read/write helpers
│   ├── webflow.js        # Webflow API helpers
│   ├── claude.js         # Anthropic API wrapper
│   └── validate.js       # Schema validation
├── prompts/
│   ├── brand.md
│   ├── copy.md
│   ├── seo.md
│   └── structure.md
├── fixtures/
│   └── sample-intake.json    # Test data for standalone agent runs
└── index.js              # Entry point (trigger handler)
```

---

## 8. Build Phases

### Phase 1 — Foundation ✅
- [x] Scaffold project structure
- [x] `.env` + credential validation
- [x] Airtable reader (`lib/airtable.js`)
- [x] Claude API wrapper (`lib/claude.js`)
- [x] Brand Agent + prompt
- [x] `fixtures/sample-intake.json`

### Phase 2 — Core Agents ✅
- [x] Copy Agent + prompt
- [x] SEO Agent + prompt
- [x] Structure Agent + prompt
- [x] Orchestrator wires all agents with checkpointing

### Phase 3 — Publish ✅
- [x] Webflow API helper (`lib/webflow.js`)
- [x] Publisher Agent with idempotency
- [x] Airtable status write-back
- [x] HTTP server entry point (`index.js`)

### Phase 4 — Tests (current)
- [ ] Write integration tests from WHEN/THEN scenarios in `specs/*.md`
- [ ] Test each agent standalone with `fixtures/sample-intake.json`
- [ ] Add `plans/requirements.md` and `plans/plan.md`
- [ ] Add `CLAUDE.md` system prompt
- [ ] Install marketing skills (`zubair-trabzada/ai-marketing-claude`)

### Phase 5 — Airtable Setup
- [ ] Build Airtable base with all intake fields
- [ ] Add checkpoint fields (Brand Output, Copy Output, SEO Output, Structure Output)
- [ ] Configure Airtable automation → webhook trigger on Pipeline Status = `ready`
- [ ] Fill in `.env` with real API keys

### Phase 6 — Webflow Setup
- [ ] Create Webflow site from template
- [ ] Build CMS Collection with fields matching SiteSpec
- [ ] Get Webflow Site ID + Collection ID → add to `.env`

### Phase 7 — End-to-End
- [ ] Run full pipeline against real Airtable record
- [ ] Verify published Webflow site
- [ ] Webflow site handoff flow tested

---

## 9. Non-Functional Requirements

### Checkpointing
Each agent writes its output to Airtable immediately after it completes. If the pipeline fails at SEO, re-run resumes from that checkpoint — Brand and Copy are not regenerated. Add checkpoint fields to Airtable: `Brand Output`, `Copy Output`, `SEO Output`, `Structure Output` (Long Text, JSON).

### Validation at Every Handoff
`lib/validate.js` runs after every agent, before output is passed to the next agent. Fail fast with a descriptive error: e.g. `BrandSpec validation failed: primary_color is not a valid HSL or hex value`. Never let a malformed output silently cascade downstream.

### LLM Retry on Constraint Failure
For fields with hard constraints (SEO character limits, color format, WCAG compliance), if validation fails, retry the agent once with a corrective prompt before halting. Example: `Your previous response returned a color name instead of HSL. Return only valid HSL values.`

### Idempotency in Publisher
Before creating CMS items, check if `Webflow Item IDs` is already populated in Airtable for this record. If yes, skip creation and go straight to publish. Prevents duplicate CMS items on re-run.

### Observability
Error Log field in Airtable must capture: which agent failed, the error message, and a truncated version of the input that caused it. `failed` alone is not enough.

### Prompt Versioning
Each file in `prompts/*.md` must include a version header:
```
## v1.0 — 2026-04-06
```
Update the version and date on every prompt change.

### Test Fixtures
Commit `fixtures/sample-intake.json` with a realistic intake record. Every agent must be runnable standalone:
```bash
node agents/brand.js fixtures/sample-intake.json
```

### Trigger
Airtable native automation — trigger on Pipeline Status changing to `ready`, send webhook to pipeline endpoint. Make.com removed as ambiguous option. Pick one trigger mechanism only.

### Font Whitelist
Hardcoded whitelist in `lib/validate.js` must include a comment with last-verified date and Webflow docs URL. Review when Webflow releases major updates.

### Color Format
Brand Agent outputs colors in **HSL by default**. Hex with separate opacity declaration also accepted (e.g. `#FFFFFF 10%`). No color names. No RGB. Validated at handoff.

---

## 10. Success Criteria

- Given a complete Airtable intake record, the pipeline produces a published Webflow site with no manual intervention
- All output fields pass their constraint checks before publish
- Pipeline status is always written back to Airtable (success or failure)
- Runtime target: < 90 seconds end-to-end

---

## 11. Edge Cases

### Human-in-the-Loop Trigger
- Client fills intake form
- Jackie reviews and refines the record in Airtable
- Jackie manually changes Pipeline Status → `ready` to trigger the pipeline
- **Guard:** If Pipeline Status is already `running` or `done`, pipeline does not re-trigger. Prevents duplicate runs from accidental double-clicks.

### Duplicate Trigger
- **Cause:** Pipeline Status flipped to `ready` more than once on same record
- **Fix:** Orchestrator checks current status on start — if not exactly `ready`, halt immediately with no action

### Unsupported Font
- **Cause:** Brand Agent returns a Google Font not available in Webflow's hosted font library
- **Fix:** Validate font against a hardcoded whitelist of Webflow-supported Google Fonts before passing to Publisher. If invalid, fall back to `Inter` and log a warning to Airtable.

### Missing Testimonials
- **Cause:** Structure Agent includes a testimonials section but client provided none in intake
- **Fix:** Structure Agent checks `Has Testimonials` boolean before including that section. If false, section is excluded regardless of layout logic.

### Webflow API Rate Limit
- **Cause:** >60 requests/min to Webflow API
- **Fix:** Add 1-second delay between CMS item creation calls. Non-issue for MVP (one client at a time).

### Webflow Site Handoff
- Pipeline delivers a completed Webflow site
- Jackie transfers site ownership to client's Webflow account
- Client receives editor access for content updates (text, images)
- Jackie remains available for maintenance but pipeline is one-and-done per client

---

## 11. Out of Scope (v1)

- Image generation or asset management
- Multi-page sites (homepage only for MVP)
- A/B copy variants
- Client-facing dashboard
- Custom domain setup
