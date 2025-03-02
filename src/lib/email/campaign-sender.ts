import { Campaign, CampaignRecipient, Contact } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sendEmailWithToken } from '@/lib/gmail/firebaseGmailApi';
import { addTrackingToEmail, getAppBaseUrl } from './tracking-utils';

interface SendCampaignOptions {
  campaignId: string;
  accessToken: string;
}

interface ResendFailedEmailOptions {
  campaignId: string;
  recipientId: string;
  accessToken: string;
}

/**
 * Helper function to get a case-insensitive field value from contact fields
 */
function getFieldValue(fields: any, fieldName: string, defaultValue: string = ""): string {
  if (!fields || typeof fields !== 'object') return defaultValue;
  
  // First try exact match
  if (fields[fieldName] !== undefined && fields[fieldName] !== null) {
    return String(fields[fieldName]);
  }
  
  // Then try case-insensitive match
  const lowerFieldName = fieldName.toLowerCase();
  const matchingKey = Object.keys(fields).find(
    key => key.toLowerCase() === lowerFieldName
  );
  
  if (matchingKey && fields[matchingKey] !== undefined && fields[matchingKey] !== null) {
    return String(fields[matchingKey]);
  }
  
  return defaultValue;
}

/**
 * Send a campaign to all recipients with tracking enabled
 */
export async function sendCampaign({ campaignId, accessToken }: SendCampaignOptions) {
  try {
    // Fetch the campaign with recipients and contacts
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        recipients: {
          include: {
            contact: true,
          },
        },
        template: {
          select: { content: true }
        }
      },
    });

    if (!campaign) {
      throw new Error(`Campaign with ID ${campaignId} not found`);
    }

    console.log(`Campaign content check: ${campaign.id}`, { 
      hasContent: !!campaign.content,
      contentLength: campaign.content?.length || 0,
      hasTemplate: !!campaign.template,
      templateContentLength: campaign.template?.content?.length || 0
    });

    // Update campaign status to sending
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'sending', sentAt: new Date() },
    });

    const baseUrl = getAppBaseUrl();
    const sentRecipients: CampaignRecipient[] = [];
    const failedRecipients: { recipient: CampaignRecipient; error: string }[] = [];

    // Send to each recipient
    for (const recipient of campaign.recipients) {
      try {
        // Skip recipients that have already been sent to
        if (recipient.status === 'sent') {
          sentRecipients.push(recipient);
          continue;
        }

        // Personalize the email
        let personalizedContent = campaign.content;
        
        if (!personalizedContent && campaign.template?.content) {
          // If campaign content is empty, use the template content
          personalizedContent = campaign.template.content;
          console.log(`Using template content for campaign ${campaignId} because campaign content is empty`);
        }

        // If still no content, use a default message
        if (!personalizedContent || personalizedContent.trim() === '') {
          personalizedContent = '<p>This email has no content.</p>';
          console.warn(`Campaign ${campaignId} has no content and no template content`);
        }

        // Parse contact fields for personalization
        let contactFields: any = {};
        if (recipient.contact.fields) {
          try {
            contactFields = typeof recipient.contact.fields === 'string' 
              ? JSON.parse(recipient.contact.fields)
              : recipient.contact.fields;
          } catch (e) {
            console.error("Error parsing contact fields:", e);
          }
        }

        // Extract email parts for basic personalization
        const contactEmail = recipient.contact.email;
        const contactName = contactEmail.split('@')[0]; // Use the part before @ as name

        // Log pre-personalization content for debugging
        console.log(`Pre-personalization content for ${contactEmail}:`, {
          content: personalizedContent.substring(0, 100) + '...',
        });

        // First handle common placeholders (with case-insensitive field matching)
        personalizedContent = personalizedContent
          .replace(/{{name}}/gi, getFieldValue(contactFields, 'name', contactName))
          .replace(/{{firstName}}/gi, getFieldValue(contactFields, 'firstName', 
            getFieldValue(contactFields, 'first name', contactName)))
          .replace(/{{lastName}}/gi, getFieldValue(contactFields, 'lastName', 
            getFieldValue(contactFields, 'last name', '')))
          .replace(/{{email}}/gi, contactEmail)
          .replace(/{{company}}/gi, getFieldValue(contactFields, 'company', 'Your Company'))
          .replace(/{{phone}}/gi, getFieldValue(contactFields, 'phone', ''));
        
        // Now handle all fields from the contact dynamically
        // This will replace any placeholder that matches the field name case-insensitively
        if (contactFields && typeof contactFields === 'object') {
          Object.entries(contactFields).forEach(([key, value]) => {
            if (value && typeof value === 'string') {
              // Create a case-insensitive regex for this field name
              const fieldRegex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
              personalizedContent = personalizedContent.replace(fieldRegex, value);
            }
          });
        }

        // Log personalization for debugging
        console.log(`Personalized email for ${contactEmail}:`, {
          contentPreview: personalizedContent.substring(0, 100) + '...',
          fieldsUsed: JSON.stringify(contactFields)
        });
        
        // Add tracking elements to the email
        const trackedContent = addTrackingToEmail(personalizedContent, recipient, baseUrl);

        // Make sure the final content is not empty
        const finalContent = trackedContent && trackedContent.trim() !== '' 
          ? trackedContent 
          : '<p>This email has no content.</p>';

        // Log final email content being sent
        console.log(`Sending email to ${contactEmail}:`, {
          subject: campaign.subject,
          bodyPreview: finalContent.substring(0, 100) + '...',
        });

        // Send the email
        await sendEmailWithToken({
          to: recipient.contact.email,
          subject: campaign.subject,
          body: finalContent,
          accessToken,
        });

        // Update recipient status
        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: { status: 'sent', sentAt: new Date() },
        });

        sentRecipients.push(recipient);
      } catch (error) {
        console.error(`Failed to send to recipient ${recipient.contact.email}:`, error);
        
        // Update recipient status to failed
        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: { status: 'failed' },
        });

        failedRecipients.push({ 
          recipient, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    // Update campaign status based on results
    const finalStatus = failedRecipients.length === 0 ? 'sent' : 
                        sentRecipients.length === 0 ? 'failed' : 'partially_sent';
    
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: finalStatus },
    });

    return {
      campaign,
      sent: sentRecipients.length,
      failed: failedRecipients.length,
      status: finalStatus,
    };
  } catch (error) {
    console.error('Error sending campaign:', error);
    throw error;
  }
}

