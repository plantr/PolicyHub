import { cn } from "@/lib/utils";

type StatusType = "Draft" | "In Review" | "Approved" | "Published" | "High" | "Medium" | "Low" | "Open" | "Closed" | "In Progress" | "Covered" | "Partially Covered" | "Not Covered";

interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStyles = (s: string) => {
    const lower = s.toLowerCase();
    
    // Severity / Negative
    if (['high', 'not covered', 'failed'].includes(lower)) {
      return "bg-red-50 text-red-700 border-red-200";
    }
    
    // Warning / Progress
    if (['medium', 'in review', 'in progress', 'partially covered'].includes(lower)) {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    
    // Success / Good
    if (['approved', 'published', 'covered', 'closed', 'low'].includes(lower)) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    
    // Neutral
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
      getStyles(status),
      className
    )}>
      {status}
    </span>
  );
}
