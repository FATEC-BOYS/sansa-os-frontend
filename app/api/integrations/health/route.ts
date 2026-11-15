import {backendFetch} from '@/lib/server-api';
export async function GET() {
  try {
    const response=await backendFetch('/api/integrations/health');
    if(!response.ok)return Response.json({error:'Diagnóstico indisponível'},{status:502});
    return Response.json(await response.json(),{headers:{'Cache-Control':'no-store'}});
  } catch {return Response.json({error:'Diagnóstico indisponível'},{status:502});}
}
