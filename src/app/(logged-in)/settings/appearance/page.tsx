import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeSwitcher } from '@/components/theme-switcher';

export default function AppearancePage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>
            Customize how the interface looks and feels. Choose between light, dark, or system
            preference.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeSwitcher />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Interface preferences</CardTitle>
          <CardDescription>
            Additional customization options for your interface experience.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            More appearance settings coming soon...
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
