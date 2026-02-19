import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { Redirect } from "wouter";
import { Shield } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";

export default function AuthPage() {
  const { session, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (session) {
    return <Redirect to="/dashboard" />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="flex items-center gap-2 mb-8">
        <Shield className="h-8 w-8 text-primary" />
        <span className="text-2xl font-bold">Policy Hub</span>
      </div>
      <div className="w-full max-w-sm rounded-lg border bg-card p-8 shadow-sm">
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: "hsl(var(--primary))",
                  brandAccent: "hsl(var(--primary))",
                  brandButtonText: "hsl(var(--primary-foreground))",
                  inputBackground: "hsl(var(--background))",
                  inputBorder: "hsl(var(--border))",
                  inputText: "hsl(var(--foreground))",
                },
                radii: {
                  borderRadiusButton: "0.375rem",
                },
              },
            },
          }}
          providers={[]}
          showLinks={true}
        />
      </div>
    </div>
  );
}
