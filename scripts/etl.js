// KYA KAR RAHA HAI: Real Kaggle dataset (7 Indian cities ka real-estate CSV) ko padhke,
// saaf karke, hamare schema me load karta hai. Hardcoded seed.sql ki jagah ASLI data.
// KAISE KAR RAHA HAI: CSV -> parse -> transform (price/type/AI estimate) -> stratified sample
// (har city se balanced) -> synthesized owner/agent/tenant pool ke saath bulk insert.
//
// Chalane ka tareeka:  node scripts/etl.js
// Raw CSV yahan hona chahiye: Real_Estate_Data/Real Estate Data V21.csv (Kaggle se download).
//
// NOTE: Ye ek ETL "tool" hai (one-off), isliye csv-parse devDependency me hai. Production app
// isko import nahi karta — sirf DB seed karne ke liye manually chalate hain.

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const bcrypt = require('bcryptjs');
const pool = require('../src/db/pool');

// ── Tunable knobs (yahin se behaviour control hota hai) ──
const CSV_PATH = path.join(__dirname, '..', 'Real_Estate_Data', 'Real Estate Data V21.csv');
const PER_CITY_CAP = 250; // har city se max itni properties (balanced demo dataset ke liye)
const N_OWNERS = 80;
const N_AGENTS = 30;
const N_TENANTS = 50;
const N_INQUIRIES = 60;
const N_LEASES = 30; // demo leases (dashboard/transaction flows ke liye)
const PWD_PLAIN = 'Test@123'; // sabhi seed login accounts ka common password

// ─────────────────────────────────────────────────────────────────────────────
// 1) TRANSFORM HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// "₹1.99 Cr" / "55 L" / "55.0k" -> numeric rupees. Galat ho toh null.
function parsePrice(raw) {
  if (!raw) return null;
  const cleaned = String(raw).replace(/₹/g, '').replace(/,/g, '').trim();
  const m = cleaned.match(/^([\d.]+)\s*(Cr|Crore|L|Lac|Lacs|Lakh|k|K)?/i);
  if (!m) return null;
  const num = parseFloat(m[1]);
  if (!isFinite(num) || num <= 0) return null;
  const unit = (m[2] || '').toLowerCase();
  const mult = unit.startsWith('cr') ? 1e7
    : (unit === 'l' || unit.startsWith('lac') || unit.startsWith('lak')) ? 1e5
    : unit === 'k' ? 1e3
    : 1;
  const value = Math.round(num * mult);
  // DECIMAL(14,2) ki max limit cross na ho.
  return value > 0 && value < 1e14 ? value : null;
}

// Title se property type nikaalo. Schema generic VARCHAR rakhta hai, hum normalize karte hain.
function parseType(title) {
  const t = String(title);
  if (/Villa/i.test(t)) return 'Villa';
  if (/Independent House|Bungalow/i.test(t)) return 'Independent House';
  if (/Studio/i.test(t)) return 'Studio';
  if (/Penthouse/i.test(t)) return 'Penthouse';
  if (/Builder Floor/i.test(t)) return 'Builder Floor';
  if (/Plot|Land/i.test(t)) return 'Plot';
  if (/Shop|Office|Commercial/i.test(t)) return 'Commercial';
  return 'Apartment'; // Flat/Apartment default
}

// Location ke aakhri token se city. "Area, City" -> "City".
function parseCity(location) {
  const parts = String(location).split(',');
  return parts[parts.length - 1].trim();
}

// AI estimate ke liye baseline: area × price-per-sqft. Phase 6 me Gemini isko refine karega.
function estimatePrice(area, sqft) {
  const a = parseFloat(area), s = parseFloat(sqft);
  if (!isFinite(a) || !isFinite(s) || a <= 0 || s <= 0) return null;
  const est = Math.round(a * s);
  return est > 0 && est < 1e14 ? est : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) SYNTHETIC ACTORS (CSV me owner/agent/tenant nahi hain, isliye realistic pool banate hain)
