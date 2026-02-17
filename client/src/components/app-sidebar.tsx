import { Link, useLocation } from "wouter";
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

const navGroups = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", icon: LayoutDashboard, path: "/" },
    ],
  },
  {
    label: "Policy Estate",
    items: [
      { title: "Documents", icon: FileText, path: "/documents" },
      { title: "Requirements", icon: BookOpen, path: "/requirements" },
      { title: "Regulatory Sources", icon: Scale, path: "/sources" },
    ],
  },
  {
    label: "Compliance",
    items: [
      { title: "Gap Analysis", icon: GitCompare, path: "/gap-analysis" },
      { title: "Findings", icon: AlertTriangle, path: "/findings" },
      { title: "Audits", icon: ClipboardCheck, path: "/audits" },
    ],
  },
  {
    label: "Governance",
    items: [
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
      { title: "Finding Severities", icon: Gauge, path: "/admin/finding-severities" },
    ],
  },
];

export function AppSidebar() {
  const [location] = useLocation();

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
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive =
                    item.path === "/"
                      ? location === "/"
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
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
