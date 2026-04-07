## 1. Foundation

- [x] 1.1 Add `.env` credential validation to `index.js` — throw on startup if any required env var is missing
- [x] 1.2 Create `fixtures/sample-intake.json` with a realistic client intake record covering all required fields
- [x] 1.3 Update `lib/claude.js` to accept `maxTokens` as a parameter (default 1000) and export the client for reuse

## 2. Airtable Integration

- [x] 2.1 Create `lib/airtable.js` — implement `readRecord(recordId)` that fetches a single record and returns its fields
- [x] 2.2 Add `updateRecord(recordId, fields)` to `lib/airtable.js` for writing status, checkpoints, and error logs
- [ ] 2.3 Test `readRecord` manually with a real Airtable record ID

## 3. Schema Validation

- [x] 3.1 Create `lib/validate.js` with `validateBrandSpec(output)` — enforces HSL/hex color format, rejects color names
- [x] 3.2 Add `validateCopySpec(output)` — checks hero headline ≤8 words, no placeholder text, CTA verbs, service fields
- [x] 3.3 Add `validateSeoSpec(output)` — enforces all character limits and focus keyword presence
- [x] 3.4 Add `validateStructureSpec(output)` — enforces section order, testimonials flag, max 8 sections, valid types
- [x] 3.5 Add font whitelist array to `lib/validate.js` with a dated comment (YYYY-MM-DD) and Webflow docs URL
- [x] 3.6 Add `validateFonts(brandSpec)` — falls back to `Inter` and returns a warning string if font not on whitelist

## 4. Brand Agent

- [x] 4.1 Create `prompts/brand.md` with a version header (`## v1.0 — 2026-04-06`) and the brand generation system prompt
- [x] 4.2 Create `agents/brand.js` — implement `runBrandAgent(intake)` that loads `prompts/brand.md`, calls Claude, parses JSON response
- [x] 4.3 Wire `validateBrandSpec` and `validateFonts` into `runBrandAgent` with single-retry corrective prompt logic
- [x] 4.4 Make `agents/brand.js` runnable standalone: `node agents/brand.js fixtures/sample-intake.json`

## 5. Copy Agent

- [x] 5.1 Create `prompts/copy.md` with version header and copy generation system prompt
- [x] 5.2 Create `agents/copy.js` — implement `runCopyAgent(intake, brandSpec)` that loads prompt, calls Claude, parses JSON
- [x] 5.3 Wire `validateCopySpec` with retry logic for word count, placeholder, and CTA verb failures
- [x] 5.4 Make `agents/copy.js` runnable standalone: `node agents/copy.js fixtures/sample-intake.json`

## 6. SEO Agent

- [x] 6.1 Create `prompts/seo.md` with version header and SEO generation system prompt
- [x] 6.2 Create `agents/seo.js` — implement `runSeoAgent(intake, copySpec)` that loads prompt, calls Claude, parses JSON
- [x] 6.3 Wire `validateSeoSpec` with retry logic for character limit and focus keyword failures
- [x] 6.4 Make `agents/seo.js` runnable standalone: `node agents/seo.js fixtures/sample-intake.json`

## 7. Structure Agent

- [x] 7.1 Create `prompts/structure.md` with version header and structure generation system prompt
- [x] 7.2 Create `agents/structure.js` — implement `runStructureAgent(intake, copySpec)` that loads prompt, calls Claude, parses JSON
- [x] 7.3 Wire `validateStructureSpec` — strip testimonials section if `Has Testimonials` is false, enforce order and limits
- [x] 7.4 Make `agents/structure.js` runnable standalone: `node agents/structure.js fixtures/sample-intake.json`

## 8. Webflow Integration

- [x] 8.1 Create `lib/webflow.js` — implement `createCmsItem(collectionId, fields)` with 1-second delay between calls
- [x] 8.2 Add `publishSite(siteId)` to `lib/webflow.js`
- [x] 8.3 Create `agents/publisher.js` — implement `runPublisherAgent(siteSpec, recordId)` with idempotency check on `Webflow Item IDs`
- [x] 8.4 Publisher writes all Webflow item IDs back to Airtable after successful publish

## 9. Orchestrator

- [x] 9.1 Create `agents/orchestrator.js` — implement `runPipeline(recordId)` that calls all agents in sequence
- [x] 9.2 Add checkpoint writes: after each agent, write its output JSON to the corresponding Airtable field
- [x] 9.3 Add checkpoint reads on startup: if a checkpoint field is populated and status is `failed`, skip that agent
- [x] 9.4 Add duplicate-trigger guard: halt immediately if Pipeline Status is `running` or `done` at startup
- [x] 9.5 Wrap all agent calls in try/catch — on failure, write structured error to Airtable Error Log and set status `failed`
- [x] 9.6 Set Pipeline Status to `running` at start, `done` on success, `failed` on unrecovered error

## 10. Entry Point & Trigger

- [x] 10.1 Update `index.js` to accept a Webflow webhook POST with `recordId` in the body and call `runPipeline(recordId)`
- [x] 10.2 Add basic request validation to `index.js` — return 400 if `recordId` is missing
- [ ] 10.3 Configure Airtable native automation to POST to pipeline endpoint when Pipeline Status changes to `ready`

## 11. End-to-End Test

- [ ] 11.1 Run full pipeline with `fixtures/sample-intake.json` against real Airtable record and verify all checkpoint fields are written
- [ ] 11.2 Verify Webflow CMS items are created in draft after pipeline run
- [ ] 11.3 Verify site publishes and Webflow Item IDs are written back to Airtable
- [ ] 11.4 Verify Pipeline Status is `done` and Error Log is empty on success
- [ ] 11.5 Trigger a deliberate failure (bad intake data) and verify `failed` status and structured Error Log are written
