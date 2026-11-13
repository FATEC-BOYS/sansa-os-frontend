import {backendFetch} from "@/lib/server-api";
export async function GET(){
  try{const r=await backendFetch("/api/email/inbox");return new Response(await r.text(),{status:r.status,headers:{"Content-Type":"application/json"}});}
  catch{return Response.json({error:"Backend indisponível"},{status:503});}
}
