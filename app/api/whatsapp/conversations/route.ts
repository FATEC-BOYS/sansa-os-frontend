import {backendFetch} from "@/lib/server-api";
export async function GET(){
  try{const response=await backendFetch("/api/whatsapp/conversations");return new Response(await response.text(),{status:response.status,headers:{"Content-Type":"application/json"}});}
  catch{return Response.json({error:"Backend indisponível"},{status:503});}
}
