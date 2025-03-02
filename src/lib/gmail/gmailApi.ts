import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
}

export async function refreshAccessToken(refreshToken: string) {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    
    return {
      accessToken: credentials.access_token,
      expiresAt: Date.now() + (credentials.expiry_date || 3600 * 1000),
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw error;
  }
}

export async function sendEmailWithGmail({ to, subject, body, cc, bcc }: EmailOptions) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken || !session?.refreshToken) {
      throw new Error('No access token available. User must be authenticated with Gmail scope.');
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL
    );

    oauth2Client.setCredentials({
      access_token: session.accessToken,
      refresh_token: session.refreshToken
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Create the email content
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const messageParts = [
      `To: ${to}`,
      cc ? `Cc: ${cc}` : '',
      bcc ? `Bcc: ${bcc}` : '',
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${utf8Subject}`,
      '',
      body,
    ].filter(Boolean);  // Remove empty strings
    
    const message = messageParts.join('\n');

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
    console.error('Error sending email:', error);
    throw error;
  }
} 