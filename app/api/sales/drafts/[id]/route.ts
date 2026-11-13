import {backendFetch} from "@/lib/server-api";
export async function PATCH(request:Request,context:{params:Promise<{id:string}>}){
  const {id}=await context.params;
  try{const r=await backendFetch("/api/sales/drafts/"+encodeURIComponent(id),{method:"PATCH",body:await request.text()});return new Response(await r.text(),{status:r.status,headers:{"Content-Type":"application/json"}});}
  catch{return Response.json({error:"Backend indisponível"},{status:503});}
}
