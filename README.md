# Nexus Finanças

### Sistema de Controle Financeiro Pessoal

**Projeto acadêmico — Frameworks Front-End**

**Integrantes:** Jefferson Cabral e Tiago Beckman
**Repositório:** https://github.com/fabricioecon12-dev/vitejs-vite-eygm1ahr
**Disponibilidade:** execução local (ainda sem URL pública)

O **Nexus Finanças** é uma aplicação web de controle financeiro pessoal desenvolvida com **Vue.js 3, JavaScript, Vite e Tailwind CSS 4**.

O sistema permite acompanhar receitas, despesas, saldo financeiro e orçamento mensal por meio de uma interface moderna, responsiva e intuitiva.

O desenvolvimento evoluiu em quatro fases: fundamentos do Vue 3, integração do Tailwind CSS 4, implementação do Vue Router e consumo de APIs REST com Axios. As duas primeiras fases correspondem às avaliações iniciais; as fases seguintes ampliaram a navegação e a integração com serviços externos.

---

## 1. Objetivo do projeto

Desenvolver uma aplicação web de página única (**Single Page Application — SPA**) para gerenciamento financeiro pessoal, aplicando conceitos estudados na disciplina de Frameworks Front-End.

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

| Vue Router | Navegação por rotas em uma SPA |
| Axios | Requisições HTTP às APIs REST |
| Vitest | Testes automatizados |
| VS Code | Ambiente local de desenvolvimento |
| StackBlitz | Ambiente utilizado em fases anteriores |

O projeto não possui backend próprio. A navegação entre as páginas utiliza **Vue Router**, mantendo o comportamento de aplicação de página única (SPA). Os dados de CEP e câmbio são consultados em serviços externos via **Axios**.

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

A aplicação é executada localmente. O StackBlitz foi utilizado em fases anteriores do desenvolvimento; atualmente, o ambiente principal é o VS Code.

Para obter o projeto a partir do GitHub:

```bash
git clone https://github.com/fabricioecon12-dev/vitejs-vite-eygm1ahr.git
cd vitejs-vite-eygm1ahr
npm install
npm run dev
```

Abra o endereço exibido pelo Vite no terminal (geralmente `http://localhost:5173`). Esse endereço é **local**, não um site público.

No Windows PowerShell, caso o comando `npm` seja bloqueado, use `npm.cmd install` e `npm.cmd run dev`.

---

## 9. Testes e validação

Durante o desenvolvimento, foram realizados testes manuais das funcionalidades e da interface, além de testes automatizados com **Vitest**. Na última validação registrada, **62 testes passaram**, e o build de produção foi concluído com sucesso.

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

O desenvolvimento envolveu decisões sobre funcionalidades, organização da interface, correções e testes práticos, inicialmente no StackBlitz e posteriormente no VS Code.

A utilização da ferramenta teve como finalidade apoiar a aplicação dos conceitos estudados na disciplina.

---

## 11. Terceira etapa — Navegação com Vue Router

Após as duas primeiras avaliações, o Nexus Finanças passou a utilizar **Vue Router**, antes da integração das APIs REST. Essa etapa organizou a navegação por URLs e componentes de página, preservando o comportamento de uma **Single Page Application (SPA)**: as páginas são alternadas sem recarregamento completo do navegador.

### 11.1 Arquitetura e fluxo de navegação

A apresentação acadêmica desta etapa documenta o seguinte fluxo:

1. O menu lateral utiliza `RouterLink` para indicar a rota desejada.
2. O **Vue Router** interpreta a URL e seleciona o componente associado.
3. O `RouterView`, no `App.vue`, exibe a página ativa.

Os arquivos apresentados como evidência da implementação são:

| Arquivo | Responsabilidade documentada |
|---|---|
| `src/main.js` | Registra o roteador com `app.use(router)` antes de montar a aplicação. |
| `src/router/index.js` | Define caminhos, nomes de rotas e componentes de página. |
| `src/components/MenuLateral.vue` | Utiliza `RouterLink` para a navegação. |
| `src/App.vue` | Utiliza `RouterView` para apresentar a rota ativa. |

Exemplos de código mostrados na apresentação dessa etapa:

```js
// src/main.js — trecho ilustrado na apresentação
const app = createApp(App)
app.use(router)
app.mount('#app')
```

```vue
<!-- src/App.vue — trecho ilustrado na apresentação -->
<RouterView />
```

### 11.2 Rotas documentadas na apresentação

A apresentação do Vue Router registrou **quatro rotas principais** naquele momento do desenvolvimento:

