import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { SessionProvider, useSession } from "@/components/kra/session";
import { Login } from "@/components/kra/Login";
import { AppShell } from "@/components/kra/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KRA Tracker — Sahayog Nanded City" },
      { name: "description", content: "Weekly KRA tracking and monthly score roll-up for Sahayog Pathology Lab, Nanded City." },
      { property: "og:title", content: "KRA Tracker — Sahayog Nanded City" },
      { property: "og:description", content: "Weekly KRA tracking and monthly score roll-up for Sahayog Pathology Lab staff." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <SessionProvider>
      <Gate />
    </SessionProvider>
  );
}

function Gate() {
  const { token, ready } = useSession();
  if (!ready) return <div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  return token ? <AppShell /> : <Login />;
}
