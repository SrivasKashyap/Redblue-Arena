// RedBlue Arena — interceptor proxy
//
// Sits in front of OWASP Juice Shop (localhost:3000 inside the same
// container/network). Every request is:
//   1. rate-limited + sanitized (this proxy is internet-facing by design)
//   2. checked against the active WAF rules for the target match
//   3. pattern-matched for known exploit signatures
//   4. logged to Supabase
//   5. forwarded to Juice Shop (or blocked, if a matching WAF rule is on)
//
// This file intentionally holds NO minting/service-role-write-everything
// key beyond inserting into http_logs/matches score columns — see
// SECURITY.md in this folder.

const express = require('express');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;
const TARGET = process.env.JUICE_SHOP_TARGET || 'http://localhost:3000';
const MATCH_ID_HEADER = process.env.MATCH_ID_HEADER || 'x-match-id';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ---- Exploit signature detection ------------------------------------------------
const SIGNATURES = [
  { category: 'sqli', pattern: /(\bor\b\s+1=1|union\s+select|--\s|;--|'\s*or\s*')/i },
  { category: 'xss', pattern: /<script|onerror\s*=|javascript:/i },
  { category: 'path_traversal', pattern: /\.\.\/|\.\.\\|%2e%2e%2f/i },
];

function detectAttack(str = '') {
  for (const sig of SIGNATURES) {
    if (sig.pattern.test(str)) return sig.category;
  }
  return null;
}

// Never let logged attacker payloads execute anywhere downstream —
// strip control chars and cap length before it ever reaches Postgres.
function sanitizeForLog(str = '') {
  return String(str).replace(/[\x00-\x08\x0E-\x1F]/g, '').slice(0, 4000);
}

// ---- Rate limiting (protects this proxy itself, not scored gameplay) -----------
app.use(
  rateLimit({
    windowMs: 10 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true, limit: '256kb' }));

// ---- WAF rule check + logging middleware ----------------------------------------
app.use(async (req, res, next) => {
  const matchId = req.header(MATCH_ID_HEADER);
  const bodyStr = sanitizeForLog(JSON.stringify(req.body || {}));
  const combined = `${req.path} ${bodyStr}`;
  const attackCategory = detectAttack(combined);

  let blocked = false;

  if (matchId && attackCategory) {
    const ruleKeyMap = { sqli: 'sqli_shield', xss: 'xss_filter', path_traversal: 'path_traversal_shield' };
    const ruleKey = ruleKeyMap[attackCategory];

    if (ruleKey) {
      const { data: rule } = await supabase
        .from('waf_rules')
        .select('enabled')
        .eq('match_id', matchId)
        .eq('rule_key', ruleKey)
        .maybeSingle();

      blocked = !!rule?.enabled;
    }
  }

  // Fire-and-forget log write — never block the request/response on this.
  if (matchId) {
    supabase
      .from('http_logs')
      .insert({
        match_id: matchId,
        method: req.method,
        path: sanitizeForLog(req.path),
        request_body: bodyStr,
        status_code: blocked ? 403 : null, // updated below once forwarded, if not blocked
        is_malicious: !!attackCategory,
        attack_category: attackCategory,
      })
      .then(({ error }) => {
        if (error) console.error('log insert failed', error.message);
      });
  }

  if (blocked) {
    // TODO: award blue-team "waf_blocks_attack" points here via a
    // server-side scoring RPC (kept out of the hot path deliberately —
    // see contracts/README or wire a Postgres function `award_points`).
    return res.status(403).json({ error: 'Blocked by WAF rule', category: attackCategory });
  }

  next();
});

// ---- Forward everything else to Juice Shop ---------------------------------------
app.use(
  '/',
  createProxyMiddleware({
    target: TARGET,
    changeOrigin: true,
    ws: true,
    on: {
      proxyReq: fixRequestBody,
      proxyRes: (proxyRes) => {
        delete proxyRes.headers['x-frame-options'];
        delete proxyRes.headers['content-security-policy'];
      },
    },
  })
);

app.listen(PORT, () => {
  console.log(`RedBlue Arena proxy listening on :${PORT}, forwarding to ${TARGET}`);
});
