# Multi-stage Dockerfile para Next.js 15 em Google Cloud Run
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# 1. Dependências
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# 2. Build da aplicação
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDrG3Sx1sh2z8VO8hOPIWvpS7F4hNgdqjI
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=studio-6533808029-72cdc.firebaseapp.com
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=studio-6533808029-72cdc
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=studio-6533808029-72cdc.firebasestorage.app
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=213244246937
ENV NEXT_PUBLIC_FIREBASE_APP_ID=1:213244246937:web:64f4a4dc61e3c55d22b108
ENV NEXT_PUBLIC_FIREBASE_DATABASE_ID=profundidadedboasis
ENV FIRESTORE_DATABASE_ID=profundidadedboasis

RUN npm run build

# 3. Runner de Produção
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 8080

CMD ["node", "server.js"]
