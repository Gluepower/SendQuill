import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/firebase/auth-server';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET - Retrieve a specific campaign
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser(req);
    
    // Check if user is authenticated
    if (!user || !user.email) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { id } = params;

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

    // Get the campaign
    const campaign = await prisma.campaign.findUnique({
      where: {
        id,
      },
      include: {
        template: true, // Include the full template
        contactLists: {
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                contacts: true,
              },
            },
          },
        },
        recipients: {
          include: {
            contact: {
              select: {
                email: true,
                fields: true
              }
            }
          }
        }
      },
    });

    if (!campaign) {
      return new NextResponse(JSON.stringify({ error: 'Campaign not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if the user owns this campaign
    if (campaign.userId !== dbUser.id) {
      return new NextResponse(JSON.stringify({ error: 'Not authorized to access this campaign' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Transform the campaign object to include contactList for frontend compatibility
    // Use type assertion to tell TypeScript that campaign has contactLists property
    const campaignWithContactList = {
      ...campaign,
      contactList: campaign.contactLists.length > 0 ? campaign.contactLists[0] : null,
    };

    return new NextResponse(JSON.stringify(campaignWithContactList), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error retrieving campaign:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to retrieve campaign' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// PUT - Update a campaign
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser(req);
    
    // Check if user is authenticated
    if (!user || !user.email) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { id } = params;
    
    // Parse request body
    const body = await req.json();
    const { status, scheduledFor, content, contactListId } = body;
    
    // Map scheduledFor to scheduledAt in the update data
    if (scheduledFor !== undefined) {
      body.scheduledAt = scheduledFor;
      delete body.scheduledFor;
    }

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

    // Check if the campaign exists
    const existingCampaign = await prisma.campaign.findUnique({
      where: {
        id,
      },
      include: {
        contactLists: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!existingCampaign) {
      return new NextResponse(JSON.stringify({ error: 'Campaign not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if the user owns this campaign
    if (existingCampaign.userId !== dbUser.id) {
      return new NextResponse(JSON.stringify({ error: 'Not authorized to update this campaign' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // If sending now, set sentAt to current time
    let updateData = { ...body };
    if (status === 'SENDING' && existingCampaign.status !== 'SENDING' && existingCampaign.status !== 'SENT') {
      updateData.sentAt = new Date();
    }

    // Update the campaign
    const updatedCampaign = await prisma.campaign.update({
      where: {
        id,
      },
      data: updateData,
    });

    // If sending immediately, create campaign recipients
    if (status === 'SENDING' && existingCampaign.status !== 'SENDING' && existingCampaign.status !== 'SENT') {
      // Get contacts from the contact list
      const listId = contactListId || existingCampaign.contactLists[0]?.id;
      
      if (listId) {
        const contacts = await prisma.contact.findMany({
          where: {
            contactListId: listId,
          },
        });

        // Create campaign recipients
        if (contacts.length > 0) {
          await prisma.campaignRecipient.createMany({
            data: contacts.map(contact => ({
              campaignId: updatedCampaign.id,
              contactId: contact.id,
              status: 'pending'
            })),
            skipDuplicates: true,
          });
        }
      }
    }

    return new NextResponse(JSON.stringify(updatedCampaign), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating campaign:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to update campaign' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// DELETE - Delete a campaign
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser(req);
    
    // Check if user is authenticated
    if (!user || !user.email) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { id } = params;
    
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

    // Check if the campaign exists
    const existingCampaign = await prisma.campaign.findUnique({
      where: {
        id,
      },
    });

    if (!existingCampaign) {
      return new NextResponse(JSON.stringify({ error: 'Campaign not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if the user owns this campaign
    if (existingCampaign.userId !== dbUser.id) {
      return new NextResponse(JSON.stringify({ error: 'Not authorized to delete this campaign' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete the campaign
    await prisma.campaign.delete({
      where: {
        id,
      },
    });

    return new NextResponse(JSON.stringify({ message: 'Campaign deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to delete campaign' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 