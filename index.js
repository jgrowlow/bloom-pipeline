import 'dotenv/config';

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
