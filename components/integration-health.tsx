"use client";
import {useState} from 'react';
type Check = {state: 'disabled'|'incomplete'|'configured'; missing: string[]; invalid: string[]};
type Report = {integrations: Record<string, Check>; alerts: {service:string;code:string}[]};
const names:Record<string,string> = {internal:'Acesso interno',crm:'Google Sheets',zoho:'E-mail Zoho',meta:'WhatsApp Meta',ai:'OpenAI',anthropic:'Claude'};
const labels = {disabled:'Não configurado ou desabilitado',incomplete:'Configuração incompleta',configured:'Configurado; acesso ainda precisa ser validado'};
export default function IntegrationHealth() {
  const [report,setReport]=useState<Report|null>(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  async function check() {
    setBusy(true);setError('');setReport(null);
    try {
      const response=await fetch('/api/integrations/health',{cache:'no-store'});
      if(!response.ok)throw new Error('unavailable');
      setReport(await response.json());
    } catch {setError('Não foi possível consultar as integrações. Tente novamente.');}
    finally {setBusy(false);}
  }
  return <section className="panel" aria-label="Diagnóstico das integrações">
    <div className="panel-top"><div><h2>Conexões da SANSA</h2><p>Confira o que falta configurar. A confirmação de acesso depende do teste ou sincronização de cada serviço.</p></div></div>
    <button className="button button-secondary" onClick={()=>void check()} disabled={busy}>{busy?'Consultando…':'Verificar configurações'}</button>
    <div aria-live="polite">
      {error&&<p role="alert">{error}</p>}
      {report&&<><div className="integration-list">{Object.entries(report.integrations).filter(([key])=>key in names).map(([key,value])=><div className="integration" key={key}><div><strong>{names[key]}</strong><small>{labels[value.state]}</small>{value.state==='incomplete'&&<small>Campos pendentes: {[...value.missing,...value.invalid].join(', ')}</small>}</div></div>)}</div>
      {report.alerts.some(a=>a.code==='public_secret_variable')&&<p role="alert">Há uma credencial em variável pública no servidor. Revogue a chave exposta e substitua a configuração.</p>}
      <p>Nenhuma mensagem é enviada durante esta consulta.</p></>}
    </div>
  </section>;
}
