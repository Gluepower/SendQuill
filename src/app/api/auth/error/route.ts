import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Get the full URL to extract query parameters
  const url = request.url;
  const urlObj = new URL(url);
  
  // Get all query parameters
  const queryParams = urlObj.searchParams.toString();
  
  // Construct the redirect URL, preserving the query parameters
  const redirectUrl = `/auth/error${queryParams ? `?${queryParams}` : ''}`;
  
  // Return a redirect response
  return NextResponse.redirect(new URL(redirectUrl, request.url));
} 