import Dashboard from "@/components/dashboard";
import { backendFetch } from "@/lib/server-api";
import type { Overview } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let overview: Overview | null = null;
  let connectionError: string | null = null;
  try {
    const response = await backendFetch("/api/overview");
    if (!response.ok) throw new Error("Backend respondeu HTTP " + response.status);
    overview = await response.json() as Overview;
  } catch (error) {
    connectionError = error instanceof Error ? error.message : "Backend indisponível";
  }
  return <Dashboard initialData={overview} connectionError={connectionError}/>;
}
