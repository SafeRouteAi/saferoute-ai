import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { Loader2, Shield } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({ component: ResetPasswordPage });

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase redirects here with a recovery session already applied to the client.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    // Also check if a session is already present (page reload after clicking link).
    void supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async () => {
    if (pw.length < 8) return toast.error("Password must be at least 8 characters");
    if (pw !== confirm) return toast.error("Passwords do not match");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated — please sign in");
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      <div className="px-6 pt-12 pb-6 text-primary-foreground">
        <div className="flex items-center gap-2">
          <div className="bg-white/15 rounded-xl p-2 backdrop-blur">
            <Shield className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Reset password</h1>
            <p className="text-xs opacity-90">Choose a new password for your account</p>
          </div>
        </div>
      </div>
      <div className="flex-1 bg-background rounded-t-3xl px-6 pt-6 pb-10 -mt-2 space-y-3">
        {!ready ? (
          <p className="text-sm text-muted-foreground">
            Waiting for reset link to load… If you didn't arrive here from the email link,
            request a new reset email from the sign-in page.
          </p>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="pw">New password</Label>
              <Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cf">Confirm new password</Label>
              <Input id="cf" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <Button className="w-full" onClick={submit} disabled={loading || !pw || !confirm}>
              {loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Update password
            </Button>
          </>
        )}
        <div className="mt-8 flex justify-center">
          <Logo />
        </div>
      </div>
    </div>
  );
}