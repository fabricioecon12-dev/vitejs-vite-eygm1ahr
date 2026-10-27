#  Nexus Finanças

### Sistema de Controle Financeiro Pessoal
**Projeto acadêmico — Frameworks Front-End**

O **Nexus Finanças** é uma aplicação web de controle financeiro pessoal desenvolvida com **Vue.js 3, JavaScript, Vite e Tailwind CSS 4**.

O sistema permite acompanhar receitas, despesas, saldo financeiro e orçamento mensal por meio de uma interface moderna, responsiva e intuitiva.

O projeto foi desenvolvido em duas etapas acadêmicas: a primeira concentrou-se nos fundamentos do Vue.js e na implementação das funcionalidades; a segunda introduziu um framework CSS para aprimorar a experiência visual e a responsividade.

---

## 1. Objetivo do projeto

Desenvolver uma aplicação web de página única (*Single Page Application — SPA*) para gerenciamento financeiro pessoal, aplicando conceitos estudados na disciplina de Frameworks Front-End.

Os principais objetivos são:

- Utilizar componentes reutilizáveis em Vue.js 3.
- Implementar reatividade e comunicação entre componentes.
- Permitir o gerenciamento de receitas e despesas.
- Disponibilizar indicadores financeiros atualizados automaticamente.
- Organizar as informações em uma interface responsiva.
- Integrar um framework CSS sem comprometer as funcionalidades existentes.

---

## 2. Tecnologias utilizadas

| Tecnologia | Aplicação |
|---|---|
| Vue.js 3 | Construção da interface e dos componentes |
| JavaScript | Regras de negócio e manipulação dos dados |
| Vite | Ambiente de desenvolvimento e compilação |
| Tailwind CSS 4 | Classes utilitárias e aprimoramentos visuais |
| HTML5 | Estrutura semântica da aplicação |
| CSS3 | Estilização personalizada |
| Flexbox e CSS Grid | Organização dos elementos |
| Media queries | Adaptação para diferentes tamanhos de tela |
| StackBlitz | Desenvolvimento e testes da aplicação |

O sistema não utiliza backend nem Vue Router.

A navegação entre as seções ocorre por meio do estado reativo do Vue.js, sem recarregamento da página.

---

## 3. Funcionalidades implementadas

### 3.1 Visão geral

O dashboard apresenta:

- Saldo financeiro acumulado.
- Receitas do mês.
- Despesas do mês.
- Resultado financeiro mensal.
- Últimas movimentações.
- Acompanhamento do orçamento.
- Distribuição dos gastos por categoria.

### 3.2 Transações

Permite:

- Cadastrar receitas e despesas.
- Informar descrição, valor, data e categoria.
- Pesquisar transações por descrição.
- Filtrar movimentações por tipo.
- Excluir registros mediante confirmação.
- Cadastrar novas categorias temporárias.
- Visualizar mensagens de validação e confirmação.

### 3.3 Orçamento

Disponibiliza:

- Definição de limite mensal.
- Acompanhamento do valor utilizado.
- Cálculo do saldo disponível.
- Barra de progresso do orçamento.
- Alertas quando os gastos atingem 80% do limite.
- Alertas quando o orçamento é atingido ou ultrapassado.

### 3.4 Relatórios

Apresenta:

- Comparação entre receitas e despesas.
- Distribuição percentual dos gastos por categoria.
- Resumo financeiro do mês selecionado.
- Indicadores atualizados conforme as movimentações cadastradas.

### 3.5 Recursos adicionais

A aplicação também permite:

- Navegar entre diferentes meses.
- Limpar os dados demonstrativos.
- Restaurar os registros de exemplo.
- Utilizar a interface em computadores e dispositivos móveis.

---

## 4. Organização dos componentes

O projeto utiliza a arquitetura de componentes do Vue.js 3.

| Componente | Responsabilidade |
|---|---|
| `App.vue` | Integração das funcionalidades e gerenciamento do estado principal |
| `Cabecalho.vue` | Títulos, navegação mensal e acesso ao cadastro |
| `MenuLateral.vue` | Navegação entre as seções |
| `CardFinanceiro.vue` | Exibição dos indicadores financeiros |
| `FormularioTransacao.vue` | Cadastro de receitas, despesas e categorias |
| `ItemTransacao.vue` | Representação individual das movimentações |
| `ListaTransacoes.vue` | Pesquisa, filtragem e gerenciamento das transações |
| `ResumoOrcamento.vue` | Acompanhamento do orçamento mensal |
| `Rodape.vue` | Informações de identificação do projeto |

A aplicação utiliza recursos do Vue.js, incluindo:

