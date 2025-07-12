import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { forceRegenerate = false } = await request.json();
    
    console.log('Regenerating annotation columns from codebook...');
    
    // This endpoint will be called by the client to trigger regeneration
    // The actual regeneration happens on the client side using localStorage
    // because we're using client-side storage for annotations
    
    return NextResponse.json({ 
      success: true, 
      message: 'Annotation regeneration triggered successfully',
      timestamp: new Date().toISOString(),
      forceRegenerate
    });
    
  } catch (error) {
    console.error('Error in regenerate-annotations API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to trigger annotation regeneration' 
    }, { status: 500 });
  }
} 