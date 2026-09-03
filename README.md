# Auxiliar de Treino

Plataforma web responsiva para acompanhamento pessoal de treino, alimentação,
metas e evolução física. Centraliza dados que normalmente ficam espalhados em
planilhas e aplicativos diferentes e os transforma em gráficos, metas e
relatórios.

O planejamento e o andamento por etapas estão em [`ROADMAP.md`](./ROADMAP.md).

## Stack

- **Next.js 16** (App Router, TypeScript) + **React 19**
- **Tailwind CSS v4** + **shadcn/ui** (tema claro/escuro)
- **Supabase** (autenticação, PostgreSQL e Storage)
- **Prisma** como ORM
- **Recharts** para gráficos
- Deploy na **Vercel**

## Rodando localmente

Pré-requisitos: Node.js 20.9+ (o projeto foi criado com a v22).

```bash
npm install
cp .env.example .env.local   # e preencha os valores do Supabase
npm run dev
```

A aplicação sobe em http://localhost:3000.

### Scripts

| Comando         | Descrição                          |
| --------------- | ---------------------------------- |
| `npm run dev`   | Servidor de desenvolvimento        |
| `npm run build` | Build de produção                  |
| `npm run start` | Sobe o build de produção           |
| `npm run lint`  | ESLint                             |

## Estrutura

```
src/
  app/
    (marketing)/      landing page pública
    (app)/            aplicação autenticada (sidebar + navegação mobile)
  components/
    ui/               componentes do shadcn/ui
  hooks/
  lib/                utilidades e configuração de navegação
```

## Aviso

As estimativas e sugestões geradas pelo sistema (IMC, gasto calórico, dicas)
são orientações gerais e não substituem a avaliação de profissionais como
médicos, nutricionistas e educadores físicos.
