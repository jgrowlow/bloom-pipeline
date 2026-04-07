import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { callClaude } from '../lib/claude.js';
import { validateStructureSpec } from '../lib/validate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadSystemPrompt() {
  const promptPath = path.join(__dirname, '../prompts/structure.md');
  try {
    return readFileSync(promptPath, 'utf-8');
  } catch {
    throw new Error('Missing prompt file: prompts/structure.md');
  }
}

function extractJson(text) {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return JSON.parse(fenceMatch ? fenceMatch[1].trim() : text.trim());
}

function buildUserPrompt(intake, copySpec) {
  const copySpecKeys = Object.keys(copySpec);
  return [
    `Number of services: ${copySpec.services.length}`,
    `Has Testimonials: ${intake['Has Testimonials']}`,
    `Has Portfolio: ${intake['Has Portfolio']}`,
    `Primary CTA Goal: ${intake['Primary CTA Goal']}`,
    `Available CopySpec fields: ${copySpecKeys.join(', ')}`,
  ].join('\n');
}

export async function runStructureAgent(intake, copySpec) {
  const systemPrompt = loadSystemPrompt();
  const userPrompt = buildUserPrompt(intake, copySpec);

  let structureSpec;
  try {
    const raw = await callClaude(systemPrompt, userPrompt, 800);
    const output = extractJson(raw);
    const [validated, warning] = validateStructureSpec(output, intake);
    if (warning) console.error('Structure warning:', warning);
    structureSpec = validated;
  } catch (err) {
    const corrective = `${userPrompt}\n\nCORRECTION REQUIRED: ${err.message}\n\nReturn ONLY the corrected JSON object.`;
    const raw2 = await callClaude(systemPrompt, corrective, 800);
    const output2 = extractJson(raw2);
    const [validated2, warning2] = validateStructureSpec(output2, intake);
    if (warning2) console.error('Structure warning:', warning2);
    structureSpec = validated2;
  }
  return structureSpec;
}

// Standalone: node agents/structure.js fixtures/sample-intake.json
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const fixturePath = process.argv[2];
  if (!fixturePath) {
    console.error('Usage: node agents/structure.js <fixture.json>');
    process.exit(1);
  }
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8'));
  const intake = fixture.fields;
  const { runBrandAgent } = await import('./brand.js');
  const { runCopyAgent } = await import('./copy.js');

  (async () => {
    try {
      console.error('Running brand agent...');
      const brandSpec = await runBrandAgent(intake);
      console.error('Running copy agent...');
      const copySpec = await runCopyAgent(intake, brandSpec);
      console.error('Running structure agent...');
      const result = await runStructureAgent(intake, copySpec);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error('Structure Agent Error:', err.message);
      process.exit(1);
    }
  })();
}
