"use client";

import {useEffect,useMemo,useState} from "react";
import {ArrowRight,CheckCircle2,ChevronDown,ClipboardCheck,FileText,LoaderCircle,PencilLine,ShieldCheck} from "lucide-react";

type PackageKey="essencial"|"completo"|"sob_medida";
type ServiceId="landing_page"|"site_institucional"|"identidade_visual"|"ux_ui"|"site_redesign";
type CatalogService={id:ServiceId;name:string;shortDescription:string;packages:Record<PackageKey,{label:string;deliverables:string[];note:string}>};
type Catalog={services:CatalogService[];pricing:string;payment:string};
type Objection="price"|"timeline"|"scope"|"competitor"|"payment"|"followup";
const objections:{value:Objection;label:string}[]=[
  {value:"price",label:"Achou o investimento alto"},
  {value:"timeline",label:"Precisa de um prazo menor"},
  {value:"scope",label:"Quer adicionar ou mudar entregas"},
  {value:"competitor",label:"Está comparando fornecedores"},
  {value:"payment",label:"Quer negociar as condições de pagamento"},
  {value:"followup",label:"Acompanhamento respeitoso da proposta"}
];
type ProposalForm={
  clientName:string;service:ServiceId;package:PackageKey;goal:string;customScope:string;
  price:string;timeline:string;paymentTerms:string;dependencies:string;
};
const initial:ProposalForm={
  clientName:"",service:"landing_page",package:"essencial",goal:"",customScope:"",
  price:"",timeline:"",paymentTerms:"",dependencies:""
};
function parseBrlPrice(value:string):number|null {
  if(!value.trim())return null;
  const cleaned=value.trim().replace(/^R\$\s*/i,"").replace(/\s+/g,"");
  // Use Brazilian decimal comma; no implicit pricing or locale-ambiguous conversion.
  if(!/^(?:\d{1,9}|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(cleaned))throw new Error("Informe o valor em reais como 2500,00 ou 2.500,00.");
  const normalized=cleaned.replace(/\./g,"").replace(",",".");
  const cents=Math.round(Number(normalized)*100);
  if(cents<100||cents>100000000)throw new Error("O valor deve estar entre R$ 1,00 e R$ 1.000.000,00.");
  return cents;
}
async function postJson<T>(path:string,body:unknown):Promise<T>{
  const r=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const data=await r.json().catch(()=>null) as ({error?:string}&T)|null;
  if(!r.ok)throw new Error(data?.error||"Não foi possível gerar o rascunho.");
  return data as T;
}

export default function SalesStudio({onOpenApprovals}:{onOpenApprovals:()=>void}){
  const [tab,setTab]=useState<"proposal"|"negotiation">("proposal");
  const [catalog,setCatalog]=useState<Catalog|null>(null);
  const [form,setForm]=useState<ProposalForm>(initial);
  const [negotiation,setNegotiation]=useState({clientName:"",objection:"price" as Objection,context:"",agreedTerms:""});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [notice,setNotice]=useState<string|null>(null);
  useEffect(()=>{
    void fetch("/api/sales/catalog",{cache:"no-store"})
      .then(async response=>{
        if(!response.ok)throw new Error("O catálogo comercial está indisponível.");
        return await response.json() as Catalog;
      }).then(setCatalog).catch(e=>setError(e instanceof Error?e.message:"Erro ao carregar catálogo"));
  },[]);
  const service=useMemo(()=>catalog?.services.find(x=>x.id===form.service),[catalog,form.service]);
  const pack=service?.packages[form.package];
  async function createProposal(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setError(null);setNotice(null);
    let priceCents:number|null;
    try{priceCents=parseBrlPrice(form.price);}catch(e){setError(e instanceof Error?e.message:"Valor inválido");return;}
    setBusy(true);
    try{
      await postJson("/api/sales/proposal-drafts",{
        clientName:form.clientName,service:form.service,package:form.package,goal:form.goal,
        customScope:form.customScope,priceCents,timeline:form.timeline,paymentTerms:form.paymentTerms,
        dependencies:form.dependencies
      });
      setNotice("Proposta salva na Central de Aprovações. Nada foi enviado.");
      setForm(initial);
    }catch(e){setError(e instanceof Error?e.message:"Falha ao preparar proposta");}
    finally{setBusy(false);}
  }
  async function createNegotiation(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setError(null);setNotice(null);setBusy(true);
    try{
      await postJson("/api/sales/negotiation-drafts",negotiation);
      setNotice("Resposta de negociação salva para aprovação. Nenhuma condição foi alterada.");
      setNegotiation({...negotiation,context:"",agreedTerms:""});
    }catch(e){setError(e instanceof Error?e.message:"Falha ao preparar negociação");}
    finally{setBusy(false);}
  }
  return <div className="sales-root">
    <div className="sales-hero"><div><span className="eyebrow">SANSA OS / COMERCIAL</span>
      <h2>Da conversa ao <em>projeto.</em></h2>
      <p>Propostas com escopo verificável, preços sob seu controle e negociações sem promessas inventadas.</p></div>
      <PencilLine size={33}/>
    </div>
    <section className="panel sales-panel">
      <div className="sales-tabbar">
        <button className={tab==="proposal"?"active":""} onClick={()=>{setTab("proposal");setError(null);}}><FileText size={16}/> Montar proposta</button>
        <button className={tab==="negotiation"?"active":""} onClick={()=>{setTab("negotiation");setError(null);}}><ClipboardCheck size={16}/> Negociar</button>
      </div>
      {error&&<div className="sales-message error">{error}</div>}
      {notice&&<div className="sales-message success"><CheckCircle2 size={16}/>{notice}
        <button onClick={onOpenApprovals}>Revisar agora <ArrowRight size={14}/></button>
      </div>}
      {tab==="proposal"?<>
        <div className="sales-heading"><span className="eyebrow">01 / PROPOSTA COMERCIAL</span><h2>Defina o valor do projeto.</h2>
          <p>Os pacotes sugerem entregáveis. O investimento, os prazos e as condições só aparecem na proposta se você os preencher.</p></div>
        <form className="sales-form" onSubmit={e=>void createProposal(e)}>
          <label>Nome do negócio / cliente<input required maxLength={140} minLength={2} value={form.clientName} placeholder="Ex.: Ateliê da Praça" onChange={e=>setForm({...form,clientName:e.target.value})}/></label>
          <div className="sales-pair">
            <label>Serviço <span className="sales-select"><select value={form.service} onChange={e=>setForm({...form,service:e.target.value as ServiceId})} disabled={!catalog}>
              {(catalog?.services??[]).map(s=><option value={s.id} key={s.id}>{s.name}</option>)}
            </select><ChevronDown size={14}/></span></label>
            <label>Escopo sugerido <span className="sales-select"><select value={form.package} onChange={e=>setForm({...form,package:e.target.value as PackageKey})}>
              <option value="essencial">Essencial</option><option value="completo">Completo</option><option value="sob_medida">Sob medida</option>
            </select><ChevronDown size={14}/></span></label>
          </div>
          <label>Objetivo do cliente<textarea rows={3} required minLength={10} maxLength={800} placeholder="O que o projeto precisa resolver ou comunicar?" value={form.goal} onChange={e=>setForm({...form,goal:e.target.value})}/></label>
          <div className="sales-scope">
            <strong>{service?.name??"Catálogo"} · {pack?.label??""}</strong>
            <p>{pack?.note??"Carregando serviços..."}</p>
            <ul>{(pack?.deliverables??[]).map(item=><li key={item}>{item}</li>)}</ul>
            <small>Entregáveis preliminares para confirmação; não são cláusulas contratuais.</small>
          </div>
          <label>Personalização do escopo<textarea rows={2} maxLength={1400} placeholder="Páginas, aplicações ou integrações específicas discutidas com o cliente" value={form.customScope} onChange={e=>setForm({...form,customScope:e.target.value})}/></label>
          <div className="sales-pair">
            <label>Investimento em R$ (opcional)<input inputMode="decimal" placeholder="Ex.: 2.500,00" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label>
            <label>Prazo proposto (opcional)<input maxLength={300} placeholder="Ex.: a combinar após briefing" value={form.timeline} onChange={e=>setForm({...form,timeline:e.target.value})}/></label>
          </div>
          <label>Condições de pagamento (opcional)<input maxLength={300} placeholder="Só preencher quando aprovado por você" value={form.paymentTerms} onChange={e=>setForm({...form,paymentTerms:e.target.value})}/></label>
          <label>Dependências e exclusões<textarea rows={2} maxLength={500} placeholder="Ex.: domínio, hospedagem, textos, fotos, integrações e revisões a definir" value={form.dependencies} onChange={e=>setForm({...form,dependencies:e.target.value})}/></label>
          <div className="sales-submit"><p><ShieldCheck size={16}/> Sem assinatura, cobrança ou envio automático. O rascunho poderá ser editado antes da aprovação.</p>
            <button className="btn-primary" type="submit" disabled={!catalog||busy}>{busy?<LoaderCircle size={16} className="spin"/>:<ArrowRight size={16}/>} Preparar proposta</button>
          </div>
        </form>
      </>:<>
        <div className="sales-heading"><span className="eyebrow">02 / NEGOCIAÇÃO</span><h2>Negociar sem se desvalorizar.</h2>
          <p>Respostas para objeções reais. O agente preserva preço e condições até você aprovar qualquer mudança.</p></div>
        <form className="sales-form" onSubmit={e=>void createNegotiation(e)}>
          <label>Nome do negócio / cliente<input required maxLength={140} minLength={2} placeholder="Cliente com quem está conversando" value={negotiation.clientName} onChange={e=>setNegotiation({...negotiation,clientName:e.target.value})}/></label>
          <label>Tipo de objeção<span className="sales-select"><select value={negotiation.objection} onChange={e=>setNegotiation({...negotiation,objection:e.target.value as Objection})}>
            {objections.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}
          </select><ChevronDown size={14}/></span></label>
          <label>O que o cliente disse?<textarea rows={3} minLength={4} maxLength={1200} required placeholder="Registre a objeção ou o contexto real, sem dados sensíveis" value={negotiation.context} onChange={e=>setNegotiation({...negotiation,context:e.target.value})}/></label>
          <label>Condições já confirmadas, se houver<textarea rows={2} maxLength={400} placeholder="Apenas condições realmente combinadas — não criaremos outras" value={negotiation.agreedTerms} onChange={e=>setNegotiation({...negotiation,agreedTerms:e.target.value})}/></label>
          <div className="sales-submit"><p><ShieldCheck size={16}/> Sem descontos, promessas ou negociação financeira automática.</p>
            <button className="btn-primary" type="submit" disabled={busy}>{busy?<LoaderCircle size={16} className="spin"/>:<ArrowRight size={16}/>} Preparar resposta</button>
          </div>
        </form>
      </>}
    </section>
    <div className="sales-tip"><ShieldCheck size={16}/><p>Projeto fechado, faseado e recorrente são estratégias comerciais; mensalidades e cobrança de pagamentos ainda dependem de acordos aprovados e integrações financeiras futuras.</p></div>
  </div>;
}
