import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { triggerSOS } from "@/lib/sos";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({ component: SettingsPage });

type Settings = {
  dark_mode: boolean;
  language: string;
  voice_sensitivity: number;
  shake_sos: boolean;
  auto_guardian: boolean;
};

const DEFAULT: Settings = {
  dark_mode: false,
  language: "en",
  voice_sensitivity: 70,
  shake_sos: false,
  auto_guardian: false,
};

function SettingsPage() {
  const [s, setS] = useState<Settings>(DEFAULT);
  const navigate = useNavigate();

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("user_settings").select("*").maybeSingle();
      if (data) {
        setS({
          dark_mode: data.dark_mode,
          language: data.language,
          voice_sensitivity: data.voice_sensitivity,
          shake_sos: data.shake_sos,
          auto_guardian: data.auto_guardian,
        });
      }
    })();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", s.dark_mode);
  }, [s.dark_mode]);

  const save = async (patch: Partial<Settings>) => {
    const next = { ...s, ...patch };
    setS(next);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase
      .from("user_settings")
      .upsert({ user_id: u.user.id, ...next });
    if (error) toast.error(error.message);
  };

  // Shake to SOS
  useEffect(() => {
    if (!s.shake_sos) return;
    let last = 0;
    let lastX = 0, lastY = 0, lastZ = 0;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      const x = a.x ?? 0, y = a.y ?? 0, z = a.z ?? 0;
      const delta = Math.abs(x - lastX) + Math.abs(y - lastY) + Math.abs(z - lastZ);
      lastX = x; lastY = y; lastZ = z;
      if (delta > 35 && Date.now() - last > 4000) {
        last = Date.now();
        toast.warning("Shake detected — sending SOS");
        void triggerSOS({ trigger: "shake" });
      }
    };
    window.addEventListener("devicemotion", onMotion);
    return () => window.removeEventListener("devicemotion", onMotion);
  }, [s.shake_sos]);

  const requestMotion = async () => {
    const anyDM = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof anyDM.requestPermission === "function") {
      try {
        const r = await anyDM.requestPermission();
        if (r !== "granted") toast.error("Motion permission denied");
        else toast.success("Motion enabled");
      } catch {
        toast.error("Couldn't request motion permission");
      }
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Tune SafeRoute AI to you" />

      <div className="space-y-3">
        <Row title="Dark mode" desc="Easier on the eyes at night">
          <Switch checked={s.dark_mode} onCheckedChange={(v) => save({ dark_mode: v })} />
        </Row>

        <Row title="Language" desc="Used by the assistant">
          <Select value={s.language} onValueChange={(v) => save({ language: v })}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="hi">Hindi</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="fr">French</SelectItem>
            </SelectContent>
          </Select>
        </Row>

        <Row title="Voice sensitivity" desc={`Trigger threshold (${s.voice_sensitivity}%)`}>
          <div className="w-40">
            <Slider
              value={[s.voice_sensitivity]}
              min={50}
              max={95}
              step={5}
              onValueChange={(v) => save({ voice_sensitivity: v[0] })}
            />
          </div>
        </Row>

        <Row title="Shake to SOS" desc="Shake the phone vigorously">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={requestMotion}>Allow</Button>
            <Switch checked={s.shake_sos} onCheckedChange={(v) => save({ shake_sos: v })} />
          </div>
        </Row>

        <Row title="Auto-start Guardian Mode" desc="Listen on app open">
          <Switch checked={s.auto_guardian} onCheckedChange={(v) => save({ auto_guardian: v })} />
        </Row>

        <Row title="Power button SOS" desc="Not available in web browsers">
          <Switch disabled />
        </Row>

        <Row title="Location permission" desc="Required for SOS & routes">
          <Button size="sm" variant="outline" onClick={() => navigator.geolocation?.getCurrentPosition(() => toast.success("Location OK"), () => toast.error("Denied"))}>
            Test
          </Button>
        </Row>
      </div>

      <div className="mt-6">
        <Button variant="outline" className="w-full" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-1" /> Sign out
        </Button>
      </div>
    </div>
  );
}

function Row({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <Label className="font-display font-semibold text-sm">{title}</Label>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}