"use client";

import {useState} from "react";
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bot,
  Check, CheckCircle2, ChevronRight, CircleAlert, ClipboardCheck,
  Clock3, ContactRound, ExternalLink, FileText, GitBranch, LayoutDashboard,
  LockKeyhole, Mail, MapPin, MessageCircle, Plus, RefreshCw, ShieldCheck, Sparkles, X
} from "lucide-react";
import type {Overview, Lead, Approval} from "@/lib/types";
import LocalRadar from "@/components/local-radar";
import WhatsAppInbox from "@/components/whatsapp-inbox";
import {getManualOutboundLink} from "@/lib/outreach";

type Tab = "overview" | "crm" | "radar" | "whatsapp" | "approvals" | "agents" | "activity";
const nav = [
  {id:"overview",label:"Visão geral",icon:LayoutDashboard},
  {id:"crm",label:"CRM & pipeline",icon:ContactRound},
  {id:"radar",label:"Radar local",icon:MapPin},
  {id:"whatsapp",label:"WhatsApp",icon:MessageCircle},
  {id:"approvals",label:"Aprovações",icon:ClipboardCheck},
  {id:"agents",label:"Agentes",icon:Bot},
  {id:"activity",label:"Atividade",icon:Activity}
] as const;

const money = (cents:number) => (cents/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const date = (value?:string|null) => value
  ? new Date(value).toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric",timeZone:"America/Sao_Paulo"})
  : "—";
const datetime = (value?:string|null) => value
  ? new Date(value).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})
  : "Nunca";

function Status({label,kind}:{label:string,kind?:"ok"|"warning"|"muted"}) {
  return <span className={`status status-${kind ?? "muted"}`}><span className="status-dot"/>{label}</span>;
}
function EmptyState({title,description}:{title:string,description:string}) {
  return <div className="empty-state"><div className="empty-icon"><FileText size={22}/></div><h3>{title}</h3><p>{description}</p></div>;
}
function LeadTable({leads}:{leads:Lead[]}) {
  if (!leads.length) return <EmptyState title="CRM ainda não sincronizado" description="Conecte a conta de serviço no backend e clique em Sincronizar CRM. Seus registros continuarão na planilha original."/>;
  return <div className="table-scroll"><table><thead><tr><th>Contato</th><th>Origem</th><th>Etapa</th><th>Resposta</th><th>Revisar em</th><th>Decisão</th></tr></thead><tbody>
    {leads.map(lead=><tr key={lead.id}>
      <td><span className="table-main">{lead.name}</span><span className="table-sub">{lead.type || "—"}</span></td>
      <td>{lead.channel || lead.origin || "—"}</td>
      <td><span className="stage">{lead.status}</span></td>
      <td>{lead.answered ? <span className="yes"><Check size={13}/> Sim</span> : <span className="quiet">Não</span>}</td>
      <td>{date(lead.reviewAt)}</td>
      <td>{lead.decision || "—"}</td>
    </tr>)}
  </tbody></table></div>;
}
function ApprovalList({items,busy,onReview}:{items:Approval[];busy:boolean;onReview:(id:string,status:"approved"|"rejected")=>void}) {
  if (!items.length) return <EmptyState title="Nenhuma decisão pendente" description="Rascunhos e propostas de ações vão aparecer aqui antes de qualquer execução externa."/>;
  return <div className="approvals-list">{items.map(item=><article className="approval-row" key={item.id}>
    <div className="approval-top"><span className="eyebrow">{item.agent.replace("_"," ")} / {item.kind.replaceAll("_"," ")}</span>
      <Status label={item.status === "pending" ? "Aguardando" : item.status === "approved" ? "Aprovado" : "Rejeitado"} kind={item.status === "pending" ? "warning" : item.status === "approved" ? "ok" : "muted"}/></div>
    <h3>{item.title}</h3><p>{item.summary}</p><details><summary>Visualizar conteúdo</summary><pre className="draft-content">{item.content}</pre></details>
    <div className="approval-bottom"><span className="quiet">Criado em {datetime(item.createdAt)}{item.channel && ` · Canal: ${item.channel==="whatsapp"?"WhatsApp":"E-mail"}`}</span>
    {item.status === "pending" && <div className="approval-actions">
      <button className="btn-ghost small" disabled={busy} onClick={()=>onReview(item.id,"rejected")}><X size={15}/> Rejeitar</button>
      <button className="btn-primary small" disabled={busy} onClick={()=>onReview(item.id,"approved")}><Check size={15}/> Aprovar rascunho</button>
    </div>}
    {item.status==="approved" && getManualOutboundLink(item) && <a
      className="btn-primary small"
      target={item.channel==="whatsapp"?"_blank":undefined}
      rel={item.channel==="whatsapp"?"noopener noreferrer":undefined}
      href={getManualOutboundLink(item)!.href}>
      <ExternalLink size={14}/> {getManualOutboundLink(item)!.label}
    </a>}
    </div>
    {item.status==="approved"&&item.channel&&<p className="delivery-note">
      {getManualOutboundLink(item)
        ?`Destinatário atual: ${getManualOutboundLink(item)!.recipient}. A mensagem será aberta no aplicativo, mas o envio depende de você.`
        :"Cadastre ou corrija o contato na aba Radar local para habilitar a abertura da proposta."}
    </p>}
  </article>)}</div>;
}
function formatMetric(value:number|undefined):string {
  return value === undefined ? "—" : value.toLocaleString("pt-BR");
}

