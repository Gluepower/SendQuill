import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/firebase/auth-server';

interface RouteParams {
  params: {
    id: string;
  };
}

// Get specific contact list
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

    // Get the contact list with contact count
    const contactList = await prisma.contactList.findUnique({
      where: {
        id,
      },
      include: {
        _count: {
          select: {
            contacts: true,
          },
        },
        contacts: {
          orderBy: {
            updatedAt: 'desc',
          },
        },
      },
    });

    if (!contactList) {
      return new NextResponse(JSON.stringify({ error: 'Contact list not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if the user owns this contact list
    const contactListWithUser = await prisma.contactList.findUnique({
      where: {
        id,
      },
      include: {
        user: true,
      },
    });

    if (!contactListWithUser || contactListWithUser.user.id !== dbUser.id) {
      return new NextResponse(JSON.stringify({ error: 'Not authorized to access this contact list' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new NextResponse(JSON.stringify(contactList), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error retrieving contact list:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to retrieve contact list' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Update a contact list
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
    const body = await req.json();
    
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

    // Check if the contact list exists
    const contactList = await prisma.contactList.findUnique({
      where: {
        id,
      },
      include: {
        user: true,
      },
    });

    if (!contactList) {
      return new NextResponse(JSON.stringify({ error: 'Contact list not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if the user owns this contact list
    if (contactList.user.id !== dbUser.id) {
      return new NextResponse(JSON.stringify({ error: 'Not authorized to update this contact list' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update the contact list
    const updatedContactList = await prisma.contactList.update({
      where: {
        id,
      },
      data: {
        name: body.name,
        description: body.description,
      },
    });

    return new NextResponse(JSON.stringify(updatedContactList), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating contact list:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to update contact list' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Delete a contact list
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

    // Check if the contact list exists
    const contactList = await prisma.contactList.findUnique({
      where: {
        id,
      },
      include: {
        user: true,
      },
    });

    if (!contactList) {
      return new NextResponse(JSON.stringify({ error: 'Contact list not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if the user owns this contact list
    if (contactList.user.id !== dbUser.id) {
      return new NextResponse(JSON.stringify({ error: 'Not authorized to delete this contact list' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete the contact list
    await prisma.contactList.delete({
      where: {
        id,
      },
    });

    return new NextResponse(JSON.stringify({ message: 'Contact list deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting contact list:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to delete contact list' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 