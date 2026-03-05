# Phase 9: Document Pipeline & Manager Admin Panel Design

## 1. Overview
This phase implements the Document Pipeline (uploading Passport and EGRN by the Owner) and the Manager Admin Panel (for moderating Investors and auditing the uploaded documents). We are skipping the automated deposit mechanic per the business decision.

## 2. Document Pipeline (Telegram Bot)

### 2.1 Trigger
- After an auction ends, the Owner selects a winner. The Lot status changes to `WAITING_DOCS`.
- The bot sends a message to the Owner with an inline button: "Загрузить документы (Паспорт и ЕГРН)".
- Clicking the button enters the `uploadDocsConversation`.

### 2.2 Conversation Flow (`uploadDocsConversation`)
1. **Prompt 1 (Passport)**: "Пожалуйста, отправьте качественное фото главного разворота паспорта."
   - User sends a photo. Bot downloads it using Telegram API.
2. **Prompt 2 (EGRN)**: "Отлично. Теперь отправьте выписку из ЕГРН (файл PDF или фото)."
   - User sends a document or photo. Bot downloads it.
3. **Storage**: Save downloaded files to local filesystem (e.g., `./uploads/lots/{lotId}/`).
4. **Database (Prisma)**: Create records in the `Media` model linked to the Lot (`type: "PASSPORT"`, `type: "EGRN"`, `url: "/uploads/...""`).
5. **State Update**: Update Lot status to `DOCS_AUDIT`.
6. **Notifications**:
   - To Owner: "Документы успешно загружены и отправлены на проверку менеджеру."
   - To Winning Investor: "Собственник загрузил документы. Ожидайте окончания аудита менеджером."

### 2.3 SLA Integration
- When entering `WAITING_DOCS`, a 2-hour BullMQ timer starts.
- Completing the upload successfully removes or completes this SLA job.

## 3. Manager Admin Panel (Web - Next.js)

### 3.1 Security & Access
- Route: `/admin/*`
- Authentication: Basic HTTP Authentication via Next.js Middleware (using `ADMIN_USER` and `ADMIN_PASSWORD` from `.env`), or a simple custom login form with a session cookie.

### 3.2 Layout & UI (shadcn/ui + Tailwind 4)
- A persistent sidebar containing:
  - **Investors Moderation** (`/admin/investors`)
  - **Lots Audit** (`/admin/lots`)

### 3.3 Investors Moderation Page
- **Data Query**: Fetch users where `role=INVESTOR` and `investorProfile.isVerified=false`.
- **UI**: A data table displaying ID, Telegram ID, Name, Phone.
- **Actions**: "Verify" button. Invokes an API route `/api/admin/investors/[id]/verify` changing `isVerified` to `true`.

### 3.4 Lots Audit Page
- **Data Query**: Fetch lots where `status=DOCS_AUDIT` (include `Media`, `Owner`, `Bids` to show winning bid).
- **UI**: A data table displaying Lot Address, Owner Name, Winning Bid Amount.
- **Actions**:
  - **View Details**: Opens a modal or sub-page showing the Passport and EGRN images.
  - **Approve**: Changes Lot status to `READY_TO_DEAL`. Sends a Telegram notification to the Winning Investor bridging them with the Owner.
  - **Reject**: Changes Lot status back to `WAITING_DOCS` (with a message to the owner stating why) or `CANCELED`.

### 3.5 Secure File Serving
- The local `./uploads` folder should not be fully public. We can create an API route `/api/media/[id]` that checks if the request comes from an authenticated Manager or the authorized Investor before serving the file content.

## 4. Testing Strategy (TDD)
- **Bot**: Mock Telegram context and `downloadFile` function. Test that `uploadDocsConversation` correctly parses photos/documents and creates Prisma records.
- **Web**: Test the API routes for admin actions (approving investor, approving docs) with `vitest`, ensuring unauthenticated requests are rejected.
