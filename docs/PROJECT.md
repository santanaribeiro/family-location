# Family Location — Especificação do Projeto

**Status:** Escopo do MVP definido  
**Versão:** 1.0  
**Objetivo:** Documento-base para desenvolvimento por agente de código

---

# 1. Visão geral

Family Location é um aplicativo mobile para grupos familiares compartilharem localização e cadastrarem locais importantes no mapa.

O produto deve permitir que:

1. Usuários façam login com Google.
2. Usuários criem e participem de múltiplas famílias/grupos.
3. Membros sejam convidados através de links.
4. Todos os membros da família possam visualizar a localização uns dos outros enquanto o compartilhamento estiver ativo.
5. A localização seja atualizada em background pelo celular.
6. Famílias cadastrem locais importantes com coordenada e raio.
7. O sistema identifique automaticamente quando um membro entra ou sai de um local.
8. O sistema envie notificações de chegada e saída.
9. Cada membro possa configurar quais eventos deseja receber.
10. O aplicativo seja desenvolvido para Android e iOS, com Android como primeira plataforma de distribuição/testes.

---

# 2. Escopo do MVP

## Incluído

### Autenticação
- Login com Google.
- Logout.
- Persistência da sessão.

### Famílias
- Criar família.
- Editar nome da família.
- Listar famílias do usuário.
- Alternar entre famílias.
- Participar de múltiplas famílias.
- Listar membros.
- Convidar membros.
- Entrar através de convite.
- Remover membros conforme permissão.
- Sair de uma família.

### Localização
- Solicitar permissão de localização.
- Obter localização atual.
- Atualizar localização em background.
- Armazenar a última localização conhecida.
- Exibir membros no mapa.
- Exibir precisão e horário da última atualização.
- Atualizar posições através de Realtime.

### Locais
- Criar local.
- Editar local.
- Excluir local.
- Definir nome.
- Definir coordenada.
- Definir raio.
- Definir ícone.
- Exibir locais no mapa.

### Geofence
- Detectar entrada em local.
- Detectar saída de local.
- Evitar notificações duplicadas.
- Identificar o local atual do membro.

### Notificações
- Notificar entrada em local.
- Notificar saída de local.
- Permitir configurar destinatários/eventos.

---

# 3. Fora do MVP

As seguintes funcionalidades serão deixadas para versões futuras:

- Histórico completo de localização.
- "Estou indo para..."
- ETA.
- Rotas.
- Histórico de viagens.
- SOS.
- Alertas de emergência.
- Bateria dos membros.
- Chat.
- Compartilhamento temporário individual.
- Modo privado/pausa de localização.
- Funcionalidades avançadas de automação.

A arquitetura deve, entretanto, evitar decisões que dificultem a implementação futura dessas funcionalidades.

---

# 4. Stack tecnológica

## Mobile

**React Native + Expo + TypeScript**

O aplicativo terá uma única base de código para Android e iOS.

Expo será utilizado para facilitar:

- Desenvolvimento.
- Integração com APIs nativas.
- Builds.
- Testes.
- Distribuição inicial.

---

## UI

**NativeWind + componentes próprios de React Native**

Não utilizar Ant Design ou Chakra UI como base principal da interface mobile.

O projeto terá um pequeno design system próprio.

Estrutura:

```text
src/
├── components/
│   ├── Button/
│   ├── Input/
│   ├── Card/
│   ├── Avatar/
│   ├── BottomSheet/
│   ├── MapMarker/
│   └── ...
├── screens/
├── navigation/
├── hooks/
├── services/
├── stores/
└── theme/
```

O design system deve centralizar:

```text
colors
spacing
typography
radius
shadows
icons
```

A interface deve priorizar simplicidade e o mapa como elemento central do produto.

---

## Backend

**Supabase**

Componentes:

- Supabase Auth.
- PostgreSQL.
- Row Level Security.
- Realtime.
- Edge Functions quando necessário.

Não haverá backend PHP no MVP.

