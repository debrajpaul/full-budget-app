"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { LogOut, Monitor, Moon, Sun } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { SessionUser } from "@/lib/auth/session";

interface SettingsViewProps {
  user: SessionUser;
}

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function SettingsView({ user }: SettingsViewProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST", redirect: "manual" });
    router.push("/login");
    router.refresh();
  }

  const shortUserId =
    user.userId.length > 16
      ? `${user.userId.slice(0, 8)}…${user.userId.slice(-6)}`
      : user.userId;

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Your account information decoded from the session.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Email
            </p>
            <p className="text-sm font-medium" data-testid="profile-email">
              {user.email || "—"}
            </p>
          </div>
          <Separator />
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Tenant
            </p>
            <Badge variant="secondary" data-testid="profile-tenant">
              {user.tenantId || "—"}
            </Badge>
          </div>
          <Separator />
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              User ID
            </p>
            <p
              className="text-sm font-mono text-muted-foreground"
              data-testid="profile-user-id"
              title={user.userId}
            >
              {shortUserId || "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Choose how full-budget looks on your device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="inline-flex rounded-lg border bg-muted p-1 gap-1"
            role="group"
            aria-label="Theme"
          >
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                data-testid={`theme-${value}`}
                aria-pressed={theme === value}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors
                  ${
                    theme === value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions — proceed with caution.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-destructive/30 p-4">
            <div>
              <p className="text-sm font-medium">Sign out</p>
              <p className="text-xs text-muted-foreground">
                End your current session on this device.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleSignOut}
              data-testid="sign-out-btn"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4 opacity-50">
            <div>
              <p className="text-sm font-medium">Delete account</p>
              <p className="text-xs text-muted-foreground">
                Permanently delete your account and all data.
              </p>
            </div>
            <Button variant="outline" size="sm" disabled>
              Coming soon
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
