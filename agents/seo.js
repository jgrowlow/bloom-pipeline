import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { callClaude } from '../lib/claude.js';
import { validateSeoSpec } from '../lib/validate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadSystemPrompt() {
  const promptPath = path.join(__dirname, '../prompts/seo.md');
  try {
    return readFileSync(promptPath, 'utf-8');
  } catch {
    throw new Error('Missing prompt file: prompts/seo.md');
  }
}

function extractJson(text) {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return JSON.parse(fenceMatch ? fenceMatch[1].trim() : text.trim());
}

function buildUserPrompt(intake, copySpec) {
  const services = [
    intake['Service 1'] ?? intake.service_1 ?? '',
    intake['Service 2'] ?? intake.service_2 ?? '',
    intake['Service 3'] ?? intake.service_3 ?? '',
    intake['Service 4'] ?? intake.service_4 ?? '',
    intake['Service 5'] ?? intake.service_5 ?? '',
  ]
    .filter(Boolean)
    .join(', ');

  return [
    `Business Name: ${intake['Business Name'] ?? intake.business_name ?? ''}`,
    `Target Audience: ${intake['Target Audience'] ?? intake.target_audience ?? ''}`,
    `Services: ${services}`,
    `Hero Headline: ${copySpec.hero_headline ?? ''}`,
    `About Body: ${copySpec.about_body ?? ''}`,
  ].join('\n');
}

export async function runSeoAgent(intake, copySpec) {
  const systemPrompt = loadSystemPrompt();
  const userPrompt = buildUserPrompt(intake, copySpec);

  let output;
  try {
    const raw = await callClaude(systemPrompt, userPrompt, 800);
    output = extractJson(raw);
    validateSeoSpec(output);
  } catch (err) {
    const corrective = `${userPrompt}\n\nCORRECTION REQUIRED: ${err.message}\n\nReturn ONLY the corrected JSON object.`;
    const raw2 = await callClaude(systemPrompt, corrective, 800);
    output = extractJson(raw2);
    validateSeoSpec(output);
  }

  return output;
}

// Standalone: node agents/seo.js fixtures/sample-intake.json
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const fixturePath = process.argv[2];
  if (!fixturePath) {
    console.error('Usage: node agents/seo.js <fixture.json>');
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
      console.error('Running SEO agent...');
      const result = await runSeoAgent(intake, copySpec);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error('SEO Agent Error:', err.message);
      process.exit(1);
    }
  })();
}
