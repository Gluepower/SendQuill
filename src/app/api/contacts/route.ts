import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/firebase/auth-server';

// POST - Create a new contact
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { listId, email, fields } = body;

    // Validate inputs
    if (!listId) {
      return NextResponse.json({ error: 'Contact list ID is required' }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
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

    // Check if the user has access to the list
    const contactList = await prisma.contactList.findUnique({
      where: {
        id: listId,
      },
      include: {
        user: true,
      },
    });

    if (!contactList) {
      return NextResponse.json({ error: 'Contact list not found' }, { status: 404 });
    }

    if (contactList.user.id !== dbUser.id) {
      return NextResponse.json({ error: 'Not authorized to access this list' }, { status: 403 });
    }

    // Check if the contact already exists in this list
    const existingContact = await prisma.contact.findFirst({
      where: {
        contactListId: listId,
        email: email,
      },
    });

    if (existingContact) {
      return NextResponse.json(
        { error: 'A contact with this email already exists in this list' },
        { status: 400 }
      );
    }

    // Create the contact
    const contact = await prisma.contact.create({
      data: {
        email,
        fields: fields || {},
        contactList: {
          connect: {
            id: listId,
          },
        },
      },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error('Error creating contact:', error);
    return NextResponse.json(
      { error: 'An error occurred while creating the contact' },
      { status: 500 }
    );
  }
}

// GET - List all contacts
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
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

    // Get query parameters
    const url = new URL(request.url);
    const listId = url.searchParams.get('listId');
    const search = url.searchParams.get('search');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Filter by list if provided
    if (listId) {
      // Verify the user has access to this list
      const contactList = await prisma.contactList.findUnique({
        where: {
          id: listId,
        },
        include: {
          user: true,
        },
      });

      if (!contactList) {
        return NextResponse.json({ error: 'Contact list not found' }, { status: 404 });
      }

      if (contactList.user.id !== dbUser.id) {
        return NextResponse.json({ error: 'Not authorized to access this list' }, { status: 403 });
      }

      where.contactListId = listId;
    } else {
      // If no list specified, only show contacts from lists owned by the user
      where.contactList = {
        userId: dbUser.id,
      };
    }

    // Get contacts for the list
    const contacts = await prisma.contact.findMany({
      where: where,
      orderBy: {
        updatedAt: 'desc',
      },
      skip: skip,
      take: limit,
    });

    return NextResponse.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching contacts' },
      { status: 500 }
    );
  }
} 