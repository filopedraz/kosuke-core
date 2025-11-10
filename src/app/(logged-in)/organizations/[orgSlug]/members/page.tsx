'use client';

import { useOrganization } from '@clerk/nextjs';
import { Clock, Loader2, Mail, UserX, X } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';

export default function OrganizationMembersPage() {
  const { organization, isLoaded, membership, memberships, invitations } = useOrganization({
    memberships: { pageSize: 50 },
    invitations: { pageSize: 50 },
  });
  const { toast } = useToast();

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);

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
    if (!inviteEmail.trim()) {
      toast({
        title: 'Error',
        description: 'Email address is required',
        variant: 'destructive',
      });
      return;
    }

    setIsInviting(true);
    try {
      const response = await fetch(`/api/organizations/${organization.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to invite member');
      }

      toast({
        title: 'Success',
        description: 'Invitation sent successfully',
      });

      setInviteEmail('');
      setInviteDialogOpen(false);
      invitations?.revalidate?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to invite member',
        variant: 'destructive',
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!invitations) return;

    setRevokingInviteId(inviteId);
    try {
      const invitation = invitations.data?.find(inv => inv.id === inviteId);
      if (invitation) {
        await invitation.revoke();
        toast({
          title: 'Success',
          description: 'Invitation revoked',
        });
        invitations.revalidate?.();
      }
    } catch (_error) {
      toast({
        title: 'Error',
        description: 'Failed to revoke invitation',
        variant: 'destructive',
      });
    } finally {
      setRevokingInviteId(null);
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
                      disabled={isInviting || !inviteEmail.trim()}
                    >
                      {isInviting ? (
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
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
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
                      <div>
                        <p className="text-sm font-medium">
                          {member.publicUserData?.firstName && member.publicUserData?.lastName
                            ? `${member.publicUserData.firstName} ${member.publicUserData.lastName}`
                            : member.publicUserData?.identifier || 'Unknown User'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.publicUserData?.identifier}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        {member.role === 'org:admin' ? 'Admin' : 'Member'}
                      </span>
                      {isAdmin && member.id !== membership?.id && !isPersonal && (
                        <Button variant="ghost" size="icon" disabled>
                          <UserX className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
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
                            disabled={revokingInviteId === invite.id}
                          >
                            {revokingInviteId === invite.id ? (
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