- `<script setup>`
- `ref()`
- `defineProps()`
- `defineEmits()`
- `v-if`
- `v-else-if`
- `v-for`
- `v-model`
- Eventos e comunicação entre componentes

---

## 5. Primeira avaliação — Desenvolvimento inicial

Na primeira etapa, o projeto foi desenvolvido utilizando Vue.js 3, JavaScript, HTML e CSS personalizado.

O objetivo foi aplicar os fundamentos da disciplina, com ênfase na componentização, reatividade e implementação das funcionalidades.

A interface foi construída utilizando CSS próprio, Flexbox, Grid e media queries.

O planejamento inicial não previa a utilização de frameworks CSS.

---

## 6. Segunda avaliação — Integração do Tailwind CSS 4

Na segunda etapa, o projeto foi atualizado para incorporar o **Tailwind CSS 4**, conforme os requisitos da nova avaliação.

A integração foi realizada preservando os componentes Vue.js, a reatividade e as funcionalidades existentes.

### 6.1 Configuração

O Tailwind CSS foi integrado ao Vite por meio do pacote `@tailwindcss/vite`.

A configuração do projeto utiliza os pacotes:

- `tailwindcss`
- `@tailwindcss/vite`
- `@vitejs/plugin-vue`

O arquivo `src/style.css` mantém a estilização personalizada e incorpora os recursos do Tailwind CSS.

### 6.2 Aplicação das classes utilitárias

Foram utilizados recursos do Tailwind CSS em diferentes elementos da interface, incluindo:

| Recurso | Aplicação |
|---|---|
| `rounded-xl` | Arredondamento de botões e controles |
| `shadow-sm` | Sombras suaves |
| `hover:shadow-lg` | Destaque de elementos ao passar o mouse |
| `hover:-translate-y-1` | Elevação visual de cartões e botões |
| `transition-all` | Transições entre estados visuais |
| `duration-300` | Controle da duração das animações |
| `hover:border-emerald-300` | Destaque de bordas |
| `focus-visible:*` | Destaque de foco para navegação por teclado |

Esses recursos foram aplicados de forma complementar ao CSS personalizado.

### 6.3 Melhorias visuais

A segunda etapa contemplou aprimoramentos como:

1. **Botões interativos:** efeitos de elevação, sombras e transições.
2. **Cartões financeiros:** destaque visual ao passar o mouse.
3. **Listagem de transações:** melhorias na apresentação e interação.
4. **Formulários:** aprimoramento de bordas, estados de foco e botões.
5. **Painéis financeiros:** refinamento visual e transições.

A identidade visual adotada segue o conceito **Premium Fintech**, com predominância de azul-marinho, verde-esmeralda e tons claros.

---

## 7. Responsividade

A interface foi desenvolvida para se adaptar a diferentes resoluções de tela.

### Computadores

- Menu lateral permanente.
- Dashboard organizado em colunas.
- Cartões financeiros distribuídos horizontalmente.
- Formulários e relatórios apresentados em painéis.

### Dispositivos móveis

- Substituição do menu lateral por navegação inferior.
- Organização dos cartões em coluna única.
- Adaptação dos formulários à largura disponível.
- Reorganização dos filtros e botões.
- Manutenção do acesso às quatro seções principais.

A responsividade combina CSS Grid, Flexbox, media queries e os aprimoramentos visuais incorporados ao projeto.

---

## 8. Como executar o projeto

### Pré-requisitos

- Node.js e npm instalados.
- Navegador web atualizado.

### Instalação

No terminal, execute:

```bash
npm install
```

### Ambiente de desenvolvimento

```bash
npm run dev
```

### Compilação de produção

```bash
npm run build
```

### Visualização da versão compilada

```bash
npm run preview
```

O projeto também pode ser executado diretamente no ambiente StackBlitz.

---

## 9. Testes e validação

Durante o desenvolvimento, foram realizados testes manuais das funcionalidades e da interface.

As verificações contemplaram:

- Navegação entre as quatro seções.
- Cadastro de receitas e despesas.
- Pesquisa e filtragem de transações.
- Exclusão de registros.
- Cadastro de categorias personalizadas.
- Atualização dos indicadores financeiros.
- Alteração dos limites de orçamento.
- Exibição de alertas financeiros.
- Funcionamento dos efeitos visuais.
- Adaptação da interface para dispositivos móveis.

Também foi executado o comando:

```bash
npm run build
```

A compilação de produção foi concluída com sucesso utilizando Vite.

---

## 10. Utilização de inteligência artificial

### Ferramenta utilizada

**ChatGPT — OpenAI**

