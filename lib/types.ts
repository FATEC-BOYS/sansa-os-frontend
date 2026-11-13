export interface Lead {
  id: string;
  name: string;
  type?: string | null;
  origin?: string | null;
  channel?: string | null;
  status: string;
  answered: boolean;
  decision?: string | null;
  reviewAt?: string | null;
  nextStep?: string | null;
  notes?: string | null;
  referenceUrl?: string | null;
  potentialCents: number;
  closedCents: number;
  updatedAt: string;
}
export interface Approval {
  id: string;
  title: string;
  summary: string;
  content: string;
  agent: string;
  kind: string;
  status: string;
  channel?: "email" | "whatsapp" | null;
  prospect?: {
    id: string;
    name: string;
    contactEmail: string | null;
    contactWhatsapp: string | null;
  } | null;
  createdAt: string;
  reviewedAt?: string | null;
}
export interface AgentInfo {
  id: string;
  name: string;
  description: string;
  status: string;
  lastRunAt?: string | null;
  lastRunStatus?: string | null;
}
export interface Activity {
  id: string;
  kind: string;
  message: string;
  createdAt: string;
}
export interface Overview {
  metrics: {records:number;responded:number;proposals:number;closed:number;revenueCents:number};
  crm: {connected:boolean;lastSyncedAt:string|null;source:string;count:number};
  leads: Lead[];
  approvals: Approval[];
  agents: AgentInfo[];
  activities: Activity[];
  externalAutomations: {managedHere:boolean;status:string};
}
