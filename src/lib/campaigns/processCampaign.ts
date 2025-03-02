import { prisma } from '@/lib/prisma';
import { sendEmailWithFirebaseGmail } from '@/lib/gmail/clientGmailApi';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

type CampaignRecipient = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  status: 'PENDING' | 'SENT' | 'FAILED';
  campaignId: string;
};

/**
 * Process a campaign by sending emails to all recipients
 * @param campaignId The ID of the campaign to process
 * @returns Object with success status and message
 */
export async function processCampaign(campaignId: string) {
  try {
    // Get the campaign with its recipients
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        recipients: {
          include: {
            contact: true
          }
        },
        user: true,
        template: true,
        contactLists: true
      }
    });

    if (!campaign) {
      return { success: false, message: 'Campaign not found' };
    }

    // Check if campaign is in SENDING status
    if (campaign.status !== 'SENDING') {
      return { 
        success: false, 
        message: `Campaign is not in SENDING status. Current status: ${campaign.status}` 
      };
    }

    // Get pending recipients
    const pendingRecipients = campaign.recipients.filter(
      (recipient) => recipient.status === 'PENDING'
    );

    if (pendingRecipients.length === 0) {
      // Update campaign status to SENT if all recipients are processed
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'SENT' }
      });
      return { success: true, message: 'All emails already sent' };
    }

    // Process each pending recipient
    let successCount = 0;
    let failureCount = 0;

    for (const recipient of pendingRecipients) {
      try {
        const contact = recipient.contact;

        if (!contact) {
          console.error(`Contact not found for recipient: ${recipient.id}`);
          continue;
        }

        // Prepare email content with personalization
        let emailContent = campaign.content || '';
        
        // Get fields from the contact's fields JSON
        const fields = contact.fields as Record<string, any>;
        
        // Replace placeholders with actual values
        emailContent = emailContent
          .replace(/{{firstName}}/g, fields.firstName || '')
          .replace(/{{lastName}}/g, fields.lastName || '')
          .replace(/{{email}}/g, contact.email);

        // Send the email using Gmail API
        await sendEmailWithFirebaseGmail({
          to: contact.email,
          subject: campaign.subject,
          body: emailContent
        });

        // Update recipient status to SENT
        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: { 
            status: 'SENT',
            sentAt: new Date()
          }
        });

        successCount++;
      } catch (error) {
        console.error(`Failed to send email to recipient ${recipient.id}:`, error);
        
        // Update recipient status to FAILED
        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: { status: 'FAILED' }
        });

        failureCount++;
      }
    }

    // Check if all recipients are processed
    const remainingPendingCount = await prisma.campaignRecipient.count({
      where: {
        campaignId,
        status: 'PENDING'
      }
    });

    // Update campaign status if all recipients are processed
    if (remainingPendingCount === 0) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { 
          status: 'SENT',
          sentAt: new Date()
        }
      });
    }

    return {
      success: true,
      message: `Processed ${successCount + failureCount} emails: ${successCount} sent, ${failureCount} failed`
    };
  } catch (error) {
    console.error('Error processing campaign:', error);
    return { success: false, message: `Error processing campaign: ${error}` };
  }
}

/**
 * Process all campaigns that are in SENDING status
 * @returns Object containing success status and counts
 */
export async function processAllPendingCampaigns() {
  try {
    // Find all campaigns in SENDING status
    const campaigns = await prisma.campaign.findMany({
      where: { status: 'SENDING' },
      select: { id: true }
    });

    if (campaigns.length === 0) {
      return {
        success: true,
        message: 'No pending campaigns to process',
        processedCount: 0
      };
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each campaign
    for (const campaign of campaigns) {
      try {
        const result = await processCampaign(campaign.id);
        results.push(result);
        successCount++;
      } catch (error) {
        console.error(`Error processing campaign ${campaign.id}:`, error);
        errorCount++;
        results.push({
          success: false,
          campaignId: campaign.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return {
      success: true,
      processedCount: campaigns.length,
      successCount,
      errorCount,
      results
    };
  } catch (error) {
    console.error('Error processing pending campaigns:', error);
    throw error;
  }
} 