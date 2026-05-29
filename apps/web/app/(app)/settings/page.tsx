import { getSessionUser } from "@/lib/auth/session";
import { SettingsView } from "@/components/settings/settings-view";

export const metadata = { title: "Settings · full-budget" };

export default async function SettingsPage() {
  const user = await getSessionUser();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your profile, appearance, and account.
        </p>
      </div>
      <SettingsView user={user} />
    </div>
  );
}
