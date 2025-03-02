-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CampaignRecipient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignRecipient_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CampaignRecipient" ("campaignId", "contactId", "createdAt", "id", "sentAt", "status", "updatedAt") SELECT "campaignId", "contactId", "createdAt", "id", "sentAt", "status", "updatedAt" FROM "CampaignRecipient";
DROP TABLE "CampaignRecipient";
ALTER TABLE "new_CampaignRecipient" RENAME TO "CampaignRecipient";
CREATE INDEX "CampaignRecipient_campaignId_idx" ON "CampaignRecipient"("campaignId");
CREATE INDEX "CampaignRecipient_contactId_idx" ON "CampaignRecipient"("contactId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Event_campaignRecipientId_idx" ON "Event"("campaignRecipientId");

-- CreateIndex
CREATE INDEX "Event_type_idx" ON "Event"("type");
