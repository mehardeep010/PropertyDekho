# 🚂 Railway pe PropertyDekho Deploy karne ki Guide

Ye guide tumhe ek **free**, **live public URL** tak le jaayegi — Docker + Kaggle data +
Gemini + concurrency sab intact, aur **MySQL hi** (koi DB change nahi).

> Mai (Claude) browser-login khud nahi kar sakta, isliye account/click wale steps tum karoge.
> Lekin sabse mushkil kaam — **live DB me data daalna** — wo mai tumhare liye kar dunga (Step 6).

---

## Step 0 — Pehle se ready
- Code GitHub pe hai: `mehardeep010/PropertyDekho`, branch **`revamp`**. ✅
- Railway free account: https://railway.app pe "Login with GitHub" se banao. (Free trial credits
  milte hain — ek demo ke liye kaafi. Card maang sakta hai par charge nahi hota jab tak tum
  khud paid plan na lo.)

---

## Step 1 — Naya Project + MySQL
1. Railway dashboard → **New Project**.
2. **+ New** → **Database** → **Add MySQL**. (Ek `MySQL` service ban jaayega.)

## Step 2 — App service (GitHub se)
1. Usi project me **+ New** → **GitHub Repo** → `PropertyDekho` choose karo.
2. Settings → **Branch** = `revamp`.
3. Railway `railway.json` + `Dockerfile` khud detect karega aur Docker image build karega.

## Step 3 — App ke Environment Variables
App service → **Variables** → ye sab add karo (MySQL wale `${{...}}` references Railway khud
fill karta hai jab dono service ek hi project me ho):

```
NODE_ENV=production
PORT=3000
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=property_mgmt
JWT_SECRET=vRd9haokT1u3rSn0YtpJx4bfZPcHWEKmGsL5yF2q8QwBl6OiIADXN7gM
JWT_EXPIRES_IN=8h
LOG_LEVEL=info
```

> **AI (optional):** Gemini chahiye toh `GEMINI_API_KEY=<apni key>` bhi add karo. Na do toh
> heuristic fallback chalega (app crash nahi hoga).
>
> **DB_NAME kyun `property_mgmt`?** Hamari `schema.sql` apni khud ki `property_mgmt` database
> banati hai (Railway ki default `railway` DB use nahi karte). App isi naam se connect karega.

## Step 4 — Public URL on karo
App service → **Settings** → **Networking** → **Generate Domain**. Ek URL milega jaise
`propertydekho-production.up.railway.app`. (Abhi khologe toh data nahi dikhega — wo Step 6 me aata hai.)

## Step 5 — MySQL ka PUBLIC connection nikaalo (mujhe dene ke liye)
MySQL service → **Variables**/**Connect** tab. Wahan "Public Network" ke neeche ye 4 cheezein
milengi (private `*.railway.internal` nahi, **public proxy** wali):
- **Host** (jaise `monorail.proxy.rlwy.net` ya `containers-us-west-x.railway.app`)
- **Port** (jaise `12345`)
- **User** (`root`)
- **Password** (lamba random string)

**Ye 4 values mujhe chat me paste kar do.** (Public DB endpoint hai, isi se mai seed karunga.)

## Step 6 — (MAI karunga) Live DB me schema + 1756-row data daalna
Tumse credentials milte hi mai tumhare local `mysql.exe` se Railway ki MySQL pe ye chalaunga:
```
mysql -h <host> -P <port> -u root -p<pass> < schema.sql           # tables + triggers + procs
mysql -h <host> -P <port> -u root -p<pass> property_mgmt < db/seed-data.sql   # 1756 properties
```
Iske baad app service ko Railway pe **Redeploy** kar dena (ya wo khud restart ho jaayega).

## Step 7 — Live! 🎉
Apna Railway URL kholo:
- **Login:** `agent1@propertydekho.in` / `Test@123`
- Properties page pe **1756 real listings**, dashboard pe ~₹33.7L revenue.
- Health check: `<url>/api/health` → `{"status":"ok","db":"up"}`

---

### Troubleshooting
- **App crash "JWT_SECRET default"** → `JWT_SECRET` variable set karna bhool gaye (Step 3).
- **App "DB connection failed"** → MySQL service abhi start ho rahi hogi; thodi der baad redeploy.
  Ya `DB_*` variables galat reference kiye. Dono service same project me hone chahiye.
- **Login fail / 0 properties** → DB seed nahi hua (Step 6 reh gaya).
- **Healthcheck fail on deploy** → `PORT=3000` variable check karo (Dockerfile bhi 3000 pe hai).
