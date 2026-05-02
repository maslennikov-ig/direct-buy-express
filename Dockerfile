# ---- Builder ----
FROM node:22-alpine AS builder
ARG NEXT_PUBLIC_BOT_USERNAME
ENV NEXT_PUBLIC_BOT_USERNAME=${NEXT_PUBLIC_BOT_USERNAME}
RUN corepack enable && corepack prepare pnpm@10.7.0 --activate
WORKDIR /app
RUN mkdir -p public
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
COPY prisma ./prisma/
COPY . .
RUN pnpm build

# ---- Runner ----
FROM node:22-alpine AS runner
ARG NEXT_PUBLIC_BOT_USERNAME
RUN corepack enable && corepack prepare pnpm@10.7.0 --activate
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_PUBLIC_BOT_USERNAME=${NEXT_PUBLIC_BOT_USERNAME}
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
RUN cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/bot ./bot
COPY --from=builder /app/lib ./lib
EXPOSE 3000
CMD ["node", ".next/standalone/server.js"]
