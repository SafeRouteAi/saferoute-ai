import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { Loader2, Shield } from "lucide-react";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const signIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate({ to: "/" });
  };

  const signUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: name },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — you can sign in now");
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      <div className="px-6 pt-12 pb-6 text-primary-foreground">
        <div className="flex items-center gap-2">
          <div className="bg-white/15 rounded-xl p-2 backdrop-blur">
            <Shield className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">SafeRoute AI</h1>
            <p className="text-xs opacity-90">Your AI guardian on every journey</p>
          </div>
        </div>
        <p className="mt-6 text-sm leading-relaxed opacity-95 max-w-sm">
          Sign in to enable Guardian Mode, save trusted contacts, and get AI-powered safer routes.
        </p>
      </div>
      <div className="flex-1 bg-background rounded-t-3xl px-6 pt-6 pb-10 -mt-2">
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
          </TabsList>
          <TabsContent value="signin" className="space-y-3 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="se">Email</Label>
              <Input id="se" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp">Password</Label>
              <Input id="sp" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button className="w-full" onClick={signIn} disabled={loading || !email || !password}>
              {loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Sign in
            </Button>
          </TabsContent>
          <TabsContent value="signup" className="space-y-3 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="un">Display name</Label>
              <Input id="un" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ue">Email</Label>
              <Input id="ue" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="up">Password</Label>
              <Input id="up" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button className="w-full" onClick={signUp} disabled={loading || !email || !password}>
              {loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Create account
            </Button>
          </TabsContent>
        </Tabs>
        <div className="mt-8 flex justify-center">
          <Logo />
        </div>
      </div>
    </div>
  );
}