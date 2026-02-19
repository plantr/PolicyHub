import { Redirect, Link } from "wouter";
import { Shield, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function Landing() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (session) {
    return <Redirect to="/dashboard" />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-2">
        <Shield className="h-16 w-16 text-primary" />
        <h1 className="text-4xl font-bold">Policy Hub</h1>
        <p className="text-muted-foreground text-lg mt-2">
          Policy and compliance management platform
        </p>
        <Link href="/login">
          <a className="mt-8 inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-lg font-medium text-primary-foreground hover:bg-primary/90">
            Sign in
          </a>
        </Link>
      </div>
    </div>
  );
}
