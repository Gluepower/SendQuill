import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getCurrentUser } from '@/lib/firebase/auth-server';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const firebaseUser = await getCurrentUser(req);

    // Check if user is authenticated
    if (!firebaseUser || !firebaseUser.email) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get all contact lists for the authenticated user
    const contactLists = await prisma.contactList.findMany({
      where: {
        user: {
          email: firebaseUser.email,
        },
      },
      include: {
        _count: {
          select: {
            contacts: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Format the response
    const formattedLists = contactLists.map((list) => ({
      id: list.id,
      name: list.name,
      description: list.description,
      contactCount: list._count.contacts,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
    }));

    return new NextResponse(JSON.stringify(formattedLists), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching contact lists:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const firebaseUser = await getCurrentUser(req);

    // Check if user is authenticated
    if (!firebaseUser || !firebaseUser.email) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body = await req.json();
    const { name, description } = body;

    // Validate input
    if (!name || name.trim() === '') {
      return new NextResponse(JSON.stringify({ error: 'Name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Find user id by email
    const user = await prisma.user.findUnique({
      where: {
        email: firebaseUser.email,
      },
    });

    if (!user) {
      // Create user if they don't exist yet
      const newUser = await prisma.user.create({
        data: {
          email: firebaseUser.email,
          name: firebaseUser.name || firebaseUser.email.split('@')[0],
          image: firebaseUser.picture || null,
        },
      });
      
      // Create new contact list for new user
      const newContactList = await prisma.contactList.create({
        data: {
          name,
          description: description || null,
          user: {
            connect: {
              id: newUser.id,
            },
          },
        },
      });

      return new NextResponse(JSON.stringify(newContactList), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create new contact list for existing user
    const newContactList = await prisma.contactList.create({
      data: {
        name,
        description: description || null,
        user: {
          connect: {
            id: user.id,
          },
        },
      },
    });

    return new NextResponse(JSON.stringify(newContactList), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating contact list:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 