# Family Location — Notificações push (Android)

**Status:** Especificado, pronto para implementação
**Base:** `docs/PROJECT.md` (MVP — Fase 6, nunca implementada), `docs/FEATURES_NEXT.md` (bateria, item 2) e
`docs/FEATURES_NEXT_2.md` (presença, item 3)
**Selecionado em:** 2026-09-03

---

## 0. Escopo desta feature

Notificação push no Android — o usuário recebe mesmo com o app fechado. Isso é a Fase 6 do MVP original
(`docs/PROJECT.md §25`), que ficou pendente desde o início; três features das levas anteriores já tinham sido
especificadas contando com essa infra chegar depois:

- `docs/FEATURES_NEXT.md §4` (Chat): "quando a infra de push for feita... plugar o chat nela como consumidor a mais."
- `docs/FEATURES_NEXT_2.md §3` (Presença): "a tabela `place_notifications`... segue sem nenhum consumidor... quando
  a Fase 6 for construída, ela consome os mesmos `place_events` — nenhuma mudança de schema necessária."
- `docs/FEATURES_NEXT.md §2` (Bateria): "alerta de bateria fraca... natural fast-follow, não pedido nesta leva."

Chegou a vez. **Android primeiro**, seguindo `docs/PROJECT.md` DEC-009 — a arquitetura (Expo push + Edge Function)
é a mesma que funcionaria pra iOS depois, só falta configurar credencial APNs quando for a hora.

### Tipos de notificação desta primeira leva

```text
battery_low  → "Marcelo está com bateria fraca."
place_enter  → "Marcelo chegou em Casa Vini."
```

**O objetivo real não é só essas duas — é o cano.** O pedido foi "criar essas notificações pra ir adicionando
conforme surgir necessidade", então o grosso desta especificação é a infraestrutura genérica (§2–3) que faz
qualquer notificação nova ser barata de adicionar depois — as duas notificações de hoje são a prova de que o cano
funciona, não o produto final. A receita de como adicionar a próxima está em §6.

### Dependências entre features

```text
battery_low → depende de user_device_status existir (docs/FEATURES_NEXT.md §2, ainda não implementado)
place_enter → depende de place_events existir (docs/FEATURES_NEXT_2.md §3, ainda não implementado)
```

Esta feature (o pipeline de push) pode ser construída em paralelo com as duas — mas os dois tipos de notificação
só têm dado real pra disparar depois que bateria e presença estiverem implementadas.

---

## 1. Escolha técnica: Expo Push Service (não FCM direto)

`docs/PROJECT.md §4` já previa "Firebase Cloud Messaging e/ou mecanismos compatíveis com Expo... A implementação
deve abstrair o provedor de push". O Expo Push Service é exatamente essa abstração: o app manda push pro endpoint
do Expo (`https://exp.host/--/api/v2/push/send`), e o Expo relaya pro FCM (Android) ou APNs (iOS) por trás — nosso
backend nunca fala direto com o Firebase, só com o Expo. Menos código, e troca de provedor no futuro não quebra
nada do nosso lado.

**Atenção — isso mudou recentemente (por isso o `AGENTS.md` manda checar a doc versionada antes de codar):** o
Google aposentou a FCM Legacy API. Hoje é obrigatório configurar **FCM V1**, que usa uma Service Account do
Firebase (JSON), não mais uma "server key" simples. Passo a passo real (confirmado na doc do Expo, com material
de 2026):

```text
1. Criar um projeto no Firebase Console (gratuito).
2. Firebase Console → Project settings → Service accounts → "Generate new private key" (baixa um .json).
3. eas credentials → Android → "Set up a Google Service Account Key for Push Notifications (FCM V1)" →
   fazer upload desse .json (a EAS CLI guarda com segurança, não vai pro repo).
4. Baixar o google-services.json do Firebase Console e colocar na raiz do projeto.
5. app.json: android.googleServicesFile = "./google-services.json".
```

