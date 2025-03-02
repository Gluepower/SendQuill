import { google } from 'googleapis';
import Cookies from 'js-cookie';

interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
}

/**
 * Send an email using the Gmail API with Firebase authentication
 */
export async function sendEmailWithFirebaseGmail({ to, subject, body, cc, bcc }: EmailOptions) {
  try {
    // Get the Gmail token from cookies (set during Firebase authentication)
    const accessToken = Cookies.get('gmail-token');
    
    if (!accessToken) {
      throw new Error('No Gmail access token available. User must be authenticated with Gmail scope.');
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    // Set credentials using the token
    oauth2Client.setCredentials({
      access_token: accessToken
    });

    // Create Gmail client
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Create the email content with proper MIME formatting
    const messageParts = [
      `From: me`,
      `To: ${to}`,
      cc ? `Cc: ${cc}` : '',
      bcc ? `Bcc: ${bcc}` : '',
      'MIME-Version: 1.0',
      'Content-Type: multipart/alternative; boundary="boundary_text"',
      `Subject: ${subject}`,
      '',
      '',  // Empty line is important to separate headers from body
      '--boundary_text',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      // Plain text version (fallback) - convert to base64
      Buffer.from('This is an HTML email. Please use an HTML-compatible email client to view it properly.').toString('base64'),
      '',
      '--boundary_text',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      // HTML version - convert to base64
      Buffer.from(body).toString('base64'),
      '',
      '--boundary_text--'
    ].filter(Boolean);  // Remove empty strings
    
    const message = messageParts.join('\r\n');  // Use CRLF for proper MIME formatting

    // The body needs to be base64url encoded
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send the email
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    return {
      success: true,
      messageId: res.data.id,
      threadId: res.data.threadId,
    };
  } catch (error) {
    console.error('Error sending email with Firebase Gmail:', error);
    throw error;
  }
}

/**
 * Server-side function to send an email using the Gmail API with a provided token
 */
export async function sendEmailWithToken({ to, subject, body, cc, bcc, accessToken }: EmailOptions & { accessToken: string }) {
  try {
    if (!accessToken) {
      throw new Error('No access token provided');
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    // Set credentials using the token
    oauth2Client.setCredentials({
      access_token: accessToken
    });

    // Create Gmail client
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Create a random boundary string
    const boundary = `----=_NextPart_${Math.random().toString(36).substring(2)}_${Date.now().toString(36)}`;

    // Create the email content with proper MIME formatting
    const messageParts = [
      `From: me`,
      `To: ${to}`,
      cc ? `Cc: ${cc}` : '',
      bcc ? `Bcc: ${bcc}` : '',
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      `Subject: ${subject}`,
      '',
      '', // Extra blank line for header separation - important!
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      // Plain text version (fallback)
      body.replace(/<[^>]*>/g, '').replace(/\n/g, '\r\n'),
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      // HTML version
      body,
      '',
      `--${boundary}--`,
      '' // Final newline
    ].filter(Boolean);  // Remove empty strings
    
    const message = messageParts.join('\r\n');  // Use CRLF for proper MIME formatting

    // The body needs to be base64url encoded (without chunking)
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send the email
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    return {
      success: true,
      messageId: res.data.id,
      threadId: res.data.threadId,
    };
  } catch (error) {
    console.error('Error sending email with token:', error);
    throw error;
  }
} 