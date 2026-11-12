import {backendFetch} from "@/lib/server-api";
export async function POST(request: Request) {
  try {
    const body = await request.text();
    const response = await backendFetch("/api/approvals",{method:"POST",body});
    return new Response(await response.text(), {status:response.status,headers:{"Content-Type":"application/json"}});
  } catch {
    return Response.json({error:"Não foi possível registrar a ação"}, {status:503});
  }
}