export default function Dashboard({initialData,connectionError}:{initialData:Overview|null;connectionError:string|null}) {
  const [data,setData] = useState<Overview|null>(initialData);
  const [tab,setTab] = useState<Tab>("overview");
  const [busy,setBusy] = useState(false);
  const [notice,setNotice] = useState<string|null>(null);
  const [error,setError] = useState<string|null>(connectionError);
  const [showComposer,setShowComposer] = useState(false);
  const [draft,setDraft] = useState({agent:"commercial",kind:"internal_note",title:"",summary:"",content:""});

  const pending = data?.approvals.filter(a=>a.status === "pending") ?? [];
  const metrics = data?.metrics;
  const connected = Boolean(data);
  const crmSynced = data?.crm.connected ?? false;

  async function refresh() {
    const response = await fetch("/api/overview",{cache:"no-store"});
    if (!response.ok) throw new Error("Não foi possível atualizar o painel.");
    setData(await response.json() as Overview);
    setError(null);
  }
  async function perform(path:string, method:"POST"|"PATCH",body:unknown,success:string) {
    setBusy(true);setNotice(null);setError(null);
    try {
      const response = await fetch(path,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      if (!response.ok) {
        const payload = await response.json().catch(()=>({error:"Erro de conexão"})) as {error?:string|object};
        throw new Error(typeof payload.error === "string" ? payload.error : "Não foi possível concluir a ação.");
      }
      await refresh();
      setNotice(success);
      return true;
    } catch(e) {
      setError(e instanceof Error ? e.message : "Erro inesperado");
      return false;
    } finally {setBusy(false);}
  }
  async function createDraft(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(await perform("/api/approvals","POST",draft,"Rascunho registrado para revisão. Nenhuma mensagem foi enviada.")) {
      setShowComposer(false);
      setDraft({agent:"commercial",kind:"internal_note",title:"",summary:"",content:""});
      setTab("approvals");
    }
  }

  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">S</div><div><div className="brand-title">SANSA<span className="brand-os"> / OS</span></div><div className="brand-sub">OFICINA DIGITAL</div></div></div>
      <div className="sidebar-label">WORKSPACE <span>01</span></div>
      <div className="nav-list">{nav.map(item=>{const Icon=item.icon;return <button key={item.id} className={`nav-item ${tab===item.id?"active":""}`} onClick={()=>setTab(item.id)}>
        <Icon size={18} strokeWidth={1.8}/><span>{item.label}</span>{item.id==="approvals" && pending.length>0 && <span className="nav-count">{pending.length}</span>}
      </button>;})}</div>
      <div className="sidebar-grow"/>
      <div className="sidebar-note"><div className="note-head"><ShieldCheck size={17}/> Controle humano</div><p>Agentes não enviam mensagens nem executam ações externas sem integração e autorização.</p></div>
      <div className="sidebar-footer"><span className="online-dot"/><span>SANSA OS · V0.1</span><span>2026</span></div>
    </aside>

    <div className="workspace">
      <header className="topbar"><div className="breadcrumb">SANSA OS <ChevronRight size={14}/> <strong>{nav.find(n=>n.id===tab)?.label}</strong></div>
        <div className="topbar-right"><span className="topbar-date">OFICINA DIGITAL</span><Status label={connected?"API conectada":"API desconectada"} kind={connected?"ok":"warning"}/></div></header>

      <main className="content">
        <div className="page-heading"><div><div className="eyebrow header-eyebrow"><span className="red-square"/> COMMAND CENTER / SANSA 001</div>
          <h1>{tab==="overview"?"Sua agência, sob controle.":tab==="crm"?"Relações que importam.":tab==="radar"?"Oportunidades perto de você.":tab==="whatsapp"?"Conversas com contexto.":tab==="approvals"?"Nada acontece no escuro.":tab==="agents"?"Inteligência com direção.":"Cada ação deixa um rastro."}</h1>
          <p className="lead-copy">{tab==="overview"?"Um lugar para acompanhar trabalho real, decisões e integrações — sem prometer automação que ainda não existe.":tab==="crm"?"O mesmo CRM de sempre. Agora com uma visão operacional, sem duplicar a fonte dos dados.":tab==="radar"?"Encontre comércios locais, investigue sinais verificáveis e prepare uma abordagem antes de decidir enviar.":tab==="whatsapp"?"Fluxo de atendimento preparado para a Meta. Nenhuma mensagem sai automaticamente.":tab==="approvals"?"Propostas ficam registradas para sua decisão. Aprovar não executa nem envia nada nesta versão.":tab==="agents"?"Especificações versionadas, ferramentas restritas e status verificável.":"Histórico de sincronizações e decisões registradas no backend."}</p></div>
          <div className="page-actions"><button disabled={busy} className="btn-outline" onClick={()=>void perform("/api/crm/sync","POST",{},"CRM sincronizado. Planilha original preservada.")}><RefreshCw size={16} className={busy?"spin":""}/> Sincronizar CRM</button>
            <button className="btn-primary" onClick={()=>setShowComposer(true)}><Plus size={17}/> Nova ação</button></div>
        </div>

        {error && <div className="alert alert-error"><CircleAlert size={18}/><div><strong>Atenção</strong><p>{error}</p></div><button aria-label="Fechar aviso" onClick={()=>setError(null)}><X size={16}/></button></div>}
        {notice && <div className="alert alert-success"><CheckCircle2 size={18}/><p>{notice}</p><button aria-label="Fechar aviso" onClick={()=>setNotice(null)}><X size={16}/></button></div>}

        {tab==="overview" && <>
          <div className="hero-strip"><div><span className="hero-kicker">VISÃO OPERACIONAL</span><h2>Uma oficina. <em>Muitas inteligências.</em><br/> Uma só direção.</h2></div><div className="hero-right"><div className="hero-symbol">✳</div><span>CREATE / CONNECT / CONTROL</span></div></div>

          <div className="metrics-grid">
            <div className="metric-card"><div className="metric-label">Registros no CRM <ContactRound size={17}/></div><div className="metric-number">{formatMetric(metrics?.records)}</div><div className="metric-caption">Contatos e oportunidades cadastrados</div></div>
            <div className="metric-card"><div className="metric-label">Responderam <ArrowUpRight size={17}/></div><div className="metric-number">{formatMetric(metrics?.responded)}</div><div className="metric-caption">Respostas registradas na planilha</div></div>
            <div className="metric-card"><div className="metric-label">Propostas enviadas <FileText size={17}/></div><div className="metric-number">{formatMetric(metrics?.proposals)}</div><div className="metric-caption">Etapa, não confirmação de contrato</div></div>
            <div className="metric-card"><div className="metric-label">Receita fechada <ArrowDownRight size={17}/></div><div className="metric-number money">{metrics?money(metrics.revenueCents):"—"}</div><div className="metric-caption">Conforme campo de fechamento no CRM</div></div>
          </div>

          <div className="two-col">
            <section className="panel priority-panel"><div className="panel-top"><div><span className="eyebrow">DECISION DESK</span><h2>Fila de aprovações</h2></div><button className="icon-link" onClick={()=>setTab("approvals")} aria-label="Abrir aprovações"><ArrowUpRight size={20}/></button></div>
              <div className="decision-count"><span>{connected?pending.length:"—"}</span><div>ações esperando<br/>sua decisão</div></div>
              {pending.length>0?<div className="pending-preview">{pending.slice(0,3).map(item=><div className="pending-item" key={item.id}><span className="pending-dot"/><div><strong>{item.title}</strong><small>{item.summary}</small></div><ChevronRight size={16}/></div>)}</div>:<div className="soft-empty">Nenhuma ação aguardando aprovação no momento.</div>}
              <button className="panel-link" onClick={()=>setTab("approvals")}>Abrir central de decisões <ArrowRight size={16}/></button>
            </section>
            <section className="panel"><div className="panel-top"><div><span className="eyebrow">SYSTEM CHECK</span><h2>Estado das integrações</h2></div><GitBranch size={20} className="muted-icon"/></div>
              <div className="integration-list">
                <div className="integration"><div className="integration-symbol"><ContactRound size={19}/></div><div><strong>Google Sheets · CRM</strong><small>{crmSynced?`Última leitura: ${datetime(data?.crm.lastSyncedAt)}`:"Aguardando primeira sincronização"}</small></div><Status label={crmSynced?"Sincronizado":"Pendente"} kind={crmSynced?"ok":"warning"}/></div>
                <div className="integration"><div className="integration-symbol"><Bot size={19}/></div><div><strong>Execução de agentes</strong><small>Worker separado na Railway · comercial e operações</small></div>
                  <Status label={data?.agents.some(a=>a.lastRunAt)?"Com histórico":"Sem execução"} kind={data?.agents.some(a=>a.status==="scheduled_active")?"ok":"warning"}/></div>
                <div className="integration"><div className="integration-symbol"><Mail size={19}/></div><div><strong>Gmail</strong><small>Sem envio automático no SANSA OS</small></div><Status label="Não conectado"/></div>
                <div className="integration"><div className="integration-symbol"><LockKeyhole size={19}/></div><div><strong>Automações do ChatGPT</strong><small>Existem fora deste sistema; preservadas</small></div><Status label="Externas"/></div>
              </div>
            </section>
          </div>

          <div className="two-col lower-grid">
            <section className="panel"><div className="panel-top"><div><span className="eyebrow">SALES PIPELINE</span><h2>Seu funil, sem suposições</h2></div><button className="icon-link" onClick={()=>setTab("crm")} aria-label="Abrir CRM"><ArrowUpRight size={19}/></button></div>
              {!metrics?<div className="soft-empty">Conecte o backend para carregar dados reais.</div>:<div className="funnel">
                {([{label:"Registros",count:metrics.records},{label:"Responderam",count:metrics.responded},{label:"Propostas",count:metrics.proposals},{label:"Fechados",count:metrics.closed}]).map((step,i)=><div className="funnel-row" key={step.label}><span>{step.label}</span><div className="funnel-track"><div style={{width:`${metrics.records>0?(100*step.count/metrics.records):0}%`}} className={`funnel-fill fill-${i}`}/></div><strong>{step.count}</strong></div>)}
              </div>}
              <div className="footnote">Os valores refletem os estados importados, não uma classificação automática de conversão.</div>
            </section>
            <section className="panel"><div className="panel-top"><div><span className="eyebrow">LATEST ACTIVITY</span><h2>Últimos movimentos</h2></div><Clock3 size={19} className="muted-icon"/></div>
              {!data?.activities.length?<div className="soft-empty">Ainda não há eventos registrados no SANSA OS.</div>:<div className="timeline">{data.activities.slice(0,4).map(item=><div className="timeline-item" key={item.id}><span className="timeline-dot"/><div><strong>{item.message}</strong><small>{datetime(item.createdAt)}</small></div></div>)}</div>}
              <button className="panel-link" onClick={()=>setTab("activity")}>Ver histórico <ArrowRight size={16}/></button>
            </section>
          </div>
        </>}

        {tab==="crm" && <section className="panel table-panel"><div className="panel-top"><div><span className="eyebrow">SINGLE SOURCE OF TRUTH</span><h2>Oportunidades e contatos</h2><p>Espelho somente leitura dos dados atuais do Google Sheets.</p></div><div className="row-actions"><span className="count-chip">{data?.leads.length ?? 0} registros</span><span className="quiet">Fonte: CRM existente</span></div></div>
          <LeadTable leads={data?.leads ?? []}/><div className="footnote">Atualizado em: {datetime(data?.crm.lastSyncedAt)} · Alterações de oportunidades devem ser feitas na planilha original.</div></section>}

        {tab==="radar" && <LocalRadar onOpenApprovals={()=>{setTab("approvals");void refresh().catch(()=>{});}}/>}

        {tab==="whatsapp" && <WhatsAppInbox onOpenApprovals={()=>{setTab("approvals");void refresh().catch(()=>{});}}/>}

        {tab==="approvals" && <section className="panel approval-panel"><div className="panel-top"><div><span className="eyebrow">HUMAN IN THE LOOP</span><h2>Central de decisões</h2><p>Após aprovar, abra a mensagem no WhatsApp ou no aplicativo de e-mail para conferir e enviar manualmente.</p></div><Status label={`${pending.length} pendente(s)`} kind={pending.length?"warning":"muted"}/></div><ApprovalList items={data?.approvals ?? []} busy={busy} onReview={(id,status)=>void perform("/api/approvals/"+id,"PATCH",{status},"Decisão registrada. Nenhuma ação externa executada.")}/></section>}

        {tab==="agents" && <><div className="agent-banner"><Sparkles size={20}/><div><strong>{data?.agents.some(a=>a.lastRunAt)?"Execuções registradas pelo worker na Railway.":"Agentes prontos para executar na Railway."}</strong>
            <p>O Comercial prepara apenas propostas revisáveis de oportunidades elegíveis; Operações verifica o estado real do sistema. Os demais agentes seguem em preparação. Nenhum deles envia mensagens automaticamente.</p></div></div>
          <div className="agent-grid">{(data?.agents ?? [
            {id:"commercial",name:"Comercial",description:"Prospeção e qualificação",status:"not_connected"},
            {id:"customer_success",name:"Atendimento",description:"Triagem e atendimento",status:"not_connected"},
            {id:"creative",name:"Criação",description:"Briefings e conteúdo",status:"not_connected"},
            {id:"projects",name:"Projetos",description:"Escopo e entregas",status:"not_connected"},
            {id:"finance",name:"Financeiro",description:"Acompanhamento",status:"not_connected"},
            {id:"operations",name:"Operações",description:"Visão operacional",status:"not_connected"}
          ]).map((agent,i)=><article className="panel agent-card" key={agent.id}><div className="agent-number">0{i+1} / AGENT</div><div className="agent-avatar"><Bot size={23}/></div><h2>{agent.name}</h2><p>{agent.description}</p><div className="agent-status">
              <Status label={agent.status==="scheduled_active"?"Executou recentemente":agent.status==="blocked"?"Bloqueado":"Não ativado"}
                kind={agent.status==="scheduled_active"?"ok":agent.status==="blocked"?"warning":"muted"}/>
              <span>{agent.lastRunAt?`Último registro: ${datetime(agent.lastRunAt)}`:"Sem execução registrada"}</span>
            </div></article>)}</div>
          <a className="agent-repo-link" href="https://github.com/FATEC-BOYS/sansa-os-agents" target="_blank" rel="noopener noreferrer"><GitBranch size={17}/> Consultar contratos dos agentes no GitHub <ArrowUpRight size={16}/></a>
        </>}

        {tab==="activity" && <section className="panel"><div className="panel-top"><div><span className="eyebrow">AUDIT TRAIL</span><h2>Registro de atividade</h2><p>Apenas eventos realmente gravados no banco, sem histórico fictício.</p></div><ShieldCheck size={21} className="muted-icon"/></div>
          {!data?.activities.length?<EmptyState title="Nenhuma atividade registrada" description="Assim que houver sincronização ou uma decisão, os registros auditáveis aparecerão nesta tela."/>:<div className="activity-list">{data.activities.map(item=><div className="activity-event" key={item.id}><div className="activity-icon"><Activity size={17}/></div><div><strong>{item.message}</strong><small>{item.kind} · {datetime(item.createdAt)}</small></div></div>)}</div>}
        </section>}
        <footer className="main-footer"><span>© 2026 SANSA OFICINA DIGITAL</span><span>DESIGNED TO BUILD. BUILT TO THINK.</span></footer>
      </main>
    </div>

    {showComposer && <div className="modal-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setShowComposer(false);}}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="draft-title">
      <div className="modal-head"><div><span className="eyebrow">NEW ACTION / V0.1</span><h2 id="draft-title">Criar rascunho</h2></div><button className="icon-link" aria-label="Fechar" onClick={()=>setShowComposer(false)}><X size={20}/></button></div>
      <p>Registre uma proposta de ação para revisar depois. Para propostas direcionadas ao WhatsApp ou e-mail, use o Radar local. Nada será enviado automaticamente.</p>
      <form onSubmit={e=>void createDraft(e)} className="draft-form">
        <div className="field-pair"><label>Departamento<select value={draft.agent} onChange={e=>setDraft({...draft,agent:e.target.value})}><option value="commercial">Comercial</option><option value="customer_success">Atendimento</option><option value="creative">Criação</option><option value="projects">Projetos</option><option value="finance">Financeiro</option><option value="operations">Operações</option></select></label>
        <label>Tipo<select value={draft.kind} onChange={e=>setDraft({...draft,kind:e.target.value})}><option value="internal_note">Nota interna</option><option value="email_draft">Rascunho de e-mail</option><option value="followup_draft">Follow-up</option><option value="briefing">Briefing</option><option value="project_task">Tarefa de projeto</option></select></label></div>
        <label>Título<input required minLength={3} maxLength={160} placeholder="Ex.: Revisar proposta de parceria" value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></label>
        <label>Resumo<input required minLength={5} maxLength={500} placeholder="Uma frase sobre a decisão" value={draft.summary} onChange={e=>setDraft({...draft,summary:e.target.value})}/></label>
        <label>Conteúdo<textarea required rows={6} placeholder="Escreva o rascunho ou a descrição da tarefa..." value={draft.content} onChange={e=>setDraft({...draft,content:e.target.value})}/></label>
        <div className="modal-footer"><button type="button" className="btn-outline" onClick={()=>setShowComposer(false)}>Cancelar</button><button type="submit" className="btn-primary" disabled={busy}>{busy?"Salvando...":"Registrar para aprovação"} <ArrowRight size={16}/></button></div>
      </form>
    </div></div>}
  </div>;
}
