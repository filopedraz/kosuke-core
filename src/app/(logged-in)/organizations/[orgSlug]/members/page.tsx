'use client';

import { useAuth, useOrganization } from '@clerk/nextjs';
import { Clock, Loader2, Mail, X } from 'lucide-react';
import { useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrganizationOperations } from '@/hooks/use-organization-operations';

export default function OrganizationMembersPage() {
  const { userId } = useAuth();
  const { organization, isLoaded, membership, memberships, invitations } = useOrganization({
    memberships: { pageSize: 50 },
    invitations: { pageSize: 50 },
  });
  const {
    inviteMember,
    isInvitingMember,
    removeMember,
    removingMemberId,
    revokeInvitation,
    revokingInvitationId,
  } = useOrganizationOperations();

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  if (!isLoaded) {
    return <OrganizationMembersSkeleton />;
  }

  if (!organization) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Organization not found</p>
        </CardContent>
      </Card>
    );
  }

  const isPersonal = organization.publicMetadata?.isPersonal === true;
  const isAdmin = membership?.role === 'org:admin';

  const handleInviteMember = async () => {
    try {
      await inviteMember({
        email: inviteEmail,
        organizationId: organization.id,
      });
      setInviteEmail('');
      setInviteDialogOpen(false);
      invitations?.revalidate?.();
    } catch (_error) {
      // Error handling is done in the hook
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      await revokeInvitation({
        invitationId: inviteId,
        organizationId: organization.id,
      });
      invitations?.revalidate?.();
    } catch (_error) {
      // Error handling is done in the hook
    }
  };

  const handleRemoveMember = async (userId: string | undefined) => {
    if (!userId) return;
    try {
      await removeMember({
        userId,
        organizationId: organization.id,
      });
      memberships?.revalidate?.();
    } catch (_error) {
      // Error handling is done in the hook
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Members</CardTitle>
              <CardDescription>
                {isPersonal
                  ? 'Personal workspaces are limited to one member'
                  : 'Manage who has access to this organization'}
              </CardDescription>
            </div>
            {!isPersonal && isAdmin && (
              <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Mail className="h-4 w-4 mr-2" />
                    Invite member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Member</DialogTitle>
                    <DialogDescription>
                      Send an invitation to join {organization.name}.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="inviteEmail">Email Address</Label>
                      <Input
                        id="inviteEmail"
                        type="email"
                        placeholder="colleague@example.com"
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleInviteMember}
                      disabled={isInvitingMember || !inviteEmail.trim()}
                    >
                      {isInvitingMember ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Invitation'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Members Section */}
          {memberships?.data && memberships.data.length > 0 ? (
            <div className="space-y-0">
              {memberships.data.map((member, index) => (
                <div key={member.id}>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage
                          src={member.publicUserData?.imageUrl}
                          alt={
                            member.publicUserData?.firstName ||
                            member.publicUserData?.identifier ||
                            'User'
                          }
                        />
                        <AvatarFallback>
                          {member.publicUserData?.firstName?.charAt(0) ||
                            member.publicUserData?.identifier?.charAt(0) ||
                            'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {member.publicUserData?.firstName && member.publicUserData?.lastName
                              ? `${member.publicUserData.firstName} ${member.publicUserData.lastName}`
                              : member.publicUserData?.identifier || 'Unknown User'}
                          </p>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                              member.role === 'org:admin'
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {member.role === 'org:admin' ? 'Admin' : 'Member'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.publicUserData?.identifier}
                        </p>
                      </div>
                    </div>
                    {isAdmin &&
                      member.publicUserData?.userId &&
                      member.publicUserData.userId !== userId &&
                      !isPersonal && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={() => handleRemoveMember(member.publicUserData?.userId)}
                          disabled={removingMemberId === member.publicUserData?.userId}
                        >
                          {removingMemberId === member.publicUserData?.userId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          )}
                        </Button>
                      )}
                  </div>
                  {index < memberships.data.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No members found</p>
            </div>
          )}

          {/* Pending Invitations Section */}
          {!isPersonal && invitations?.data && invitations.data.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium mb-3">Pending Invitations</h3>
                <div className="space-y-0">
                  {invitations.data.map((invite, index) => (
                    <div key={invite.id}>
                      <div className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <Mail className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{invite.emailAddress}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>Pending</span>
                            </div>
                          </div>
                        </div>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRevokeInvite(invite.id)}
                            disabled={revokingInvitationId === invite.id}
                          >
                            {revokingInvitationId === invite.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            )}
                          </Button>
                        )}
                      </div>
                      {index < invitations.data.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function OrganizationMembersSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
