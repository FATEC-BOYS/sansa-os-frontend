"use client";

import {useEffect,useState} from "react";
import {ArrowRight,Check,CheckCircle2,ChevronDown,ExternalLink,Globe2,LoaderCircle,MapPin,Mail,MessageCircle,Search,ShieldCheck,Sparkles} from "lucide-react";

type Candidate={
  sourceKey:string;name:string;category:string;lat:number;lon:number;website:string|null;
  socialListed:boolean;priorityScore:number;evidence:string[];confidence:"low"|"medium";
  alreadyInCrm?:boolean;alreadyShortlisted?:boolean;
};
type SavedProspect={
  id:string;sourceKey:string;name:string;category:string;website:string|null;
  priorityScore:number;scoreEvidence:string;status:string;analysisMode?:string|null;analysisSummary?:string|null;
  createdAt:string;
  contactEmail:string|null;
  contactWhatsapp:string|null;
};
type Region={key:string;label:string;lat:number;lon:number};
const regions:Region[]=[
  {key:"sbc",label:"São Bernardo · Centro",lat:-23.7080198,lon:-46.5506139},
  {key:"sa",label:"Santo André · Centro",lat:-23.6583333,lon:-46.5166667},
  {key:"scs",label:"São Caetano · Centro",lat:-23.6142821,lon:-46.5716258}
];
type Category="all"|"retail"|"food"|"beauty";
const categories:{value:Category;label:string}[]=[
  {value:"all",label:"Todos os comércios"},{value:"retail",label:"Lojas e varejo"},
  {value:"food",label:"Alimentação"},{value:"beauty",label:"Beleza"}
];
function isSafeUrl(input:string|null) {
  if(!input)return false;
  try{const url=new URL(input);return url.protocol==="https:"||url.protocol==="http:";}catch{return false;}
}
async function callApi<T>(path:string,method:"GET"|"POST"|"PATCH",body?:unknown):Promise<T> {
  const response=await fetch(path,{
    method,headers:{"Content-Type":"application/json"},
    ...(body!==undefined?{body:JSON.stringify(body)}:{}),
    cache:"no-store"
  });
  const payload=await response.json().catch(()=>null) as {error?:string}|null;
  if(!response.ok)throw new Error(payload?.error||`Erro HTTP ${response.status}`);
  return payload as T;
}
function ShortlistBadge({status}:{status:string}){return <span className="radar-badge"><Check size={13}/>{status}</span>;}

