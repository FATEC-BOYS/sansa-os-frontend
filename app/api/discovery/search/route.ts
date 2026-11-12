import {backendFetch} from "@/lib/server-api";
export async function POST(request:Request){
  try{
    const response=await backendFetch("/api/discovery/search",{method:"POST",body:await request.text()});
    return new Response(await response.text(),{status:response.status,headers:{"Content-Type":"application/json"}});
  }catch{return Response.json({error:"Backend indisponível para pesquisa"},{status:503});}
}
