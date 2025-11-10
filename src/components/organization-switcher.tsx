'use client';

import { useOrganizationList } from '@clerk/nextjs';
import { Loader2, Plus, Settings, Upload, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrganizationOperations } from '@/hooks/use-organization-operations';

interface OrganizationSwitcherComponentProps {
  onClose?: () => void;
}

export function OrganizationSwitcherComponent({ onClose }: OrganizationSwitcherComponentProps) {
  const router = useRouter();
  const {
    organization,
    createOrganization,
    isCreating,
    invitations,
    acceptInvitation,
    acceptingInvitationId,
  } = useOrganizationOperations();
  const {
    userMemberships,
    isLoaded: isListLoaded,
    setActive,
  } = useOrganizationList({
    userMemberships: {
      infinite: true,
    },
  });
  const [isSwitching, setIsSwitching] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOrgLoaded = organization !== undefined;

  // Auto-select first available organization if none is active
  useEffect(() => {
    if (
      !isOrgLoaded ||
      !isListLoaded ||
      !setActive ||
      organization ||
      isSwitching ||
      userMemberships.isLoading
    )
      return;

    const firstOrg = userMemberships.data?.[0];
    if (firstOrg) {
      console.log('Auto-selecting first org:', firstOrg.organization.name);
      setIsSwitching(true);
      setActive({ organization: firstOrg.organization.id })
        .then(() => {
          router.refresh();
        })
        .catch(error => {
          console.error('Failed to auto-select organization:', error);
        })
        .finally(() => {
          setIsSwitching(false);
        });
    }
  }, [isOrgLoaded, isListLoaded, organization, userMemberships, setActive, router, isSwitching]);

  const handleSwitch = async (orgId: string) => {
    if (!setActive || isSwitching) return;

    setIsSwitching(true);
    onClose?.(); // Close dropdown immediately
    try {
      await setActive({ organization: orgId });
      router.push('/projects');
      router.refresh();
    } catch (error) {
      console.error('Failed to switch organization:', error);
    } finally {
      setIsSwitching(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoFile(file);
    const url = URL.createObjectURL(file);
    setLogoPreviewUrl(url);
  };

  const clearLogo = () => {
    setLogoFile(null);
    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl);
      setLogoPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreateOrganization = async () => {
    try {
      await createOrganization({
        name: newOrgName,
        logo: logoFile || undefined,
      });

      setNewOrgName('');
      clearLogo();
      setCreateDialogOpen(false);
    } catch (_error) {
      // Error handling is done in the hook
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    onClose?.(); // Close the dropdown immediately for better UX
    try {
      await acceptInvitation(invitationId);
    } catch (_error) {
      // Error handling is done in the hook
    }
  };

  if (!isOrgLoaded || !isListLoaded || userMemberships.isLoading) {
    return (
      <div className="px-2 py-1.5">
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  const currentOrgName = organization?.name || 'No organization';
  const currentOrgImage = organization?.imageUrl;
  const hasOrganizations = userMemberships.data && userMemberships.data.length > 0;

  return (
    <>
      <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
        Organization
      </DropdownMenuLabel>

      {hasOrganizations ? (
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer">
            <Avatar className="h-5 w-5 mr-2">
              <AvatarImage src={currentOrgImage} alt={currentOrgName} />
              <AvatarFallback className="text-xs">
                {currentOrgName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-sm">{currentOrgName}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-56 p-1" sideOffset={8} alignOffset={-4}>
            {/* Current Organization */}
            {organization && (
              <>
                <div className="relative">
                  <div className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm bg-accent/50">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={organization.imageUrl} alt={organization.name} />
                      <AvatarFallback className="text-xs">
                        {organization.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{organization.name}</p>
                    </div>
                    <Link
                      href={`/organizations/${organization.slug}`}
                      className="p-1 rounded-sm hover:bg-accent transition-colors"
                      onClick={() => onClose?.()}
                    >
                      <Settings className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </Link>
                  </div>
                </div>
                {userMemberships.data?.some(m => m.organization.id !== organization.id) && (
                  <DropdownMenuSeparator className="my-1" />
                )}
              </>
            )}

            {/* Other Organizations */}
            {userMemberships.data
              ?.filter(membership => membership.organization.id !== organization?.id)
              .map(membership => (
                <div key={membership.organization.id} className="relative">
                  <button
                    onClick={() => handleSwitch(membership.organization.id)}
                    disabled={isSwitching}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-accent transition-colors text-left"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage
                        src={membership.organization.imageUrl}
                        alt={membership.organization.name}
                      />
                      <AvatarFallback className="text-xs">
                        {membership.organization.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{membership.organization.name}</p>
                    </div>
                  </button>
                </div>
              ))}
            {userMemberships.data?.some(m => m.organization.id !== organization?.id) && (
              <DropdownMenuSeparator className="my-1" />
            )}

            {/* Pending Invitations */}
            {invitations.length > 0 && (
              <>
                {invitations.map(invitation => (
                  <div key={invitation.id} className="relative">
                    <button
                      onClick={() => handleAcceptInvitation(invitation.id)}
                      disabled={acceptingInvitationId === invitation.id}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-accent transition-colors text-left"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage
                          src={invitation.organizationImageUrl}
                          alt={invitation.organizationName}
                        />
                        <AvatarFallback className="text-xs">
                          {invitation.organizationName?.slice(0, 2).toUpperCase() || 'IN'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{invitation.organizationName}</p>
                      </div>
                      {acceptingInvitationId === invitation.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      ) : (
                        <span className="text-xs text-primary">Join</span>
                      )}
                    </button>
                  </div>
                ))}
                <DropdownMenuSeparator className="my-1" />
              </>
            )}

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-accent transition-colors text-left text-sm text-muted-foreground">
                  <div className="h-6 w-6 rounded-full border border-dashed border-muted-foreground/40 flex items-center justify-center">
                    <Plus className="h-3 w-3" />
                  </div>
                  <span>Create organization</span>
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Organization</DialogTitle>
                  <DialogDescription>
                    Create a new team workspace to collaborate with others.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="orgName">Organization Name</Label>
                    <Input
                      id="orgName"
                      placeholder="Acme Inc."
                      value={newOrgName}
                      onChange={e => setNewOrgName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newOrgName.trim()) {
                          handleCreateOrganization();
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Organization Logo (Optional)</Label>
                    {logoPreviewUrl ? (
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={logoPreviewUrl} alt="Preview" />
                          <AvatarFallback>
                            {newOrgName.slice(0, 2).toUpperCase() || 'OR'}
                          </AvatarFallback>
                        </Avatar>
                        <Button variant="ghost" size="sm" onClick={clearLogo} className="h-8">
                          <X className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        type="button"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload logo
                      </Button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <p className="text-xs text-muted-foreground">
                      JPEG or PNG. Square image, at least 400x400px. Max 5MB.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleCreateOrganization}
                    disabled={isCreating || !newOrgName.trim()}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Organization'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      ) : (
        <div className="px-2 py-2">
          <p className="text-xs text-muted-foreground mb-3">
            No workspace found. Try signing out and back in, or create one manually.
          </p>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                <span>Create Workspace</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Organization</DialogTitle>
                <DialogDescription>
                  Create a new team workspace to collaborate with others.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="orgNameEmpty">Organization Name</Label>
                  <Input
                    id="orgNameEmpty"
                    placeholder="Acme Inc."
                    value={newOrgName}
                    onChange={e => setNewOrgName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newOrgName.trim()) {
                        handleCreateOrganization();
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Organization Logo (Optional)</Label>
                  {logoPreviewUrl ? (
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={logoPreviewUrl} alt="Preview" />
                        <AvatarFallback>
                          {newOrgName.slice(0, 2).toUpperCase() || 'OR'}
                        </AvatarFallback>
                      </Avatar>
                      <Button variant="ghost" size="sm" onClick={clearLogo} className="h-8">
                        <X className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      type="button"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload logo
                    </Button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground">
                    JPEG or PNG. Square image, at least 400x400px. Max 5MB.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreateOrganization}
                  disabled={isCreating || !newOrgName.trim()}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Organization'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </>
  );
}
