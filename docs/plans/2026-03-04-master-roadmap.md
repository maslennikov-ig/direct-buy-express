# Phase 11+: Production Roadmap

> **Контекст:** Фазы 1–10 завершены. MVP работает, 84 теста проходят. Ниже — что осталось по ТЗ и для деплоя, в правильном порядке с зависимостями.

---

## 🧱 Слой 0. Инфраструктура (нет зависимостей)

### Phase 11: Hardening Admin Auth
- Убрать захардкоженный fallback `'direct-buy-admin-secret'` из `middleware.ts` и `lib/admin-auth.ts`
- Если `ADMIN_SESSION_TOKEN` не задан → бросить ошибку при старте, а не подставлять дефолт
- Это **блокирует деплой** — нельзя выпускать в prod с дефолтным токеном
- **Зависимости:** нет

### Phase 12: Dockerization & docker-compose
- Создать `Dockerfile` (multi-stage build: Next.js admin + bot + worker)
- `docker-compose.yml` с сервисами: `bot`, `admin-panel`, `worker`, `postgres`, `redis`
- Caddy/Nginx reverse proxy + Let's Encrypt
- **Зависимости:** Phase 11 (auth hardened)

---

## 🔧 Слой 1. Бизнес-логика (незавершённые фичи из ТЗ)

### Phase 13: Owner Choice Flow (Выбор Победителя)
- После `WAITING_CHOICE` собственник видит топ-ставки с кнопками «Согласен» / «Не согласен»
- «Согласен» → привязка winnerId, переход в `WAITING_DOCS`, запуск SLA_DOCS_UPLOAD
- «Не согласен» → Alert менеджеру для ручного дожима
- Калькулятор: вычислить `итог = ставка - 100 000 - комиссия_брокера`
- **Зависимости:** нет (может идти параллельно с Phase 11/12)

### Phase 14: Add SLA_DOCS_UPLOAD Trigger
- При переходе лота в `WAITING_DOCS` нужно ставить `slaQueue.add('SLA_DOCS_UPLOAD', ...)`
- Сейчас воркер обрабатывает это событие, но **никто его не ставит в очередь**
- Добавить в `create-lot.ts` и в сценарий выбора инвестора из Phase 13
- **Зависимости:** Phase 13

### Phase 15: Offer Acceptance SLA
- Таймер 2 часа на принятие оффера клиентом (ТЗ §7 п.1)
- Новый job `SLA_OFFER_RESPONSE` в worker + добавление в очередь при показе оффера
- **Зависимости:** Phase 13 (оффер генерируется в Owner Choice Flow)

---

## 🎨 Слой 2. UX & Полировка

### Phase 16: Photo Upload in Lot Creation
- ТЗ §3 п.3: «Обязательная загрузка 7–10 фото. Блок на переход дальше без фото.»
- Добавить шаг в `create-lot.ts`: media group → сохранение в uploads/, Media records в БД
- **Зависимости:** нет (параллельно)

### Phase 17: Meeting Scheduling Flow
- ТЗ §6.2: Инвестор после одобрения доков вводит дату/время/адрес встречи
- Бот пересылает продавцу детали + кнопки «Подтверждаю / Перенести»
- Менеджер получает алерт для координации
- **Зависимости:** Phase 10 (Deal Finalization — уже сделан)

### Phase 18: Remove Demo Data
- Удалить hardcoded demo-массивы из `app/admin/lots/page.tsx`
- Дашборд уже работает на реальных данных, демо нужны только для презентации
- **Зависимости:** после презентации заказчику

---

## 🧪 Слой 3. Качество

### Phase 19: E2E Integration Test
- Сквозной тест полного пайплайна: /start → создание лота → аукцион → ставки → выбор → документы → финализация
- Mock bot API, реальный Prisma + in-memory Redis
- **Зависимости:** Phase 13, Phase 14 (все бизнес-фичи должны быть на месте)

### Phase 20: Production Deployment
- Финальный чеклист: env vars, SSL, DNS, мониторинг
- Deploy docker-compose на VPS
- Smoke-тесты на проде
- **Зависимости:** все Phase 11–19

---

## Граф зависимостей

```
Phase 11 (Auth) ──────────────────┐
                                  ▼
Phase 13 (Owner Choice) ───► Phase 14 (SLA Docs Trigger)
        │                         │
        ▼                         ▼
Phase 15 (Offer SLA)     Phase 12 (Docker) ◄── Phase 11
                                  │
Phase 16 (Photos) ────────────────┤  (параллельно)
Phase 17 (Meetings) ──────────────┤
Phase 18 (Remove Demo) ──────────┤
                                  ▼
                          Phase 19 (E2E Tests)
                                  │
                                  ▼
                          Phase 20 (Deploy)
```
