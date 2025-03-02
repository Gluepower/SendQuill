import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/firebase/auth-server';
import { prisma } from '@/lib/prisma';

// GET - List all templates
export async function GET(req: NextRequest) {
  try {
    console.log('GET request for all templates');
    const firebaseUser = await getCurrentUser(req);
    
    // Check if user is authenticated
    if (!firebaseUser || !firebaseUser.email) {
      console.log('Unauthorized: No valid user found in request');
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get or create the user record
    let user = await prisma.user.findUnique({
      where: {
        email: firebaseUser.email,
      },
    });

    if (!user) {
      console.log(`Creating new user with email: ${firebaseUser.email}`);
      // Create user if not exists
      user = await prisma.user.create({
        data: {
          email: firebaseUser.email,
          name: firebaseUser.name || firebaseUser.email.split('@')[0],
        },
      });
    }

    // Get templates for this user
    const templates = await prisma.template.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    console.log(`Retrieved ${templates.length} templates for user ${user.id}`);
    return new NextResponse(JSON.stringify(templates), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error listing templates:', error);
    return new NextResponse(JSON.stringify({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// POST - Create a new template
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
    const { name, description, content } = body;

    // Validate input
    if (!name || name.trim() === '') {
      return new NextResponse(JSON.stringify({ error: 'Name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!content) {
      return new NextResponse(JSON.stringify({ error: 'Content is required' }), {
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
      
      // Create new template for new user
      const newTemplate = await prisma.template.create({
        data: {
          name,
          description: description || null,
          content,
          user: {
            connect: {
              id: newUser.id,
            },
          },
        },
      });

      return new NextResponse(JSON.stringify(newTemplate), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create new template for existing user
    const newTemplate = await prisma.template.create({
      data: {
        name,
        description: description || null,
        content,
        user: {
          connect: {
            id: user.id,
          },
        },
      },
    });

    return new NextResponse(JSON.stringify(newTemplate), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating template:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 