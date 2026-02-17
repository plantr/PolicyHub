import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  FileText, 
  BookOpen, 
  ShieldCheck, 
  AlertCircle, 
  Settings, 
  LogOut 
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/policies", label: "Policy Library", icon: FileText },
  { href: "/requirements", label: "Requirements", icon: BookOpen },
  { href: "/gap-analysis", label: "Gap Analysis", icon: ShieldCheck },
  { href: "/findings", label: "Findings", icon: AlertCircle },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 border-r border-border bg-card flex flex-col h-screen sticky top-0">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">PolicyManager</span>
        </div>

        <nav className="space-y-1">
          {items.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer group",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}>
                  <Icon className={cn(
                    "w-4 h-4 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-border">
        <Link href="/settings">
          <div className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-all",
            location === "/settings" && "bg-primary/10 text-primary"
          )}>
            <Settings className="w-4 h-4" />
            Settings
          </div>
        </Link>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 cursor-pointer transition-all mt-1">
          <LogOut className="w-4 h-4" />
          Logout
        </div>
      </div>
    </div>
  );
}
