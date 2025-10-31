import { subscribeToNewsletter } from '@/lib/ghost/admin-client';
import type { NewsletterSubscriptionResponse } from '@/lib/types/ghost';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const subscribeSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  name: z.string().optional(),
});

/**
 * Send notification to Slack webhook
 */
async function sendSlackNotification(email: string, isNewSubscriber: boolean): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('SLACK_WEBHOOK_URL not configured, skipping Slack notification');
    return;
  }

  try {
    const message = isNewSubscriber
      ? `🎉 New newsletter subscriber: ${email}`
      : `📧 Existing subscriber attempted to sign up: ${email}`;

    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: message,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: message,
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `*Email:* ${email} | *Time:* ${new Date().toLocaleString('en-US', { timeZone: 'UTC' })} UTC`,
              },
            ],
          },
        ],
      }),
    });
  } catch (error) {
    console.error('Error sending Slack notification:', error);
    // Don't throw - we don't want to fail the subscription if Slack notification fails
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<NewsletterSubscriptionResponse>> {
  try {
    const body = await request.json();

    // Validate request body
    const validation = subscribeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: validation.error.issues[0]?.message || 'Invalid email address',
        },
        { status: 400 }
      );
    }

    const { email, name } = validation.data;

    // Subscribe to newsletter via Ghost Admin API
    const result = await subscribeToNewsletter(email, name);

    // Send Slack notification on successful subscription
    if (result.success) {
      // Fire and forget - don't await to avoid slowing down the response
      sendSlackNotification(email, !result.alreadySubscribed).catch(err =>
        console.error('Failed to send Slack notification:', err)
      );
    }

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An unexpected error occurred. Please try again later.',
      },
      { status: 500 }
    );
  }
}
