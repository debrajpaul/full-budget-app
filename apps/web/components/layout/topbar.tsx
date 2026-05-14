"use client";
import { useRouter } from "next/navigation";
import { LogOut, Sun } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TopbarProps {
  email: string;
}

function initials(email: string): string {
  const local = email.split("@")[0] ?? "U";
  return local.slice(0, 2).toUpperCase();
}

export function Topbar({ email }: TopbarProps) {
  const router = useRouter();

  async function handleLogout() {
    // Use redirect:'manual' so fetch doesn't follow the 303 redirect itself;
    // we handle navigation via the router instead.
    await fetch("/api/auth/logout", { method: "POST", redirect: "manual" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="ml-auto flex items-center gap-1">
      {/* Theme toggle — stub until next-themes ThemeProvider is wired up */}
      <Button variant="ghost" size="icon" aria-label="Toggle theme" disabled>
        <Sun className="h-4 w-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-8 w-8 rounded-full"
            aria-label="User menu"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {initials(email)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <p className="text-xs text-muted-foreground truncate">{email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={handleLogout}
            className="text-destructive focus:text-destructive cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
