import {backendFetch} from "@/lib/server-api";
export async function GET(_request:Request,context:{params:Promise<{id:string}>}){
  const {id}=await context.params;
  try{const response=await backendFetch("/api/whatsapp/conversations/"+encodeURIComponent(id));return new Response(await response.text(),{status:response.status,headers:{"Content-Type":"application/json"}});}
  catch{return Response.json({error:"Backend indisponível"},{status:503});}
}