PHP poderá ser introduzido posteriormente caso surja necessidade de regras de negócio, integrações ou serviços que justifiquem uma API própria.

---

## Push Notifications

Utilizar Firebase Cloud Messaging e/ou mecanismos compatíveis com Expo para notificações push.

A implementação deve abstrair o provedor de push para permitir evolução futura.

---

# 5. Arquitetura

```text
┌─────────────────────────────────┐
│         Mobile App              │
│      React Native + Expo        │
│                                 │
│  Maps / GPS / Geofence / Push   │
└────────────────┬────────────────┘
                 │
                 │ HTTPS
                 │
                 ▼
┌─────────────────────────────────┐
│            Supabase             │
│                                 │
│ Auth                            │
│ PostgreSQL                      │
│ Row Level Security              │
│ Realtime                        │
│ Edge Functions                  │
└─────────────────────────────────┘
```

Fluxo de localização:

```text
GPS do celular
      ↓
React Native
      ↓
Atualização de localização
      ↓
Supabase
      ↓
user_locations
      ↓
Realtime
      ↓
Outros membros da família
```

O banco deve representar principalmente o **estado atual da localização**, e não um histórico ilimitado.

---

# 6. Usuários e autenticação

## Login

O único método de autenticação do MVP será Google OAuth.

Fluxo:

```text
Abrir aplicativo
      ↓
Continuar com Google
      ↓
Google OAuth
      ↓
Sessão autenticada
      ↓
Criar família ou entrar em família
```

Não implementar inicialmente:

- Senha.
- E-mail/senha.
- Facebook.
- Apple Sign In.
- SMS.

A arquitetura deve permitir adicionar métodos futuramente.

---

# 7. Famílias

Um usuário pode participar de **múltiplas famílias**.

Exemplo:

```text
Vinicius
├── Família Ribeiro
├── Família Silva
└── Outro grupo
```

O usuário terá uma família selecionada/ativa no aplicativo.

O mapa e os dados apresentados devem respeitar a família atualmente selecionada.

---

# 8. Papéis

Os grupos terão três papéis:

```text
owner
admin
member
```

### Owner

- Criar família.
- Alterar configurações.
- Gerenciar membros.
- Gerenciar administradores.
- Gerenciar convites.

### Admin

- Gerenciar membros conforme regras de autorização.
- Gerenciar convites.
- Gerenciar locais.

### Member

- Visualizar membros.
- Compartilhar localização.
- Criar/editar locais, conforme regra definida pelo produto.
- Configurar suas preferências de notificação.

A autorização deve ser aplicada no backend/banco através de RLS e não apenas no aplicativo.

---

# 9. Convites

Os convites serão feitos através de links únicos.

Exemplo:

```text
https://app.example.com/invite/<token>
```

O token deve ser aleatório e não deve expor IDs internos.

Tabela:

```text
family_group_invites
--------------------
id
family_group_id
token
created_by
expires_at
used_at
created_at
```

Fluxo:

```text
Membro
  ↓
Gerar convite
  ↓
Link
  ↓
Novo usuário abre
  ↓
Login Google
  ↓
Aceitar convite
  ↓
family_group_members
```

O sistema deve permitir:

- Expiração.
- Uso único.
- Revogação futura.

---

# 10. Modelo de dados

## users

```text
id
name
email
avatar_url
created_at
updated_at
```

A autenticação deve utilizar o identificador do Supabase Auth como referência.

---

## family_groups

```text
id
name
created_by
created_at
updated_at
```

---

## family_group_members

```text
id
family_group_id
user_id
role
joined_at
```

Constraint recomendada:

```text
UNIQUE(family_group_id, user_id)
```

---

## family_group_invites

```text
id
family_group_id
token
created_by
expires_at
used_at
created_at
```

Constraint recomendada:

```text
UNIQUE(token)
```

---

## user_locations

Representa a última localização conhecida.

```text
user_id
latitude
longitude
accuracy
altitude
speed
heading
recorded_at
```

A localização deve possuir timestamp para que a interface consiga diferenciar:

