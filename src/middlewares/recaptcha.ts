import { Request, Response, NextFunction } from 'express';

// Verifies reCAPTCHA token sent by client. Expects token in req.body.recaptchaToken
// Uses RECAPTCHA_SECRET env var. For reCAPTCHA v3, you can set RECAPTCHA_MIN_SCORE to adjust threshold.
export const verifyRecaptcha = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.body?.recaptchaToken || req.headers['x-recaptcha-token'];
    if (!token) {
      return res.status(400).json({ message: 'Missing reCAPTCHA token' });
    }

    const secret = process.env.RECAPTCHA_SECRET;
    if (!secret) {
      console.error('RECAPTCHA_SECRET is not configured');
      return res.status(500).json({ message: 'reCAPTCHA not configured' });
    }

    const params = new URLSearchParams();
    params.append('secret', secret);
    params.append('response', String(token));
    // Optionally send remoteip if available
    if (req.ip) params.append('remoteip', req.ip);

    const resp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!resp.ok) {
      console.error('reCAPTCHA verification failed with status', resp.status);
      return res.status(502).json({ message: 'Failed to verify reCAPTCHA' });
    }

  const data: any = await resp.json();

    // data.success true indicates verification OK. For v3, evaluate score.
    if (!data.success) {
      return res.status(403).json({ message: 'reCAPTCHA verification failed', details: data['error-codes'] || null });
    }

    const minScore = Number(process.env.RECAPTCHA_MIN_SCORE || 0.5);
    if (typeof data.score === 'number') {
      // v3
      if (data.score < minScore) {
        return res.status(403).json({ message: 'reCAPTCHA score too low', score: data.score });
      }
    }

    // Passed verification - remove token from body so downstream doesn't store it
    delete req.body.recaptchaToken;
    next();
  } catch (err) {
    console.error('verifyRecaptcha error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export default verifyRecaptcha;
