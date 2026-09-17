import app from './server/index.js';
const mockRes = {
  json: (data) => console.log('RESPONSE:', data),
  status: (code) => { console.log('STATUS:', code); return mockRes; },
  send: (msg) => console.log('SEND:', msg)
};
const req = { url: '/api/config', method: 'GET' };
app.handle(req, mockRes);
