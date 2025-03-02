import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/firebase/auth-server';

// GET - List all campaigns for the authenticated user
export async function GET(req: NextRequest) {
  try {
    console.log('GET request for all campaigns');
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

    // Get query parameters for filtering
    const url = new URL(req.url);
    const status = url.searchParams.get('status');

    // Find or create user in database
    let dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (!dbUser) {
      console.log(`Creating new user for ${user.email}`);
      dbUser = await prisma.user.create({
        data: {
          email: user.email,
          name: user.name || user.email.split('@')[0],
        },
      });
    }

    // Prepare filter
    const filter: any = {
      userId: dbUser.id,
    };

    // Add status filter if provided
    if (status) {
      filter.status = status;
    }

    // Get all campaigns for the authenticated user
    const campaigns = await prisma.campaign.findMany({
      where: filter,
      include: {
        template: {
          select: {
            id: true,
            name: true,
          },
        },
        contactLists: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    console.log(`Retrieved ${campaigns.length} campaigns for user ${dbUser.id}`);
    return new NextResponse(JSON.stringify(campaigns), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// POST - Create a new campaign
export async function POST(req: NextRequest) {
  try {
    console.log('POST request to create a new campaign');
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
    const { name, description, templateId, contactListId, scheduledFor, subject, content, status } = body;

    // Validate input
    if (!name || name.trim() === '') {
      return new NextResponse(JSON.stringify({ error: 'Name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!templateId) {
      return new NextResponse(JSON.stringify({ error: 'Template is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!contactListId) {
      return new NextResponse(JSON.stringify({ error: 'Contact list is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!subject || subject.trim() === '') {
      return new NextResponse(JSON.stringify({ error: 'Email subject is required' }), {
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

    // Verify template exists and belongs to user
    const template = await prisma.template.findUnique({
      where: {
        id: templateId,
      },
    });

    if (!template) {
      return new NextResponse(JSON.stringify({ error: 'Template not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (template.userId !== dbUser.id) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized access to template' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify contact list exists and belongs to user
    const contactList = await prisma.contactList.findUnique({
      where: {
        id: contactListId,
      },
    });

    if (!contactList) {
      return new NextResponse(JSON.stringify({ error: 'Contact list not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (contactList.userId !== dbUser.id) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized access to contact list' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse scheduledFor date
    let scheduledDate = null;
    if (scheduledFor) {
      scheduledDate = new Date(scheduledFor);
      if (isNaN(scheduledDate.getTime())) {
        return new NextResponse(JSON.stringify({ error: 'Invalid date format for scheduledFor' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Determine campaign status
    const campaignStatus = status || (scheduledDate ? 'SCHEDULED' : 'DRAFT');
    
    // If sending now, set sentAt to current time
    const sentAt = campaignStatus === 'SENDING' ? new Date() : null;

    // Create campaign, mapping scheduledFor to scheduledAt
    const campaign = await prisma.campaign.create({
      data: {
        name,
        subject,
        content,
        status: campaignStatus,
        scheduledAt: scheduledDate,
        sentAt,
        userId: dbUser.id,
        templateId,
        contactLists: {
          connect: {
            id: contactListId
          }
        }
      },
      include: {
        template: true,
        contactLists: {
          include: {
            _count: {
              select: {
                contacts: true
              }
            }
          }
        }
      }
    });

    // If sending immediately, create campaign recipients
    if (campaignStatus === 'SENDING') {
      // Get contacts from the contact list
      const contacts = await prisma.contact.findMany({
        where: {
          contactListId: contactListId,
        },
      });

      // Create campaign recipients
      if (contacts.length > 0) {
        await prisma.campaignRecipient.createMany({
          data: contacts.map(contact => ({
            campaignId: campaign.id,
            contactId: contact.id,
            status: 'pending'
          })),
        });
      }
    }

    return new NextResponse(JSON.stringify(campaign), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 