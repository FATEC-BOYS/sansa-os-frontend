import {backendFetch} from "@/lib/server-api";
export async function PATCH(request:Request,context:{params:Promise<{id:string}>}){
  const {id}=await context.params;
  try{
    const response=await backendFetch("/api/discovery/prospects/"+encodeURIComponent(id)+"/contacts",{method:"PATCH",body:await request.text()});
    return new Response(await response.text(),{status:response.status,headers:{"Content-Type":"application/json"}});
  }catch{return Response.json({error:"Não foi possível atualizar os contatos"},{status:503});}
}
