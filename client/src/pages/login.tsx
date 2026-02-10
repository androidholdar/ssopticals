import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { LogIn, ShieldAlert } from "lucide-react";

export default function LoginPage() {
  const { user, isAuthenticated, isWhitelisted, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-display font-bold text-primary">S.S. Opticals</CardTitle>
          <CardDescription>Secure management for customer records and lens pricing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAuthenticated && !isWhitelisted ? (
            <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-xl flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-destructive">Access Denied</p>
                <p className="text-xs text-destructive/80 mt-1">
                  Your email ({user?.email}) is not authorized to access this application.
                  Please contact the administrator.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
               <p className="text-sm text-muted-foreground mb-6">
                 Please sign in with your authorized Gmail account to continue.
               </p>
            </div>
          )}

          <Button
            className="w-full h-12 text-lg rounded-xl shadow-lg shadow-primary/20"
            asChild
          >
            <a href="/__replauthlogin">
              <LogIn className="w-5 h-5 mr-2" />
              {isAuthenticated ? "Switch Account" : "Login with Google"}
            </a>
          </Button>

          <p className="text-[10px] text-center text-muted-foreground mt-4">
            Authorized access only. All activities are logged.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
