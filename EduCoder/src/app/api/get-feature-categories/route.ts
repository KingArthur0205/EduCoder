import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // For local storage deployment, feature categories are stored in browser localStorage
    // Return empty categories since we can't access browser storage from server-side
    // The client-side will manage feature categories from localStorage
    
    console.log('Get feature categories API called - returning empty categories for local storage mode');
    
    return NextResponse.json({
      success: true,
      categories: [],
      source: 'local-storage-mode',
      message: 'Feature categories are stored locally in browser storage'
    });

  } catch (error) {
    console.error('Error in get feature categories API:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get feature categories',
      categories: [] // Fallback
    });
  }
} 