| Página | Caminho | Finalidade |
|---|---|---|
| Visão geral | `/` | Resumo de receitas, despesas e saldo. |
| Transações | `/transacoes` | Cadastro, pesquisa e gerenciamento de lançamentos. |
| Orçamento | `/orcamento` | Limites mensais e acompanhamento dos gastos. |
| Relatórios | `/relatorios` | Indicadores e análises financeiras. |

**Nota histórica:** a lista acima representa as quatro rotas exibidas na apresentação do Vue Router, e não necessariamente a lista completa de rotas da versão mais recente. Posteriormente, a aplicação também passou a contar com a página de Configurações, utilizada na integração com o ViaCEP.

### 11.3 Validação da etapa

Na apresentação específica do Vue Router foram registrados **20 testes automatizados aprovados** e a validação do build de produção. Esse número corresponde ao estágio do projeto naquela ocasião. Após as implementações seguintes, a última verificação registrada passou a ser de **62 testes aprovados**, conforme a seção [Testes e validação](#9-testes-e-validação).

A navegação por rotas foi integrada mantendo a identidade **Premium Fintech Light**, com sidebar azul-marinho, destaques verde-esmeralda, fundo cinza-claro e cards brancos arredondados.

> A navegação exclusivamente por estado reativo, descrita no histórico inicial do projeto, corresponde à arquitetura anterior à implementação do Vue Router.

---

## 12. Quarta etapa — Integração de APIs REST

A aplicação consome serviços públicos externos por meio de **Axios**, utilizando requisições **HTTP GET** e respostas **JSON**. Não há backend próprio para essas integrações.

### 12.1 ViaCEP — Consulta de endereço

- **Endpoint:** `GET https://viacep.com.br/ws/{cep}/json/`
- **Exemplo:** https://viacep.com.br/ws/66050430/json/
- **Serviço:** `src/services/viacepService.js`
- **Interface:** `src/pages/ConfiguracoesPage.vue`, seção **Meu endereço**.
- **Funcionamento:** o usuário informa um CEP com oito dígitos; o sistema consulta e exibe logradouro, bairro, cidade, UF e CEP.
- **Tratamento:** validação do CEP, indicação de carregamento e mensagens em caso de endereço não encontrado ou falha na consulta.

Exemplo simplificado da requisição utilizada:

```js
const resposta = await apiViaCEP.get(`${cepLimpo}/json/`)
return resposta.data
```

### 12.2 AwesomeAPI — Cotações de moedas

- **Endpoint:** `GET https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL`
- **Consulta:** https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL
- **Serviço:** `src/services/cambioService.js`
- **Estado reativo:** `src/composables/useCotacoes.js`
- **Interface:** `src/components/CotacoesMercado.vue`, exibido no Dashboard.
- **Funcionamento:** consulta as cotações de dólar (USD/BRL) e euro (EUR/BRL), com valor e variação percentual, além de atualização manual.
- **Tratamento:** estados de carregamento, erro, ausência de resultados e horário da última atualização.

Exemplo simplificado da requisição utilizada:

```js
const resposta = await axios.get(
  'https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL',
  { timeout: 10000 }
)
const dados = resposta.data
```

### 12.3 Fluxo de dados

1. O usuário acessa a funcionalidade ou solicita uma consulta.
2. O componente Vue aciona a função de serviço ou composable.
3. O Axios envia uma requisição HTTP GET à API externa.
4. A API retorna dados JSON, que são validados e transformados quando necessário.
5. Os dados atualizam o estado reativo do Vue e são exibidos na interface.
6. A aplicação apresenta mensagens adequadas durante o carregamento e em caso de erro.

---

## 13. Entrega acadêmica e acesso ao projeto

**Integrantes:** Jefferson Cabral e Tiago Beckman.

**Código-fonte:** https://github.com/fabricioecon12-dev/vitejs-vite-eygm1ahr

**Execução:** atualmente local, pelo servidor de desenvolvimento do Vite. **Não existe URL pública da aplicação nesta etapa.** Para executar, siga a seção [Como executar o projeto](#8-como-executar-o-projeto).

**Apresentação:** os quatro slides da atividade documentam as APIs selecionadas, os endpoints, o consumo com Axios, as capturas da aplicação e os aprendizados sobre HTTP, REST, JSON e assincronicidade.

---

## 14. Considerações finais

O Nexus Finanças demonstra a utilização dos principais recursos do Vue.js 3 na construção de uma aplicação financeira interativa.

A primeira etapa consolidou a componentização e a reatividade. A segunda aprimorou a interface com o Tailwind CSS 4. Na sequência, foram integrados o Vue Router e duas APIs REST, ViaCEP e AwesomeAPI.

O resultado é uma aplicação de página única com funcionalidades de gerenciamento financeiro, navegação por rotas, integração de serviços REST, organização modular e interface responsiva, desenvolvida para fins acadêmicos.
