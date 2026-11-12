import {backendFetch} from "@/lib/server-api";
export async function PATCH(request: Request, context: {params: Promise<{id:string}>}) {
  const {id} = await context.params;
  try {
    const body = await request.text();
    const response = await backendFetch("/api/approvals/" + encodeURIComponent(id), {method:"PATCH",body});
    return new Response(await response.text(),{status:response.status,headers:{"Content-Type":"application/json"}});
  } catch {
    return Response.json({error:"Não foi possível revisar a ação"}, {status:503});
  }
}
