# ---- Builder: install all deps (incl. dev) and compile TypeScript ----
FROM node:22-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# ---- Production: only runtime deps + compiled output ----
FROM node:22-slim AS production

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
# bcrypt (native) only ships prebuilt binaries for glibc, not musl — that's
# why this uses node:22-slim (Debian/glibc) rather than -alpine, avoiding a
# native compile step that would otherwise need build tools not present
# in either base image.
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

# node:*-slim images ship a built-in non-root "node" user (uid 1000) —
# use it instead of creating a new one.
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://localhost:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["node", "dist/index.js"]
