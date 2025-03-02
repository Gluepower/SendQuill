import { auth } from '@/lib/firebase/firebase';
import Cookies from 'js-cookie';

interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
}

/**
 * Send an email using the Gmail API with Firebase authentication (client-side)
 */
export async function sendEmailWithFirebaseGmail(options: EmailOptions) {
  try {
    // Get the current user
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get the ID token
    const idToken = await user.getIdToken();

    // Get the Gmail token from cookies
    const accessToken = Cookies.get('gmail-token');
    if (!accessToken) {
      throw new Error('No Gmail access token available. User must be authenticated with Gmail scope.');
    }

    // Call the API endpoint to send the email
    const response = await fetch('/api/gmail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        ...options,
        accessToken
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send email');
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

/**
 * Example usage:
 * 
 * ```
 * import { sendEmailWithFirebaseGmail } from '@/lib/gmail/clientGmailApi';
 * 
 * // In a component or function
 * async function sendEmail() {
 *   try {
 *     const result = await sendEmailWithFirebaseGmail({
 *       to: 'recipient@example.com',
 *       subject: 'Test Email',
 *       body: '<p>Hello, this is a test email!</p>'
 *     });
 *     console.log('Email sent successfully:', result);
 *   } catch (error) {
 *     console.error('Failed to send email:', error);
 *   }
 * }
 * ```
 */ 