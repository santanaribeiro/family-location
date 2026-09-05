# Family Location — Próxima leva de features

**Status:** Especificado, pronto para implementação
**Base:** `docs/PROJECT.md` (MVP) — este documento não substitui aquele, complementa.
**Selecionado em:** 2026-09-03

---

## 0. Escopo desta leva

Quatro features, priorizadas pelo usuário a partir de uma lista de candidatas levantada com base no que já estava
mapeado em `docs/PROJECT.md §3` ("Fora do MVP") e em pesquisa de mercado (Life360, Find My, Google Maps location
sharing):

1. Convite por QR code
2. Bateria dos membros visível
3. Log de auditoria da família
4. Chat da família

Cada seção abaixo tem: objetivo, escopo incluído/excluído, modelo de dados, RLS, fluxo de UX e ordem de
implementação — no mesmo nível de detalhe do MVP, para ser entregue direto a um agente de código.

Princípio a manter (§29 do PROJECT.md): **Privacidade → Segurança → Confiabilidade → Bateria → Custo → UX.**
Nenhuma das quatro features exige custo de infraestrutura novo (continuam em Supabase free tier + Expo).

### Mockups (aprovados em 2026-09-03)

8 telas estáticas, no design system atual do app (cores/tipografia/raio/espaçamento tirados de `src/theme` e dos
componentes reais — `Button`, `Text`, `Avatar`, `MemberRow`, etc.):
[Mockups Próximas Features](https://claude.ai/code/artifact/7b67b563-9154-49cb-8aa1-8291d64868e5).

Cada seção abaixo tem uma subseção **"Telas de referência"** descrevendo em texto o que está em cada mockup —
para o caso do link não estar acessível a quem for implementar, a descrição escrita é a fonte de verdade
equivalente.

---

## 1. Convite por QR code

### Objetivo

Hoje `family.tsx` só permite copiar o link de convite (`createInvite` + `Clipboard`). Adicionar um segundo formato
— gerar um QR code do link, e ler QR code de outra pessoa — cobre o caso comum de convidar alguém que está
fisicamente perto (ex.: mostrar a tela para o avô escanear) sem precisar mandar link por outro app.

### Escopo incluído

- Gerar QR code do link de convite (tela "Mostrar QR code" na aba Família).
- Ler QR code de convite pela câmera (opção dentro do modal do `JoinFamilyButton`).
- Reaproveita 100% a infraestrutura de convite existente (`family_group_invites`, `createInvite`, `acceptInvite`,
  `extractInviteToken`) — **nenhuma tabela nova, nenhuma RLS nova**.

### Fora de escopo

- Convite multi-uso / sem expiração (o token continua single-use, como hoje — ver nota de atenção abaixo).
- Scanner de QR na versão web (câmera via `expo-camera` no navegador não é confiável entre browsers; web já tem o
  fluxo de colar link/código, que funciona bem).

### Novas dependências

```text
expo-camera            → leitura do QR (CameraView + onBarcodeScanned, API do SDK 54)
react-native-qrcode-svg → renderização do QR (usa react-native-svg como peer dependency)
react-native-svg        → peer dependency do pacote acima
```

`app.json` precisa do plugin `expo-camera` com `cameraPermission` (string em pt-BR, mesmo padrão do plugin
`expo-location` já configurado) para gerar o `NSCameraUsageDescription` (iOS) e a permissão `CAMERA` (Android).

### Fluxo de UX

**Gerar (tela Família):**
```text
family.tsx → ícone "share-social-outline" no card da família
   ↓
abre modal com 2 ações: "Mostrar QR code" (novo, ação primária) | "Copiar link" (secundária, comportamento atual)
   ↓
"Mostrar QR code" chama createInvite() (novo token) e renderiza <QRCode value={inviteLink(token)} />
```

**Ler (`JoinFamilyButton`):**
```text
Modal "Entrar em uma família" ganha um botão/ícone extra: "Ler QR code" (oculto quando Platform.OS === 'web')
   ↓
Abre CameraView em tela cheia com barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
   ↓
onBarcodeScanned → extractInviteToken(data) → acceptInvite(token) → mesmo caminho feliz do código colado
```

Reaproveitar `extractInviteToken` já é importante: ele já sabe extrair o token tanto de um link completo quanto de
um token cru, então o scanner não precisa de lógica própria de parsing.

### Telas de referência

1. **Convidar — menu** — o card da família (aba Família) com um modal sobre fundo escurecido
   (`rgba(0,0,0,0.55)`, mesmo padrão do modal do `JoinFamilyButton`): título "Convidar para {nome da família}",
   texto de apoio, e 3 ações empilhadas de cima pra baixo — `Mostrar QR code` (botão primário, ícone de QR),
   `Copiar link` (botão secundário, ícone de copiar) e `Cancelar` (ghost). Aberto pelo mesmo ícone de
   compartilhar que já existe no card.
2. **QR gerado** — modal centralizado: nome da família, instrução ("Peça para a pessoa escanear com a câmera do
   celular"), o QR num quadrado **branco** com quiet zone (o módulo em si é sempre preto sobre branco, mesmo no
   app sendo dark-only — é requisito físico de leitura óptica pela câmera, não uma decisão de tema), abaixo uma
   linha com o link truncado (fonte monoespaçada) + ícone de copiar ao lado, legenda "O código expira depois de
   usado uma vez", botão `Fechar`.
3. **Leitor de QR** — tela cheia, sem chrome do app (nem barra de status/teclado falsos — só o fundo de câmera).
   Botão de voltar (círculo translúcido) no canto superior esquerdo, moldura de mira com os 4 cantos em L no
   centro, texto "Aponte a câmera para o QR code" abaixo da moldura, e um link secundário "Ou digite o código"
   perto da base — fallback pra quem não conseguir escanear (essa tela nem existe na versão web, que já usa o
   campo de colar código).

### Atenção (não é escopo desta feature, mas vale registrar)

`createInvite` hoje não define `expires_at` — o token só expira por uso único, nunca por tempo. Isso já é assim no
MVP; QR code só aumenta um pouco a chance de alguém de fora escanear a tela por cima do ombro. Não é necessário
resolver agora, mas se `family_group_invites.expires_at` ganhar um valor padrão (ex.: 24h) no futuro, tanto o link
quanto o QR se beneficiam automaticamente — nenhuma mudança adicional nesta feature.

### Ordem de implementação

- [ ] Adicionar `expo-camera`, `react-native-qrcode-svg`, `react-native-svg` ao projeto.
- [ ] Configurar plugin `expo-camera` no `app.json` com texto de permissão em pt-BR.
- [ ] Componente `InviteQrModal` (recebe `familyId`, chama `createInvite`, renderiza o QR).
- [ ] Componente `QrScannerModal` (câmera + `onBarcodeScanned`, gate por `Platform.OS !== 'web'`).
- [ ] Ligar os dois em `family.tsx` e `JoinFamilyButton.tsx`.
- [ ] Testar em dev build Android (Expo Go não dá acesso a `expo-camera` de forma confiável para scanner contínuo).

---

## 2. Bateria dos membros visível

### Objetivo

Mostrar o nível de bateria do celular de cada membro (como Life360/Find My fazem) — sinal simples de "esse
familiar pode ficar sem localização em breve porque a bateria está acabando".

### Escopo incluído

- Capturar nível de bateria (0–100%) e se está carregando, no dispositivo do próprio usuário.
- Exibir a bateria dos outros membros no mapa (badge no marcador) e na lista da bottom sheet (`MemberRow`).

### Fora de escopo

- Alertas de bateria fraca (notificar quando <20%) — natural fast-follow, não pedido nesta leva.
- Histórico de bateria.

### Modelo de dados

Nova tabela, **separada de `user_locations`** — decisão deliberada:

```text
user_device_status
-------------------
user_id        (PK, FK → users.id, on delete cascade)
battery_level  (real, 0.0–1.0, nullable)
battery_state  (text: 'unknown' | 'unplugged' | 'charging' | 'full')
low_power_mode (boolean, default false)
updated_at     (timestamptz, default now())
```

Por quê uma tabela nova em vez de colunas em `user_locations`: bateria não deveria depender de um fix de GPS
para ser atualizada (ex.: celular parado em casa, sem `distanceInterval` disparando, ainda deve reportar bateria
periodicamente), e a tabela `user_locations` já é conceitualmente "última posição conhecida" (§21 do PROJECT.md).
Manter os dois domínios em tabelas separadas facilita evoluir cada um sem acoplar (mesmo raciocínio do doc para
separar eventos de persistência de localização, §16).

### RLS

Mesmo padrão de `user_locations` (reaproveita os helpers `security definer` já existentes):

```text
select: user_id = auth.uid() OR shares_family_with(user_id)
insert/update: user_id = auth.uid()  (upsert da própria bateria apenas)
```

Adicionar a tabela à publicação `supabase_realtime` (mesmo padrão de `user_locations`/`saved_places`) para o
badge atualizar sozinho.

### Captura no app

- Nova dependência: `expo-battery` (`getBatteryLevelAsync`, `getBatteryStateAsync`, `isLowPowerModeEnabledAsync`,
  mais os listeners `watchBatteryLevelAsync`/`watchBatteryStateAsync` para não fazer polling).
- Nenhuma permissão de runtime é necessária (iOS/Android expõem bateria sem prompt).
- Onde disparar o upsert: piggyback no mesmo ciclo que já existe, para não criar um novo timer e não gastar
  bateria extra —
  - no `watchAndSync` (foreground, `src/services/location/index.ts`), envia bateria junto de cada localização;
  - na task de background (`src/services/location/background.ts`), idem, dentro do handler existente;
  - adicional: os listeners de `expo-battery` podem disparar um upsert imediato quando o estado muda bruscamente
    (ex.: começou a carregar), sem esperar o próximo ciclo de localização — mais fiel ao que os apps de
    referência fazem, mas opcional para v1 se o agente quiser simplificar.

### UI

**Exceção deliberada ao monocromático.** A paleta do app é cinza puro por decisão de design (commit `fc4d22f`,
`src/theme/colors.ts`: `success`/`warning`/`danger` hoje colapsam no mesmo cinza). Para bateria, o usuário pediu
explicitamente para usar cor de verdade — o nível da bateria é justamente o tipo de informação que se lê num
piscar de olho por cor, então vale abrir exceção aqui. **Nenhum outro lugar do app deve virar colorido por causa
disso** — QR code, log de auditoria e chat continuam no cinza padrão (ver §7).

Reativar `success`/`warning`/`danger` em `src/theme/colors.ts` com valores reais (hoje neutralizados em cinza),
para esse token voltar a existir como "cor de status" reutilizável por qualquer feature futura que precise —
não só bateria:

```text
success (bateria ≥ 50%) → verde   #5FBF7B
warning (bateria 20–49%) → âmbar  #E0B95C
danger  (bateria < 20%)  → vermelho #E5686B
```

Tons desaturados de propósito, para não destoarem do resto da UI (que continua cinza) nem parecerem "alerta de
sistema operacional" berrante — mais "sinalização discreta" do que "aviso".

Mapeamento ícone (`Ionicons`) + cor por estado:

```text
carregando            → battery-charging  (cor pelo nível, como abaixo)
nível ≥ 50%            → battery-full      cor success
nível 20–49%            → battery-half      cor warning
nível < 20%             → battery-dead      cor danger
sem dado (nunca sincronizou) → nenhum badge (não quebra layout)
```

- `MemberRow`: badge pequeno ao lado do "Atualizado há X" — ícone colorido + texto, ex. `🔋 68%`.
- `FamilyMap` (marcador): badge pequeno no canto do avatar circular, com a mesma cor/ícone, só quando
  `battery_level` existe.

### Telas de referência

1. **Mapa — lista da família** — o bottom sheet como já existe hoje; cada `MemberRow` ganha o badge no fim da
   linha, depois do "Atualizado há X": um gauge retangular pequeno (contorno cinza, preenchimento colorido
   proporcional ao nível) + a porcentagem em texto, colorida na mesma cor do preenchimento. Quando carregando,
   um ícone de raio aparece antes do gauge (cor = a do nível atual, não uma cor própria de "carregando").
2. **Detalhe — marcador no mapa** — o mesmo badge (gauge + porcentagem), miniaturizado, ancorado no canto
   inferior-direito do círculo do avatar no marcador, com fundo escuro e borda para não se perder sobre o mapa.

### Ordem de implementação

- [ ] Migration: tabela `user_device_status` + RLS + realtime publication.
- [ ] Adicionar `expo-battery`.
- [ ] `src/services/battery/index.ts`: `getSnapshot()`, `upsertBatteryStatus()`, `watchBattery()`.
- [ ] Integrar upsert de bateria no `watchAndSync` e na task de background.
- [ ] Buscar `user_device_status` junto de `getFamilyLocations` (join por `user_id`, igual já é feito para
      `user_locations` + `users`).
- [ ] Badge de bateria em `MemberRow` e no marcador de `FamilyMap`/`FamilyMap.web`.

---

## 3. Log de auditoria da família

### Objetivo

Registrar "quem fez o quê" dentro da família — quem convidou, quem removeu um membro, quem criou/editou/apagou um
local, quem renomeou a família. Hoje essas mudanças acontecem silenciosamente; qualquer membro pode ser
surpreendido por uma remoção ou por um local que sumiu sem saber quem tirou.

### Escopo incluído

- Log automático (via trigger no banco, não no app) das mutações abaixo.
- Tela "Atividade" dentro da aba Família, listando os eventos da família ativa.

### Fora de escopo

- Edição de mensagens de chat no log (o chat, se vier, tem sua própria seção — ver item 4).
- Retenção/expurgo automático (mesmo raciocínio do §21 do PROJECT.md para histórico de localização: não é
  necessário para o volume esperado numa família; a tela pagina as últimas N entradas).

### Modelo de dados

```text
family_audit_log
-----------------
id                (PK, uuid)
family_group_id   (FK → family_groups.id, on delete cascade)
actor_user_id     (FK → users.id, on delete set null — nullable: ator pode ter saído/sido removido depois)
action            (text: 'family_created' | 'family_renamed' | 'invite_created' |
                         'member_joined' | 'member_left' | 'member_removed' | 'member_role_changed' |
                         'place_created' | 'place_updated' | 'place_deleted')
target_user_id    (FK → users.id, on delete set null, nullable — quem sofreu a ação, quando aplicável)
metadata          (jsonb — snapshot legível: nome do local, nome/role antigo→novo, etc.)
created_at        (timestamptz, default now())
```

`metadata` existe porque nomes podem mudar ou a entidade pode ser apagada — o log precisa continuar legível depois
(ex.: local apagado ainda mostra "Fulano apagou 🏋️ Academia", mesmo sem `saved_places` para consultar).

### Por que trigger no banco, não `INSERT` no app

Consistente com §20 do PROJECT.md ("nunca confiar exclusivamente nas validações do cliente") e com o padrão já
usado em `create_family_group`/`accept_invite`: a lógica de negócio crítica mora no Postgres. Um trigger garante
que **toda** remoção de membro ou exclusão de local gera log, mesmo que aconteça por uma via que não passou pelo
`services/family`. Se o registro dependesse de uma chamada extra no client, um bug ou uma chamada direta à tabela
deixaria buracos no histórico.

Funções de trigger devem ser `security definer`, do mesmo dono das tabelas (mesmo padrão das RPCs existentes) —
isso permite que o insert em `family_audit_log` funcione independente da RLS de quem disparou a mutação original.

Triggers necessários:

```text
family_groups      AFTER UPDATE OF name   → 'family_renamed'      (actor = auth.uid())
family_group_invites AFTER INSERT         → 'invite_created'      (actor = created_by)
family_group_members AFTER INSERT         → 'member_joined'       (actor = target = NEW.user_id)
family_group_members AFTER UPDATE OF role → 'member_role_changed' (actor = auth.uid(), metadata: old/new role)
family_group_members AFTER DELETE         → 'member_removed' se OLD.user_id != auth.uid(),
                                             senão 'member_left'   (actor = auth.uid(), target = OLD.user_id)
saved_places        AFTER INSERT          → 'place_created'
saved_places        AFTER UPDATE          → 'place_updated'       (metadata: campos alterados)
saved_places        AFTER DELETE          → 'place_deleted'       (metadata: nome/ícone do local, via OLD.*)
```

Não logar `invite_used`/`accept_invite` separadamente — seria redundante com `member_joined`, que já cobre o
resultado observável.

### RLS

```text
select: is_group_member(family_group_id)   -- todos os membros veem (decisão de transparência; ver nota abaixo)
insert/update/delete: nenhuma policy para authenticated — só os triggers (security definer) escrevem
```

**Nota de produto:** deixar visível para todos os membros (não só owner/admin) porque a família já compartilha
localização entre si — o nível de confiança já é alto, e transparência sobre remoções/edições evita a sensação de
"sumiu sem explicação". Se o usuário preferir restringir a owner/admin, é só trocar a policy de select para
`has_group_role(family_group_id, array['owner','admin'])`.

### UI

Nova entrada na aba Família: botão/link "Ver atividade" no topo (ou por família, dentro do card) → tela com lista
cronológica (mais recente primeiro), reaproveitando `timeAgo()`:

```text
👋 Você entrou na família · há 2 dias
🗑️ Mãe removeu Pedro · há 5 dias
📍 Você criou 🏋️ Academia · há 1 semana
✏️ Pai renomeou "Família" para "Família Ribeiro" · há 2 semanas
```

Ícone por tipo de ação (Ionicons, sem cor nova — mesmo raciocínio da seção de bateria). Paginar (ex.: 30 por vez,
"carregar mais") em vez de carregar tudo de uma vez.

Mapeamento `action` → ícone usado no mockup (manter na implementação, por consistência):

```text
member_joined        → person-add
member_left          → exit (mesmo ícone já usado no botão "Sair da família" em family.tsx)
member_removed       → trash
member_role_changed  → pencil
place_created        → pin (location)
place_updated        → pencil
place_deleted        → trash
family_renamed       → pencil
family_created       → person-add (mesmo ícone de "entrou" — criar a família implica entrar nela como owner)
invite_created       → link
```

### Telas de referência

**Atividade da família** — acessível a partir da aba Família (topo: seta de voltar + título "Atividade",
subtítulo com o nome da família ativa). Lista rolável, uma linha por evento: ícone circular pequeno (cinza, sem
cor — contorno + fundo neutro) à esquerda, descrição em texto corrido à direita com o tempo relativo abaixo
(reaproveitando `timeAgo()`). Botão `Carregar mais` (ghost) centralizado no fim da lista.

### Ordem de implementação

- [ ] Migration: tabela `family_audit_log` + RLS (só select) + os 7 triggers `security definer`.
- [ ] `src/services/audit/index.ts`: `listAuditLog(familyId, { cursor })`.
- [ ] Tela `activity.tsx` (ou modal a partir de `family.tsx`) com a lista.
- [ ] Testar cada ação (remover membro, sair, criar/editar/apagar local, renomear família, gerar convite, entrar
      por convite) e conferir que a entrada certa aparece, com o ator/alvo corretos.

---

## 4. Chat da família

### Objetivo

Conversa simples de texto por família, para coordenação rápida ("cheguei", "já saiu daí?") sem depender de outro
app.

### Escopo incluído (v1)

- Mensagens de texto simples, por família.
- Lista em tempo real (Realtime), mensagens próprias à direita, dos outros à esquerda com avatar/nome.
- Apagar a própria mensagem (soft delete — mostra "Mensagem apagada" no lugar, mesmo padrão do WhatsApp).

### Fora de escopo (v1)

- Anexos (foto, áudio, localização compartilhada dentro do chat).
- Edição de mensagem.
- Respostas/threads, reações, "digitando...".
- **Push notification de mensagem nova.** Isso é o maior corte de escopo: o projeto ainda não tem nenhuma
  infraestrutura de push (Fase 6 do `docs/PROJECT.md` — registro de device token, Expo push — não foi
  construída; hoje `notify()` só faz alertas locais/in-app). Sem isso, uma mensagem só aparece pro destinatário
  se o app estiver aberto (via Realtime) ou ao abrir o app depois (contagem de não lidas). Implementar push aqui
  contaminaria o escopo desta feature com a Fase 6 inteira do MVP original — melhor construir o chat v1 sem push
  e, quando a infra de push for feita (ela também é pré-requisito das notificações de entrada/saída de local, que
  já estão especificadas e ainda não implementadas), plugar o chat nela como consumidor a mais.
  **Nota (2026-09-03):** essa infra já está especificada em `docs/FEATURES_NEXT_3.md` — mensagem nova de chat é
  um candidato natural a próximo `type` no pipeline de lá (receita em `docs/FEATURES_NEXT_3.md §6`), ainda não
  construído.

### Modelo de dados

```text
family_messages
-----------------
id              (PK, uuid)
family_group_id (FK → family_groups.id, on delete cascade)
user_id         (FK → users.id, on delete set null — mensagem permanece após o autor sair/ser removido)
body            (text, 1–2000 caracteres)
deleted_at      (timestamptz, nullable — soft delete)
created_at      (timestamptz, default now())
```

Sem `updated_at`/edição no v1 — reduz superfície (não precisa de indicador "editado").

### RLS

```text
select: is_group_member(family_group_id)
insert: is_group_member(family_group_id) AND user_id = auth.uid()
update: (user_id = auth.uid()) OR has_group_role(family_group_id, array['owner','admin'])
        -- apenas para permitir soft delete (set deleted_at); ver nota abaixo
delete: nenhuma policy — nunca DELETE físico, só soft delete via UPDATE
```

Owner/admin podem apagar mensagem de qualquer membro (moderação básica); um member só apaga a própria. A policy de
`update` deveria, na prática, restringir quais colunas podem mudar (idealmente só `deleted_at`) — como Postgres
RLS não faz "column-level update" nativamente de forma simples, a validação de que só `deleted_at` mudou (corpo
da mensagem não foi reescrito) deve ficar num trigger `before update` que rejeita mudança em `body`/`user_id`/
`family_group_id`, ou a operação de apagar deve ser uma RPC dedicada (`delete_message(p_id uuid)`,
`security definer`) em vez de exposta como update livre pelo client — **recomendado: RPC**, para ficar no mesmo
padrão de `accept_invite`/`create_family_group` e não depender de disciplina do client.

Adicionar `family_messages` à publicação `supabase_realtime`.

### Fluxo de UX

Entrada: ícone de balão de chat na barra superior do mapa (ao lado do `FamilySelector`/`JoinFamilyButton` em
`map.tsx`), não uma 5ª aba — mantém a filosofia do §19 do PROJECT.md ("mapa é a tela principal, sem sequência de
menus antes dele"). Abre uma tela/modal de chat da família ativa.

```text
map.tsx (topo) → ícone "chatbubble-outline"
   ↓
tela Chat (família ativa == activeFamilyId do useFamilyStore)
   ↓
lista de mensagens (realtime) + campo de texto + botão enviar
   ↓
long-press na própria mensagem (ou nas de outros, se owner/admin) → "Apagar"
```

Indicador simples de mensagem não lida: contagem local (última mensagem lida por família, guardada em
`AsyncStorage`, mesmo padrão do `familyStore.ts` para persistência leve) comparada ao timestamp da mensagem mais
recente — vira um badge no ícone do balão. Não precisa de tabela nova para isso no v1 (é só client-side).

### Telas de referência

1. **Entrada no mapa** — ícone de balão de chat (botão circular, mesmo padrão dos outros botões do topo do mapa)
   ao lado do `FamilySelector` e do botão `Entrar`. Quando há mensagem não lida, um badge pequeno (círculo com
   número) fica sobreposto no canto superior-direito do ícone.
2. **Conversa** — cabeçalho com voltar + avatar da família + nome e contagem de membros. Lista de mensagens em
   bolhas: recebidas alinhadas à esquerda, com avatar e nome do remetente acima do texto, fundo `neutral-800`;
   próprias alinhadas à direita, sem avatar/nome, fundo `neutral-700` (um tom mais claro que as recebidas — usa
   só os tons cinza que já existem, sem introduzir cor nova, e ainda assim diferencia visualmente quem mandou
   o quê). Mensagem apagada mostra "Mensagem apagada" em itálico/muted no lugar do texto, na mesma bolha.
   Composer fixo embaixo: campo de texto + botão de enviar circular.

### Ordem de implementação

- [ ] Migration: tabela `family_messages` + RLS + RPC `delete_message` + realtime publication.
- [ ] `src/services/chat/index.ts`: `listMessages`, `sendMessage`, `deleteMessage`, `subscribeMessages`.
- [ ] Tela de chat (lista + composer), reaproveitando `Avatar`/`Text`/`Screen`.
- [ ] Ícone de entrada em `map.tsx` + badge de não lida (client-side).
- [ ] Testar com 2+ contas simultâneas (realtime chegando pros dois lados, soft delete refletindo pros dois).

---

## 5. Resumo de dependências novas

```text
expo-camera             — leitura de QR (item 1)
react-native-qrcode-svg — geração de QR (item 1)
react-native-svg        — peer de react-native-qrcode-svg (item 1)
expo-battery            — nível/estado de bateria (item 2)
```

Nenhuma dependência nova para os itens 3 (auditoria) e 4 (chat) — só tabelas/RPCs novas em cima do Supabase já
configurado.

---

## 6. Ordem recomendada entre as 4 features

```text
1. QR code de convite   → menor escopo, zero tabela nova, reaproveita tudo que já existe
2. Bateria dos membros  → 1 tabela nova simples, 1 dependência nova, sem tela nova (só badges)
3. Log de auditoria     → 1 tabela nova + triggers (mexe mais no banco), mas nenhuma dependência nova
4. Chat da família      → maior escopo (tabela + RPC + tela nova + realtime + estado de não lida)
```

Cada item é independente dos outros — podem ser feitos em qualquer ordem ou em paralelo por PRs separados, mas a
ordem acima vai da menor à maior complexidade/risco.

---

## 7. O que NÃO fazer nesta leva

Para manter o escopo do que foi pedido:

- Não implementar push notifications (pré-requisito maior, fora do que foi selecionado — ver nota no item 4).
- Não implementar alerta de bateria fraca (só a visibilidade foi pedida).
- Não mudar o modelo de convite para multi-uso/expiração padrão (fora do que foi pedido; ver nota no item 1).
- Não espalhar cor para outros lugares do app por causa da bateria — QR code, log de auditoria e chat continuam
  monocromáticos (cinza). A exceção de cor (item 2) é só para o indicador de nível de bateria.
