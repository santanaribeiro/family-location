# Family Location — Leva 2 de features (Histórico, Presença, Resumo)

**Status:** Especificado, pronto para implementação
**Base:** `docs/PROJECT.md` (MVP) e `docs/FEATURES_NEXT.md` (leva 1 — QR, bateria, auditoria, chat)
**Selecionado em:** 2026-09-03

---

## 0. Escopo desta leva

Três features, também vindas da lista de candidatas original:

1. Histórico/timeline de localização (últimos dias) — já estava cotada em `docs/PROJECT.md §3/§21`.
2. Feed de atividades da família ("Mãe chegou em casa às 14:32") — chamado aqui de **Presença**, pra não colidir
   com a tela "Atividade" (log de auditoria) da leva 1, que é outra coisa (ver §8).
3. Resumo diário/semanal de atividade da família.

**Isso completa a Fase 5 do MVP original.** `docs/PROJECT.md §2` já incluía Geofence (detectar entrada/saída,
identificar local atual) no escopo do MVP — só nunca foi implementado. A feature 2 (Presença) é, na prática, essa
implementação, só que expondo o resultado como uma tela de feed em vez de só notificação push (que segue fora de
escopo — ver nota na seção 3). Não é escopo novo se somando ao MVP; é escopo já aprovado, finalmente construído.

**Dependência entre as três:** o Resumo (3) lê dados que só existem depois que o Histórico (1) e a Presença (2)
estiverem gravando. Construir nessa ordem: 1 → 2 → 3.

Nenhuma dependência nova de pacote nesta leva — `react-native-maps` (já instalado) tem `Polyline`, e todo o resto é
lógica em Postgres. Continua R$ 0 de infra (§23 do PROJECT.md).

### Mockups (aprovados em 2026-09-03)

