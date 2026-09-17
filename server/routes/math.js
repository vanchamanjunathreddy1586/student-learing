import { Router } from 'express';

export const mathRouter = Router();

const NEWTON_BASE = process.env.NEWTON_BASE_URL || 'https://newton.vercel.app/api/v2';

const validOperations = ['simplify', 'factor', 'derive', 'integrate', 'zeroes', 'tangent', 'area', 'cos', 'sin', 'tan', 'arccos', 'arcsin', 'arctan', 'abs', 'log'];

const handleMathRequest = async (operation, req, res) => {
  try {
    const expression = req.body.expression;
    if (!expression) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Expression is required.' } });
    }
    
    if (!validOperations.includes(operation)) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid math operation.' } });
    }

    // URL encode the expression for Newton API
    const url = `${NEWTON_BASE}/${operation}/${encodeURIComponent(expression)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Newton API error: ${response.statusText}`);
    }

    const data = await response.json();
    res.json({ success: true, data });
  } catch (error) {
    console.error(`Newton API Error (${operation}):`, error);
    res.status(503).json({ success: false, error: { code: 'RESOURCE_PROVIDER_UNAVAILABLE', message: 'The math service is temporarily unavailable.' } });
  }
};

mathRouter.post('/solve', (req, res) => handleMathRequest('simplify', req, res));
mathRouter.post('/simplify', (req, res) => handleMathRequest('simplify', req, res));
mathRouter.post('/factor', (req, res) => handleMathRequest('factor', req, res));
mathRouter.post('/derive', (req, res) => handleMathRequest('derive', req, res));
mathRouter.post('/integrate', (req, res) => handleMathRequest('integrate', req, res));

export default mathRouter;
