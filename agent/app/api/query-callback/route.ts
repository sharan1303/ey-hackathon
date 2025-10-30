import { NextRequest, NextResponse } from 'next/server';
import { handleQueryResult, handleQueryError } from '../src/mastra/lib/query-executor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface QueryCallbackRequest {
  queryId: string;
  result?: {
    columns: string[];
    values: unknown[][];
  };
  error?: string;
}

/**
 * POST /api/query-callback
 * 
 * Receives query results from the browser client after executing SQL queries.
 * This endpoint is called by the client-side code after it runs a query
 * in the browser's SQL.js database.
 */
export async function POST(req: NextRequest) {
  try {
    const body: QueryCallbackRequest = await req.json();
    const { queryId, result, error } = body;

    if (!queryId) {
      return NextResponse.json(
        { error: 'queryId is required' },
        { status: 400 }
      );
    }

    // If there's an error, handle it
    if (error) {
      console.error(`❌ Query callback error for ${queryId}:`, error);
      handleQueryError(queryId, error);
      return NextResponse.json({ success: true, handled: 'error' });
    }

    // If there's a result, handle it
    if (result) {
      console.log(`✅ Query callback success for ${queryId}: ${result.values.length} rows`);
      handleQueryResult(queryId, result);
      return NextResponse.json({ success: true, handled: 'result' });
    }

    // Neither result nor error was provided
    return NextResponse.json(
      { error: 'Either result or error must be provided' },
      { status: 400 }
    );
  } catch (error) {
    console.error('❌ Query callback endpoint error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: 'Failed to process query callback', message: errorMessage },
      { status: 500 }
    );
  }
}

