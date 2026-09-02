# Family Location 📍

Aplicativo mobile para grupos familiares compartilharem localização em tempo real e cadastrarem
locais importantes no mapa (com geofence e notificações de entrada/saída).

> **Estado atual:** Entrega 1 concluída — **fundação e ambiente de desenvolvimento**.
> Nenhuma funcionalidade de negócio foi implementada ainda. A especificação completa é a fonte de
> verdade do projeto e está em [`docs/PROJECT.md`](docs/PROJECT.md).

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | [Expo](https://expo.dev) (SDK 57) + React Native 0.86 |
| Linguagem | TypeScript (strict) |
| Navegação | [Expo Router](https://docs.expo.dev/router/introduction) (baseada em arquivos, em `src/app`) |
| UI / estilo | [NativeWind](https://www.nativewind.dev) v4 (Tailwind) + design system próprio (`src/theme`, `src/components`) |
| Testes | Jest ([`jest-expo`](https://docs.expo.dev/develop/unit-testing/)) + Testing Library |
| Backend (futuro) | Supabase (Auth, PostgreSQL, RLS, Realtime) |

---

## Pré-requisitos

- **Node.js 20+ ou 22 LTS** — `node --version`
- **App "Expo Go"** no seu celular Android (Play Store) — usado para rodar/validar em desenvolvimento.
- O celular e o computador precisam estar na **mesma rede Wi‑Fi**.
- Git.

> Windows: nenhum Android Studio/JDK é necessário para rodar via Expo Go. Eles só serão necessários
> mais adiante, quando o app passar a usar módulos nativos (mapa, GPS em background, push) e exigir um
> *development build* — veja "Próximos passos".

---

## Começando

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar o servidor de desenvolvimento (Metro)
npx expo start
```

No terminal aparecerá um **QR code**. Abra o app **Expo Go** no celular Android e escaneie o QR.
O aplicativo será carregado no dispositivo.

- Se o celular não conectar pela rede local, use o modo túnel: `npx expo start --tunnel`.
- Atalhos no terminal do Expo: `a` (abrir no Android), `w` (abrir no navegador/web), `r` (recarregar).

---

## Scripts

| Comando | O que faz |
|---|---|
| `npm start` | Inicia o servidor de desenvolvimento (Metro). |
| `npm run android` | Inicia e tenta abrir no Android. |
| `npm run web` | Abre a versão web (útil para conferir a UI rapidamente). |
| `npm run typecheck` | Verificação de tipos TypeScript (`tsc --noEmit`). |
| `npm run lint` | ESLint (config do Expo). |
| `npm test` | Testes unitários (Jest). |

---

## Estrutura do projeto

```text
family-location/
├─ src/
│  ├─ app/                 # Rotas (Expo Router)
│  │  ├─ _layout.tsx       # Layout raiz (Stack)
│  │  ├─ index.tsx         # Tela inicial (health-check)
│  │  └─ (main)/           # Abas: Mapa · Família · Locais · Perfil (placeholders)
│  ├─ components/          # Design system (Button, Screen, Text, ...)
│  ├─ theme/               # Tokens: colors, spacing, typography, radius, shadows
│  ├─ services/            # auth, location, family, places, notifications (vazios por ora)
│  ├─ hooks/ stores/ types/ utils/ screens/
│  └─ global.css           # Diretivas do Tailwind/NativeWind
├─ assets/                 # Ícones e splash
├─ docs/PROJECT.md         # Especificação (fonte de verdade)
├─ app.json                # Configuração do Expo
├─ tailwind.config.js · babel.config.js · metro.config.js
└─ jest.config.js · tsconfig.json
```

O design system centraliza os tokens em `src/theme` e os expõe **duas vezes**: como objetos TypeScript
(para estilos imperativos) e espelhados em `tailwind.config.js` (para uso via `className` do NativeWind).

---

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha quando as fases de backend começarem. Nenhuma variável é
usada nesta entrega. `.env` está no `.gitignore` (apenas `.env.example` é versionado).

---

## Próximos passos (próximas entregas)

1. **Fase 1 — Backend:** criar projeto Supabase, Google OAuth, migrations e RLS.
2. **Fase 2 — Famílias:** criar/listar famílias, membros e convites.
3. **Fase 3+ — Mapa/GPS/Geofence/Push:** exigem um **development build** (o Expo Go não roda módulos
   nativos). No Windows, isso pode ser feito por *build local* (JDK 17 + Android SDK) ou via
   [EAS Build](https://docs.expo.dev/build/introduction/) (build na nuvem, plano gratuito).

A ordem completa de desenvolvimento está na seção 25 de [`docs/PROJECT.md`](docs/PROJECT.md).
