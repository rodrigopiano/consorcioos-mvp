# ConsórcioOS MVP

Sistema Operacional Comercial para consultores de consórcio.

## Instalação

### Pré-requisito: Node.js

Baixe e instale o Node.js LTS em: https://nodejs.org

Após instalar, abra o PowerShell nesta pasta e execute:

```powershell
npm install
npm run dev
```

Acesse: http://localhost:3000

## Telas do sistema

| Rota | Tela | Descrição |
|------|------|-----------|
| `/` | Dashboard | O que fazer agora? Resumo do dia |
| `/followup` | Follow-up ⭐ | Lista de ações do dia com botões Concluir/Adiar |
| `/tarefas` | Tarefas do Dia | Checklist com progresso por categoria |
| `/funil` | Funil Kanban | Visão do pipeline por etapa |
| `/leads` | Leads | Tabela com busca e filtro por etapa |
| `/leads/novo` | Novo Lead | Formulário de cadastro com próxima ação |
| `/metricas` | Métricas | Funil de conversão e taxas |

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Lucide React (ícones)
- Dados mock (sem backend — substitua por Supabase)

## Próximos passos

1. Conectar ao Supabase (banco PostgreSQL)
2. Autenticação por email/senha
3. Deploy na Vercel
4. Notificações push de follow-up
