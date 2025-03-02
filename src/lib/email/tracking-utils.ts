import { CampaignRecipient } from '@prisma/client';

/**
 * Adds tracking elements to email content
 * @param content Original email HTML content
 * @param recipient Campaign recipient data
 * @param baseUrl Base URL of the application (for tracking links)
 * @returns Modified email HTML with tracking elements
 */
export function addTrackingToEmail(
  content: string,
  recipient: CampaignRecipient,
  baseUrl: string
): string {
  // Add tracking pixel for open tracking
  const trackingPixel = createTrackingPixel(recipient.id, baseUrl);
  let modifiedContent = `${content}\n${trackingPixel}`;
  
  // Convert links to tracked links
  modifiedContent = addTrackedLinks(modifiedContent, recipient.id, baseUrl);
  
  return modifiedContent;
}

/**
 * Creates a tracking pixel image tag
 */
function createTrackingPixel(recipientId: string, baseUrl: string): string {
  const trackingUrl = `${baseUrl}/api/tracking/open?rid=${recipientId}`;
  return `<img src="${trackingUrl}" alt="" width="1" height="1" border="0" style="height:1px !important;width:1px !important;border-width:0 !important;margin:0 !important;padding:0 !important;" />`;
}

/**
 * Converts regular links to tracked links
 */
function addTrackedLinks(content: string, recipientId: string, baseUrl: string): string {
  // Simple regex to find href attributes in anchor tags
  // Note: This is a basic implementation. A more robust solution might use a proper HTML parser
  const linkRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']*)["'][^>]*>/gi;
  
  return content.replace(linkRegex, (match, url) => {
    // Skip tracking for anchor links, mailto links, tel links, etc.
    if (url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('sms:')) {
      return match;
    }
    
    // Encode the original URL
    const encodedUrl = encodeURIComponent(url);
    const trackingUrl = `${baseUrl}/api/tracking/click?rid=${recipientId}&url=${encodedUrl}`;
    
    // Replace the original URL with the tracking URL
    return match.replace(url, trackingUrl);
  });
}

/**
 * Generate the full application URL including protocol
 */
export function getAppBaseUrl(): string {
  // In production, use the actual domain
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  // In development, use localhost with configured port
  const devUrl = process.env.NEXT_PUBLIC_DEV_URL || 'http://localhost:3000';
  return process.env.NODE_ENV === 'production' 
    ? process.env.NEXT_PUBLIC_APP_URL || devUrl
    : devUrl;
} 