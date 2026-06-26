// KYA KAR RAHA HAI: Property ka "fair market" estimated price nikaalta hai (AI_Est_Price ke liye).
// KAISE KAR RAHA HAI: PLUGGABLE design — agar GEMINI_API_KEY set hai toh Google Gemini se
// estimate maangta hai; nahi toh (ya Gemini fail ho toh) ek DETERMINISTIC heuristic fallback
// use karta hai jo same Type+city ki comparable properties ka average nikaalta hai (asli
// real-estate "comparative market analysis" wala idea). Dono case me {value, source, rationale}
// return karta hai taaki UI/caller ko pata rahe estimate kahan se aaya.
//
// Fayda (interview): koi API key na ho tab bhi app tutta nahi — graceful degradation. Aur
// Gemini wala call bilkul boring REST fetch hai (koi heavy SDK nahi), isliye defend karna aasaan.

const pool = require('../db/pool');
const config = require('../config');
const logger = require('../utils/logger');

// Location string ke aakhri token se city ("Area, City" -> "City").
function cityOf(location) {
  const parts = String(location || '').split(',');
  return parts[parts.length - 1].trim();
}

// ── HEURISTIC: comparable properties (same Type + same city) ka average price ──
// Listed price ke saath blend karte hain taaki ek hi property ka apna signal bhi count ho.
async function heuristicEstimate({ Type, Location, Price }) {
  const city = cityOf(Location);
  const [rows] = await pool.query(
    `SELECT AVG(Price) AS avgPrice, COUNT(*) AS n
       FROM PROPERTY
      WHERE Type = ? AND Location LIKE ?`,
    [Type, `%${city}`]);

  const n = rows[0] ? Number(rows[0].n) : 0;
  const avg = rows[0] && rows[0].avgPrice ? Number(rows[0].avgPrice) : null;
  const listed = Number(Price) || 0;

  let value;
  let rationale;
  if (avg && n >= 3) {
    // Comparable data bharosemand hai -> 60% market avg + 40% listed price.
    value = Math.round(0.6 * avg + 0.4 * listed);
    rationale = `${n} comparable ${Type} in ${city} (avg ₹${Math.round(avg).toLocaleString('en-IN')})`;
  } else {
    // Kam/ no comparables -> listed price ke aas-paas halka adjustment.
    value = Math.round(listed * 0.98);
    rationale = `insufficient comparables in ${city}; based on listed price`;
  }
  return { value, source: 'heuristic', rationale };
}

// ── GEMINI: REST call (global fetch, koi SDK nahi). 5s timeout. Sirf ek number maangte hain. ──
async function geminiEstimate({ Title, Type, Location, Price }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.ai.geminiModel}:generateContent?key=${config.ai.geminiKey}`;
  const prompt = `You are an Indian real-estate pricing expert. Estimate the fair market value in INR ` +
    `for this property. Reply with ONLY a plain integer (rupees), no commas, no words.\n` +
    `Title: ${Title}\nType: ${Type}\nLocation: ${Location}\nListed price (INR): ${Price}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 },
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const num = parseInt(String(text).replace(/[^\d]/g, ''), 10);
    if (!num || !isFinite(num) || num <= 0) throw new Error('Gemini ne valid number nahi diya');
    return { value: num, source: 'gemini', rationale: 'Gemini AI market estimate' };
  } finally {
    clearTimeout(timer);
  }
}

const AiEstimator = {
  // Single entry point. Gemini try karo (agar key hai), warna/fail pe heuristic.
  async estimate(property) {
    if (config.ai.geminiKey) {
      try {
        return await geminiEstimate(property);
      } catch (err) {
        // Gemini down/slow/quota -> chup-chaap heuristic pe gir jao (app kabhi nahi tutega).
        logger.warn({ err: err.message }, '[AiEstimator] Gemini fail, heuristic fallback use kar rahe hain');
      }
    }
    return heuristicEstimate(property);
  },
};

module.exports = AiEstimator;
