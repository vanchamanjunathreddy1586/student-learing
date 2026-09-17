import { Router } from 'express';

export const codeRouter = Router();

const JUDGE0_BASE = process.env.JUDGE0_BASE_URL || 'https://ce.judge0.com';
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || '';
const JUDGE0_AUTH_USER = process.env.JUDGE0_AUTH_USER || '';
const JUDGE0_AUTH_TOKEN = process.env.JUDGE0_AUTH_TOKEN || '';

const getHeaders = () => {
  const headers = {
    'Content-Type': 'application/json'
  };
  if (JUDGE0_API_KEY) {
    headers['x-rapidapi-key'] = JUDGE0_API_KEY; // RapidAPI uses this header, some direct instances use X-Auth-Token or similar
  }
  if (JUDGE0_AUTH_TOKEN) {
    headers['X-Auth-Token'] = JUDGE0_AUTH_TOKEN;
  }
  if (JUDGE0_AUTH_USER) {
    headers['X-Auth-User'] = JUDGE0_AUTH_USER;
  }
  return headers;
};

codeRouter.get('/languages', async (req, res) => {
  try {
    const response = await fetch(`${JUDGE0_BASE}/languages`, { headers: getHeaders() });
    
    if (!response.ok) {
      throw new Error(`Judge0 API error: ${response.statusText}`);
    }

    const data = await response.json();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Judge0 Languages Error:', error);
    res.status(503).json({ success: false, error: { code: 'RESOURCE_PROVIDER_UNAVAILABLE', message: 'The coding service is temporarily unavailable.' } });
  }
});

codeRouter.post('/submit', async (req, res) => {
  try {
    const { language_id, source_code, stdin } = req.body;
    
    if (!language_id || !source_code) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Language ID and source code are required.' } });
    }

    const payload = {
      language_id,
      source_code,
      stdin: stdin || ''
    };

    const response = await fetch(`${JUDGE0_BASE}/submissions/?base64_encoded=false&wait=false`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Judge0 API error: ${response.statusText}`);
    }

    const data = await response.json();
    // data.token contains the submission token
    res.json({ success: true, data });
  } catch (error) {
    console.error('Judge0 Submit Error:', error);
    res.status(503).json({ success: false, error: { code: 'RESOURCE_PROVIDER_UNAVAILABLE', message: 'The coding service is temporarily unavailable.' } });
  }
});

codeRouter.get('/submissions/:token', async (req, res) => {
  try {
    const token = req.params.token;
    
    const response = await fetch(`${JUDGE0_BASE}/submissions/${token}?base64_encoded=false`, { headers: getHeaders() });
    
    if (!response.ok) {
      throw new Error(`Judge0 API error: ${response.statusText}`);
    }

    const data = await response.json();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Judge0 Submission Get Error:', error);
    res.status(503).json({ success: false, error: { code: 'RESOURCE_PROVIDER_UNAVAILABLE', message: 'The coding service is temporarily unavailable.' } });
  }
});

export default codeRouter;
