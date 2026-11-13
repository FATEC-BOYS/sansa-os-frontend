"use client";

import {useEffect,useState} from "react";
import {Bot,CheckCircle2,ChevronRight,Clock3,ExternalLink,FileText,LockKeyhole,MessageCircle,RefreshCw,ShieldAlert,ShieldCheck} from "lucide-react";

type MetaStatus={
  integration:string;webhookReady:boolean;outboundEnabled:boolean;policy:string
};
type Conversation={
  id:string;displayContact:string;profileName:string|null;
  stage:string;intent:string|null;validationStatus:string;
  optedOut:boolean;handoffRequired:boolean;lastInboundAt:string|null;
  messagesCount:number;draftsCount:number;updatedAt:string
};
type Message={id:string;metaMessageId:string;type:string;text:string|null;receivedAt:string};
type InboxDetail=Conversation&{messages:Message[];approvals:{id:string;title:string;status:string;content:string}[]};
const stages=[
  {id:"identifier",name:"Identificador",description:"Quem escreveu e com qual intenção"},
  {id:"validator",name:"Validador",description:"Referência do projeto; revisão necessária"},
  {id:"service",name:"Atendimento",description:"Serviços e briefing inicial"},
  {id:"sales",name:"Negociação",description:"Escopo e proposta para aprovação"},
  {id:"after_service",name:"Pós-atendimento",description:"Dúvidas, acompanhamento e documentos"}
];
function fmt(date:string|null){return date?new Date(date).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo",dateStyle:"short",timeStyle:"short"}):"—";}
async function api<T>(path:string):Promise<T>{
  const res=await fetch(path,{cache:"no-store"});
  if(!res.ok)throw new Error("Não foi possível consultar o WhatsApp no backend da SANSA.");
  return await res.json() as T;
}
export default function WhatsAppInbox({onOpenApprovals}:{onOpenApprovals:()=>void}){
  const [status,setStatus]=useState<MetaStatus|null>(null);
  const [conversations,setConversations]=useState<Conversation[]>([]);
  const [selected,setSelected]=useState<InboxDetail|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  async function refresh(){
    setBusy(true);setError(null);
    try{
      const [s,c]=await Promise.all([
        api<MetaStatus>("/api/whatsapp/status"),
        api<Conversation[]>("/api/whatsapp/conversations")
      ]);
      setStatus(s);setConversations(c);
    }catch(e){setError(e instanceof Error?e.message:"Falha de conexão");}
    finally{setBusy(false);}
  }
  async function openConversation(id:string){
    setBusy(true);setError(null);
    try{setSelected(await api<InboxDetail>("/api/whatsapp/conversations/"+encodeURIComponent(id)));}
    catch(e){setError(e instanceof Error?e.message:"Falha ao abrir conversa");}
    finally{setBusy(false);}
  }
  useEffect(()=>{void refresh();},[]);
  return <div className="wa-root">
    <div className="wa-banner">
      <div><span className="eyebrow">SANSA OS / META BUSINESS</span>
        <h2>Atendimento em cinco etapas.</h2>
        <p>A recepção segura está preparada. Ativar a conta na Meta é o próximo passo.</p>
      </div>
      <MessageCircle size={34}/>
    </div>
    <section className="panel wa-status">
      <div className="panel-top"><div><span className="eyebrow">INTEGRATION CHECK</span>
        <h2>WhatsApp Cloud API</h2></div>
        <button className="btn-outline small" onClick={()=>void refresh()} disabled={busy}><RefreshCw size={14}/>Atualizar</button>
      </div>
      {error&&<p className="wa-error">{error}</p>}
      <div className="wa-status-grid">
        <div><span>Webhook / credenciais Meta</span><strong className={status?.webhookReady?"wa-ok":"wa-pending"}>
          {status?.webhookReady?<><CheckCircle2 size={16}/> Configurado</>:<><Clock3 size={16}/> Aguardando ativação</>}
        </strong></div>
        <div><span>Envio automático</span><strong className="wa-pending"><LockKeyhole size={16}/> Desabilitado</strong></div>
        <div><span>Conversas recebidas</span><strong>{conversations.length}</strong></div>
      </div>
      <p className="wa-footnote">Sem número ativo, não há mensagens reais para processar. Ao integrar, as mensagens recebidas serão registradas somente depois de validar a assinatura da Meta. Não existe envio de boletos, Pix ou mensagens automáticas.</p>
    </section>
    <section className="panel">
      <div className="panel-top"><div><span className="eyebrow">AGENT ORCHESTRATION</span><h2>Fluxo do atendimento</h2></div><Bot size={20}/></div>
      <div className="wa-agent-grid">{stages.map((step,index)=><div key={step.id} className="wa-agent-stage">
        <span className="wa-agent-num">0{index+1}</span>
        <strong>{step.name}</strong><p>{step.description}</p>
        {index<stages.length-1&&<ChevronRight className="wa-stage-arrow" size={15}/>}
      </div>)}</div>
      <div className="wa-policy"><ShieldAlert size={16}/><span>O Validador só entra quando há dados restritos. Negociação e pagamentos exigem revisão humana. Não solicitamos CPF completo, dados de cartão nem senhas.</span></div>
    </section>
    <section className="panel">
      <div className="panel-top"><div><span className="eyebrow">INBOUND MESSAGES</span><h2>Conversas recebidas</h2></div><ShieldCheck size={20}/></div>
      {conversations.length===0?<div className="wa-empty"><MessageCircle size={28}/><strong>Nenhuma conversa registrada</strong><p>Quando a Meta estiver ativa, os contatos aparecerão aqui. Não exibimos dados simulados como se fossem reais.</p></div>:
        <div className="wa-inbox-grid">
          <div className="wa-conversation-list">{conversations.map(item=><button key={item.id} className={"wa-conversation"+(selected?.id===item.id?" active":"")} onClick={()=>void openConversation(item.id)}>
            <strong>{item.profileName||item.displayContact}</strong>
            <small>{item.displayContact} · {fmt(item.lastInboundAt)}</small>
            <span>{item.optedOut?"Não contatar":item.handoffRequired?"Revisão humana":item.stage}</span>
          </button>)}</div>
          <div className="wa-detail">{selected?<>
            <div className="wa-detail-head"><strong>{selected.profileName||selected.displayContact}</strong><small>Estágio: {selected.stage} · Identidade: {selected.validationStatus}</small></div>
            <div className="wa-messages">{selected.messages.slice().reverse().map(message=><article key={message.id}>
              <small>{fmt(message.receivedAt)} · {message.type}</small><p>{message.text||"Mensagem não textual. Revisão humana necessária."}</p></article>)}</div>
            <div className="wa-drafts"><strong>Rascunhos internos ({selected.approvals.length})</strong>
              <p>As respostas ainda não foram enviadas. Todas exigem revisão antes de qualquer integração futura de envio.</p>
              <button className="btn-outline small" onClick={onOpenApprovals}><FileText size={14}/> Abrir aprovações <ExternalLink size={13}/></button></div>
          </>:<div className="wa-empty"><MessageCircle size={24}/><p>Selecione uma conversa para ver o histórico e os rascunhos.</p></div>}</div>
        </div>}
    </section>
  </div>;
}
