import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { callClaude } from '../lib/claude.js';
import { validateCopySpec } from '../lib/validate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadSystemPrompt() {
  const promptPath = path.join(__dirname, '../prompts/copy.md');
  try {
    return readFileSync(promptPath, 'utf-8');
  } catch {
    throw new Error('Missing prompt file: prompts/copy.md');
  }
}

function extractJson(text) {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return JSON.parse(fenceMatch ? fenceMatch[1].trim() : text.trim());
}

function buildUserPrompt(intake, brandSpec) {
  const services = (intake['Services'] ?? intake.services ?? []);
  const servicesList = Array.isArray(services)
    ? services.slice(0, 5).join(', ')
    : String(services);

  return [
    `Brand Tone: ${brandSpec.tone ?? ''}`,
    `Business Name: ${intake['Business Name'] ?? intake.business_name ?? ''}`,
    `Services: ${servicesList}`,
    `USP: ${intake['USP'] ?? intake.usp ?? ''}`,
    `Target Audience: ${intake['Target Audience'] ?? intake.target_audience ?? ''}`,
    `Primary CTA Goal: ${intake['Primary CTA Goal'] ?? intake.primary_cta_goal ?? ''}`,
  ].join('\n');
}

export async function runCopyAgent(intake, brandSpec) {
  const systemPrompt = loadSystemPrompt();
  const userPrompt = buildUserPrompt(intake, brandSpec);

  let output;
  try {
    const raw = await callClaude(systemPrompt, userPrompt, 1500);
    output = extractJson(raw);
    validateCopySpec(output);
  } catch (err) {
    const corrective = `${userPrompt}\n\nCORRECTION REQUIRED: ${err.message}\n\nReturn ONLY the corrected JSON object.`;
    const raw2 = await callClaude(systemPrompt, corrective, 1500);
    output = extractJson(raw2);
    validateCopySpec(output);
  }

  return output;
}

// Standalone: node agents/copy.js fixtures/sample-intake.json
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const fixturePath = process.argv[2];
  if (!fixturePath) {
    console.error('Usage: node agents/copy.js <fixture.json>');
    process.exit(1);
  }
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8'));
  const intake = fixture.fields;
  const { runBrandAgent } = await import('./brand.js');

  (async () => {
    try {
      console.error('Running brand agent...');
      const brandSpec = await runBrandAgent(intake);
      console.error('Running copy agent...');
      const result = await runCopyAgent(intake, brandSpec);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error('Copy Agent Error:', err.message);
      process.exit(1);
    }
  })();
}
