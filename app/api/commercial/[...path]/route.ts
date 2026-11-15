import {backendFetch} from '@/lib/server-api';
type Context={params:Promise<{path:string[]}>};
async function proxy(request:Request,context:Context){
  const {path}=await context.params;
  const target=path.join('/');
  if(!/^(?:briefings(?:\/[a-zA-Z0-9_-]+(?:\/(?:estimates|versions))?)?|versions\/[a-zA-Z0-9_-]+\/pdf)$/.test(target))return Response.json({error:'Rota inválida'},{status:404});
  try{
    const r=await backendFetch('/api/commercial/'+target,{method:request.method,...(request.method==='GET'?{}:{body:await request.text()})});
    const pdf=r.headers.get('content-type')?.includes('application/pdf');
    return new Response(pdf?await r.arrayBuffer():await r.text(),{status:r.status,headers:{'Content-Type':pdf?'application/pdf':'application/json','Cache-Control':'no-store',...(pdf?{'Content-Disposition':r.headers.get('content-disposition')||'attachment; filename="SANSA-proposta.pdf"'}:{})}});
  }catch{return Response.json({error:'Serviço comercial indisponível. Tente novamente.'},{status:503});}
}
export const GET=proxy;export const POST=proxy;export const PUT=proxy;