Isso é configuração de conta/infra (não código) — precisa ser feito uma vez, por quem tiver acesso ao Firebase e
à conta EAS do projeto, antes do primeiro teste em dispositivo real.

---

## 2. Modelo de dados

### Tokens dos dispositivos

```text
user_push_tokens
------------------
id                (PK, uuid)
user_id           (FK → users.id, on delete cascade)
expo_push_token   (text, unique)
platform          (text: 'android' | 'ios')
device_name       (text, nullable — ex. "Galaxy S23", só pra o usuário eventualmente reconhecer/gerenciar)
created_at        (timestamptz, default now())
updated_at        (timestamptz, default now())
```

Um usuário pode ter mais de um dispositivo (token por aparelho); todo login/abertura do app reconfirma o token
(`upsert` por `expo_push_token`, não por `user_id`, já que o mesmo usuário pode ter 2+ tokens simultâneos).

### Fila de envio (o "cano" genérico)

```text
notification_outbox
----------------------
id          (PK, uuid)
user_id     (FK → users.id, on delete cascade)  -- destinatário
type        (text — livre, não é enum de banco; ex. 'battery_low', 'place_enter')
title       (text)
body        (text)
data        (jsonb, nullable — payload pra deep link ao tocar, ex. {"screen":"presence","familyId":"..."})
status      (text: 'pending' | 'sent' | 'failed', default 'pending')
created_at  (timestamptz, default now())
sent_at     (timestamptz, nullable)
```

`type` é texto livre de propósito — adicionar um tipo novo nunca precisa de migration nem de alterar um enum. Cada
feature futura só insere nessa tabela com o `type` que quiser (ver receita em §6).

### RLS

```text
user_push_tokens:    select/insert/update/delete = user_id = auth.uid()   -- cada um só mexe no próprio token
notification_outbox: select = user_id = auth.uid()                        -- só pra o próprio histórico/debug
                      insert/update/delete: nenhuma policy para authenticated
                                             — só triggers (security definer) e a Edge Function (service role)
```

---

## 3. Pipeline de envio

```text
Trigger em alguma tabela (ex. user_device_status, place_events)
   ↓
INSERT em notification_outbox (status='pending')
   ↓
Database Webhook do Supabase (dispara em INSERT em notification_outbox)
   ↓
Edge Function `send-push` (Deno, roda no Supabase — já previsto em docs/PROJECT.md §4: "Edge Functions quando necessário")
   ↓
busca os tokens do destinatário em user_push_tokens
   ↓
POST https://exp.host/--/api/v2/push/send  { to, title, body, data }
   ↓
marca notification_outbox.status = 'sent' (ou 'failed' + loga o erro)
   ↓
se o Expo responder "DeviceNotRegistered" → apaga o token de user_push_tokens (limpeza — o app reconfirma no próximo login)
```

Zero servidor próprio — Edge Function + Database Webhook são recursos do Supabase, dentro do free tier (a Edge
Function precisa da `SUPABASE_SERVICE_ROLE_KEY`, disponível automaticamente no ambiente da function, pra poder ler
`user_push_tokens` de qualquer usuário — é um contexto de backend confiável, não passa pela RLS do usuário final).

Continua R$ 0 de infra (`docs/PROJECT.md §23`).

---

## 4. Tipo 1 — `battery_low`

Depende de `user_device_status` (`docs/FEATURES_NEXT.md §2`) já estar gravando `battery_level`/`battery_state`.

```text
trigger AFTER UPDATE ON user_device_status
  se NEW.battery_level < 0.20
     e (OLD.battery_level IS NULL OU OLD.battery_level >= 0.20)   -- só quando CRUZA o limite pra baixo
     e NEW.battery_state != 'charging'                            -- carregando não é urgente
  então, para cada membro que compartilha família com esse usuário (exceto ele mesmo):
     insert into notification_outbox (user_id=destinatário, type='battery_low',
       title='Bateria fraca', body='{Nome} está com bateria fraca.',
       data={'screen':'family','userId':...})
```

