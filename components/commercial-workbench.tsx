"use client";
import {useEffect,useState} from 'react';
import type {Lead} from '@/lib/types';
type Briefing={company:string;objective:string;audience:string;service:string;references:string;deliverables:string;desiredDeadline:string;budget:string;constraints:string;contactPermission:string;objectiveConfirmed:boolean};
type CostLine={discipline:string;hours:string;hourly:string};
type Estimate={id:string;briefingRevision:number;parameters:{name:string;taxBps:number};calculation:{laborCents:number;subtotalCents:number;riskCents:number;totalCostCents:number;minimumCents:number;recommendedCents:number}};
type Version={id:string;number:number;briefingRevision:number;content:string;createdAt:string;approval:{id:string;status:string}|null};
type Dossier={id:string;leadId:string|null;revision:number;data:Briefing;estimates?:Estimate[];proposals?:Version[];missing?:string[]};
const empty:Briefing={company:'',objective:'',audience:'',service:'landing_page',references:'',deliverables:'',desiredDeadline:'',budget:'',constraints:'',contactPermission:'unknown',objectiveConfirmed:false};
const money=(n:number)=>(n/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function decimal(value:string,multiplier:number){
  if(!/^\d+(?:[.,]\d{1,2})?$/.test(value.trim()))throw new Error('Preencha todos os valores numéricos, usando vírgula ou ponto decimal, sem separador de milhar.');
  const result=Number(value.replace(',','.'))*multiplier;
  if(Math.abs(result-Math.round(result))>0.00001)throw new Error('Use até duas casas decimais.');
  return Math.round(result);
}
async function request<T>(path:string,method='GET',body?:unknown):Promise<T>{
  const r=await fetch('/api/commercial/'+path,{method,cache:'no-store',...(body===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
  const data=await r.json();if(!r.ok)throw new Error(data.error||'Não foi possível concluir.');return data;
}
export default function CommercialWorkbench({leads,onOpenApprovals}:{leads:Lead[];onOpenApprovals:()=>void}){
  const [items,setItems]=useState<Dossier[]>([]),[current,setCurrent]=useState<Dossier|null>(null),[data,setData]=useState<Briefing>(empty),[leadId,setLeadId]=useState('');
  const [step,setStep]=useState<'briefing'|'cost'|'versions'>('briefing'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[dirty,setDirty]=useState(false);
  const [lines,setLines]=useState<CostLine[]>([{discipline:'',hours:'',hourly:''}]);
  const [cost,setCost]=useState({name:'',fixed:'',tools:'',tax:'',risk:'',margin:''}),[confirmed,setConfirmed]=useState(false);
  const [estimateId,setEstimateId]=useState('');
  const [terms,setTerms]=useState({price:'',validity:'',timeline:'',paymentTerms:'',exclusions:'',milestones:'',revisions:''});
  const [commercialConfirmed,setCommercialConfirmed]=useState(false),[discountApproved,setDiscountApproved]=useState(false);
  const [compare,setCompare]=useState('');
  function resetCalculation(){setLines([{discipline:'',hours:'',hourly:''}]);setCost({name:'',fixed:'',tools:'',tax:'',risk:'',margin:''});setConfirmed(false);setTerms({price:'',validity:'',timeline:'',paymentTerms:'',exclusions:'',milestones:'',revisions:''});}
  async function list(){const result=await request<{briefings:Dossier[]}>('briefings');setItems(result.briefings);}
  useEffect(()=>{void list().catch(()=>setError('Não foi possível carregar os briefings salvos.'));},[]);
  useEffect(()=>{
    const guard=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue='';}};
    window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);
  },[dirty]);
  function edit(key:keyof Briefing,value:string|boolean){setData(v=>({...v,[key]:value}));setDirty(true);setCommercialConfirmed(false);}
  async function act(fn:()=>Promise<void>){setBusy(true);setError('');setNotice('');try{await fn();}catch(e){setError(e instanceof Error?e.message:'Falha na operação.');}finally{setBusy(false);}}
  async function open(id:string){await act(async()=>{
    const result=await request<Dossier>('briefings/'+id);setCurrent(result);setData(result.data);setLeadId(result.leadId||'');setDirty(false);setEstimateId('');setCommercialConfirmed(false);setDiscountApproved(false);setCompare('');resetCalculation();setStep('briefing');
  });}
  async function reload(){if(current)setCurrent(await request<Dossier>('briefings/'+current.id));await list();}
  async function save(){await act(async()=>{
    const result=await request<Dossier>('briefings'+(current?'/'+current.id:''),current?'PUT':'POST',{leadId:leadId||null,data,...(current?{expectedRevision:current.revision}:{})});
    setCurrent(await request<Dossier>('briefings/'+result.id));setData(result.data);setDirty(false);setEstimateId('');setCommercialConfirmed(false);await list();
    setNotice(`Briefing salvo · revisão ${result.revision}. ${result.missing?.length?'Ainda há campos a confirmar.':'Pronto para preparar uma proposta.'}`);
  });}
  async function calculate(){await act(async()=>{
    if(!current||dirty)throw new Error('Salve o briefing antes de calcular.');
    if(!confirmed)throw new Error('Confirme os parâmetros informados.');
    const result=await request<Estimate>(`briefings/${current.id}/estimates`,'POST',{expectedRevision:current.revision,parameters:{name:cost.name,parametersConfirmed:true,lines:lines.map(l=>({discipline:l.discipline,minutes:decimal(l.hours,60),hourlyCostCents:decimal(l.hourly,100)})),fixedCostCents:decimal(cost.fixed,100),toolsCents:decimal(cost.tools,100),taxBps:decimal(cost.tax,100),riskBps:decimal(cost.risk,100),marginBps:decimal(cost.margin,100)}});
    await reload();setEstimateId(result.id);setCommercialConfirmed(false);setDiscountApproved(false);setNotice('Cenário e memorial de cálculo salvos. O investimento final continua sob sua decisão.');
  });}
  const estimate=current?.estimates?.find(x=>x.id===estimateId);
  async function createVersion(){await act(async()=>{
    if(!current||dirty||!estimate)throw new Error('Salve o briefing e selecione um cálculo da revisão atual.');
    await request(`briefings/${current.id}/versions`,'POST',{estimateId,expectedRevision:current.revision,priceCents:decimal(terms.price,100),commercialConfirmed,discountApproved,validity:terms.validity,timeline:terms.timeline,paymentTerms:terms.paymentTerms,exclusions:terms.exclusions,milestones:terms.milestones,revisions:terms.revisions});
    await reload();setNotice('Nova versão imutável criada e enviada à sua Central de Aprovações. Nenhuma mensagem foi enviada ao cliente.');setCommercialConfirmed(false);
  });}
  return <section className="panel sales-panel commercial-workbench">
    <div className="sales-heading"><span className="eyebrow">ESTEIRA COMERCIAL</span><h2>Do briefing à proposta PDF.</h2><p>Salve o contexto, compare custos e mantenha cada versão da proposta.</p></div>
    <fieldset className="sales-form commercial-fields" disabled={busy}>
      <label>Retomar briefing salvo<select aria-label="Retomar briefing salvo" disabled={busy||dirty} value={current?.id||''} onChange={e=>{if(e.target.value)void open(e.target.value);}}><option value="">Selecione um briefing</option>{items.map(x=><option key={x.id} value={x.id}>{x.data.company||'Sem nome'} · revisão {x.revision}</option>)}</select></label>
      <button type="button" className="btn-outline" disabled={busy||dirty} onClick={()=>{setCurrent(null);setData(empty);setLeadId('');setEstimateId('');setCompare('');setCommercialConfirmed(false);setDiscountApproved(false);resetCalculation();setStep('briefing');}}>Novo briefing</button>
      {dirty&&<p role="status">Alterações não salvas. Salve antes de trocar de briefing ou sair desta aba.</p>}
      <div className="sales-tabbar">{(['briefing','cost','versions'] as const).map((s,i)=><button type="button" key={s} className={step===s?'active':''} onClick={()=>setStep(s)}>{i+1}. {s==='briefing'?'Briefing':s==='cost'?'Custo e preço':'Propostas e PDF'}</button>)}</div>
      {error&&<p className="sales-message error" role="alert">{error}</p>}{notice&&<p className="sales-message success" role="status">{notice}</p>}
      {step==='briefing'&&<>
        <label>Contato do CRM (opcional)<select value={leadId} disabled={Boolean(current)||busy} onChange={e=>{setLeadId(e.target.value);setData({...empty,company:leads.find(x=>x.id===e.target.value)?.name||''});setDirty(true);}}><option value="">Cliente sem vínculo no CRM</option>{leads.map(l=><option value={l.id} key={l.id}>{l.name}</option>)}</select></label>
        <label>Empresa<input value={data.company} readOnly={Boolean(leadId)} maxLength={140} onChange={e=>edit('company',e.target.value)}/></label>
        <label>Serviço<select value={data.service} onChange={e=>edit('service',e.target.value)}>{[['landing_page','Landing page'],['site_institucional','Site institucional'],['identidade_visual','Identidade visual'],['ux_ui','UI/UX'],['site_redesign','Redesign de site']].map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label>
        {([['objective','Objetivo do projeto',800],['audience','Público',600],['deliverables','Entregáveis combinados',1400],['references','Referências',2000],['desiredDeadline','Prazo desejado',300],['budget','Orçamento informado (opcional)',300],['constraints','Restrições e premissas',1000]] as const).map(([key,label,max])=><label key={key}>{label}<textarea aria-label={label} rows={2} maxLength={max} value={data[key]} onChange={e=>edit(key,e.target.value)}/></label>)}
        <label>Permissão de contato<select value={data.contactPermission} onChange={e=>edit('contactPermission',e.target.value)}><option value="unknown">Não confirmada</option><option value="granted">Cliente autorizou contato</option><option value="denied">Cliente recusou contato</option></select><small>Registro de contexto; não autoriza envio automático nem marketing.</small></label>
        <label className="commercial-check"><input type="checkbox" checked={data.objectiveConfirmed} onChange={e=>edit('objectiveConfirmed',e.target.checked)}/> Confirmei o objetivo com o cliente</label>
        <button className="btn-primary" type="button" disabled={busy} onClick={()=>void save()}>{busy?'Salvando…':'Salvar briefing'}</button>
        {current&&<p>Revisão {current.revision} · {current.missing?.length?'Incompleto: confirme empresa, objetivo, público e entregáveis.':'Dados salvos. Abra Custo e preço para continuar.'}</p>}
      </>}
      {step==='cost'&&<>
        <p>Preencha seus custos reais. Não há valores sugeridos. Imposto e margem são percentuais sobre o preço; risco é aplicado sobre o custo.</p>
        <label>Nome do cenário<input value={cost.name} maxLength={100} onChange={e=>{setCost({...cost,name:e.target.value});setConfirmed(false);}} placeholder="Ex.: Escopo inicial"/></label>
        {lines.map((line,i)=><fieldset className="commercial-line" key={i}><legend>Disciplina {i+1}</legend>{([['discipline','Disciplina'],['hours','Horas'],['hourly','Custo por hora (R$)']] as const).map(([key,label])=><label key={key}>{label}<input inputMode={key==='discipline'?'text':'decimal'} value={line[key]} onChange={e=>{setLines(lines.map((l,j)=>i===j?{...l,[key]:e.target.value}:l));setConfirmed(false);}}/></label>)}<button type="button" className="btn-outline" disabled={lines.length===1} onClick={()=>{setLines(lines.filter((_,j)=>i!==j));setConfirmed(false);}}>Remover disciplina</button></fieldset>)}
        <button type="button" className="btn-outline" disabled={lines.length>=30} onClick={()=>{setLines([...lines,{discipline:'',hours:'',hourly:''}]);setConfirmed(false);}}>Adicionar disciplina</button>
        <div className="sales-pair">{([['fixed','Custos fixos alocados (R$)'],['tools','Ferramentas (R$)'],['tax','Impostos (%)'],['risk','Reserva de risco (%)'],['margin','Margem alvo (%)']] as const).map(([key,label])=><label key={key}>{label}<input inputMode="decimal" value={cost[key]} onChange={e=>{setCost({...cost,[key]:e.target.value});setConfirmed(false);}}/></label>)}</div>
        <label className="commercial-check"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> Conferi todos os parâmetros, inclusive os valores zero</label>
        <button type="button" className="btn-primary" disabled={busy||!current||dirty} onClick={()=>void calculate()}>Calcular e salvar cenário</button>
        {!current&&<p>Primeiro salve um briefing.</p>}
        {current?.estimates?.map(e=><article className="sales-scope" key={e.id}><strong>{e.parameters.name}</strong><p>Revisão {e.briefingRevision} {e.briefingRevision!==current.revision?'· Desatualizado após edição do briefing':''}</p><dl><dt>Custo com risco</dt><dd>{money(e.calculation.totalCostCents)}</dd><dt>Mínimo sem margem</dt><dd>{money(e.calculation.minimumCents)}</dd><dt>Preço com margem alvo</dt><dd>{money(e.calculation.recommendedCents)}</dd></dl><details><summary>Memorial completo</summary><pre className="commercial-preview">{JSON.stringify(e.calculation,null,2)}</pre></details><button type="button" className="btn-outline" disabled={e.briefingRevision!==current.revision||dirty} onClick={()=>{setEstimateId(e.id);setCommercialConfirmed(false);setDiscountApproved(false);setTerms({...terms,price:'',timeline:data.desiredDeadline});setStep('versions');}}>Usar este cenário na proposta</button></article>)}
      </>}
      {step==='versions'&&<>
        <label>Cenário de custo<select value={estimateId} onChange={e=>{setEstimateId(e.target.value);setCommercialConfirmed(false);setDiscountApproved(false);}}><option value="">Selecione</option>{current?.estimates?.filter(e=>e.briefingRevision===current.revision).map(e=><option key={e.id} value={e.id}>{e.parameters.name} · {money(e.calculation.recommendedCents)}</option>)}</select></label>
        {estimate&&<p>Referência do cálculo: {money(estimate.calculation.recommendedCents)}. Digite o investimento final abaixo.</p>}
        {([['price','Investimento final (R$)'],['validity','Validade da proposta'],['timeline','Prazo proposto'],['paymentTerms','Condições de pagamento'],['exclusions','Exclusões e dependências'],['milestones','Marcos de entrega'],['revisions','Revisões incluídas']] as const).map(([key,label])=><label key={key}>{label}<input value={terms[key]} maxLength={key==='price'?16:key==='validity'?200:key==='timeline'||key==='paymentTerms'?300:key==='revisions'?500:1000} onChange={e=>{setTerms({...terms,[key]:e.target.value});setCommercialConfirmed(false);setDiscountApproved(false);}}/></label>)}
        <label className="commercial-check"><input type="checkbox" checked={discountApproved} onChange={e=>setDiscountApproved(e.target.checked)}/> Aprovo explicitamente o desconto, caso o investimento fique abaixo do preço com margem alvo</label>
        <label className="commercial-check"><input type="checkbox" checked={commercialConfirmed} onChange={e=>setCommercialConfirmed(e.target.checked)}/> Conferi escopo, investimento e condições desta versão</label>
        <button type="button" className="btn-primary" disabled={busy||dirty||!estimate||!commercialConfirmed} onClick={()=>void createVersion()}>Criar versão para aprovação</button>
        <button type="button" className="btn-outline" onClick={onOpenApprovals}>Abrir Central de Aprovações</button>
        <button type="button" className="btn-outline" disabled={busy||!current} onClick={()=>void act(reload)}>Atualizar status das versões</button>
        {current?.proposals?.map(v=><article className="sales-scope" key={v.id}><strong>Versão {v.number}</strong><p>Briefing rev. {v.briefingRevision} · {v.approval?.status==='approved'?'Aprovada internamente':v.approval?.status==='rejected'?'Rejeitada':'Aguardando aprovação'} · {new Date(v.createdAt).toLocaleString('pt-BR')}</p><a className="btn-outline" href={`/api/commercial/versions/${v.id}/pdf`}>Baixar PDF v{v.number}</a><details><summary>Conteúdo preservado</summary><pre className="commercial-preview">{v.content}</pre></details><button type="button" className="btn-outline" onClick={()=>setCompare(v.id)}>Comparar com versão mais recente</button></article>)}
        {compare&&current?.proposals?.[0]&&<div className="commercial-comparison">{[current.proposals.find(v=>v.id===compare),current.proposals[0]].filter((v):v is Version=>Boolean(v)).map((v,i)=><div key={i}><h3>Versão {v.number}</h3><pre className="commercial-preview">{v.content}</pre></div>)}</div>}
        <p>Versões não são editadas nem apagadas. Para mudar condições, crie uma nova versão. Aprovação interna não equivale a aceite do cliente; o PDF não é enviado automaticamente.</p>
      </>}
    </fieldset>
  </section>;
}
