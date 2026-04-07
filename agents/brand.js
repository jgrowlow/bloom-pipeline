import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { callClaude } from '../lib/claude.js';
import { validateBrandSpec, validateFonts } from '../lib/validate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadSystemPrompt() {
  const promptPath = path.join(__dirname, '../prompts/brand.md');
  try {
    return readFileSync(promptPath, 'utf-8');
  } catch {
    throw new Error('Missing prompt file: prompts/brand.md');
  }
}

function extractJson(text) {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return JSON.parse(fenceMatch ? fenceMatch[1].trim() : text.trim());
}

function buildUserPrompt(intake) {
  return [
    `Business Name: ${intake['Business Name'] ?? intake.business_name ?? ''}`,
    `Industry: ${intake['Industry'] ?? intake.industry ?? ''}`,
    `Brand Tone: ${intake['Brand Tone'] ?? intake.brand_tone ?? ''}`,
    `Target Audience: ${intake['Target Audience'] ?? intake.target_audience ?? ''}`,
    `Competitors: ${intake['Competitors'] ?? intake.competitors ?? ''}`,
  ].join('\n');
}

export async function runBrandAgent(intake) {
  const systemPrompt = loadSystemPrompt();
  const userPrompt = buildUserPrompt(intake);

  let output;
  try {
    const raw = await callClaude(systemPrompt, userPrompt, 800);
    output = extractJson(raw);
    validateBrandSpec(output);
  } catch (err) {
    // Retry with corrective prompt
    const corrective = `${userPrompt}\n\nCORRECTION REQUIRED: ${err.message}\n\nReturn ONLY the corrected JSON object.`;
    const raw2 = await callClaude(systemPrompt, corrective, 800);
    output = extractJson(raw2);
    validateBrandSpec(output); // throws if still invalid
  }

  const fontWarning = validateFonts(output);
  return { ...output, fontWarning };
}

// Standalone: node agents/brand.js fixtures/sample-intake.json
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const fixturePath = process.argv[2];
  if (!fixturePath) {
    console.error('Usage: node agents/brand.js <fixture.json>');
    process.exit(1);
  }
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8'));
  runBrandAgent(fixture.fields)
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((err) => { console.error('Brand Agent Error:', err.message); process.exit(1); });
}