/**
 * Resend a specific failed email from a campaign
 */
export async function resendFailedEmail({ campaignId, recipientId, accessToken }: ResendFailedEmailOptions) {
  try {
    // Fetch the campaign with template
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        template: {
          select: { content: true }
        }
      },
    });

    if (!campaign) {
      throw new Error(`Campaign with ID ${campaignId} not found`);
    }

    // Fetch the recipient with contact
    const recipient = await prisma.campaignRecipient.findUnique({
      where: { id: recipientId },
      include: {
        contact: true,
      },
    });

    if (!recipient) {
      throw new Error(`Recipient with ID ${recipientId} not found`);
    }

    // Verify the recipient is in failed status
    if (recipient.status.toLowerCase() !== 'failed') {
      throw new Error(`Cannot resend email that is not in failed status. Current status: ${recipient.status}`);
    }

    // Personalize the email
    let personalizedContent = campaign.content;
    
    if (!personalizedContent && campaign.template?.content) {
      // If campaign content is empty, use the template content
      personalizedContent = campaign.template.content;
      console.log(`Using template content for campaign ${campaignId} because campaign content is empty`);
    }

    // If still no content, use a default message
    if (!personalizedContent || personalizedContent.trim() === '') {
      personalizedContent = '<p>This email has no content.</p>';
      console.warn(`Campaign ${campaignId} has no content and no template content`);
    }

    // Parse contact fields for personalization
    let contactFields: any = {};
    if (recipient.contact.fields) {
      try {
        contactFields = typeof recipient.contact.fields === 'string' 
          ? JSON.parse(recipient.contact.fields)
          : recipient.contact.fields;
      } catch (e) {
        console.error("Error parsing contact fields:", e);
      }
    }

    // Extract email parts for basic personalization
    const contactEmail = recipient.contact.email;
    const contactName = contactEmail.split('@')[0]; // Use the part before @ as name

    // Log pre-personalization content for debugging
    console.log(`[Resend] Pre-personalization content for ${contactEmail}:`, {
      content: personalizedContent.substring(0, 100) + '...',
    });

    // First handle common placeholders (with case-insensitive field matching)
    personalizedContent = personalizedContent
      .replace(/{{name}}/gi, getFieldValue(contactFields, 'name', contactName))
      .replace(/{{firstName}}/gi, getFieldValue(contactFields, 'firstName', 
        getFieldValue(contactFields, 'first name', contactName)))
      .replace(/{{lastName}}/gi, getFieldValue(contactFields, 'lastName', 
        getFieldValue(contactFields, 'last name', '')))
      .replace(/{{email}}/gi, contactEmail)
      .replace(/{{company}}/gi, getFieldValue(contactFields, 'company', 'Your Company'))
      .replace(/{{phone}}/gi, getFieldValue(contactFields, 'phone', ''));
    
    // Now handle all fields from the contact dynamically
    // This will replace any placeholder that matches the field name case-insensitively
    if (contactFields && typeof contactFields === 'object') {
      Object.entries(contactFields).forEach(([key, value]) => {
        if (value && typeof value === 'string') {
          // Create a case-insensitive regex for this field name
          const fieldRegex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
          personalizedContent = personalizedContent.replace(fieldRegex, value);
        }
      });
    }

    // Log personalization for debugging
    console.log(`[Resend] Personalized email for ${contactEmail}:`, {
      contentPreview: personalizedContent.substring(0, 100) + '...',
      fieldsUsed: JSON.stringify(contactFields)
    });
    
    // Add tracking elements to the email
    const baseUrl = getAppBaseUrl();
    const trackedContent = addTrackingToEmail(personalizedContent, recipient, baseUrl);

    // Make sure the final content is not empty
    const finalContent = trackedContent && trackedContent.trim() !== '' 
      ? trackedContent 
      : '<p>This email has no content.</p>';

    // Log final email content being sent
    console.log(`[Resend] Sending email to ${contactEmail}:`, {
      subject: campaign.subject,
      bodyPreview: finalContent.substring(0, 100) + '...',
    });

    // Send the email
    await sendEmailWithToken({
      to: recipient.contact.email,
      subject: campaign.subject,
      body: finalContent,
      accessToken,
    });

    // Update recipient status
    await prisma.campaignRecipient.update({
      where: { id: recipient.id },
      data: { status: 'sent', sentAt: new Date() },
    });

    return {
      success: true,
      message: `Successfully resent email to ${recipient.contact.email}`,
      recipient: {
        id: recipient.id,
        email: recipient.contact.email,
        status: 'sent'
      }
    };
  } catch (error) {
    console.error('Error resending email:', error);
    throw error;
  }
} 