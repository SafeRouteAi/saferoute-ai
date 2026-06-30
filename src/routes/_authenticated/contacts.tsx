import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Phone, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/contacts")({ component: ContactsPage });

type Contact = {
  id: string;
  name: string;
  phone: string;
  relationship: string | null;
  priority: number;
};

function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [rel, setRel] = useState("");

  const load = async () => {
    const { data, error } = await supabase
      .from("emergency_contacts")
      .select("*")
      .order("priority", { ascending: true });
    if (error) toast.error(error.message);
    else setContacts(data ?? []);
  };

  useEffect(() => { void load(); }, []);

  const add = async () => {
    if (!name || !phone) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("emergency_contacts").insert({
      user_id: u.user.id,
      name,
      phone,
      relationship: rel || null,
      priority: contacts.length + 1,
    });
    if (error) return toast.error(error.message);
    setOpen(false); setName(""); setPhone(""); setRel("");
    toast.success("Contact added");
    void load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("emergency_contacts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    void load();
  };

  return (
    <div>
      <PageHeader title="Emergency Contacts" subtitle="People we notify on SOS" />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="w-full"><Plus className="h-4 w-4 mr-1" /> Add contact</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>New contact</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 0123" /></div>
            <div className="space-y-1.5"><Label>Relationship</Label><Input value={rel} onChange={(e) => setRel(e.target.value)} placeholder="Mom, Friend…" /></div>
            <Button className="w-full" onClick={add}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mt-4 space-y-2">
        {contacts.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No emergency contacts yet. Add someone you trust.
          </p>
        )}
        {contacts.map((c) => (
          <div key={c.id} className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-gradient-primary text-primary-foreground font-display font-semibold flex items-center justify-center">
              {c.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-semibold text-sm truncate">{c.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {c.phone}{c.relationship ? ` • ${c.relationship}` : ""}
              </div>
            </div>
            <a href={`tel:${c.phone}`} className="h-9 w-9 rounded-full bg-safe/15 text-safe flex items-center justify-center"><Phone className="h-4 w-4" /></a>
            <a href={`sms:${c.phone}`} className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center"><MessageSquare className="h-4 w-4" /></a>
            <button onClick={() => void remove(c.id)} className="h-9 w-9 rounded-full bg-destructive/15 text-destructive flex items-center justify-center">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}