```text
Atualizado há 10 segundos
```

de:

```text
Atualizado há 20 minutos
```

---

## saved_places

Locais pertencem à **família**, não individualmente ao usuário.

```text
id
family_group_id
name
latitude
longitude
radius
icon
created_by
created_at
updated_at
```

Exemplo:

```text
Família Ribeiro

🏠 Minha Casa
💼 Trabalho
👵 Casa da Vó
🏋️ Academia
```

---

## place_notifications

Tabela para configuração de notificações por membro/local.

```text
id
saved_place_id
user_id
notify_on_enter
notify_on_exit
created_at
updated_at
```

Essa estrutura permite configurar individualmente quem recebe quais eventos.

---

# 11. Localização

O celular será responsável pela obtenção da localização.

O MVP deve armazenar somente a última posição conhecida.

Não implementar histórico neste momento.

A estrutura, entretanto, deve permitir adicionar posteriormente uma tabela de histórico sem precisar alterar radicalmente o modelo atual.

---

## Frequência de atualização

A frequência não deve ser fixa em 1 segundo.

Comportamento inicial esperado:

```text
Usuário em movimento:
    aproximadamente 10–30 segundos

Usuário parado:
    menor frequência

Mudança significativa:
    atualização imediata
```

Os valores finais devem ser determinados através de testes reais de:

- Consumo de bateria.
- Precisão.
- Frequência de atualização.
- Android.
- iOS.

A plataforma deve ter liberdade para otimizar a frequência conforme suas próprias APIs de localização.

---

# 12. Estado da localização

O MVP **não terá botão de "pausar localização"**.

O compartilhamento será tratado como uma capacidade normal do aplicativo.

Não implementar neste momento:

```text
Pausar
Modo privado
Pausar por 1 hora
Compartilhamento temporário
```

Essas funcionalidades podem ser adicionadas futuramente.

---

# 13. Visualização no mapa

A tela principal deve abrir diretamente no mapa.

Exemplo conceitual:

```text
┌─────────────────────────────┐
│ Família Ribeiro         ⚙️  │
├─────────────────────────────┤
│                             │
│            MAPA             │
│                             │
│       🔵                    │
│                🟢           │
│                         🔴  │
│                             │
│          🏠                 │
│                             │
├─────────────────────────────┤
│ Mapa    Família    Locais   │
└─────────────────────────────┘
```

Cada marcador deve poder apresentar:

- Avatar.
- Nome.
- Local identificado.
- Estado da última atualização.

Exemplo:

```text
👤 Vinicius
🏠 Minha Casa
Atualizado há 12 segundos
```

---

# 14. Locais salvos

Um local possui:

```text
Nome
Latitude
Longitude
Raio
Ícone
```

Exemplo:

```text
🏠 Minha Casa

Latitude:  -23.5505
Longitude: -46.6333
Raio:      100m
```

Os locais são compartilhados por todos os membros da família.

Qualquer membro autorizado poderá utilizar os locais para identificação e notificações.

---

# 15. Geofence

A lógica conceitual:

```text
distância(localização, local) <= radius
```

significa que o usuário está dentro do local.

Quando:

```text
distância > radius
```

está fora.

Entretanto, não deve ser utilizado somente um teste instantâneo para gerar eventos.

É necessário considerar:

- Accuracy do GPS.
- Oscilação da posição.
- Pequenos erros de GPS.
- Entradas e saídas repetidas.
- Tempo mínimo de permanência.
- Debounce/histerese.

Objetivo:

```text
GPS instável
     ↓
Não gerar 10 notificações
```

O sistema deve produzir apenas eventos significativos.

---

# 16. Eventos

Eventos iniciais:

```text
LOCATION_UPDATED
ENTER_PLACE
EXIT_PLACE
```

Exemplo:

```text
GPS
 ↓
Usuário entrou no raio
 ↓
ENTER_PLACE
 ↓
"Vinicius chegou em Minha Casa"
```

Saída:

```text
EXIT_PLACE
 ↓
"Vinicius saiu de Minha Casa"
```

