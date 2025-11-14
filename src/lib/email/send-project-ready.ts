import 'server-only';

/**
 * Send project ready notification email to organization members
 * Uses Resend for email delivery
 */

interface SendProjectReadyEmailOptions {
  projectId: string;
  projectName: string;
  orgId: string;
}

/**
 * Get all members of an organization from Clerk
 */
async function getOrganizationMembers(orgId: string): Promise<
  Array<{
    userId: string;
    email: string;
    name: string | null;
  }>
> {
  try {
    const { createClerkClient } = await import('@clerk/nextjs/server');
    const clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY!,
    });

    const memberships = await clerkClient.organizations.getOrganizationMembershipList({
      organizationId: orgId,
    });

    const members = await Promise.all(
      memberships.data.map(async membership => {
        if (!membership.publicUserData) {
          return null;
        }
        const user = await clerkClient.users.getUser(membership.publicUserData.userId);
        return {
          userId: user.id,
          email: user.primaryEmailAddress?.emailAddress || '',
          name: user.fullName || user.firstName || null,
        };
      })
    );

    const validMembers = members.filter((m): m is NonNullable<typeof m> => m !== null);

    return validMembers.filter(member => member.email); // Filter out members without email
  } catch (error) {
    console.error('Error fetching organization members:', error);
    return [];
  }
}

/**
 * Send project ready email using Resend
 */
export async function sendProjectReadyEmail(options: SendProjectReadyEmailOptions): Promise<void> {
  const { projectId, projectName, orgId } = options;

  // Check if Resend is configured
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured, skipping email notification');
    return;
  }

  try {
    // Get organization members
    const members = await getOrganizationMembers(orgId);

    if (members.length === 0) {
      console.warn('No organization members found for project ready notification');
      return;
    }

    // Import Resend dynamically
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Project URL
    const projectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/projects/${projectId}`;

    // Send email to each member
    const emailPromises = members.map(async member => {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'noreply@kosuke.ai',
          to: member.email,
          subject: `Your project "${projectName}" is ready!`,
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Project is Ready</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Project Ready!</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      ${member.name ? `Hi ${member.name},` : 'Hi there,'}
    </p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Great news! Your project <strong>"${projectName}"</strong> is now ready and available for you to use.
    </p>

    <p style="font-size: 16px; margin-bottom: 30px;">
      You can now access all features including chat sessions, code exploration, preview, and more.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${projectUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 16px;">
        Open Project
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      If you didn't request this project or have any questions, please contact our support team.
    </p>
  </div>

  <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
    <p>© ${new Date().getFullYear()} Kosuke. All rights reserved.</p>
  </div>
</body>
</html>
          `,
        });
      } catch (error) {
        console.error(`Failed to send email to ${member.email}:`, error);
      }
    });

    await Promise.allSettled(emailPromises);
    console.log(`Sent ${emailPromises.length} project ready notification emails`);
  } catch (error) {
    console.error('Error sending project ready emails:', error);
    throw error;
  }
}
