import axios from 'axios';

const WEBFLOW_BASE = 'https://api.webflow.com/v2';

const authHeaders = () => ({
  Authorization: `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
  'Content-Type': 'application/json',
});

// NOTE: Webflow rate limits require a 1-second delay between consecutive
// createCmsItem calls. This delay is NOT implemented here — it is the
// responsibility of the caller (e.g. the publisher agent) so that
// createCmsItem remains a pure single-item function.

export async function createCmsItem(collectionId, fieldData) {
  try {
    const response = await axios.post(
      `${WEBFLOW_BASE}/collections/${collectionId}/items`,
      { fieldData },
      { headers: authHeaders() }
    );
    return response.data;
  } catch (err) {
    const status = err.response?.status;
    const message = err.response?.data?.message ?? err.message;
    throw new Error(`Webflow createCmsItem failed (${status}): ${message}`);
  }
}

export async function publishSite(siteId) {
  try {
    const response = await axios.post(
      `${WEBFLOW_BASE}/sites/${siteId}/publish`,
      { publishToWebflowSubdomain: true },
      { headers: authHeaders() }
    );
    return response.data;
  } catch (err) {
    const status = err.response?.status;
    const message = err.response?.data?.message ?? err.message;
    throw new Error(`Webflow publishSite failed (${status}): ${message}`);
  }
}
