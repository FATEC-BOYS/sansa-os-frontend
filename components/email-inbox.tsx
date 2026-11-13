"use client";
import {useEffect,useState} from "react";
import {Mail,RefreshCw,ShieldCheck,Clock3,ExternalLink,CheckCircle2,Inbox,FileText} from "lucide-react";

type EmailStatus={
  provider:string;configured:boolean;readOnly:boolean;autoSendEnabled:boolean;
  lastSyncedAt:string|null;total:number;
};
type EmailItem={
  id:string;fromAddress:string;senderName:string|null;
  toAddress:string;subject:string;preview:string;category:string;
  receivedAt:string;approval:{id:string;status:string;title:string}|null;
};
async function request<T>(path:string,method:"GET"|"POST"="GET"):Promise<T>{
  const res=await fetch(path,{method,cache:"no-store"});
  const body=await res.json().catch(()=>null) as (T&{error?:string})|null;
  if(!res.ok)throw new Error(body?.error||"Não foi possível consultar o Zoho Mail.");
  return body as T;
}
const stamp=(date:string|null)=>date?new Date(date).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo",dateStyle:"short",timeStyle:"short"}):"Nunca";

export default function EmailInbox({onOpenApprovals}:{onOpenApprovals:()=>void}){
  const [status,setStatus]=useState<EmailStatus|null>(null);
  const [items,setItems]=useState<EmailItem[]>([]);
  const [selected,setSelected]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [notice,setNotice]=useState<string|null>(null);
  const current=items.find(x=>x.id===selected)||null;
  async function refresh(){
    setError(null);
    const [s,i]=await Promise.all([
      request<EmailStatus>("/api/email/status"),
      request<EmailItem[]>("/api/email/inbox")
    ]);
    setStatus(s);setItems(i);
    if(!selected&&i.length)setSelected(i[0].id);
  }
  async function sync(){
    setBusy(true);setError(null);setNotice(null);
    try{
      const result=await request<{added:number;drafts:number;skipped:number}>("/api/email/sync","POST");
      setNotice(`${result.added} nova(s) mensagem(ns), ${result.drafts} rascunho(s) gerado(s). Nenhuma mensagem enviada.`);
      await refresh();
    }catch(e){setError(e instanceof Error?e.message:"Erro desconhecido");}
    finally{setBusy(false);}
  }
  useEffect(()=>{void refresh().catch(e=>setError(e instanceof Error?e.message:"Falha de conexão"));},[]);
  return <div className="email-root">
    <div className="email-banner"><div><span className="eyebrow">SANSA OS / ZOHO MAIL</span>
      <h2>Uma caixa. Conversas com propósito.</h2>
      <p>comercial@sansadigital.com.br · Novos contatos, propostas e respostas em revisão.</p></div><Mail size={31}/></div>
    <section className="panel">
      <div className="panel-top"><div><span className="eyebrow">CONEXÃO PROFISSIONAL</span><h2>Zoho Mail</h2></div>
        <button className="btn-outline small" disabled={busy} onClick={()=>void sync()}><RefreshCw size={14} className={busy?"spin":""}/> Sincronizar agora</button></div>
      <div className="email-metrics">
        <div><small>Conexão da caixa</small><strong className={status?.configured?"email-positive":"email-muted"}>
          {status?.configured?<><CheckCircle2 size={15}/> Credenciais configuradas</>:<><Clock3 size={15}/> Aguardando autorização</>}</strong></div>
        <div><small>Mensagens registradas</small><strong>{status?.total??0}</strong></div>
        <div><small>Última leitura</small><strong>{stamp(status?.lastSyncedAt??null)}</strong></div>
      </div>
      <div className="email-safety"><ShieldCheck size={17}/><p>A conexão é somente leitura. O SANSA OS não apaga e-mails nem marca mensagens como lidas no Zoho. Respostas e propostas precisam da sua revisão; não existe envio automático nesta versão.</p></div>
      {error&&<p className="email-alert">{error}</p>}
      {notice&&<p className="email-notice">{notice}</p>}
      {!status?.configured&&<p className="email-instructions">Para ativar: no Zoho, habilite o IMAP e gere uma senha de aplicativo. Cadastre <code>ZOHO_IMAP_ENABLED</code>, <code>ZOHO_IMAP_USER</code> e <code>ZOHO_IMAP_APP_PASSWORD</code> nas variáveis privadas da API no Railway. Não compartilhe a senha por chat.</p>}
    </section>
    <section className="panel">
      <div className="panel-top"><div><span className="eyebrow">RECEBIDOS</span><h2>Caixa comercial</h2></div><Inbox size={20}/></div>
      {!items.length?<div className="email-empty"><Mail size={26}/><h3>Nenhum e-mail sincronizado</h3><p>Quando a caixa estiver autorizada e a primeira sincronização for concluída, os contatos reais aparecerão aqui.</p></div>:
      <div className="email-layout">
        <div className="email-list">{items.map(item=><button className={"email-item"+(selected===item.id?" active":"")} key={item.id} onClick={()=>setSelected(item.id)}>
          <strong>{item.senderName||item.fromAddress}</strong><small>{item.fromAddress}</small><span>{item.subject}</span>
          <small>{stamp(item.receivedAt)}</small>
        </button>)}</div>
        <div className="email-detail">{current&&<>
          <span className="eyebrow">EMAIL RECEBIDO · {current.category.toUpperCase()}</span>
          <h3>{current.subject}</h3>
          <p className="email-parties">De: {current.fromAddress} · Para: {current.toAddress}</p>
          <p className="email-preview">{current.preview||"Sem texto extraído; consultar a mensagem original no Zoho."}</p>
          <div className="email-review">
            <strong>{current.approval?"Resposta preparada: "+(current.approval.status==="pending"?"aguardando revisão":current.approval.status==="approved"?"aprovada":"rejeitada"):"Sem resposta gerada automaticamente"}</strong>
            <p>Confira a mensagem completa na caixa Zoho antes de responder, principalmente se houver anexos ou informações contratuais.</p>
            <button className="btn-outline small" onClick={onOpenApprovals}><FileText size={14}/> Ver aprovações</button>
            <a className="btn-primary small" href="https://mail.zoho.com/" target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/> Abrir Zoho</a>
          </div>
        </>}</div>
      </div>}
    </section>
  </div>;
}
