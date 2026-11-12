import {backendFetch} from "@/lib/server-api";
export async function POST(_request:Request,context:{params:Promise<{id:string}>}){
  const {id}=await context.params;
  try{
    const response=await backendFetch("/api/discovery/prospects/"+encodeURIComponent(id)+"/draft",{method:"POST",body:"{}"});
    return new Response(await response.text(),{status:response.status,headers:{"Content-Type":"application/json"}});
  }catch{return Response.json({error:"Não foi possível preparar a análise"},{status:503});}
}
