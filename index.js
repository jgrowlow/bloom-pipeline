import 'dotenv/config';
import http from 'http';
import { runPipeline } from './agents/orchestrator.js';

const REQUIRED_ENV = [
  'ANTHROPIC_API_KEY',
  'AIRTABLE_API_KEY',
  'AIRTABLE_BASE_ID',
  'WEBFLOW_API_TOKEN',
  'WEBFLOW_SITE_ID',
  'WEBFLOW_COLLECTION_ID',
];

const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/trigger') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', async () => {
    let recordId;
    try {
      ({ recordId } = JSON.parse(body));
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      return;
    }

    if (!recordId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'recordId is required' }));
      return;
    }

    // Respond immediately — pipeline runs async
    res.writeHead(202, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ accepted: true, recordId }));

    try {
      await runPipeline(recordId);
      console.log(`Pipeline complete for record: ${recordId}`);
    } catch (err) {
      console.error(`Pipeline failed for record ${recordId}:`, err.message);
    }
  });
});

server.listen(PORT, () => {
  console.log(`bloom-pipeline listening on port ${PORT}`);
});
