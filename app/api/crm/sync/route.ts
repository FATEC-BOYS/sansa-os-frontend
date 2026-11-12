import {backendFetch} from "@/lib/server-api";
export async function POST() {
  try {
    const response = await backendFetch("/api/crm/sync",{method:"POST",body:"{}"});
    return new Response(await response.text(),{status:response.status,headers:{"Content-Type":"application/json"}});
  } catch {
    return Response.json({error:"Backend ou CRM não conectado"}, {status:503});
  }
}
