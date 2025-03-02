import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST - Bulk delete contacts
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { contactIds } = body;

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json(
        { error: 'Contact IDs array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Get all contacts to check ownership
    const contacts = await prisma.contact.findMany({
      where: {
        id: {
          in: contactIds,
        },
      },
      include: {
        contactList: {
          include: {
            user: true,
          },
        },
      },
    });

    // Check if all contacts belong to the user
    const unauthorized = contacts.some(
      (contact) => contact.contactList.user.email !== session.user!.email
    );

    if (unauthorized) {
      return NextResponse.json(
        { error: 'Not authorized to delete one or more of these contacts' },
        { status: 403 }
      );
    }

    // Delete the contacts
    await prisma.contact.deleteMany({
      where: {
        id: {
          in: contactIds,
        },
      },
    });

    return NextResponse.json({ success: true, deletedCount: contactIds.length });
  } catch (error) {
    console.error('Error bulk deleting contacts:', error);
    return NextResponse.json(
      { error: 'An error occurred while deleting contacts' },
      { status: 500 }
    );
  }
} 