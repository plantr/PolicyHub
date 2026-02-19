import { useEffect } from "react";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, loading, sessionExpired } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (sessionExpired) {
      toast({
        title: "Session expired, please log in again",
      });
    }
  }, [sessionExpired, toast]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sessionExpired || !session) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}