// ─────────────────────────────────────────────────────────────────────────────
const FIRST = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Reyansh', 'Krishna', 'Ishaan',
  'Rohan', 'Kabir', 'Ananya', 'Diya', 'Aadhya', 'Saanvi', 'Priya', 'Meera', 'Riya', 'Kavya',
  'Neha', 'Pooja', 'Rahul', 'Amit', 'Suresh', 'Deepak', 'Nikhil', 'Sandeep', 'Manish', 'Vikram'];
const LAST = ['Sharma', 'Verma', 'Gupta', 'Mehta', 'Nair', 'Reddy', 'Iyer', 'Pillai', 'Joshi',
  'Kapoor', 'Malhotra', 'Singh', 'Desai', 'Rao', 'Pandey', 'Mishra', 'Bose', 'Chopra', 'Banerjee'];

// Deterministic naam/phone/email taaki har run pe same data mile (reproducible seed).
// Naam repeat ho sakta hai (realistic), par phone+email index se unique rehte hain.
function makeActors(count, phoneBase, tag) {
  const out = [];
  for (let idx = 0; idx < count; idx++) {
    const first = FIRST[idx % FIRST.length];
    const last = LAST[Math.floor(idx / FIRST.length) % LAST.length];
    out.push({
      name: `${first} ${last}`,
      phone: String(phoneBase + idx),
      // tag (own/agt/ten) email ko globally unique rakhta hai — alag pools clash na karein.
      email: `${first}.${last}.${tag}${idx}`.toLowerCase() + '@mail.com',
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) BULK INSERT HELPER (chunked, taaki ek hi query me hazaron rows na thus jaayein)
// ─────────────────────────────────────────────────────────────────────────────
async function bulkInsert(conn, sql, rows, chunk = 500) {
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    await conn.query(sql, [slice]);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) MAIN PIPELINE
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`[ETL] CSV nahi mili: ${CSV_PATH}\nKaggle dataset download karke yahan rakho.`);
    process.exit(1);
  }

  console.log('[ETL] CSV padh rahe hain...');
  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const records = parse(raw, { columns: true, skip_empty_lines: true, relax_column_count: true });
  console.log(`[ETL] ${records.length} rows mile. Transform + stratified sampling...`);

  // Transform + city-wise stratified sampling (har city se PER_CITY_CAP tak).
  const byCity = new Map();
  let skipped = 0;
  for (const r of records) {
    const price = parsePrice(r.Price);
    const title = (r['Property Title'] || '').trim();
    const location = (r.Location || '').trim();
    if (!price || !title || !location) { skipped++; continue; }
    const city = parseCity(location);
    if (!byCity.has(city)) byCity.set(city, []);
    const bucket = byCity.get(city);
    if (bucket.length >= PER_CITY_CAP) continue;
    bucket.push({
      title: title.slice(0, 200),
      type: parseType(title),
      location: location.slice(0, 255),
      price,
      aiEst: estimatePrice(r.Total_Area, r.Price_per_SQFT),
    });
  }

  const properties = [];
  for (const [city, bucket] of byCity) {
    console.log(`[ETL]   ${city}: ${bucket.length}`);
    properties.push(...bucket);
  }
  console.log(`[ETL] Total ${properties.length} properties loadable (${skipped} rows skip hue).`);

  // Synthesized actors.
  const owners = makeActors(N_OWNERS, 9900000000, 'own');
  const agents = makeActors(N_AGENTS, 9811000000, 'agt');
  const tenants = makeActors(N_TENANTS, 9700000000, 'ten');

  const conn = await pool.getConnection();
  try {
    console.log('[ETL] Purana data clear kar rahe hain...');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const t of ['PAYMENT', 'TENANT_LEASE', 'INQUIRY_AUDIT', 'INQUIRY', 'PROPERTY_AMENITY',
      'LEASE', 'SALE', 'PROPERTY', 'AMENITY', 'CUSTOMER_ANALYSIS', 'TENANT', 'OWNER', 'AGENT', 'USERS']) {
      await conn.query(`TRUNCATE TABLE ${t}`);
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    // AMENITY
    const amenityNames = ['Swimming Pool', 'Gym', 'Parking', 'Security', 'Power Backup',
      'Elevator', 'Garden', 'Clubhouse'];
    await bulkInsert(conn, 'INSERT INTO AMENITY (Amenity_Name) VALUES ?',
      amenityNames.map((n) => [n]));

    // AGENT (commission 4-8%)
    await bulkInsert(conn, 'INSERT INTO AGENT (Name, Phone, Commission_Rate) VALUES ?',
      agents.map((a, i) => [a.name, a.phone, 4 + (i % 9) * 0.5]));

    // OWNER
    await bulkInsert(conn, 'INSERT INTO OWNER (Name, Phone, Email) VALUES ?',
      owners.map((o) => [o.name, o.phone, o.email]));

    // TENANT
    await bulkInsert(conn, 'INSERT INTO TENANT (Name, Phone, Email) VALUES ?',
      tenants.map((t) => [t.name, t.phone, t.email]));

    // PROPERTY — har property ko random owner+agent assign (FK satisfy + realistic spread).
    console.log('[ETL] Properties insert ho rahi hain...');
    const propRows = properties.map((p, i) => {
      const ownerId = ((i * 13 + 7) % N_OWNERS) + 1;
      const agentId = ((i * 5 + 2) % N_AGENTS) + 1;
      return [p.title, p.type, p.location, p.price, 'Available', p.aiEst, ownerId, agentId];
    });
    await bulkInsert(conn,
      'INSERT INTO PROPERTY (Title, Type, Location, Price, Status, AI_Est_Price, Owner_ID, Agent_ID) VALUES ?',
      propRows);
    const propCount = propRows.length;

    // PROPERTY_AMENITY — har property ko 2-5 amenities (deterministic).
    const paRows = [];
    for (let pid = 1; pid <= propCount; pid++) {
      const k = 2 + (pid % 4); // 2..5
      for (let j = 0; j < k; j++) {
        const amenityId = ((pid * 3 + j * 2) % amenityNames.length) + 1;
        paRows.push([pid, amenityId]);
      }
    }
    // Duplicate (pid,amenityId) hata do (composite PK clash na ho).
    const paSeen = new Set();
    const paUnique = paRows.filter(([p, a]) => {
      const key = `${p}-${a}`;
      if (paSeen.has(key)) return false;
      paSeen.add(key); return true;
    });
    await bulkInsert(conn, 'INSERT INTO PROPERTY_AMENITY (Property_ID, Amenity_ID) VALUES ?', paUnique);

    // USERS — pehle 3 agents/owners/tenants ko login do + admin. Sab ka password Test@123.
    // Login EMAIL clean/yaad-rakhne-laayak rakhte hain (jaise agent1@propertydekho.in) —
    // demo me type karna aasaan. Ref_ID role-table ke id se map hota hai.
    const hash = await bcrypt.hash(PWD_PLAIN, 10);
    const userRows = [];
    for (let i = 0; i < 3; i++) {
      userRows.push([`agent${i + 1}`, `agent${i + 1}@propertydekho.in`, hash, 'agent', i + 1]);
      userRows.push([`owner${i + 1}`, `owner${i + 1}@propertydekho.in`, hash, 'owner', i + 1]);
      userRows.push([`tenant${i + 1}`, `tenant${i + 1}@propertydekho.in`, hash, 'tenant', i + 1]);
    }
    userRows.push(['admin', 'admin@propertydekho.in', hash, 'admin', 1]);
    await bulkInsert(conn, 'INSERT INTO USERS (Username, Email, Password, Role, Ref_ID) VALUES ?', userRows);

    // INQUIRY — random tenant/property/agent (dashboard ko data dene ke liye).
    const inqRows = [];
    const msgs = ['Is this still available?', 'Can we schedule a site visit?',
      'What are the lease terms?', 'Please share the floor plan.', 'Is price negotiable?',
      'Any nearby schools?', 'Is parking included?'];
    for (let i = 0; i < N_INQUIRIES; i++) {
      const tenantId = (i % N_TENANTS) + 1;
      const propId = ((i * 17 + 3) % propCount) + 1;
      const agentId = ((i * 5 + 2) % N_AGENTS) + 1; // (note: ideal me property ka agent hota, demo ke liye theek)
      const status = ['New', 'Responded', 'Closed'][i % 3];
      inqRows.push([msgs[i % msgs.length], '2026-03-01', status, tenantId, propId, agentId]);
    }
    await bulkInsert(conn,
      'INSERT INTO INQUIRY (Message, Date, Status, Tenant_ID, Property_ID, Agent_ID) VALUES ?', inqRows);

    // LEASE + TENANT_LEASE + PAYMENT — demo transactional flows. Trigger rules ka dhyan:
    // payment sirf Active/Pending lease pe allowed hai, isliye lease pehle Active daalte hain.
    console.log('[ETL] Demo leases + payments...');
    const leaseRows = [];
    const usedProps = new Set();
    for (let i = 0; i < N_LEASES; i++) {
      let propId = ((i * 29 + 11) % propCount) + 1;
      while (usedProps.has(propId)) propId = (propId % propCount) + 1; // distinct property per lease
      usedProps.add(propId);
      const rent = 15000 + (i % 10) * 5000;
      leaseRows.push([propId, rent]);
    }
    // Leases ek-ek karke (insertId chahiye TENANT_LEASE + PAYMENT ke liye). Trigger property
    // ko Rented kar dega.
    let leaseId = 0;
    const tlRows = [];
    const payRows = [];
    for (let i = 0; i < leaseRows.length; i++) {
      const [propId, rent] = leaseRows[i];
      const [res] = await conn.query(
        `INSERT INTO LEASE (Start_Date, End_Date, Monthly_Rent, Security_Deposit, Property_ID, Lease_Status)
         VALUES ('2026-01-01', '2026-12-31', ?, ?, ?, 'Active')`,
        [rent, rent * 2, propId]);
      leaseId = res.insertId;
      const tenantId = (i % N_TENANTS) + 1;
      tlRows.push([tenantId, leaseId]);
      // Security deposit + 2 rent payments.
      payRows.push(['2026-01-05', rent * 2, 'Security_Deposit', 'UPI', 'Success', leaseId]);
      payRows.push(['2026-02-05', rent, 'Monthly_Rent', 'NEFT', 'Success', leaseId]);
      payRows.push(['2026-03-05', rent, 'Monthly_Rent', 'Bank Transfer', 'Pending', leaseId]);
    }
    await bulkInsert(conn, 'INSERT INTO TENANT_LEASE (Tenant_ID, Lease_ID) VALUES ?', tlRows);
    await bulkInsert(conn,
      'INSERT INTO PAYMENT (Payment_Date, Amount, Payment_Type, Method, Status, Lease_ID) VALUES ?', payRows);

    console.log('\n[ETL] ✓ DONE');
    console.log(`  Properties : ${propCount}`);
    console.log(`  Owners/Agents/Tenants : ${N_OWNERS}/${N_AGENTS}/${N_TENANTS}`);
    console.log(`  Inquiries : ${inqRows.length}  Leases : ${leaseRows.length}  Payments : ${payRows.length}`);
    console.log(`  Logins : agent1@propertydekho.in / owner1@.. / tenant1@.. / admin@..  (1..3)`);
    console.log(`  Password (sabhi) : ${PWD_PLAIN}`);
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[ETL] FAIL:', err.message);
  process.exit(1);
});
