import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { getAuth } from 'firebase-admin/auth';
import { getFirebaseAdmin } from '@/lib/firebase/firebaseAdmin';

// Initialize Firebase Admin
getFirebaseAdmin();

const prisma = new PrismaClient();

// Helper function to verify Firebase token
async function verifyFirebaseToken(request: NextRequest) {
  try {
    // Get the token from cookies
    const firebaseToken = cookies().get('firebase-token')?.value;
    
    if (!firebaseToken) {
      return null;
    }
    
    // Verify the token
    const decodedToken = await getAuth().verifyIdToken(firebaseToken);
    return decodedToken.email;
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    return null;
  }
}

// GET - Get a specific contact
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const userEmail = await verifyFirebaseToken(request);
    
    if (!userEmail) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Find the contact
    const contact = await prisma.contact.findUnique({
      where: {
        id,
      },
      include: {
        contactList: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Check if the user has access to this contact
    if (contact.contactList.user.email !== userEmail) {
      return NextResponse.json({ error: 'Not authorized to access this contact' }, { status: 403 });
    }

    return NextResponse.json(contact);
  } catch (error) {
    console.error('Error fetching contact:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching the contact' },
      { status: 500 }
    );
  }
}

// PUT - Update a contact
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const userEmail = await verifyFirebaseToken(request);
    
    if (!userEmail) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { email, fields } = body;

    // Validate inputs
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Find the contact
    const contact = await prisma.contact.findUnique({
      where: {
        id,
      },
      include: {
        contactList: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Check if the user has access to this contact
    if (contact.contactList.user.email !== userEmail) {
      return NextResponse.json({ error: 'Not authorized to update this contact' }, { status: 403 });
    }

    // Check if updating to an email that already exists in this list (other than this contact)
    if (email !== contact.email) {
      const existingContact = await prisma.contact.findFirst({
        where: {
          contactListId: contact.contactListId,
          email,
          id: {
            not: id,
          },
        },
      });

      if (existingContact) {
        return NextResponse.json(
          { error: 'A contact with this email already exists in this list' },
          { status: 400 }
        );
      }
    }

    // Update the contact
    const updatedContact = await prisma.contact.update({
      where: {
        id,
      },
      data: {
        email,
        fields: fields || {},
      },
    });

    return NextResponse.json(updatedContact);
  } catch (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json(
      { error: 'An error occurred while updating the contact' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a contact
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const userEmail = await verifyFirebaseToken(request);
    
    if (!userEmail) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Find the contact
    const contact = await prisma.contact.findUnique({
      where: {
        id,
      },
      include: {
        contactList: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Check if the user has access to this contact
    if (contact.contactList.user.email !== userEmail) {
      return NextResponse.json({ error: 'Not authorized to delete this contact' }, { status: 403 });
    }

    // Delete the contact
    await prisma.contact.delete({
      where: {
        id,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json(
      { error: 'An error occurred while deleting the contact' },
      { status: 500 }
    );
  }
} 