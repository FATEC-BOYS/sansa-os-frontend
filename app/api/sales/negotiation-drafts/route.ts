import {backendFetch} from "@/lib/server-api";
export async function POST(request:Request){
  try{const r=await backendFetch("/api/sales/negotiation-drafts",{method:"POST",body:await request.text()});return new Response(await r.text(),{status:r.status,headers:{"Content-Type":"application/json"}});}
  catch{return Response.json({error:"Backend indisponível"},{status:503});}
}
