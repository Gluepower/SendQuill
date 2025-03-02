import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Simplified POST handler that actually creates contacts
export async function POST(request: NextRequest) {
  console.log("======== BULK IMPORT REQUEST RECEIVED ========");
  
  try {
    // Log request details
    console.log("Request URL:", request.url);
    console.log("Request method:", request.method);
    
    // Parse the request body
    const body = await request.json();
    console.log("Request body:", JSON.stringify(body).substring(0, 200) + "...");
    
    const { listId, contacts } = body;
    console.log(`Received request to import contacts to list: ${listId}`);
    
    // Validate input
    if (!listId) {
      return NextResponse.json(
        { error: "Contact list ID is required" },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      );
    }
    
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json(
        { error: "No valid contacts provided" },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      );
    }
    
    // Verify that the contact list exists
    const contactList = await prisma.contactList.findFirst({
      where: {
        id: listId,
      },
    });
    
    console.log("Contact list found:", !!contactList);
    
    if (!contactList) {
      return NextResponse.json(
        { error: "Contact list not found" },
        { 
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      );
    }
    
    // Process contacts
    const validContacts = [];
    const invalidContacts = [];
    
    for (const contact of contacts) {
      if (!contact.email || typeof contact.email !== 'string' || !contact.email.includes('@')) {
        invalidContacts.push(contact);
        continue;
      }
      
      // Extract fields other than email
      const { email, ...fields } = contact;
      validContacts.push({ email, fields });
    }
    
    // If no valid contacts, return error
    if (validContacts.length === 0) {
      return NextResponse.json(
        { error: "No valid contacts found in the provided data" },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      );
    }
    
    console.log(`Creating ${validContacts.length} contacts for list ${listId}`);
    
    // Create contacts in batches to avoid overloading the database
    const batchSize = 50;
    const results = [];
    
    try {
      for (let i = 0; i < validContacts.length; i += batchSize) {
        const batch = validContacts.slice(i, i + batchSize);
        
        // Create contacts in database
        const createdContacts = await Promise.all(
          batch.map(async (contact) => {
            try {
              return await prisma.contact.create({
                data: {
                  email: contact.email,
                  fields: contact.fields,
                  contactListId: listId,
                },
              });
            } catch (error) {
              console.error(`Error creating contact ${contact.email}:`, error);
              return null;
            }
          })
        );
        
        results.push(...createdContacts.filter(c => c !== null));
      }
    } catch (dbError) {
      console.error("Database error while creating contacts:", dbError);
      return NextResponse.json(
        { error: "Error saving contacts to database" },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      );
    }
    
    console.log(`Successfully created ${results.length} contacts`);
    
    // Return results
    return NextResponse.json(
      { 
        success: true,
        message: "Contacts imported successfully",
        totalContacts: contacts.length,
        validContacts: validContacts.length,
        invalidContacts: invalidContacts.length,
        createdContacts: results.length,
      },
      { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    );
  } catch (error) {
    console.error("Error in bulk import:", error);
    
    return NextResponse.json(
      { 
        error: "An error occurred", 
        details: error instanceof Error ? error.message : String(error)
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    );
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}