Adicionados à mesma galeria da leva 1: [Mockups Próximas Features](https://claude.ai/code/artifact/7b67b563-9154-49cb-8aa1-8291d64868e5)
(seção "Leva 2" no fim da página, 4 telas).

---

## 1. Infraestrutura compartilhada

Histórico (§2) e Presença (§3) são acionados pelo mesmo evento — uma nova localização chegando — então a base é
uma só, pra não duplicar lógica nem criar duas fontes de verdade.

### Função de distância

```sql
distance_meters(lat1, lng1, lat2, lng2) returns double precision
```
Haversine em SQL puro (`acos`/`cos`/`sin`/`radians`), sem depender de PostGIS — evita adicionar uma extensão só
pra isso. Reaproveitada tanto pelo throttle do histórico quanto pela detecção de geofence.

### RPC `save_location`

Hoje `saveLocation` (`src/services/location/index.ts`) faz um `upsert` direto em `user_locations` pelo client.
Essa leva propõe substituir por uma RPC `security definer` que faz tudo numa transação só:

```text
save_location(p_lat, p_lng, p_accuracy, p_altitude, p_speed, p_heading, p_recorded_at)
  1. upsert user_locations (auth.uid())          — comportamento atual, preservado
  2. [dispara o trigger de geofence — ver §3]     — automático, por causa do upsert acima
  3. throttle de histórico (ver §2)               — grava em location_history se aplicável
  4. limpeza de retenção (ver §2)                 — apaga histórico velho do próprio usuário
```

Client (`watchAndSync` e a task de background) passam a chamar essa RPC no lugar do `.upsert()` direto. Menos uma
viagem de rede por atualização (hoje seria: upsert + insert histórico + delete velho = 3 chamadas; com a RPC, 1) e
a lógica de negócio fica no banco, seguindo o padrão já usado em `create_family_group`/`accept_invite` (§20 do
PROJECT.md: nunca confiar só no cliente).

---

## 2. Histórico de localização (últimos dias)

### Objetivo

Ver por onde um membro passou, não só onde está agora — "o Pedro esteve na escola das 8h às 12h, depois foi pra
casa da avó". Já estava previsto desde o MVP (§21 do PROJECT.md: "a arquitetura deve permitir adicionar
posteriormente uma tabela de histórico").

### Escopo incluído

- Gravar posições históricas por usuário, com retenção automática (mantém só os últimos 7 dias).
- Tela de histórico por membro: mapa com o trajeto de um dia + resumo (distância, primeiro/último ponto).

### Fora de escopo

- Histórico "infinito" ou configurável por família (fixo em 7 dias nesta v1 — trocar depois é só mudar o
  intervalo do trigger).
- Detecção de "paradas" / tempo parado num lugar sem ser um local salvo (isso é related à Presença, §3 — histórico
  aqui é só o traço bruto no mapa).
- Exportar/baixar o histórico.

### Modelo de dados

```text
location_history
-----------------
id           (PK, uuid)
user_id      (FK → users.id, on delete cascade)
latitude     (double precision)
longitude    (double precision)
accuracy     (double precision, nullable)
recorded_at  (timestamptz)
```
Índice em `(user_id, recorded_at desc)` — toda consulta é "pontos de um usuário num intervalo de tempo".

### Throttle de gravação (dentro da RPC `save_location`, §1)

Gravar todo ping de localização seria demais (o app já atualiza a cada 15–30s em primeiro plano). Grava um novo
ponto só se, comparado ao último ponto salvo desse usuário:

```text
distance_meters(último, novo) > 40  OU  novo.recorded_at - último.recorded_at > interval '5 minutes'
```

Isso limita a uns 300 pontos/dia por usuário no pior caso (alguém em movimento contínuo) — folgado pro free tier
do Supabase mesmo com uma família de 5+ pessoas.

### Retenção

Dentro da mesma RPC, depois de gravar: `delete from location_history where user_id = auth.uid() and recorded_at <
now() - interval '7 days'`. Autolimpeza, sem precisar de cron/Edge Function agendada (§23: manter R$ 0 de infra).

### RLS

```text
select: user_id = auth.uid() OR shares_family_with(user_id)   -- mesmo padrão de user_locations
insert/delete: nenhuma policy para authenticated — só a RPC (security definer) escreve
```

### Fluxo de UX

```text
Mapa → bottom sheet → aba "Família" → ícone de histórico na linha do membro (ao lado do badge de bateria)
   ↓
Tela "Histórico de {nome}"
   ↓
seletor de dia (chips: Hoje, Ontem, + 5 dias) → busca location_history do dia escolhido
   ↓
mapa com <Polyline> ligando os pontos em ordem + marcador maior no primeiro e no último ponto
   ↓
toca num ponto do "scrubber" embaixo → destaca esse ponto no mapa e mostra o horário
```

### Telas de referência

**Histórico de {nome}** — cabeçalho com voltar + avatar + nome. Linha de chips de dia (o dia selecionado com
destaque). Mapa ocupando o resto da tela com o trajeto desenhado (linha fina) e pontos marcados; começo e fim
maiores que os pontos intermediários. Painel inferior compacto: resumo em uma linha ("07:32 – 19:14 · 14,2 km
percorridos") + uma tira horizontal de pontos (scrubber) representando a linha do tempo do dia, com o ponto
selecionado em destaque e o horário dele em texto grande acima da tira.

### Ordem de implementação

- [ ] Função `distance_meters` (SQL, reaproveitada por §2 e §3).
- [ ] Migration: tabela `location_history` + índice + RLS.
- [ ] RPC `save_location` (upsert + throttle + retenção) substituindo o `.upsert()` direto em
      `src/services/location/index.ts`.
- [ ] Atualizar `watchAndSync` e a task de background para chamar a RPC.
- [ ] `src/services/history/index.ts`: `listHistory(userId, day)`.
- [ ] Tela de histórico (mapa + `Polyline` + chips de dia + scrubber).
- [ ] Ícone de histórico em `MemberRow`.
- [ ] Testar retenção (inserir com `recorded_at` forjado > 7 dias atrás e confirmar que a próxima gravação limpa).

---

## 3. Presença (chegadas e saídas)

### Objetivo

Feed de "quem chegou/saiu de onde": "Mãe chegou em 🏠 Minha Casa às 14:32", "Pai saiu de 💼 Trabalho às 18:05" — e
"quem está onde agora". Implementa o Geofence do MVP (§15 do PROJECT.md), com debounce/histerese, expondo o
resultado como feed em vez de (só) notificação.

### Escopo incluído

- Detecção de entrada/saída em `saved_places`, com histerese pra não gerar eventos por oscilação de GPS.
- Card "Agora" (quem está em qual local, neste momento).
- Feed cronológico de chegadas/saídas, agrupado por dia.

### Fora de escopo (v1)

- **Push notification dos eventos.** Mesmo corte de escopo do chat na leva 1 — a infra de push (Fase 6 do
  `docs/PROJECT.md`) ainda não existe. A tabela `place_notifications` (preferências por local/membro) já existe no
  schema desde o MVP mas segue sem nenhum consumidor; o feed é o primeiro consumidor real dos eventos, só que via
  tela, não push. Quando a Fase 6 for construída, ela consome os mesmos `place_events` — nenhuma mudança de
  schema necessária. **Nota (2026-09-03):** já está especificada em `docs/FEATURES_NEXT_3.md` — `place_enter` é um
  dos dois tipos da primeira leva de lá.
- Filtrar o feed pelas preferências de `place_notifications` — o feed mostra os eventos de todo mundo pra todo
  mundo (decisão de produto: visibilidade do feed ≠ quem recebe notificação push; ver nota abaixo).
- Duração formatada ("ficou 6h no trabalho") — fica pro Resumo (§4), que já cruza os dados.

### Modelo de dados

Estado (uma linha por usuário — "onde ele está agora, e há quanto tempo o candidato está sendo avaliado"):

```text
user_current_place
--------------------
user_id             (PK, FK → users.id, on delete cascade)
saved_place_id       (FK → saved_places.id, on delete set null, nullable — null = "em trânsito")
candidate_place_id   (FK → saved_places.id, on delete set null, nullable)
candidate_since      (timestamptz, nullable)
updated_at           (timestamptz)
```

Eventos (log append-only — é o que o feed lê):

```text
place_events
--------------
id               (PK, uuid)
family_group_id  (FK → family_groups.id, on delete cascade)
user_id          (FK → users.id, on delete cascade)
saved_place_id   (FK → saved_places.id, on delete set null, nullable)
place_name       (text — snapshot do nome do local no momento do evento)
place_icon       (text, nullable — snapshot do ícone)
event            (text: 'enter' | 'exit')
occurred_at      (timestamptz)
```

`place_name`/`place_icon` são snapshot pelo mesmo motivo do `metadata` do log de auditoria (leva 1, item 3): o
local pode ser editado ou apagado depois, e o feed precisa continuar legível.

### Detecção (trigger em `user_locations`, disparado pela RPC `save_location`)

`AFTER INSERT OR UPDATE OF latitude, longitude ON user_locations`, `security definer`, roda pra cada atualização
de posição:

```text
1. candidato = saved_place mais próximo (entre as famílias do usuário) onde
   distance_meters(nova posição, local) <= local.radius
   (o mais próximo se houver mais de um; null se nenhum)

2. se candidato == saved_place_id atual (confirmado) → nada muda, só toca updated_at

3. se candidato != saved_place_id atual:
   a. se candidato != candidate_place_id → reinicia o timer:
      candidate_place_id = candidato, candidate_since = now()
   b. se candidato == candidate_place_id (mesmo candidato de antes) → checa se já passou o debounce:
      debounce = candidato IS NULL ? 2 minutos (saída) : 1 minuto (entrada)
      se now() - candidate_since >= debounce:
        - se saved_place_id atual não é null → insere evento 'exit' pro local atual
        - se candidato não é null           → insere evento 'enter' pro candidato
        - confirma: saved_place_id = candidato, limpa candidate_place_id/candidate_since
```

Debounce assimétrico (saída mais lenta que entrada) de propósito: é na borda do raio, saindo, que o GPS mais
oscila — sair e voltar a entrar em poucos segundos não deve gerar 2 eventos (§15 do PROJECT.md: "GPS instável →
não gerar 10 notificações").

**Bônus:** `user_current_place` também resolve o "local atual" que `docs/PROJECT.md §13` já pedia pro marcador no
mapa ("👤 Vinicius · 🏠 Minha Casa") e que nunca foi implementado — dá pra ler dali direto.

### RLS

```text
place_events:       select = is_group_member(family_group_id); sem insert/update/delete (só o trigger escreve)
user_current_place: select = user_id = auth.uid() OR shares_family_with(user_id); sem policy de escrita
```

Adicionar as duas à publicação `supabase_realtime` (feed e card "Agora" atualizam sozinhos).

### Fluxo de UX

A bottom sheet do mapa ganha um controle segmentado no topo — **Família | Presença** — em vez de um ícone novo na
barra do mapa (que já tem seletor de família, entrar, e o balão de chat da leva 1; mais um ícone ali apertaria).

```text
Mapa → bottom sheet → segmentado no topo do sheet
   ↓                                    ↓
"Família" (aba atual, com o    "Presença" (nova)
ícone de histórico do §2)               ↓
                              card "Agora" (quem está em qual local)
                                         ↓
                              feed cronológico, agrupado por dia (Hoje, Ontem, ...)
```

### Telas de referência

**Mapa — aba Presença** — mesma bottom sheet do mapa, agora com o segmentado "Família | Presença" logo abaixo do
handle. Com "Presença" selecionada: card "Agora" no topo (uma linha por local ocupado, ex. "🏠 Você e Mãe estão em
Minha Casa"; quem está em trânsito não aparece aqui). Abaixo, feed com cabeçalhos de dia ("Hoje", "Ontem") e uma
linha por evento: avatar pequeno + ícone de direção (seta pra dentro = chegada, seta pra fora = saída) + texto
("Mãe chegou em 🏠 Minha Casa") + horário. Sem cor nova — só ícone e texto, como a Atividade da leva 1.

A aba **Família** (mesma bottom sheet) ganha o ícone de histórico (relógio) em cada linha, ao lado do badge de
bateria da leva 1 — é o mesmo mockup que mostra a entrada pro Histórico do §2.

### Ordem de implementação

- [ ] Migration: `user_current_place`, `place_events`, RLS, trigger de detecção (`security definer`, reaproveita
      `distance_meters`), realtime publication.
- [ ] Confirmar que a RPC `save_location` (§1) dispara o trigger corretamente (upsert precisa contar como
      "UPDATE OF latitude, longitude" mesmo quando o valor não muda — usar `AFTER INSERT OR UPDATE` cobre isso).
- [ ] `src/services/presence/index.ts`: `getCurrentPlaces(familyId)`, `listPlaceEvents(familyId, { cursor })`,
      subscribe realtime.
- [ ] Segmentado "Família / Presença" na bottom sheet de `map.tsx`.
- [ ] Tela/aba Presença (card "Agora" + feed).
- [ ] Testar histerese: andar até a borda do raio de um local repetidas vezes e confirmar que não gera eventos
      duplicados — só 1 enter/exit por passagem real.

---

## 4. Resumo diário/semanal de atividade da família

### Objetivo

Um retrato rápido do dia/semana da família, sem precisar rolar o feed inteiro: "Você: 12,4 km, 3 locais, chegou em
casa às 18:32."

### Escopo incluído

- Alternar entre "Hoje" e "Esta semana".
- Uma linha por membro: distância percorrida, nº de locais visitados, último evento (chegada/saída) com horário.

### Fora de escopo

- Notificação/push com o resumo (mesmo corte de push das outras features desta leva e da leva 1).
- Resumo agregado da família inteira (ex. "a família andou X km no total") — números somados que ninguém pediu
  são ruído, não informação (uma linha por pessoa já é o suficiente pra entender o dia de cada um).
- Período customizado (só hoje/semana no v1).

### Fonte dos dados — sem tabela nova

Tudo já existe depois de §2 e §3: `location_history` (distância) e `place_events` (locais visitados, último
evento). O resumo é só uma agregação sobre o período escolhido — não precisa persistir nada.

RPC `security definer` (mesma razão de sempre: menos ida-e-volta, lógica agregada num lugar só):

```text
family_digest(p_family_id uuid, p_period text)  -- p_period: 'today' | 'week'
  para cada membro da família:
    distance_meters somado entre pontos consecutivos de location_history no período
    contagem de saved_place_id distintos entre eventos 'enter' de place_events no período
    place_events mais recente do período (pro "chegou em X às HH:MM")
```

### RLS

Não precisa de tabela/policy nova — a RPC roda como `security definer` e internamente já filtra por
`is_group_member(p_family_id)` antes de agregar (se quem chamou não for membro, retorna vazio/erro).

### Fluxo de UX

```text
Aba Presença (§3) → botão "Resumo" no cabeçalho
   ↓
Tela "Resumo" → segmentado "Diário | Semanal"
   ↓
lista: uma linha por membro (avatar, nome, "12,4 km · 3 locais · chegou em casa às 18:32")
```

### Telas de referência

**Resumo** — cabeçalho com voltar + título "Resumo" + segmentado "Diário | Semanal" (Diário selecionado por
padrão). Lista com uma linha compacta por membro: avatar + nome, e abaixo uma única linha de estatísticas
separadas por `·` (distância, nº de locais, último evento com horário). Sem cards grandes por pessoa — o
objetivo é ler a família inteira num relance, não uma dashboard.

### Ordem de implementação

- [ ] RPC `family_digest(family_id, period)`.
- [ ] `src/services/presence/index.ts` (ou um `digest/index.ts` separado): `getFamilyDigest(familyId, period)`.
- [ ] Tela Resumo (segmentado + lista).
- [ ] Botão "Resumo" no cabeçalho da aba Presença.
- [ ] Testar com um membro sem nenhum dado no período (deve mostrar algo tipo "sem dados hoje", não quebrar).

---

## 5. Resumo de dependências novas

Nenhuma. `react-native-maps` (já no projeto) tem `Polyline` para o traço do histórico; o resto é SQL/RPC/trigger
em cima do Supabase já configurado.

---

## 6. Ordem recomendada

```text
1. Infraestrutura compartilhada (§1) — distance_meters + RPC save_location
2. Histórico de localização (§2)     — depende só de §1
3. Presença (§3)                     — depende só de §1 (independente de §2, mas faz sentido ir junto por reaproveitar o trigger)
4. Resumo (§4)                       — depende de §2 E §3 terem dados
```

---

## 7. O que NÃO fazer nesta leva

- Não implementar push notifications dos eventos de presença nem do resumo (mesma razão da leva 1 — sem infra de
  push ainda). **Nota (2026-09-03):** essa infra já está especificada em `docs/FEATURES_NEXT_3.md`, com
  `place_enter` ("Fulano chegou em {local}") como um dos dois tipos da primeira leva, direto em cima do trigger
  de `place_events` desta seção — `place_exit` segue como próximo passo natural (receita em
  `docs/FEATURES_NEXT_3.md §6`), ainda não construído.
- Não filtrar o feed de Presença pelas preferências de `place_notifications` — o feed é visível a todos os
  membros, sempre; essa tabela é (e continua sendo) só para quando o push existir (nem `docs/FEATURES_NEXT_3.md`
  usa essa tabela na v1 — ver nota lá, §5).
- Não tornar o histórico configurável por família (fixo em 7 dias).
- Não somar estatísticas da família inteira no Resumo — só por pessoa.
- Não introduzir cor nova (a exceção de cor continua sendo só a bateria, leva 1 §2).

---

## 8. Nota de navegação

Depois das duas levas, o app ganhou bastante superfície de "tela de lista cronológica": **Atividade** (log de
auditoria — quem convidou/removeu/editou, leva 1), **Presença** (chegadas/saídas, esta leva) e, em menor grau,
**Histórico** (trajeto de um membro) e **Resumo** (agregado). São domínios de dado genuinamente diferentes, por
isso ficaram em telas separadas nesta especificação — mas vale registrar que, se depois de construídas elas
parecerem redundantes na prática, dá pra unificar Atividade + Presença numa timeline só com um filtro (ex. chip
"Tudo / Família / Locais"), sem precisar mudar nenhum modelo de dados — as duas já são tabelas de eventos com o
mesmo formato (`family_group_id`, `user_id`, `created_at`/`occurred_at`). Não fazer essa unificação agora — é
complexidade que ninguém pediu ainda.
