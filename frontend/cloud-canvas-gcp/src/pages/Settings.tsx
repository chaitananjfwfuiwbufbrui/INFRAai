import NavHeader from '@/components/shared/NavHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Building2, CreditCard } from 'lucide-react';
import CommunicationChannels from '@/components/communications/CommunicationChannels';
import { ENABLE_CLERK_AUTH } from '@/config/app.config';
import { useUser } from '@clerk/clerk-react';

function ProfileSection() {
  const { user, isLoaded } = ENABLE_CLERK_AUTH
    ? useUser()
    : { user: null, isLoaded: true };

  const fullName = user?.fullName || user?.firstName || 'Guest User';
  const email = user?.primaryEmailAddress?.emailAddress || 'Not signed in';
  const imageUrl = user?.imageUrl;

  if (!isLoaded) {
    return (
      <Card className="border-border/50 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-serif">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-muted" />
              <div className="space-y-2">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-3 w-24 bg-muted rounded" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-serif">Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          {imageUrl ? (
            <img src={imageUrl} alt={fullName} className="w-14 h-14 rounded-full object-cover ring-2 ring-border" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
              <User className="w-7 h-7 text-muted-foreground" />
            </div>
          )}
          <div>
            <p className="font-semibold text-foreground">{fullName}</p>
            {!ENABLE_CLERK_AUTH && (
              <p className="text-sm text-muted-foreground">Sign in to see your profile</p>
            )}
          </div>
        </div>

        <div className="grid gap-3 pt-2">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">{email}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Workspace: {user?.organizationMemberships?.[0]?.organization?.name || 'Personal'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <CreditCard className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Plan:</span>
            <Badge variant="secondary" className="rounded-full text-xs">Pro</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavHeader showBackButton backPath="/infrastructure" />

      <main className="container mx-auto px-4 py-12 space-y-10 max-w-3xl">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Configuration</p>
          <h1 className="text-3xl sm:text-4xl font-serif font-semibold mb-1">Settings</h1>
          <p className="text-muted-foreground">Manage your profile and integrations.</p>
        </div>

        <ProfileSection />

        <CommunicationChannels />
      </main>
    </div>
  );
}
