import axios from 'axios';

const baseUrl = () =>
  `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}`;

const authHeaders = () => ({
  Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
});

export async function updateRecord(recordId, fields) {
  try {
    const response = await axios.patch(
      `${baseUrl()}/${recordId}`,
      { fields },
      { headers: authHeaders() }
    );
    return response.data.fields;
  } catch (err) {
    const status = err.response?.status;
    const message = err.response?.data?.error?.message ?? err.message;
    throw new Error(`Airtable PATCH failed (${status}): ${message}`);
  }
}

export async function readRecord(recordId) {
  try {
    const response = await axios.get(`${baseUrl()}/${recordId}`, {
      headers: authHeaders(),
    });
    return response.data.fields;
  } catch (err) {
    if (err.response?.status === 404) {
      throw new Error(`Intake record not found: ${recordId}`);
    }
    const status = err.response?.status;
    const message = err.response?.data?.error?.message ?? err.message;
    throw new Error(`Airtable GET failed (${status}): ${message}`);
  }
}
