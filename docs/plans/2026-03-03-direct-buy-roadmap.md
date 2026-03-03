# Direct Buy: Project Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the complete P2P real estate quick-buy platform (Telegram Bot + Admin Panel) with strict SLA enforcement, secure document handling, and an auction mechanic.

**Architecture:** A monolithic but highly detached architecture. `grammY` runs the Telegram Bot for sellers and investors. `Next.js` runs the Admin Panel and secure document delivery. `BullMQ` + `Redis` handle background SLA timers (12h, 3h, 2h). `Prisma` + `PostgreSQL` manage the strict relational state of Lots and Users.

**Tech Stack:** TypeScript, Node.js 22 LTS, Next.js 16 LTS, React 19 LTS, grammY, Prisma, PostgreSQL, BullMQ, Redis, TailwindCSS.

---

## Phase 1: Database & Core Infrastructure (Current Sprint)

### Task 1: Setup Prisma ORM and Core Schema

**Files:**
- Create: `prisma/schema.prisma`
- Modify: `package.json`
- Create: `lib/db.ts`

**Step 1: Install dependencies**

```bash
pnpm add prisma @prisma/client
pnpm exec prisma init
```

**Step 2: Define Core Schema**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  OWNER
  BROKER
  INVESTOR
  MANAGER
}

enum LotStatus {
  DRAFT
  AUCTION
  WAITING_CHOICE
  WAITING_DEPOSIT
  WAITING_DOCS
  DOCS_AUDIT
  READY_TO_DEAL
  CANCELED
  SOLD
}

model User {
  id         String   @id @default(cuid())
  telegramId BigInt   @unique
  role       Role
  fullName   String?
  phone      String?
  createdAt  DateTime @default(now())
  
  lots       Lot[]    @relation("OwnerLots")
  bids       Bid[]
}

model Lot {
  id             String    @id @default(cuid())
  ownerId        String
  owner          User      @relation("OwnerLots", fields: [ownerId], references: [id])
  address        String
  area           Float
  floor          Int
  rooms          Int
  hasDebts       Boolean   @default(false)
  hasMortgage    Boolean   @default(false)
  hasRegistered  Boolean   @default(false)
  expectedPrice  Decimal
  urgencyReason  String?
  status         LotStatus @default(DRAFT)
  auctionEndsAt  DateTime?
  createdAt      DateTime  @default(now())

  bids           Bid[]
  media          Media[]
}

model Bid {
  id        String   @id @default(cuid())
  lotId     String
  lot       Lot      @relation(fields: [lotId], references: [id])
  investorId String
  investor  User     @relation(fields: [investorId], references: [id])
  amount    Decimal
  createdAt DateTime @default(now())
}

model Media {
  id        String   @id @default(cuid())
  lotId     String
  lot       Lot      @relation(fields: [lotId], references: [id])
  type      String   // PHOTO, PASSPORT, EGRN
  url       String   // Local path or URL
  createdAt DateTime @default(now())
}
```

**Step 3: Setup DB Client Singleton**

```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**Step 4: Commit**

```bash
git add prisma/schema.prisma package.json pnpm-lock.yaml lib/db.ts
git commit -m "feat(db): initialize Prisma and core schema for users, lots, bids"
```

---

### Task 2: Setup Background Jobs (BullMQ + Redis)

**Files:**
- Create: `lib/queue/worker.ts`
- Create: `lib/queue/client.ts`

**Step 1: Install dependencies**

```bash
pnpm add bullmq ioredis
```

**Step 2: Create Queue Client**

```typescript
// lib/queue/client.ts
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

export const slaQueue = new Queue('sla-timers', { connection });

export const QueueJobs = {
  CLOSE_AUCTION: 'CLOSE_AUCTION',
  AWAITING_DEPOSIT: 'AWAITING_DEPOSIT',
  AWAITING_DOCS: 'AWAITING_DOCS',
  AWAITING_INVESTOR_DECISION: 'AWAITING_INVESTOR_DECISION'
};
```

**Step 3: Define Worker Skeleton**

```typescript
// lib/queue/worker.ts
import { Worker } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

export const slaWorker = new Worker('sla-timers', async job => {
  switch (job.name) {
    case 'CLOSE_AUCTION':
      console.log(`Closing auction for lot ${job.data.lotId}`);
      // Logic to transition lot from AUCTION to WAITING_CHOICE
      break;
    default:
      console.warn(`Unknown job: ${job.name}`);
  }
}, { connection });
```

**Step 4: Commit**

```bash
git add lib/queue/ package.json pnpm-lock.yaml
git commit -m "feat(jobs): setup BullMQ infrastructure for SLA timers"
```

---

## Phase 2: Telegram Bot Foundation (grammY)

### Task 3: Initialize grammY Bot & Middleware

**Files:**
- Create: `bot/index.ts`
- Create: `bot/middleware/auth.ts`

**Step 1: Install dependencies**

```bash
pnpm add grammy @grammyjs/runner
```

**Step 2: Create Basic Bot Entrypoint**

```typescript
// bot/index.ts
import { Bot } from "grammy";
import { run } from "@grammyjs/runner";

const bot = new Bot(process.env.BOT_TOKEN || "");

bot.command("start", (ctx) => {
    ctx.reply("Добро пожаловать в Direct Buy — первую P2P-платформу скоростного выкупа недвижимости в Москве и МО. 🏎\n\nМы исключили из цепочки посредников и лишние комиссии. Здесь вы соединяетесь с капиталом напрямую.\n\nЧтобы начать, примите условия сервиса:\n• [Политика обработки персональных данных]\n• [Соглашение о конфиденциальности (NDA)]", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "✅ Принимаю условия и начинаю", callback_data: "accept_terms" }]
            ]
        }
    });
});

bot.on("callback_query:data", async (ctx) => {
    if (ctx.callbackQuery.data === "accept_terms") {
        await ctx.answerCallbackQuery();
        await ctx.editMessageText("Кто вы? Выберите роль для настройки интерфейса:", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "👤 Я Собственник", callback_data: "role_owner" }],
                    [{ text: "🤝 Я Брокер", callback_data: "role_broker" }],
                    [{ text: "💰 Я Инвестор", callback_data: "role_investor" }]
                ]
            }
        });
    }
});

// Run it gracefully
run(bot);
console.log("Bot started!");
```

**Step 3: Commit**

```bash
git add bot/ package.json pnpm-lock.yaml
git commit -m "feat(bot): setup basic grammy bot and start command routing"
```

---

## Phase 3: Web Dashboard (Admin Panel Integration)

### Task 4: API Routes for Admin Panel

**Files:**
- Create: `app/api/lots/route.ts`

**Step 1: Create API Endpoint to fetch lots for Admin Panel**

```typescript
// app/api/lots/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const lots = await prisma.lot.findMany({
      include: { owner: true, bids: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(lots);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch lots' }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add app/api/
git commit -m "feat(api): add REST endpoints for Admin Panel data binding"
```

---

## Future Sprints (Unplanned)

- **Sprint 4:** Lot Creation Flow (Interactive Bot Conversation using `@grammyjs/conversations` & DaData API)
- **Sprint 5:** The Auction Engine (Broadcasting to Investors, collecting Bids, handling 12h SLA)
- **Sprint 6:** Document Pipeline (Secure file upload via Telegram, saving to VPS Docker volume, exposing via secure Next.js API)
- **Sprint 7:** Manager Alerts System & Dashboard wiring.