A lógica de eventos deve ser separada da persistência da localização para facilitar futuras funcionalidades.

---

# 17. Notificações

Notificações do MVP:

### Entrada

```text
🏠 Vinicius chegou em Minha Casa.
```

### Saída

```text
🚗 Vinicius saiu de Minha Casa.
```

Os destinatários serão determinados por `place_notifications`.

Exemplo:

```text
Minha Casa

Vinicius:
☑ Entrada
☑ Saída

Mãe:
☑ Entrada
☐ Saída

Pai:
☑ Entrada
☑ Saída
```

---

# 18. Navegação

Estrutura principal:

```text
App
├── Authentication
│   └── Google Login
│
└── Main
    ├── Map
    ├── Family
    ├── Places
    └── Profile
```

Navegação inferior:

```text
🗺️ Mapa
👨‍👩‍👧 Família
📍 Locais
👤 Perfil
```

O mapa será a tela principal.

---

# 19. UX

Princípio:

> O usuário deve conseguir descobrir onde estão os membros da família em poucos segundos.

Ao abrir o aplicativo:

```text
Login já realizado?
      ↓
     SIM
      ↓
Mapa
```

Não criar uma sequência de menus antes do mapa.

A interface deve ser:

- Simples.
- Limpa.
- Mobile-first.
- Fácil de entender.
- Orientada ao mapa.
- Com feedback claro sobre atualização de localização.

---

# 20. Segurança e privacidade

Localização é um dado sensível.

Regras fundamentais:

1. Usuário só pode acessar dados das famílias das quais participa.
2. Usuário só pode visualizar localização de membros das próprias famílias.
3. Convites devem utilizar tokens não previsíveis.
4. RLS deve proteger todas as tabelas relevantes.
5. Nunca confiar exclusivamente nas validações do cliente.
6. Não expor coordenadas de famílias diferentes.
7. Não utilizar IDs sequenciais como tokens de convite.
8. Registrar timestamps das localizações.
9. Futuramente, histórico deverá ter política específica de retenção/exclusão.
10. O aplicativo deverá possuir política de privacidade antes de distribuição pública.

---

# 21. Preparação para histórico futuro

O MVP não armazenará histórico.

Mas a arquitetura deve permitir posteriormente:

```text
user_locations
     ↓
estado atual

location_history
     ↓
histórico
```

Possível tabela futura:

```text
location_history
-----------------
id
user_id
latitude
longitude
accuracy
recorded_at
```

A existência dessa tabela não deve ser necessária para o funcionamento do MVP.

Quando implementada, deverá existir política de retenção, por exemplo:

```text
manter últimos X dias
```

A política exata será decidida posteriormente.

---

# 22. Distribuição

## Android

A primeira distribuição será através de APK.

Fluxo:

```text
Código
 ↓
Expo/EAS Build
 ↓
APK
 ↓
Celular Android
 ↓
Instalação manual
```

Não será necessário publicar inicialmente na Google Play Store.

---

## iOS

O código será compatível com iOS desde o início.

A distribuição inicial será feita por mecanismos oficiais de desenvolvimento/teste da Apple.

Não considerar distribuição direta de `.ipa` pela internet como estratégia equivalente ao APK.

A publicação na App Store/TestFlight poderá ser feita posteriormente.

---

# 23. Estratégia de custo

Objetivo do MVP:

> **R$ 0 de custo de infraestrutura.**

Serviços preferenciais:

```text
Mobile       → Expo
Backend      → Supabase
Database     → Supabase PostgreSQL
Auth         → Supabase Auth
Realtime     → Supabase Realtime
Push         → Firebase/Expo
Web auxiliar → Vercel ou equivalente gratuito
```

Todos os limites gratuitos devem ser verificados no momento de implantação.

O projeto não deve depender de serviços pagos enquanto houver alternativa gratuita adequada ao MVP.

---

# 24. Estrutura sugerida do projeto mobile