O `AND (OLD.battery_level IS NULL OR OLD.battery_level >= 0.20)` evita spam sozinho, sem precisar de estado extra:
uma vez disparado, só dispara de novo depois que a bateria voltar a passar de 20% (carregou) e cair de novo — não
manda notificação repetida enquanto continua baixa. O limite de 20% é o mesmo já usado na cor `danger` do badge de
bateria (`docs/FEATURES_NEXT.md §2`) — mesmo número, duas features, sem inventar um segundo limite.

---

## 5. Tipo 2 — `place_enter`

Depende de `place_events` (`docs/FEATURES_NEXT_2.md §3`) já estar gravando eventos de entrada/saída.

```text
trigger AFTER INSERT ON place_events
  se NEW.event = 'enter'                     -- v1 só cobre chegada; ver §6 pra adicionar 'exit' depois
  então, para cada membro da mesma família (exceto o próprio usuário do evento):
     insert into notification_outbox (user_id=destinatário, type='place_enter',
       title='Chegada', body='{Nome} chegou em {place_icon} {place_name}.',
       data={'screen':'presence','familyId':...})
```

**Decisão de produto — quem recebe, nesta v1:** `docs/PROJECT.md §17`/`place_notifications` previa controle
individual por local ("Mãe: só entrada, não saída"), mas essa tabela nunca ganhou tela de configuração (a aba
"Locais" ainda nem existe — `places.tsx` mostra "Em breve"). Em vez de bloquear esta feature numa tela de settings
que ninguém pediu ainda, a v1 notifica **todo mundo da família por padrão** (modelo opt-out, não opt-in). Quando a
tela de preferências por local existir, é só trocar "para cada membro da família" por "para cada membro com
`notify_on_enter = true` em `place_notifications`" — a tabela já existe, só falta o consumidor real dela.

---

## 6. Como adicionar um novo tipo de notificação

A parte que mais importa pra esta feature ser útil no longo prazo. Receita, sempre a mesma:

```text
1. Decidir o "gatilho": qual tabela/evento deveria disparar a notificação?
   (uma UPDATE, um INSERT, ou até uma condição calculada por uma RPC)

2. Escrever (ou estender) um trigger `security definer` nessa tabela que faz
   INSERT INTO notification_outbox (user_id, type, title, body, data)
   — escolher um `type` novo (string livre — não precisa alterar nenhum enum/migration de schema pra isso).

3. Se ao tocar a notificação o app deve abrir uma tela específica: adicionar um `case` novo no handler de
   deep link do client (switch por `data.type` — ver §7), apontando pra rota certa.

4. Pronto. Nenhuma mudança na Edge Function, nenhuma mudança no client além do passo 3 (que só existe se
   o tipo precisar de uma tela própria — uma notificação que só abre o mapa, por exemplo, não precisa de nada).
```

Exemplos de próximos tipos, só pra ilustrar como ficam baratos com esse cano pronto (nenhum destes é escopo desta
feature — é só pra mostrar que a receita se sustenta):

```text
place_exit         → tirar o filtro "NEW.event = 'enter'" do trigger de §5, adicionar o segundo insert
device_offline      → trigger num cron/Edge Function checando user_locations.recorded_at velho demais
family_all_home     → trigger em place_events comparando se todo mundo da família está com saved_place_id != null
```

---

## 7. Fluxo de UX (client)

### Registro do token

```text
Login concluído (useAuth) → app em foreground
   ↓
Notifications.requestPermissionsAsync()   -- Android 13+ (API 33+) exige permissão em runtime (POST_NOTIFICATIONS),
   ↓                                          igual localização; sem isso a notificação não aparece
Notifications.getExpoPushTokenAsync({ projectId })   -- projectId já existe em app.json (extra.eas.projectId)
   ↓
upsert em user_push_tokens (por expo_push_token, não por user_id — mesmo usuário pode ter 2+ aparelhos)
```

