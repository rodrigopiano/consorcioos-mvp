export type FunnelStage =
  | "prospeccao"
  | "contato_ativo"
  | "qualificacao"
  | "reuniao_agendada"
  | "reuniao_realizada"
  | "proposta_enviada"
  | "followup"
  | "venda";

export type LeadOrigin =
  | "instagram"
  | "whatsapp"
  | "tiktok"
  | "evento"
  | "networking"
  | "indicacao";

export type LeadInterest = "imovel" | "carro" | "investimento";

export type ActionChannel = "whatsapp" | "ligacao" | "email" | "presencial";

export interface NextAction {
  description: string;
  dueDate: string; // ISO date string
  channel: ActionChannel;
  completed: boolean;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  origin: LeadOrigin;
  interest: LeadInterest;
  stage: FunnelStage;
  lastInteraction: string; // ISO date string
  nextAction: NextAction | null;
  notes: string;
  createdAt: string;
  value?: number; // estimated deal value
}

export interface DailyTask {
  id: string;
  type: "contato" | "followup" | "ligacao" | "reuniao" | "proposta";
  leadId: string;
  leadName: string;
  description: string;
  dueDate: string;
  completed: boolean;
  channel?: ActionChannel;
}

export const STAGE_LABELS: Record<FunnelStage, string> = {
  prospeccao: "Prospecção",
  contato_ativo: "Contato Ativo",
  qualificacao: "Qualificação",
  reuniao_agendada: "Reunião Agendada",
  reuniao_realizada: "Reunião Realizada",
  proposta_enviada: "Proposta Enviada",
  followup: "Follow-up",
  venda: "Venda",
};

export const ORIGIN_LABELS: Record<LeadOrigin, string> = {
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  tiktok: "TikTok",
  evento: "Evento",
  networking: "Networking",
  indicacao: "Indicação",
};

export const INTEREST_LABELS: Record<LeadInterest, string> = {
  imovel: "Imóvel",
  carro: "Carro",
  investimento: "Investimento",
};

export const CHANNEL_LABELS: Record<ActionChannel, string> = {
  whatsapp: "WhatsApp",
  ligacao: "Ligação",
  email: "E-mail",
  presencial: "Presencial",
};
