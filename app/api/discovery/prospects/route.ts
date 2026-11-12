import {backendFetch} from "@/lib/server-api";
export async function GET(){
  try{
    const response=await backendFetch("/api/discovery/prospects");
    return new Response(await response.text(),{status:response.status,headers:{"Content-Type":"application/json"}});
  }catch{return Response.json({error:"Backend indisponível"},{status:503});}
}
export async function POST(request:Request){
  try{
    const response=await backendFetch("/api/discovery/prospects",{method:"POST",body:await request.text()});
    return new Response(await response.text(),{status:response.status,headers:{"Content-Type":"application/json"}});
  }catch{return Response.json({error:"Não foi possível salvar a oportunidade"},{status:503});}
}
