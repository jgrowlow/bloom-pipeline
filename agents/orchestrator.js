import 'dotenv/config';
import { readRecord, updateRecord } from '../lib/airtable.js';
import { runBrandAgent } from './brand.js';
import { runCopyAgent } from './copy.js';
import { runSeoAgent } from './seo.js';
import { runStructureAgent } from './structure.js';
import { runPublisherAgent } from './publisher.js';

async function writeCheckpoint(recordId, field, data) {
  try {
    await updateRecord(recordId, { [field]: JSON.stringify(data) });
  } catch (err) {
    console.error(`Checkpoint write failed for ${field}:`, err.message);
  }
}

export async function runPipeline(recordId) {
  // 1. Read intake
  const intake = await readRecord(recordId);

  // 2. Duplicate trigger guard
  const status = intake['Pipeline Status'];
  if (status === 'running' || status === 'done') {
    throw new Error(`Pipeline already triggered: status is ${status}`);
  }

  // 3. Set status to running
  await updateRecord(recordId, { 'Pipeline Status': 'running' });

  try {
    // 4. Resume from checkpoints
    let brandSpec = intake['Brand Output'] ? JSON.parse(intake['Brand Output']) : null;
    let copySpec = intake['Copy Output'] ? JSON.parse(intake['Copy Output']) : null;
    let seoSpec = intake['SEO Output'] ? JSON.parse(intake['SEO Output']) : null;
    let structureSpec = intake['Structure Output'] ? JSON.parse(intake['Structure Output']) : null;

    // 5+6. Run agents and checkpoint
    if (!brandSpec) {
      try {
        brandSpec = await runBrandAgent(intake);
      } catch (err) {
        err.agentName = 'brand';
        err.input = { businessName: intake['Business Name'] };
        throw err;
      }
      await writeCheckpoint(recordId, 'Brand Output', brandSpec);
    }

    if (!copySpec) {
      try {
        copySpec = await runCopyAgent(intake, brandSpec);
      } catch (err) {
        err.agentName = 'copy';
        err.input = { usp: intake['USP'] };
        throw err;
      }
      await writeCheckpoint(recordId, 'Copy Output', copySpec);
    }

    if (!seoSpec) {
      try {
        seoSpec = await runSeoAgent(intake, copySpec);
      } catch (err) {
        err.agentName = 'seo';
        err.input = { heroHeadline: copySpec.hero_headline };
        throw err;
      }
      await writeCheckpoint(recordId, 'SEO Output', seoSpec);
    }

    if (!structureSpec) {
      try {
        structureSpec = await runStructureAgent(intake, copySpec);
      } catch (err) {
        err.agentName = 'structure';
        err.input = { hasTestimonials: intake['Has Testimonials'] };
        throw err;
      }
      await writeCheckpoint(recordId, 'Structure Output', structureSpec);
    }

    // 7. Build SiteSpec
    const siteSpec = { intake, brand: brandSpec, copy: copySpec, seo: seoSpec, structure: structureSpec };

    // 8. Publish
    try {
      await runPublisherAgent(siteSpec, recordId);
    } catch (err) {
      err.agentName = 'publisher';
      err.input = { siteId: process.env.WEBFLOW_SITE_ID };
      throw err;
    }

    // 9. Done
    await updateRecord(recordId, { 'Pipeline Status': 'done' });

    // 10. Return
    return siteSpec;

  } catch (err) {
    const errorLog = `Agent failure: ${err.agentName || 'unknown'}\nError: ${err.message}\nInput (truncated): ${JSON.stringify(err.input || {}).slice(0, 500)}`;
    try {
      await updateRecord(recordId, {
        'Pipeline Status': 'failed',
        'Error Log': errorLog,
      });
    } catch (logErr) {
      console.error('Failed to write error to Airtable:', logErr.message);
    }
    throw err;
  }
}
