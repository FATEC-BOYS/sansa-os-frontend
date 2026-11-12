import {backendFetch} from "@/lib/server-api";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const response = await backendFetch("/api/overview");
    return new Response(await response.text(), {status:response.status,headers:{"Content-Type":"application/json"}});
  } catch {
    return Response.json({error:"Backend não conectado"}, {status:503});
  }
}
