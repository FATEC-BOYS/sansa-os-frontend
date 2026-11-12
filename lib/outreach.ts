import type {Approval} from "./types";

export type OutboundLink={href:string;label:string;channel:"email"|"whatsapp";recipient:string};

export function getManualOutboundLink(item:Approval):OutboundLink|null {
  // Jamais ofereça ação de envio para rascunho pendente/rejeitado.
  if(item.status!=="approved" || !item.prospect || !item.channel)return null;
  if(item.channel==="whatsapp"){
    const number=item.prospect.contactWhatsapp?.replace(/\D/g,"")??"";
    if(!/^55[1-9]\d[2-9]\d{7,8}$/.test(number))return null;
    return {href:`https://wa.me/${number}?text=${encodeURIComponent(item.content)}`,label:"Abrir no WhatsApp",channel:"whatsapp",recipient:item.prospect.contactWhatsapp!};
  }
  if(item.channel==="email"){
    const email=item.prospect.contactEmail;
    if(!email || email.length>254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))return null;
    return {href:`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(item.title)}&body=${encodeURIComponent(item.content)}`,label:"Abrir e-mail",channel:"email",recipient:email};
  }
  return null;
}