```text
family-location/
│
├── app/
│   ├── (auth)/
│   ├── (main)/
│   └── invite/
│
├── src/
│   ├── components/
│   ├── screens/
│   ├── services/
│   │   ├── auth/
│   │   ├── location/
│   │   ├── family/
│   │   ├── places/
│   │   └── notifications/
│   ├── hooks/
│   ├── stores/
│   ├── types/
│   ├── utils/
│   └── theme/
│
├── assets/
│
├── docs/
│   └── PROJECT.md
│
├── package.json
└── ...
```

A estrutura exata pode ser adaptada conforme a versão do Expo e a estratégia de navegação escolhida.

---

# 25. Ordem de desenvolvimento

## Fase 1 — Fundação

- [ ] Criar projeto Expo.
- [ ] Configurar TypeScript.
- [ ] Configurar estrutura de pastas.
- [ ] Criar projeto Supabase.
- [ ] Configurar variáveis de ambiente.
- [ ] Configurar Google Auth.
- [ ] Criar migrations.
- [ ] Criar RLS.

## Fase 2 — Família

- [ ] Criar família.
- [ ] Listar famílias.
- [ ] Selecionar família ativa.
- [ ] Listar membros.
- [ ] Criar convite.
- [ ] Abrir convite.
- [ ] Aceitar convite.
- [ ] Remover membro.
- [ ] Sair da família.

## Fase 3 — Mapa

- [ ] Integrar mapa.
- [ ] Solicitar permissão GPS.
- [ ] Mostrar localização própria.
- [ ] Salvar localização.
- [ ] Atualizar localização.
- [ ] Implementar Realtime.
- [ ] Mostrar localização dos membros.
- [ ] Mostrar última atualização.

## Fase 4 — Locais

- [ ] Criar local.
- [ ] Selecionar coordenada no mapa.
- [ ] Definir raio.
- [ ] Escolher ícone.
- [ ] Editar local.
- [ ] Excluir local.
- [ ] Mostrar locais no mapa.

## Fase 5 — Geofence

- [ ] Detectar entrada.
- [ ] Detectar saída.
- [ ] Implementar debounce/histerese.
- [ ] Evitar eventos duplicados.
- [ ] Identificar local atual.

## Fase 6 — Notificações

- [ ] Registrar dispositivo.
- [ ] Configurar push.
- [ ] Implementar evento de entrada.
- [ ] Implementar evento de saída.
- [ ] Configurar destinatários.
- [ ] Testar Android.
- [ ] Testar iOS.

## Fase 7 — Polimento

- [ ] Loading states.
- [ ] Empty states.
- [ ] Offline states.
- [ ] Erros.
- [ ] Permissões.
- [ ] Privacidade.
- [ ] Performance.
- [ ] Consumo de bateria.
- [ ] Build Android.
- [ ] Testes em dispositivos reais.

---

# 26. Regras de produto definidas

Estas decisões devem ser consideradas requisitos do projeto:

| Regra | Decisão |
|---|---|
| Múltiplas famílias por usuário | Sim |
| Locais pertencem à família | Sim |
| Qualquer membro pode criar locais | Sim, respeitando RLS/permissões |
| Membros veem membros da mesma família | Sim |
| Login | Google |
| Backend inicial | Supabase |
| PHP no MVP | Não |
| Mobile | React Native + Expo |
| Linguagem | TypeScript |
| UI | NativeWind + componentes próprios |
| Android | Sim |
| iOS | Sim |
| Android sem Play Store | Sim, APK |
| iOS sem App Store | Somente mecanismos oficiais de desenvolvimento/teste |
| Histórico de localização | Não no MVP |
| Arquitetura preparada para histórico | Sim |
| "Estou indo para..." | Não no MVP |
| Pausar localização | Não no MVP |
| Modo privado | Não no MVP |
| Geofence | Sim |
| Notificação de entrada | Sim |
| Notificação de saída | Sim |
| Realtime | Sim |
| Última localização conhecida | Sim |
| Histórico infinito no banco | Não |
| Objetivo de custo | R$ 0 no MVP |