export default function LocalRadar({onOpenApprovals}:{onOpenApprovals:()=>void}) {
  const [region,setRegion]=useState("sbc");
  const [radius,setRadius]=useState(1200);
  const [category,setCategory]=useState<Category>("all");
  const [candidates,setCandidates]=useState<Candidate[]>([]);
  const [saved,setSaved]=useState<SavedProspect[]>([]);
  const [hasSearched,setHasSearched]=useState(false);
  const [searching,setSearching]=useState(false);
  const [saving,setSaving]=useState<string|null>(null);
  const [drafting,setDrafting]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [notice,setNotice]=useState<string|null>(null);
  const [lastMode,setLastMode]=useState<"ai"|"rules"|null>(null);
  const [showSaved,setShowSaved]=useState(true);
  const [editingContactId,setEditingContactId]=useState<string|null>(null);
  const [contactForm,setContactForm]=useState({email:"",whatsapp:""});
  const [savingContacts,setSavingContacts]=useState(false);

  async function loadSaved() {
    const items=await callApi<SavedProspect[]>("/api/discovery/prospects","GET");
    setSaved(items);
    return items;
  }
  useEffect(()=>{void loadSaved().catch(()=>{});},[]);

  async function search() {
    setError(null);setNotice(null);setSearching(true);
    try {
      const point=regions.find(item=>item.key===region)!;
      const data=await callApi<{candidates:Candidate[]}>("/api/discovery/search","POST",{
        lat:point.lat,lon:point.lon,radius,category
      });
      setCandidates(data.candidates);
      setHasSearched(true);
      setNotice(`${data.candidates.length} estabelecimentos encontrados. Os sinais são preliminares, sem auditoria do negócio.`);
    }catch(e){setError(e instanceof Error?e.message:"Erro ao pesquisar estabelecimentos");}
    finally{setSearching(false);}
  }
  async function shortlist(item:Candidate){
    setError(null);setNotice(null);setSaving(item.sourceKey);
    try{
      await callApi("/api/discovery/prospects","POST",{
        sourceKey:item.sourceKey,name:item.name,category:item.category,lat:item.lat,lon:item.lon,
        website:item.website,socialListed:item.socialListed,priorityScore:item.priorityScore,evidence:item.evidence
      });
      setCandidates(previous=>previous.map(candidate=>candidate.sourceKey===item.sourceKey?{...candidate,alreadyShortlisted:true}:candidate));
      await loadSaved();
      setNotice(`${item.name} salvo para pesquisa. O CRM original não foi alterado.`);
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível salvar");}
    finally{setSaving(null);}
  }
  function editContacts(item:SavedProspect){
    setEditingContactId(item.id);
    setContactForm({email:item.contactEmail??"",whatsapp:item.contactWhatsapp??""});
    setError(null);
  }
  async function saveContacts(event:React.FormEvent<HTMLFormElement>,item:SavedProspect){
    event.preventDefault();
    setSavingContacts(true);
    setError(null);setNotice(null);
    try{
      await callApi(`/api/discovery/prospects/${encodeURIComponent(item.id)}/contacts`,"PATCH",{
        email:contactForm.email.trim()||null,
        whatsapp:contactForm.whatsapp.trim()||null
      });
      await loadSaved();
      setEditingContactId(null);
      setNotice(`Contatos de ${item.name} atualizados. Nenhuma mensagem enviada.`);
    }catch(e){setError(e instanceof Error?e.message:"Erro ao salvar contatos");}
    finally{setSavingContacts(false);}
  }
  async function draft(item:SavedProspect,channel:"email"|"whatsapp"){
    setError(null);setNotice(null);setDrafting(item.id+":"+channel);
    try{
      const result=await callApi<{mode?:"ai"|"rules";reused?:boolean}>(
        `/api/discovery/prospects/${encodeURIComponent(item.id)}/draft`,"POST",{channel}
      );
      setLastMode(result.mode??null);
      setNotice(result.reused?
        `Já existe um rascunho de ${channel==="email"?"e-mail":"WhatsApp"} pendente para este comércio. Abra Aprovações para revisar.`:
        result.mode==="ai"?
          "Análise com IA registrada e rascunho criado para revisão — nada foi enviado.":
          "Rascunho conservador por regras criado. Configure OPENAI_API_KEY no backend para usar IA."
      );
      await loadSaved();
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível preparar proposta");}
    finally{setDrafting(null);}
  }
  const trackedKeys=new Set(saved.map(x=>x.sourceKey));
  const duplicateCount=candidates.filter(x=>x.alreadyInCrm||x.alreadyShortlisted||trackedKeys.has(x.sourceKey)).length;
  return <div className="radar-root">
    <div className="radar-hero">
      <div><span className="eyebrow">SANSA OS / LOCAL INTELLIGENCE</span><h2>Encontre. Investigue. <em>Proponha.</em></h2>
      <p>Uma pesquisa comercial orientada por evidências — antes de qualquer contato.</p></div>
      <div className="radar-hero-icon"><MapPin size={37}/></div>
    </div>
    <section className="panel radar-search-panel">
      <div className="radar-section-heading"><div><span className="eyebrow">01 / DESCOBERTA</span><h2>Explorar comércios</h2></div><span className="radar-subtle">Busca manual · OSM</span></div>
      <div className="radar-search-controls">
        <label>Região
          <span className="radar-select-wrap"><select value={region} onChange={e=>setRegion(e.target.value)}>{regions.map(r=><option key={r.key} value={r.key}>{r.label}</option>)}</select><ChevronDown size={14}/></span>
        </label>
        <label>Segmento
          <span className="radar-select-wrap"><select value={category} onChange={e=>setCategory(e.target.value as Category)}>{categories.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</select><ChevronDown size={14}/></span>
        </label>
        <label>Raio
          <span className="radar-select-wrap"><select value={radius} onChange={e=>setRadius(Number(e.target.value))}>
            <option value={600}>600 metros</option><option value={1200}>1,2 km</option><option value={2000}>2 km</option><option value={3000}>3 km</option>
          </select><ChevronDown size={14}/></span>
        </label>
        <button className="btn-primary radar-search-button" onClick={()=>void search()} disabled={searching||saving!==null||drafting!==null}>
          {searching?<LoaderCircle size={17} className="spin"/>:<Search size={17}/>}
          {searching?"Pesquisando...":"Buscar comércios"}
        </button>
      </div>
      <p className="radar-credit">Fonte: © OpenStreetMap contributors (ODbL). Respeitamos um intervalo mínimo entre pesquisas. Um campo vazio no mapa não prova ausência de site ou problema de marketing.</p>
    </section>

    {error&&<div className="alert alert-error"><ShieldCheck size={17}/><p>{error}</p><button onClick={()=>setError(null)} aria-label="Fechar">×</button></div>}
    {notice&&<div className="alert alert-success"><CheckCircle2 size={17}/><p>{notice}</p><button onClick={()=>setNotice(null)} aria-label="Fechar">×</button></div>}
    {lastMode==="ai"&&<p className="radar-muted">A análise contextual foi realizada com modelo configurado no backend; revise afirmações antes de usar.</p>}

    <section className="panel radar-results">
      <div className="radar-section-heading"><div><span className="eyebrow">02 / TRIAGEM</span><h2>Potenciais oportunidades</h2><p>Ranking explicável de prioridade de investigação, não avaliação definitiva de qualidade.</p></div>
        <span className="radar-count">{hasSearched?`${candidates.length} encontrados · ${duplicateCount} já conhecidos`:"Ainda sem pesquisa"}</span></div>
      {!hasSearched?<div className="radar-empty"><Search size={28}/><h3>Comece pela sua região</h3><p>Escolha um segmento e busque estabelecimentos. Nenhum comércio é abordado automaticamente.</p></div>:
        candidates.length===0?<div className="radar-empty"><MapPin size={28}/><h3>Nenhum resultado nesta área</h3><p>Tente outro segmento ou aumente o raio.</p></div>:
        <div className="radar-card-grid">{candidates.map(candidate=>{
          const known=Boolean(candidate.alreadyInCrm);
          const inQueue=Boolean(candidate.alreadyShortlisted||trackedKeys.has(candidate.sourceKey));
          const disabled=known||inQueue||saving!==null||drafting!==null;
          return <article className="radar-card" key={candidate.sourceKey}>
            <div className="radar-card-head"><span className="radar-category">{candidate.category}</span><span className="radar-score" title="Prioridade preliminar, não nota de qualidade">{candidate.priorityScore}<small>/100</small></span></div>
            <h3>{candidate.name}</h3>
            <div className="radar-signals">
              <span className={candidate.website?"radar-signal positive":"radar-signal"}><Globe2 size={13}/>{candidate.website?"URL cadastrada":"Site não informado no OSM"}</span>
              {candidate.socialListed&&<span className="radar-signal positive">Rede social cadastrada</span>}
            </div>
            <p className="radar-reason">{candidate.evidence.find(x=>x.includes("afinidade")||x.includes("potencial"))||candidate.evidence[0]}</p>
            <div className="radar-actions">
              {isSafeUrl(candidate.website)&&<a href={candidate.website!} rel="noopener noreferrer" target="_blank" className="radar-website">Ver site <ExternalLink size={13}/></a>}
              {known?<span className="radar-known">No CRM existente</span>:inQueue?<ShortlistBadge status="Na fila"/>:
                <button className="btn-primary small" onClick={()=>void shortlist(candidate)} disabled={disabled}>
                  {saving===candidate.sourceKey?<LoaderCircle size={13} className="spin"/>:<ArrowRight size={13}/>} Investigar
                </button>}
            </div>
          </article>;
        })}</div>}
    </section>

    <section className="panel radar-shortlist">
      <button className="radar-toggle" onClick={()=>setShowSaved(!showSaved)} aria-expanded={showSaved}><div><span className="eyebrow">03 / PESQUISA</span><h2>Fila de investigação <span>({saved.length})</span></h2></div><ChevronDown className={showSaved?"":"rotated"} size={20}/></button>
      {showSaved&&(saved.length===0?<div className="radar-empty slim"><Sparkles size={25}/><p>Selecione um comércio acima para iniciar uma análise individual.</p></div>:
        <div className="radar-saved-list">{saved.map(item=><article key={item.id} className="radar-saved-row">
          <div className="radar-saved-info">
            <div className="radar-saved-name">{item.name} <span>· {item.category}</span></div>
            <p>Prioridade {item.priorityScore}/100 · {item.analysisMode==="ai"?"Analisado com IA":item.analysisMode==="rules"?"Análise baseada em regras":"Aguardando análise"}</p>
            {item.analysisSummary&&<p className="radar-saved-summary">{item.analysisSummary}</p>}
            <div className="radar-contact-summary">
              <span><Mail size={13}/>{item.contactEmail || "E-mail não cadastrado"}</span>
              <span><MessageCircle size={13}/>{item.contactWhatsapp || "WhatsApp não cadastrado"}</span>
            </div>
            {editingContactId===item.id
              ? <form className="radar-contact-form" onSubmit={event=>void saveContacts(event,item)}>
                  <label>E-mail comercial
                    <input type="email" maxLength={254} placeholder="contato@empresa.com.br" value={contactForm.email}
                      onChange={e=>setContactForm({...contactForm,email:e.target.value})}/>
                  </label>
                  <label>WhatsApp com DDD
                    <input type="tel" inputMode="tel" maxLength={30} placeholder="(11) 99999-9999" value={contactForm.whatsapp}
                      onChange={e=>setContactForm({...contactForm,whatsapp:e.target.value})}/>
                  </label>
                  <div className="radar-contact-buttons">
                    <button type="button" className="btn-ghost small" disabled={savingContacts} onClick={()=>setEditingContactId(null)}>Cancelar</button>
                    <button type="submit" className="btn-primary small" disabled={savingContacts}>
                      {savingContacts?"Salvando...":"Salvar contatos"}
                    </button>
                  </div>
                  <small>Deixe um campo vazio e salve para apagá-lo. Cadastre apenas contatos comerciais apropriados.</small>
                </form>
              : <button className="radar-edit-button" type="button" onClick={()=>editContacts(item)}>Cadastrar / editar contatos</button>}
          </div>
          <div className="radar-proposal-actions">
            <button className="btn-outline small" disabled={!item.contactWhatsapp||drafting!==null||savingContacts} onClick={()=>void draft(item,"whatsapp")}
              title={!item.contactWhatsapp?"Cadastre um WhatsApp primeiro":undefined}>
              {drafting===item.id+":whatsapp"?<LoaderCircle size={15} className="spin"/>:<MessageCircle size={15}/>}
              Proposta WhatsApp
            </button>
            <button className="btn-outline small" disabled={!item.contactEmail||drafting!==null||savingContacts} onClick={()=>void draft(item,"email")}
              title={!item.contactEmail?"Cadastre um e-mail primeiro":undefined}>
              {drafting===item.id+":email"?<LoaderCircle size={15} className="spin"/>:<Mail size={15}/>}
              Proposta e-mail
            </button>
          </div>
        </article>)}
        <button className="radar-approvals-link" onClick={onOpenApprovals}>Revisar rascunhos na central de aprovações <ArrowRight size={16}/></button>
        </div>)}
    </section>
    <div className="radar-warning"><ShieldCheck size={17}/><p>Depois da aprovação, você abre a proposta no WhatsApp ou no e-mail e envia manualmente. Os contatos podem ser corrigidos a qualquer momento; o CRM original e as automações externas não são alterados.</p></div>
  </div>;
}
