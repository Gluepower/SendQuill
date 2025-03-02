import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/firebase/auth-server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET - Retrieve a specific template
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    console.log(`GET request for template ID: ${params.id}`);
    
    if (!params.id) {
      console.log('Invalid template ID: empty or undefined');
      return new NextResponse(JSON.stringify({ error: 'Invalid template ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const firebaseUser = await getCurrentUser(req);
    
    // Check if user is authenticated
    if (!firebaseUser || !firebaseUser.email) {
      console.log('Unauthorized: No valid user found in request');
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { id } = params;
    console.log(`Authenticated user: ${firebaseUser.email}, looking for template: ${id}`);

    // Get the template
    const template = await prisma.template.findUnique({
      where: {
        id,
      },
    });

    if (!template) {
      console.log(`Template not found with ID: ${id}`);
      return new NextResponse(JSON.stringify({ error: 'Template not found' }), {
        status: 404,
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
      console.log(`Created user with ID: ${user.id}`);
    }

    // Check if the user has permission to view this template
    if (template.userId !== user.id) {
      console.log(`Unauthorized: User ${user.id} trying to access template owned by ${template.userId}`);
      return new NextResponse(JSON.stringify({ error: 'You do not have permission to view this template' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`Successfully retrieved template: ${template.name}`);
    return new NextResponse(JSON.stringify(template), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    return new NextResponse(JSON.stringify({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// PUT - Update a specific template
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const firebaseUser = await getCurrentUser(req);
    
    // Check if user is authenticated
    if (!firebaseUser || !firebaseUser.email) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { id } = params;
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

    // Get the template
    const template = await prisma.template.findUnique({
      where: {
        id,
      },
    });

    if (!template) {
      return new NextResponse(JSON.stringify({ error: 'Template not found' }), {
        status: 404,
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
      // Create user if not exists
      user = await prisma.user.create({
        data: {
          email: firebaseUser.email,
          name: firebaseUser.name || firebaseUser.email.split('@')[0],
        },
      });
    }

    // Check if the user has permission to update this template
    if (template.userId !== user.id) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update the template
    const updatedTemplate = await prisma.template.update({
      where: {
        id,
      },
      data: {
        name,
        description: description || null,
        content,
      },
    });

    return new NextResponse(JSON.stringify(updatedTemplate), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating template:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// DELETE - Delete a specific template
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const firebaseUser = await getCurrentUser(req);
    
    // Check if user is authenticated
    if (!firebaseUser || !firebaseUser.email) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { id } = params;

    // Get the template
    const template = await prisma.template.findUnique({
      where: {
        id,
      },
    });

    if (!template) {
      return new NextResponse(JSON.stringify({ error: 'Template not found' }), {
        status: 404,
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
      // Create user if not exists
      user = await prisma.user.create({
        data: {
          email: firebaseUser.email,
          name: firebaseUser.name || firebaseUser.email.split('@')[0],
        },
      });
    }

    // Check if the user has permission to delete this template
    if (template.userId !== user.id) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if the template is used in any campaigns
    const campaignsUsingTemplate = await prisma.campaign.findMany({
      where: {
        templateId: id,
      },
    });

    if (campaignsUsingTemplate.length > 0) {
      return new NextResponse(JSON.stringify({ 
        error: 'Cannot delete template that is used in campaigns',
        campaigns: campaignsUsingTemplate.map(c => ({ id: c.id, name: c.name }))
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete the template
    await prisma.template.delete({
      where: {
        id,
      },
    });

    return new NextResponse(null, {
      status: 204,
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 