# Mail Merge Web App — **Full Detailed Specification**

This **markdown** document combines all **functional requirements** (Google OAuth, Gmail API, CSV import, templates, campaigns, scheduling, follow-ups) with a **step-by-step** implementation outline, **detailed code snippets**, and a **modern UI** design approach. It’s intended to be a **single reference** (`projectspecs.md`) for you or an AI tool (like Cursor) to implement in sequence.

---

## **Table of Contents**

1. [High-Level Overview](#1-high-level-overview)  
2. [Core Features](#2-core-features)  
3. [Technical Architecture](#3-technical-architecture)  
4. [Proposed Database Schema (Prisma)](#4-proposed-database-schema-prisma)  
5. [Detailed Implementation Steps](#5-detailed-implementation-steps)  
   - 5.1 [Project Setup](#51-project-setup)  
   - 5.2 [NextAuth & Google OAuth Configuration](#52-nextauth--google-oauth-configuration)  
   - 5.3 [Gmail API Integration (Send Logic)](#53-gmail-api-integration-send-logic)  
   - 5.4 [Contacts & CSV Import](#54-contacts--csv-import)  
   - 5.5 [Templates & WYSIWYG Editor](#55-templates--wysiwyg-editor)  
   - 5.6 [Campaign Creation & Sending](#56-campaign-creation--sending)  
   - 5.7 [Scheduling & Automated Sequences](#57-scheduling--automated-sequences)  
   - 5.8 [Sent Items & History](#58-sent-items--history)  
   - 5.9 [Dashboard & Modern UI](#59-dashboard--modern-ui)  
   - 5.10 [Search & Partial Resend](#510-search--partial-resend)  
   - 5.11 [Testing & Deployment](#511-testing--deployment)  
6. [UI & Design Guidelines](#6-ui--design-guidelines)  
7. [Future Enhancements](#7-future-enhancements)  

---

## 1. **High-Level Overview**

You want a **web application** that:

1. **Authenticates** via **Google OAuth** and uses the **Gmail API** to send personalized emails, which appear in the user’s Gmail “Sent” folder.  
2. Manages **contacts** in multiple lists, supports **CSV import**, and stores **custom fields**.  
3. Creates **email templates** (WYSIWYG) with placeholders (like `{{firstName}}`).  
4. Sends or **schedules** email campaigns to a selected contact list.  
5. Optionally sets up **automated follow-ups** (sequences).  
6. Displays a **dashboard** with summary metrics and a modern, card-based interface.

---

## 2. **Core Features**

1. **User Authentication**  
   - Google Sign-In (OAuth) for login.  
   - Retrieve the necessary **Gmail scopes** (e.g., `gmail.send`).  

2. **Contacts**  
   - Multiple contact lists (groups).  
   - Flexible JSON-based custom fields.  
   - CSV import with field mapping.  
   - Basic search/filter.  

3. **Templates**  
   - WYSIWYG editor (drag-and-drop placeholders).  
   - Store inline images (base64) or external links (future optimization).  
   - Simple template list management (create/edit/delete).  

4. **Campaigns**  
   - Compose a new campaign (select list, template, placeholders, subject, body).  
   - Send immediately or schedule.  
   - Partial resend to new contacts.  

5. **Automated Sequences** (optional)  
   - Multi-step flows with time delays between steps.  
   - (Advanced “if no reply” detection requires deeper Gmail reading—could be future scope.)  

6. **Sent Items & History**  
   - Track which contacts received which email (campaign recipients).  
   - Search or filter campaigns by subject, recipient, or date.  
   - Clone or resend.  

7. **Dashboard**  
   - Card-based summary of total contacts, lists, campaigns, etc.  
   - Recent campaigns, statuses (Draft, Scheduled, Sent).  

8. **Modern UI/UX**  
   - Card-based layout, side navigation bar, top bar, responsive design.  

---

## 3. **Technical Architecture**

- **Frontend**:  
  - **Next.js** (TypeScript)  
  - **Tailwind CSS** (for rapid, modern UI)  
  - **React Quill** or **Tiptap** for WYSIWYG templates

- **Backend**:  
  - **Next.js API Routes** (or tRPC)  
  - **Prisma** ORM  
  - **Database**: PostgreSQL or MySQL  
  - **NextAuth** for Google OAuth  
  - **Gmail API** for sending on behalf of the user

- **Deployment**:  
  - Hosted on **Vercel** (for the Next.js app)  
  - Database on **Supabase** (PostgreSQL) or **PlanetScale** (MySQL), or similar

---

## 4. **Proposed Database Schema (Prisma)**

Below is an example `schema.prisma`. Adjust as needed.

```prisma
datasource db {
  provider = "postgresql" // or "mysql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id                String   @id @default(uuid())
  email             String   @unique
  name              String?
  image             String?
  // NextAuth fields:
  emailVerified     DateTime?
  // Store Google refresh token if needed:
  googleRefreshToken String?
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  contactLists      ContactList[]
  templates         Template[]
  campaigns         Campaign[]
  emailSequences    EmailSequence[]
}

model ContactList {
  id         String   @id @default(uuid())
  name       String
  ownerId    String
  owner      User     @relation(fields: [ownerId], references: [id])
  contacts   ContactListContact[]

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model Contact {
  id         String   @id @default(uuid())
  email      String
  // Store additional fields in JSON:
  fields     Json
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model ContactListContact {
  id            String   @id @default(uuid())
  contactId     String
  contact       Contact  @relation(fields: [contactId], references: [id])
  contactListId String
  contactList   ContactList @relation(fields: [contactListId], references: [id])
  createdAt     DateTime @default(now())
}

model Template {
  id         String   @id @default(uuid())
  name       String
  content    String   // HTML content with placeholders
  ownerId    String
  owner      User     @relation(fields: [ownerId], references: [id])
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model Campaign {
  id           String   @id @default(uuid())
  subject      String
  content      String
  ownerId      String
  owner        User       @relation(fields: [ownerId], references: [id])
  contactListId String?
  contactList   ContactList? @relation(fields: [contactListId], references: [id])
  status       CampaignStatus @default(DRAFT)
  scheduledAt  DateTime?
  sentAt       DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  recipients   CampaignRecipient[]
}

model CampaignRecipient {
  id         String   @id @default(uuid())
  campaignId String
  campaign   Campaign @relation(fields: [campaignId], references: [id])
  contactId  String
  contact    Contact  @relation(fields: [contactId], references: [id])
  sentAt     DateTime?
}

model EmailSequence {
  id        String   @id @default(uuid())
  name      String
  ownerId   String
  owner     User     @relation(fields: [ownerId], references: [id])
  steps     EmailSequenceStep[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model EmailSequenceStep {
  id         String        @id @default(uuid())
  sequenceId String
  sequence   EmailSequence @relation(fields: [sequenceId], references: [id])
  templateId String?
  template   Template?     @relation(fields: [templateId], references: [id])
  delayDays  Int
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

enum CampaignStatus {
  DRAFT
  SCHEDULED
  SENT
}
After setting up schema.prisma, run:

bash
Copy
Edit
npx prisma migrate dev --name "init_schema"
5. Detailed Implementation Steps
5.1 Project Setup
Initialize Next.js with TypeScript:

bash
Copy
Edit
npx create-next-app --typescript mail-merge-app
cd mail-merge-app
Install dependencies:

bash
Copy
Edit
npm install prisma @prisma/client next-auth react-quill tailwindcss postcss autoprefixer googleapis
# or yarn add ...
Tailwind Configuration:

bash
Copy
Edit
npx tailwindcss init -p
Update tailwind.config.js and globals.css accordingly.

Prisma Initialization:

bash
Copy
Edit
npx prisma init
Paste the schema above into prisma/schema.prisma, then npx prisma migrate dev.

Set up .env:

bash
Copy
Edit
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB_NAME"
NEXTAUTH_SECRET="some-random-string"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
5.2 NextAuth & Google OAuth Configuration
Create pages/api/auth/[...nextauth].ts:

ts
Copy
Edit
import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export default NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/gmail.send",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account?.provider === "google") {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.sub
      session.user.accessToken = token.accessToken
      session.user.refreshToken = token.refreshToken
      return session
    },
  },
})
Key Points:

Request the gmail.send scope.
Store refreshToken in token if needed for background sending.
You might store the refresh token in the DB (User.googleRefreshToken) if you want to send without user intervention.
5.3 Gmail API Integration (Send Logic)
Create a helper, e.g. lib/gmail.ts:

ts
Copy
Edit
import { google } from "googleapis"

interface SendEmailParams {
  to: string
  subject: string
  htmlContent: string
  accessToken: string
  refreshToken?: string
}

export async function sendEmailWithGmail({
  to,
  subject,
  htmlContent,
  accessToken,
  refreshToken,
}: SendEmailParams) {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL
  )

  oAuth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  const gmail = google.gmail({ version: "v1", auth: oAuth2Client })

  // Construct raw email (RFC 2822)
  const messageParts = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "",
    htmlContent,
  ]
  const message = messageParts.join("\n")

  // Base64 encode
  const encodedMessage = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")

  // Send
  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedMessage,
    },
  })

  return res.data
}
Notes:

If the token is expired, you’ll need to refresh it or request a new token from Google.
For an MVP, you might rely on the short session or user’s active session to handle sending.
5.4 Contacts & CSV Import
Create an API route pages/api/contacts/index.ts (or use a single route with multiple endpoints) to handle:

GET: List contacts or contact lists.
POST: Bulk create/update from CSV.
CSV Parsing:

You can parse CSV client-side using Papa Parse or server-side.
Map CSV columns to contact fields (e.g., firstName, company, etc.) and store them in fields JSON.
UI:

ContactList page to show all lists in a card/table.
Import button or link that opens a form to upload CSV, specify a list, and map columns to JSON keys.
5.5 Templates & WYSIWYG Editor
Models: Already included (Template with name and content).

UI:

List of templates (/templates): each template in a card or table row.
Create/Edit (/templates/[id]): Use React Quill or Tiptap.
Placeholders: Provide a side panel or dropdown with placeholders (e.g., {{firstName}}) that the user can insert into the content.
API Routes:

GET /api/templates (list user templates).
POST /api/templates (create).
PUT /api/templates/[id] (update).
DELETE /api/templates/[id] (delete).
5.6 Campaign Creation & Sending
New Campaign (Wizard-like flow):

Select a contact list (or multiple, if you add that logic).
Enter a subject or pick from a template.
WYSIWYG editor for final content (replace placeholders with dynamic data on send).
Choose Send Now or Schedule.
Sending Process:

For each contact in the selected list:
Merge placeholders in subject and content (e.g., replace {{firstName}} with the contact’s firstName).
Call sendEmailWithGmail().
Record a CampaignRecipient entry for that contact with sentAt.
Mark campaign status = SENT and sentAt after completion.
API Route: POST /api/campaigns

If scheduledAt is null, send immediately.
Otherwise, set status = SCHEDULED.
5.7 Scheduling & Automated Sequences
Scheduled Campaigns:

Store scheduledAt.
Use a CRON job (e.g., Vercel Cron Jobs) or a background worker to check every minute for campaigns where status = SCHEDULED and scheduledAt <= now().
Send those campaigns, then set status = SENT.
Sequences (multi-step):

EmailSequence model has multiple steps (EmailSequenceStep), each referencing a template and a delayDays.
When “starting” a sequence for a list, create scheduled campaigns for each step:
Step 1: scheduledAt = now() or a chosen time.
Step 2: scheduledAt = step1SendTime + delayDays.
Step 3: scheduledAt = step2SendTime + delayDays, etc.
(Advanced “if no reply” logic requires reading Gmail inbox messages, which is more complex.)

5.8 Sent Items & History
Campaign List (/campaigns):

Show DRAFT, SCHEDULED, and SENT.
Subject, scheduled time, status, etc.
Campaign Detail (/campaigns/[id]):

Which contacts were targeted (CampaignRecipient).
Who was actually sent to, sentAt.
A button to clone or partial resend if new contacts were added.
Search:

Filter by subject or recipient email.
Basic server-side search is fine for MVP.
5.9 Dashboard & Modern UI
Dashboard (/dashboard):

KPI Cards: total contacts, total lists, total templates, recent campaigns.
Possibly small charts (line chart for # of emails sent per day/week).
Layout:

Sidebar Navigation: Links to Dashboard, Contacts, Campaigns, Templates, Sequences.
Top Bar: Quick actions, user avatar, minimal search.
Card Components: Reusable <Card> with title prop, etc.
Responsive Design:

Cards adapt to smaller screens by stacking.
Sidebar collapses into a hamburger menu or hidden drawer.
5.10 Search & Partial Resend
Search: On campaigns page or within “sent items,” filter by subject, date, or contact.
Partial Resend:
Check who has been sent a campaign (CampaignRecipient).
For new contacts in the same list, allow “resend to new contacts only.”
5.11 Testing & Deployment
Local Testing:

Run npm run dev.
Sign in with Google.
Import contacts from a sample CSV.
Create a template.
Create a campaign, send to yourself, verify email is in “Sent” folder.
Deployment:

Deploy to Vercel.
Set environment variables (DB, NextAuth secret, Google client info).
Configure a CRON job for scheduling (if you have scheduled campaigns).
Security Checks:

Ensure that each resource is only accessible by its owner.
NextAuth session checks on every request.
6. UI & Design Guidelines
Card-Based Dashboard:

Display major metrics (number of contacts, campaigns, etc.) in stat cards.
Use a consistent accent color for buttons, highlights, or chart lines.
Sidebar & Top Navigation:

Sidebar with icons/labels for main sections.
Top Bar with user profile info, a small search bar or date filter.
Tables:

Minimal row styling, potential for sorting or filtering columns.
Could incorporate a library like react-table or just straightforward HTML tables.
WYSIWYG Editor:

Keep a stable, consistent approach (e.g., React Quill).
Provide a placeholder insertion dropdown or side panel.
Responsive:

Use Tailwind’s responsive utilities (md:, lg:) to stack or reflow content.
Animation:

Subtle transitions on hover or modals.
Keep it professional and not distracting.