---

# 27. Decisões arquiteturais

## DEC-001 — React Native + Expo

Escolhido para permitir desenvolvimento Android/iOS com uma base de código.

## DEC-002 — Supabase

Escolhido para eliminar inicialmente a necessidade de manter um servidor próprio.

## DEC-003 — Sem PHP no MVP

Não há necessidade inicial de uma API customizada. PHP poderá ser adicionado futuramente.

## DEC-004 — Mapa como tela principal

O principal objetivo do aplicativo é permitir visualizar rapidamente a família.

## DEC-005 — Localização como estado atual

Não armazenar histórico no MVP.

## DEC-006 — Locais pertencem à família

"Minha Casa", "Trabalho" etc. são entidades compartilhadas pelo grupo.

## DEC-007 — Usuário pode participar de múltiplas famílias

A arquitetura deve permitir várias relações `user ↔ family`.

## DEC-008 — Geofence

Locais possuem coordenada + raio e geram eventos de entrada/saída.

## DEC-009 — Android primeiro

Android será utilizado para acelerar os testes e a distribuição inicial via APK.

## DEC-010 — Privacidade por padrão

RLS e autorização devem ser implementados desde o início.

---

# 28. Critérios de sucesso do MVP

O MVP será considerado funcional quando for possível executar integralmente:

```text
1. Usuário A
   ↓
2. Login Google
   ↓
3. Criar "Família Ribeiro"
   ↓
4. Gerar convite
   ↓
5. Usuário B abre convite
   ↓
6. Login Google
   ↓
7. Usuário B entra na família
   ↓
8. Ambos autorizam localização
   ↓
9. Ambos aparecem no mapa
   ↓
10. Usuário A cria "Minha Casa"
   ↓
11. Usuário A entra no raio da casa
   ↓
12. Sistema detecta ENTER_PLACE
   ↓
13. Família recebe notificação
   ↓
14. Usuário A sai do raio
   ↓
15. Sistema detecta EXIT_PLACE
   ↓
16. Família recebe notificação
```

Esse fluxo é o **happy path principal** do produto.

---

# 29. Princípio para futuras implementações

Toda nova funcionalidade deve respeitar:

```text
Privacidade
    ↓
Segurança
    ↓
Confiabilidade
    ↓
Consumo de bateria
    ↓
Custo
    ↓
Experiência do usuário
```

Não adicionar complexidade ao MVP sem necessidade.

O objetivo é primeiro construir uma versão pequena, funcional e confiável.

---

# 30. Documentação viva

Este documento deve ser atualizado conforme novas decisões forem tomadas.

Toda decisão importante deve ser registrada com:

```text
DEC-XXX
Título
Decisão
Motivo
Impacto
```

Ao final do desenvolvimento, este documento deverá ser consolidado em uma documentação completa contendo:

- Arquitetura.
- Stack.
- Estrutura do projeto.
- Banco de dados.
- Migrations.
- RLS.
- Autenticação.
- Famílias.
- Convites.
- Localização.
- Background location.
- Geofence.
- Eventos.
- Notificações.
- Navegação.
- Design system.
- Segurança.
- Privacidade.
- Deploy.
- Distribuição Android.
- Distribuição iOS.
- Variáveis de ambiente.
- Limites dos serviços gratuitos.
- Regras de negócio.
- Decisões arquiteturais.
- Funcionalidades futuras.
- Procedimentos para desenvolvimento local.
- Procedimentos para build e release.

Este documento é a fonte de verdade do projeto.

---

# 31. Estado atual

**Escopo inicial aprovado.**

Próximo passo recomendado:

```text
Criar repositório
      ↓
Inicializar Expo + TypeScript
      ↓
Criar projeto Supabase
      ↓
Configurar Auth Google
      ↓
Criar migrations
      ↓
Configurar RLS
      ↓
Construir primeira tela
```

A partir deste ponto, decisões adicionais devem ser tomadas somente quando necessárias para a implementação, evitando aumentar o escopo do MVP prematuramente.
