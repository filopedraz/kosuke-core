'use client';

import { Loader2, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateOrganization: (data: { name: string; logo?: File }) => Promise<void>;
  isCreating: boolean;
}

export function CreateOrganizationDialog({
  open,
  onOpenChange,
  onCreateOrganization,
  isCreating,
}: CreateOrganizationDialogProps) {
  const [newOrgName, setNewOrgName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSubmit = async () => {
    await onCreateOrganization({
      name: newOrgName,
      logo: logoFile || undefined,
    });
    setNewOrgName('');
    clearLogo();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                  handleSubmit();
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
                  <AvatarFallback>{newOrgName.slice(0, 2).toUpperCase() || 'OR'}</AvatarFallback>
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
          <Button onClick={handleSubmit} disabled={isCreating || !newOrgName.trim()}>
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
  );
}
