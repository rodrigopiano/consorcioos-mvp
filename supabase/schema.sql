-- ConsórcioOS — Schema completo

create extension if not exists "uuid-ossp";

-- Leads
create table leads (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text not null,
  origin text not null check (origin in ('instagram','whatsapp','tiktok','evento','networking','indicacao')),
  interest text not null check (interest in ('imovel','carro','investimento')),
  stage text not null default 'prospeccao' check (stage in (
    'prospeccao','contato_ativo','qualificacao',
    'reuniao_agendada','reuniao_realizada',
    'proposta_enviada','followup','venda'
  )),
  last_interaction date default current_date,
  notes text default '',
  value numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Próximas ações dos leads
create table next_actions (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid references leads(id) on delete cascade,
  description text not null,
  due_date date not null,
  channel text not null check (channel in ('whatsapp','ligacao','email','presencial')),
  completed boolean default false,
  created_at timestamptz default now()
);

-- Tarefas diárias
create table daily_tasks (
  id uuid primary key default uuid_generate_v4(),
  type text not null check (type in ('contato','followup','ligacao','reuniao','proposta')),
  lead_id uuid references leads(id) on delete cascade,
  lead_name text not null,
  description text not null,
  due_date date not null default current_date,
  completed boolean default false,
  channel text check (channel in ('whatsapp','ligacao','email','presencial')),
  created_at timestamptz default now()
);

-- Métricas diárias (snapshot)
create table daily_metrics (
  id uuid primary key default uuid_generate_v4(),
  date date not null default current_date unique,
  contacts_goal integer default 40,
  contacts_done integer default 0,
  created_at timestamptz default now()
);

-- Indexes
create index leads_stage_idx on leads(stage);
create index leads_created_at_idx on leads(created_at desc);
create index next_actions_lead_id_idx on next_actions(lead_id);
create index next_actions_due_date_idx on next_actions(due_date);
create index daily_tasks_due_date_idx on daily_tasks(due_date);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger leads_updated_at
  before update on leads
  for each row execute function update_updated_at();

-- Row Level Security (desativado para MVP — ativar quando tiver auth)
alter table leads enable row level security;
alter table next_actions enable row level security;
alter table daily_tasks enable row level security;
alter table daily_metrics enable row level security;

-- Políticas permissivas para MVP (qualquer um autenticado ou anon acessa)
create policy "allow all leads" on leads for all using (true) with check (true);
create policy "allow all next_actions" on next_actions for all using (true) with check (true);
create policy "allow all daily_tasks" on daily_tasks for all using (true) with check (true);
create policy "allow all daily_metrics" on daily_metrics for all using (true) with check (true);

-- Dados de exemplo
insert into leads (name, phone, origin, interest, stage, last_interaction, notes, value) values
  ('Ana Paula Silva', '(11) 99876-5432', 'instagram', 'imovel', 'followup', '2026-06-28', 'Tem interesse em imóvel no interior. Marido ainda não convencido.', 150000),
  ('Carlos Mendes', '(11) 98765-4321', 'whatsapp', 'carro', 'proposta_enviada', '2026-06-27', 'Quer carro novo. Enviamos proposta no dia 27.', 60000),
  ('Fernanda Costa', '(11) 91234-5678', 'indicacao', 'imovel', 'reuniao_agendada', '2026-06-29', 'Indicação do João. Quer casa própria até o final do ano.', 200000),
  ('Roberto Alves', '(11) 97654-3210', 'evento', 'investimento', 'qualificacao', '2026-06-28', 'Empresário. Interessado em diversificar investimentos.', 300000),
  ('Camila Ferreira', '(11) 91111-2345', 'whatsapp', 'investimento', 'venda', '2026-06-28', 'VENDA FECHADA! Carta R$100k.', 100000);
