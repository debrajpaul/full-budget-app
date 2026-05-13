"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  LayoutDashboard,
  PiggyBank,
  Repeat2,
  Settings,
  Target,
  TrendingUp,
  Upload,
  Wallet,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Set to true once the page is implemented. Controls disabled state. */
  built: boolean;
}

// Update `built` to `true` as each page is shipped.
export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    built: false,
  },
  {
    label: "Transactions",
    href: "/transactions",
    icon: ArrowLeftRight,
    built: false,
  },
  { label: "Upload", href: "/upload", icon: Upload, built: false },
  { label: "Budgets", href: "/budgets", icon: PiggyBank, built: false },
  { label: "Forecast", href: "/forecast", icon: TrendingUp, built: false },
  { label: "Recurring", href: "/recurring", icon: Repeat2, built: false },
  { label: "Goals", href: "/goals", icon: Target, built: false },
  {
    label: "Sinking Funds",
    href: "/sinking-funds",
    icon: Wallet,
    built: false,
  },
  { label: "Settings", href: "/settings", icon: Settings, built: false },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-3">
          <PiggyBank className="h-5 w-5 shrink-0 text-primary" />
          <span className="font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            full-budget
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(({ label, href, icon: Icon, built }) => {
                const isActive =
                  pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      asChild={built}
                      isActive={isActive}
                      tooltip={label}
                      aria-disabled={!built}
                      className={cn(!built && "pointer-events-none opacity-50")}
                    >
                      {built ? (
                        <Link href={href}>
                          <Icon />
                          <span>{label}</span>
                        </Link>
                      ) : (
                        <>
                          <Icon />
                          <span>{label}</span>
                        </>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