A inteligência artificial foi utilizada como ferramenta de apoio durante o planejamento, desenvolvimento, testes, documentação e preparação da apresentação acadêmica.

### 10.1 Prompt original da primeira avaliação

O prompt abaixo registra a orientação inicial utilizada no desenvolvimento do projeto.

> Desenvolva uma aplicação web de controle financeiro pessoal denominada Nexux Finanças, utilizando Vue.js 3, JavaScript, HTML e CSS, respeitando os requisitos acadêmicos da disciplina de Frameworks Front-End.
>
> A aplicação deverá funcionar em uma única página (One Page), sem utilizar Vue Router, bibliotecas externas de interface, frameworks CSS ou backend. Utilize os conceitos estudados na disciplina, incluindo componentes Vue, script setup, ref(), defineProps, defineEmits, v-if, v-for, v-model e eventos.
>
> Organize a aplicação em componentes reutilizáveis, com responsabilidades bem definidas, integrados pelo arquivo App.vue.
>
> Desenvolva uma interface moderna, intuitiva e responsiva, com identidade visual em azul-marinho, verde-esmeralda e tons claros. O dashboard deverá destacar o saldo financeiro e apresentar indicadores de receitas, despesas e resultado mensal.
>
> Implemente quatro seções principais: Visão geral, Transações, Orçamento e Relatórios. A navegação deverá ocorrer dentro da mesma página, exibindo somente a seção selecionada, sem recarregar a aplicação.
>
> Permita cadastrar receitas e despesas com descrição, valor, categoria e data; listar, pesquisar, filtrar e excluir movimentações; navegar entre meses; acompanhar o saldo acumulado; definir limites mensais de orçamento; e visualizar relatórios financeiros por categoria.
>
> Inclua a possibilidade de cadastrar novas categorias de receitas e despesas, caso o usuário não encontre uma opção adequada. As categorias personalizadas deverão funcionar durante a utilização da aplicação, sem necessidade de armazenamento permanente.
>
> Inclua dados demonstrativos para facilitar os testes e a apresentação, com opções para limpar e restaurar os registros.
>
> Desenvolva o projeto componente por componente, explicando a responsabilidade de cada arquivo e, por último, apresente a integração no App.vue. Utilize CSS próprio, Flexbox, Grid e media queries para criar uma interface responsiva.

**Observação:** o nome “Nexux” foi utilizado no texto original do prompt. O nome adotado na aplicação é **Nexus Finanças**.

A orientação inicial de não utilizar frameworks CSS corresponde à primeira avaliação. Na segunda etapa, foi incorporado o Tailwind CSS 4 para atender aos novos requisitos acadêmicos.

### 10.2 Etapas de utilização da IA

| Etapa | Aplicação das instruções | Resultado |
|---|---|---|
| 1. Planejamento | Definição dos requisitos e funcionalidades | Escopo inicial |
| 2. UX/UI | Escolha de cores, layout e navegação | Identidade visual |
| 3. Prototipação | Planejamento das quatro seções | Estrutura da interface |
| 4. Componentização | Organização dos componentes Vue | Arquitetura reutilizável |
| 5. Implementação | Desenvolvimento e integração das funcionalidades | Aplicação funcional |
| 6. Reatividade | Utilização de estados, diretivas, props e eventos | Atualização dinâmica |
| 7. Estilização | Desenvolvimento do CSS personalizado | Interface responsiva |
| 8. Integração do framework | Configuração do Tailwind CSS 4 | Classes utilitárias disponíveis |
| 9. Aprimoramento visual | Refinamento de botões, cartões e formulários | Interface Premium Fintech |
| 10. Testes | Verificações funcionais e responsivas | Validação da aplicação |
| 11. Documentação | Atualização das informações do projeto | Registro das duas avaliações |

### 10.3 Considerações sobre o uso da IA

As respostas fornecidas pela inteligência artificial foram analisadas e utilizadas como referência durante a implementação.

O desenvolvimento envolveu decisões sobre funcionalidades, organização da interface, correções e testes práticos no StackBlitz.

A utilização da ferramenta teve como finalidade apoiar a aplicação dos conceitos estudados na disciplina.

---

## 11. Considerações finais

O Nexus Finanças demonstra a utilização dos principais recursos do Vue.js 3 na construção de uma aplicação financeira interativa.

A primeira etapa consolidou a componentização e a reatividade. A segunda permitiu aprimorar a interface com a integração do Tailwind CSS 4.

O resultado é uma aplicação de página única com funcionalidades de gerenciamento financeiro, organização modular e interface responsiva, desenvolvida para fins acadêmicos.