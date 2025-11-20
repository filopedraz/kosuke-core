import { NextResponse } from 'next/server';

/**
 * GET /api/cli/verify
 * Verify that kosuke-cli is properly mounted and accessible
 */
export async function GET() {
  try {
    // Try to import kosuke-cli
    try {
      const kosukeModule = await import('@kosuke-ai/cli');

      const availableExports = Object.keys(kosukeModule);

      return NextResponse.json({
        success: true,
        message: 'Kosuke CLI is properly mounted and accessible!',
        availableCommands: availableExports.filter(
          key => key.endsWith('Command') || key.endsWith('Core')
        ),
        allExports: availableExports,
      });
    } catch (importError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Kosuke CLI is NOT accessible',
          error: importError instanceof Error ? importError.message : 'Unknown error',
          troubleshooting: {
            step1: 'Make sure you are running with docker-compose.local.yml',
            step2:
              'Verify kosuke-cli is built: cd /Users/filippopedrazzini/Documents/Work.nosync/kosuke-cli && npm run build',
            step3: 'Check Docker volume mount at line 39 in docker-compose.local.yml',
            step4: 'Restart containers: docker compose -f docker-compose.local.yml restart',
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error verifying CLI:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to verify CLI',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
