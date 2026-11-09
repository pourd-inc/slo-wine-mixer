// Sponsor inquiry form -> email to the team, via Resend.
//
// Vercel env vars (Project settings > Environment Variables):
//   RESEND_API_KEY        required. Without it the endpoint returns 503 and the
//                         form falls back to a pre-filled email link.
//   SPONSOR_INQUIRY_TO    optional, comma-separated. Default hello@pourdhq.com
//   SPONSOR_INQUIRY_FROM  optional. Must be on a domain verified in Resend.
//                         Default "SLO Wine Mixer <hello@pourdhq.com>"

const INTERESTS = ['Presenting', 'Activation', 'Product / in-kind', 'Not sure yet'];

function clean(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, max);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  // Honeypot: real people never fill the hidden "website" field.
  if (clean(body.website, 200)) return res.status(200).json({ ok: true });

  const d = {
    name: clean(body.name, 120),
    company: clean(body.company, 160),
    email: clean(body.email, 200),
    phone: clean(body.phone, 40),
    interest: INTERESTS.includes(body.interest) ? body.interest : 'Not sure yet',
    message: clean(body.message, 4000),
  };
  if (!d.name || !d.company || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) {
    return res.status(400).json({ ok: false, error: 'invalid' });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(503).json({ ok: false, error: 'not_configured' });

  const to = (process.env.SPONSOR_INQUIRY_TO || 'hello@pourdhq.com').split(',').map((s) => s.trim()).filter(Boolean);
  const from = process.env.SPONSOR_INQUIRY_FROM || 'SLO Wine Mixer <hello@pourdhq.com>';

  const text = [
    'New sponsor inquiry from slowinemixer.com',
    '',
    'Name: ' + d.name,
    'Brand: ' + d.company,
    'Email: ' + d.email,
    'Phone: ' + (d.phone || '-'),
    'Interested in: ' + d.interest,
    '',
    d.message || '(no message)',
  ].join('\n');

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to,
        reply_to: d.email,
        subject: 'SWM 2027 sponsor inquiry: ' + d.company + ' (' + d.interest + ')',
        text,
      }),
    });
    if (!r.ok) return res.status(502).json({ ok: false, error: 'send_failed' });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'send_failed' });
  }
};
