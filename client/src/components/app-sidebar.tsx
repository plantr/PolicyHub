import { Link, useLocation } from "wouter";
import { useState } from "react";
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Scale,
  GitCompare,
  AlertTriangle,
  ClipboardCheck,
  History,
  Building2,
  Users,
  UserCog,
  MapPin,
  FolderOpen,
  Gauge,
  Blocks,
  ChevronDown,
  Shield,
  Target,
  Library,
  ShieldAlert,
  ListChecks,
  BookMarked,
  Camera,
  Settings2,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const navGroups = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    ],
  },
  {
    label: "Policy Estate",
    items: [
      { title: "Frameworks", icon: Scale, path: "/sources" },
      { title: "Controls", icon: BookOpen, path: "/requirements" },
      { title: "Documents", icon: FileText, path: "/documents" },
    ],
  },
  {
    label: "Compliance",
    items: [
      { title: "Gap Analysis", icon: GitCompare, path: "/gap-analysis" },
      { title: "Findings", icon: AlertTriangle, path: "/findings" },
      { title: "Audits", icon: ClipboardCheck, path: "/audits" },
      { title: "Commitments", icon: Target, path: "/commitments" },
    ],
  },
  {
    label: "Risk Management",
    items: [
      { title: "Overview", icon: ShieldAlert, path: "/risk-management" },
      { title: "Risk Register", icon: AlertTriangle, path: "/risk-management/register" },
      { title: "Risk Library", icon: BookMarked, path: "/risk-management/library" },
      { title: "Action Tracker", icon: ListChecks, path: "/risk-management/actions" },
      { title: "Snapshots", icon: Camera, path: "/risk-management/snapshots" },
      { title: "Risk Settings", icon: Settings2, path: "/risk-management/settings" },
    ],
  },
  {
    label: "Trust & Governance",
    items: [
      { title: "Trust Center", icon: Shield, path: "/trust-center" },
      { title: "Knowledge Base", icon: Library, path: "/knowledge-base" },
      { title: "Audit Trail", icon: History, path: "/audit-trail" },
    ],
  },
  {
    label: "Administration",
    items: [
      { title: "Business Units", icon: Building2, path: "/business-units" },
      { title: "Users", icon: UserCog, path: "/users" },
      { title: "Entity Types", icon: Blocks, path: "/admin/entity-types" },
      { title: "Roles / Actors", icon: Users, path: "/admin/roles" },
      { title: "Jurisdictions", icon: MapPin, path: "/admin/jurisdictions" },
      { title: "Document Categories", icon: FolderOpen, path: "/admin/document-categories" },
      { title: "Document Statuses", icon: FileText, path: "/admin/document-statuses" },
      { title: "Finding Severities", icon: Gauge, path: "/admin/finding-severities" },
    ],
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () => Object.fromEntries(navGroups.map((g) => [g.label, true]))
  );

  function toggleSection(label: string) {
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <span className="text-lg font-semibold" data-testid="text-app-title">
            PolicyManager
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => (
          <Collapsible
            key={group.label}
            open={openSections[group.label]}
            onOpenChange={() => toggleSection(group.label)}
          >
            <SidebarGroup>
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel
                  className="cursor-pointer select-none"
                  data-testid={`button-toggle-${group.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {group.label}
                  <ChevronDown
                    className={`ml-auto h-4 w-4 shrink-0 transition-transform duration-200 ${
                      openSections[group.label] ? "" : "-rotate-90"
                    }`}
                  />
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => {
                      const isActive =
                        item.path === "/dashboard"
                          ? location === "/dashboard"
                          : item.path === "/risk-management"
                            ? location === "/risk-management"
                            : location.startsWith(item.path);
                      return (
                        <SidebarMenuItem key={item.path}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            tooltip={item.title}
                            data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, "-").replace(/\//g, "-")}`}
                          >
                            <Link href={item.path}>
                              <item.icon />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
