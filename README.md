# SANSA OS · Frontend

Painel da **SANSA Oficina Digital**, construído com **Next.js + React + TypeScript + Tailwind CSS**.

A versão 0.1 oferece:
- Visão geral de CRM, indicadores, auditoria e integrações
- Tabela de oportunidades sincronizadas do CRM Google Sheets
- Criação de rascunhos e aprovação/rejeição humana (sem disparar mensagens)
- Catálogo de agentes, exibindo honestamente quando não estão conectados
- Leitura do backend exclusivamente pelo servidor; chave da API nunca vai ao navegador
- Proteção básica do painel por usuário/senha na camada de middleware

## Rodar localmente
1. Configure e inicie primeiro o repositório `sansa-os-backend-`.
2. Copie `.env.example` para `.env.local` e defina uma chave longa idêntica ao `INTERNAL_API_KEY` do backend.
3. Execute:
```bash
npm install
npm run dev
```
4. Abra http://localhost:3000

## Conectar o CRM
O botão **Sincronizar CRM** chama o backend, que lê a planilha Google Sheets original **sem alterá-la**. Se o backend, PostgreSQL ou as credenciais estiverem ausentes, o painel mostra um estado de conexão pendente. O sistema não inventa métricas.

## Limites e segurança
- Nenhuma automação existente do ChatGPT é pausada, renomeada, reiniciada ou controlada por este painel.
- A aprovação de um rascunho **não envia** e-mail; o backend mantém apenas a decisão.
- Credenciais de API são variáveis de servidor; não use prefixo `NEXT_PUBLIC_` para elas.
- Não publique este painel sem proteção de acesso. O Basic Auth incluído é uma proteção inicial; para produção adicione autenticação de sessão, usuários e RBAC.
- **Visibilidade GitHub:** na criação, os repositórios apareceram como públicos. Antes de incluir dados operacionais, altere-os para privados em Settings → General → Danger Zone → Change repository visibility.

Repos relacionados: `sansa-os-backend-` e `sansa-os-agents`.

## Radar local — comércios e propostas
Na aba **Radar local**, escolha região (Centro de SBC, Santo André ou São Caetano), segmento e raio. A pesquisa em OpenStreetMap retorna uma classificação preliminar explicável e detecta possíveis duplicatas no CRM. Escolha quais empresas devem entrar na **fila de investigação**; esta fila não altera o Google Sheets original. Em cada oportunidade salva, o botão **Preparar proposta** cria uma avaliação e um rascunho para Aprovações.

- Sem chave `OPENAI_API_KEY` no backend, o rascunho usa regras conservadoras, **não é IA**.
- Com chave, a API Responses elabora texto e justificativa estruturados usando os fatos disponíveis.
- Não existe envio automático de e-mail; as automações anteriores do ChatGPT permanecem intactas.
- Dados do mapa: © OpenStreetMap contributors, licença ODbL. Não confunda ausência de website no mapa com ausência de site.

## Propostas por e-mail e WhatsApp (v0.3)
Na aba **Radar local**, cada comércio salvo tem **dois campos editáveis**: `E-mail comercial` e `WhatsApp com DDD`. É possível cadastrar, alterar e remover ambos independentemente. Use `Cadastrar / editar contatos` e depois escolha **Proposta e-mail** ou **Proposta WhatsApp**.

O texto é preparado para o canal, fica na **Central de aprovações** e, depois de aprovado, exibe **Abrir e-mail** (link `mailto:` com assunto/corpo) ou **Abrir no WhatsApp** (link `wa.me` com mensagem). A abertura do aplicativo **não envia** a mensagem; você revisa e confirma o envio. Se o contato for corrigido posteriormente, o botão usa o contato atual.

Não existe disparo automático ou envio em massa. O CRM Google Sheets e as automações já existentes permanecem preservados. Em produção, proteja o painel e o banco com login/RBAC e controle de acesso.

## Claude ou GPT por proposta
No Radar local, selecione o **modelo que prepara a proposta**: Automático, Claude, GPT ou Regras. A seleção ocorre no backend; as chaves permanecem protegidas na Railway e nunca são enviadas ao browser. Em Automático o sistema prioriza Claude, depois GPT, depois regras. A escolha explícita de um modelo sem chave mostra erro e não cria um rascunho falso. Um rascunho pendente por canal não é duplicado; rejeite-o antes de testar outro modelo para o mesmo comércio/canal.

## Worker de agentes (serviço independente)
O repositório `sansa-os-agents` foi preparado para execução diária em Railway, às 10h (São Paulo) nos dias úteis. A aba **Agentes** consulta o backend e mostra status e hora da **última rodada efetivamente registrada** para Comercial e Operações. Os demais continuam não ativados até que haja implementações reais. Sem sincronização recente do Google Sheets, o Comercial deve aparecer bloqueado; o sistema não inventa propostas. Consulte o histórico em **Atividade**.

## WhatsApp Meta — caixa de entrada preparada
A aba **WhatsApp** consulta a nova API: status de credenciais da Meta, papéis dos cinco agentes, histórico real de mensagens recebidas, pedidos de revisão humana e rascunhos pendentes. Nenhuma conversa de demonstração é apresentada como real. O backend recebe webhooks assinados depois de configurar WABA, ID do número e App Secret, e a aplicação **não envia mensagens** até implementarmos autorização e as regras da Meta.

## Propostas comerciais e negociação (v0.6)
Nova aba **Propostas comerciais**: seleciona serviço e versão (Essencial/Completo/Sob medida), apresenta entregáveis, recebe objetivo e escopo do cliente, preço manual opcional em reais, prazo/condições/limites, e cria proposta pendente de aprovação. Também oferece respostas para objeções de valor, prazo, escopo, concorrência, pagamento e follow-up. Nada é enviado nem cobrado automaticamente. Consulte e edite rascunhos pendentes na Central de Aprovações.
