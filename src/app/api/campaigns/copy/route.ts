import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/firebase/auth-server';

// Define types for our recipients
interface Contact {
  id: string;
  email: string;
  fields: any;
}

interface Recipient {
  id: string;
  contact: {
    email: string;
    fields: any;
  };
  status: string;
  events: any[];
}

// Define the CampaignRecipient type
interface CampaignRecipient {
  id: string;
  campaignId: string;
  contactId: string;
  status: string;
  sentAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  contact: {
    email: string;
    fields: any;
  };
}

// POST - Copy an existing campaign
export async function POST(req: NextRequest) {
  try {
    console.log('POST request to copy a campaign');
    const user = await getCurrentUser(req);

    // Check if user is authenticated
    if (!user || !user.email) {
      console.log('Unauthorized: No authenticated user found');
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`Authenticated user: ${user.email}`);

    // Parse request body
    const body = await req.json();
    const { campaignId } = body;

    if (!campaignId) {
      return new NextResponse(JSON.stringify({ error: 'Campaign ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Find user id by email
    const dbUser = await prisma.user.findUnique({
      where: {
        email: user.email,
      },
    });

    if (!dbUser) {
      return new NextResponse(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Find the original campaign with contact lists and template
    const originalCampaign = await prisma.campaign.findUnique({
      where: {
        id: campaignId,
      },
      include: {
        contactLists: {
          include: {
            _count: {
              select: {
                contacts: true
              }
            }
          }
        },
        template: true
      }
    });

    if (!originalCampaign) {
      return new NextResponse(JSON.stringify({ error: 'Campaign not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify campaign belongs to user
    if (originalCampaign.userId !== dbUser.id) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized access to campaign' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create a copy of the campaign
    const copiedCampaign = await prisma.campaign.create({
      data: {
        name: `Copy of ${originalCampaign.name}`,
        status: 'DRAFT', // Always set to DRAFT regardless of original status
        subject: originalCampaign.subject,
        content: originalCampaign.content,
        userId: dbUser.id,
        templateId: originalCampaign.templateId,
        // Connect to the same contact lists as the original
        contactLists: {
          connect: originalCampaign.contactLists.map(list => ({ id: list.id }))
        }
      },
      include: {
        contactLists: {
          include: {
            _count: {
              select: {
                contacts: true
              }
            }
          }
        },
        template: {
          select: {
            id: true,
            name: true,
            content: true,
            description: true
          }
        }
      }
    });

    // Get contacts for each contact list
    let contacts: Contact[] = [];
    let campaignRecipients: CampaignRecipient[] = [];
    
    if (copiedCampaign.contactLists.length > 0) {
      const contactList = copiedCampaign.contactLists[0];
      contacts = await prisma.contact.findMany({
        where: { 
          contactListId: contactList.id 
        },
        select: {
          id: true,
          email: true,
          fields: true
        }
      });
      
      // Create real campaign recipients in the database instead of just placeholders
      if (contacts.length > 0) {
        // Create recipients in database
        const newRecipients = await prisma.campaignRecipient.createMany({
          data: contacts.map(contact => ({
            campaignId: copiedCampaign.id,
            contactId: contact.id,
            status: 'pending'
          })),
        });
        
        console.log(`Created ${newRecipients.count} recipient records for the copied campaign`);
        
        // Fetch the created recipients with contact details for the response
        campaignRecipients = await prisma.campaignRecipient.findMany({
          where: {
            campaignId: copiedCampaign.id
          },
          include: {
            contact: {
              select: {
                email: true,
                fields: true
              }
            }
          }
        });
      }
    }

    // Construct a campaign object that matches what the UI expects
    const formattedCampaign = {
      ...copiedCampaign,
      // Ensure contactList is set for backward compatibility
      contactList: copiedCampaign.contactLists[0] || null,
      // Add recipients with proper structure for the UI
      recipients: campaignRecipients,
      // Ensure template has all required fields
      template: copiedCampaign.template
    };

    // Return the newly created campaign with more complete data
    return new NextResponse(JSON.stringify(formattedCampaign), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error copying campaign:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 