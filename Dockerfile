# KYA KAR RAHA HAI: PropertyDekho app ko ek chhoti, production-ready Docker image me pack karta hai.
# KAISE: Multi-stage build — pehle stage me sirf dependencies install hoti hain (cache friendly),
# doosre stage me final image banti hai jisme prod deps + source code aata hai. Image alpine pe
# based hai (chhoti), non-root user pe chalti hai (security), aur HEALTHCHECK rakhta hai.

# ---- Stage 1: dependencies ----
FROM node:22-alpine AS deps
WORKDIR /app
# Sirf manifest copy karke install -> Docker layer cache reuse hota hai jab tak deps na badlein.
COPY package.json package-lock.json ./
# --omit=dev: app ko chalane ke liye sirf production deps chahiye (csv-parse etc. dev tooling hai).
RUN npm ci --omit=dev

# ---- Stage 2: runtime ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# wget healthcheck ke liye chahiye (alpine me already hota hai). node:alpine me wget present hai.

# Deps stage se ready node_modules uthao, phir baaki source.
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Non-root user pe chalao (container compromise ho toh blast radius kam).
USER node

EXPOSE 3000

# Container "healthy" tabhi jab /api/health 200 de (app + DB dono up).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