Repetir esse registro toda vez que o app abre com sessão ativa é barato (upsert idempotente) e cobre o caso de
token expirado/trocado sem precisar de lógica extra de expiração.

### Ao tocar a notificação

```text
Notifications.addNotificationResponseReceivedListener
   ↓
lê notification.request.content.data.screen
   ↓
switch: 'family' → router.push('/family') · 'presence' → abre a aba Presença do mapa · (default) → abre o mapa
```

### Recebida com o app aberto

Sem tratamento especial na v1 — deixa o comportamento padrão do `expo-notifications` (mostra a notificação normal
mesmo em foreground). Dá pra silenciar quando a tela relevante já está aberta (ex. já estar na aba Presença quando
chega um `place_enter`) depois, se incomodar na prática — não é necessário resolver agora.

---

## 8. Telas de referência

Adicionada à mesma galeria: [Mockups Próximas Features](https://claude.ai/code/artifact/7b67b563-9154-49cb-8aa1-8291d64868e5)
(seção "Notificações push").

**Notificação — shade do Android** — diferente das telas anteriores (que recriam o app), este mockup mostra o
*sistema operacional*, então tem uma barra de status mínima (só o horário) no topo pra dar contexto, coisa que as
outras telas propositalmente evitam. Duas notificações empilhadas, no estilo padrão Android (ícone do app + nome
"Family Location" + horário relativo numa linha, título em negrito, corpo abaixo): a de bateria fraca
("Marcelo está com bateria fraca.") e a de chegada ("Marcelo chegou em Casa Vini."). Mostra as duas juntas de
propósito — é o mesmo pipeline entregando dois tipos diferentes.

---

## 9. Novas dependências

```text
expo-notifications → registro de token + recebimento (client)
```

Mais a configuração de conta (não é pacote): projeto Firebase + Service Account key (FCM V1) + `google-services.json`
— ver §1.

`app.json`: adicionar o plugin `expo-notifications` e `android.googleServicesFile`.

---

## 10. Ordem de implementação

- [ ] Criar projeto Firebase, gerar Service Account key, subir via `eas credentials` (Android → FCM V1).
- [ ] Baixar `google-services.json`, colocar na raiz, referenciar em `app.json`.
- [ ] Adicionar `expo-notifications` + plugin no `app.json`.
- [ ] Migration: `user_push_tokens`, `notification_outbox`, RLS.
- [ ] Edge Function `send-push` (lê o outbox, chama a API do Expo, marca status, limpa token morto).
- [ ] Database Webhook: INSERT em `notification_outbox` → `send-push`.
- [ ] `src/services/notifications/index.ts`: `registerForPush()`, listener de tap com deep link.
- [ ] Chamar `registerForPush()` após login (`AuthProvider` ou `map.tsx` no primeiro mount autenticado).
- [ ] Trigger `battery_low` em `user_device_status` (depende de `docs/FEATURES_NEXT.md §2` estar implementado).
- [ ] Trigger `place_enter` em `place_events` (depende de `docs/FEATURES_NEXT_2.md §3` estar implementado).
- [ ] Testar em dev build Android real (push não funciona em Expo Go nem em emulador sem Google Play Services) com
      o app fechado/em background — o teste que importa é esse, não o app aberto.

---

## 11. O que NÃO fazer nesta feature

- Não construir a tela de preferências por local (`place_notifications` com UI) — v1 notifica todo mundo por
  padrão (§5). A tabela já existe pra quando isso for pedido.
- Não implementar `place_exit`, "todo mundo chegou em casa" ou qualquer outro tipo além dos dois pedidos — a
  receita (§6) é o entregável, não a lista de tipos.
- Não configurar iOS/APNs agora (`docs/PROJECT.md` DEC-009: Android primeiro) — a arquitetura já é compatível,
  só falta a credencial quando chegar a vez.
- Não silenciar notificação em foreground nem agrupar/collapsing de múltiplas notificações — comportamento padrão
  do Android/Expo é suficiente pro v1.
