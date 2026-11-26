# Nexus Finanças

### Sistema de Controle Financeiro Pessoal

**Projeto acadêmico — Frameworks Front-End**

- **Integrantes:** Jefferson Cabral e Tiago Beckman
- **Repositório:** https://github.com/fabricioecon12-dev/vitejs-vite-eygm1ahr
- **Disponibilidade:** execução local; não há URL pública de produção registrada nesta versão.

O **Nexus Finanças** é uma aplicação web de controle financeiro pessoal desenvolvida com **Vue.js 3, JavaScript, Vite e Tailwind CSS 4**. A interface adota a identidade visual **Premium Fintech**, com azul-marinho, verde-esmeralda, fundo cinza-claro e painéis brancos.

O projeto começou como uma aplicação acadêmica para praticar componentização e reatividade em Vue.js. Ao longo das etapas, recebeu estilização com Tailwind CSS, navegação com Vue Router, consumo de APIs REST e ampliação gradual dos módulos financeiros. A versão atual do código inclui áreas de transações, orçamento, relatórios, contas bancárias, cartões de crédito e configurações.

---

## 1. Objetivo do projeto

Desenvolver uma aplicação web de página única (**Single Page Application — SPA**) para gerenciamento financeiro pessoal, aplicando conceitos estudados na disciplina de Frameworks Front-End.

Os objetivos incluem:

- Utilizar componentes reutilizáveis em Vue.js 3.
- Implementar reatividade e comunicação entre componentes.
- Permitir o gerenciamento de receitas e despesas.
- Apresentar indicadores financeiros e acompanhamento de orçamento.
- Organizar as informações em módulos navegáveis por rotas.
- Integrar serviços externos por meio de requisições HTTP.
- Aplicar validações e preservar a consistência dos registros financeiros.
- Disponibilizar uma interface responsiva e acessível.

---

## 2. Tecnologias utilizadas

| Tecnologia | Aplicação |
|---|---|
| Vue.js 3 | Interface, componentes e reatividade |
| JavaScript (ES Modules) | Regras de negócio e manipulação dos dados |
| Vite 7 | Servidor de desenvolvimento e compilação |
| Tailwind CSS 4 | Classes utilitárias e composição visual |
| CSS3 | Estilos personalizados e identidade visual |
| Vue Router 4 | Navegação entre as páginas da SPA |
| Axios | Requisições HTTP para serviços externos |
| ApexCharts / Vue3-ApexCharts | Gráficos e indicadores visuais |
| Lucide Vue | Ícones da interface |
| Vitest | Testes automatizados |
| Vue Test Utils | Apoio aos testes de componentes Vue |
| jsdom | Ambiente DOM para testes |
| Node.js e npm | Ambiente de execução e gerenciamento de dependências |
| VS Code | Ambiente local de desenvolvimento |

As versões e dependências instaladas estão registradas em `package.json` e `package-lock.json`.

---

## 3. Arquitetura e organização do projeto

A aplicação utiliza Vue 3 com componentes `.vue`, `<script setup>`, composables e páginas associadas a rotas do Vue Router.

### 3.1 Estrutura principal

```text
nexus-financas-git/
├── public/
│   ├── bancos/                 # Identidades visuais de instituições bancárias
│   └── cartoes/                # Identidades visuais de bandeiras de cartões
├── src/
│   ├── components/             # Componentes reutilizáveis da interface
│   ├── composables/            # Estado compartilhado e regras financeiras
│   ├── pages/                  # Páginas associadas às rotas
│   ├── router/                 # Configuração do Vue Router
│   ├── services/               # Integrações com serviços externos e bancários
│   ├── styles/                 # Design system e estilos complementares
│   ├── tests/                  # Testes automatizados Vitest
│   ├── utils/                  # Cálculos e validações auxiliares
│   ├── App.vue                 # Estrutura principal da aplicação
│   ├── main.js                 # Inicialização do Vue, router e CSS
│   └── style.css               # Estilos globais
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

A pasta `src/` também contém arquivos de backup e versões candidatas criados durante o desenvolvimento. Esses arquivos são artefatos de trabalho e não devem ser confundidos com os módulos ativos da aplicação.

### 3.2 Páginas e rotas atuais

O arquivo `src/router/index.js` registra as seguintes rotas:

| Módulo | Caminho | Nome da rota | Componente |
|---|---|---|---|
| Visão geral | `/` | `inicio` | `DashboardPage.vue` |
| Transações | `/transacoes` | `transacoes` | `TransacoesPage.vue` |
| Contas bancárias | `/contas` | `contas` | `ContasBancariasPage.vue` |
| Cartões de crédito | `/cartoes` | `cartoes` | `CartoesPage.vue` |
| Orçamento | `/orcamento` | `orcamento` | `OrcamentoPage.vue` |
| Relatórios | `/relatorios` | `relatorios` | `RelatoriosPage.vue` |
| Configurações | `/configuracoes` | `configuracoes` | `ConfiguracoesPage.vue` |

A navegação é realizada sem recarregamento integral da página, mantendo o comportamento de SPA.

### 3.3 Núcleo financeiro

O composable `src/composables/useFinancas.js` centraliza estados reativos e operações financeiras utilizadas por diferentes módulos. Entre os dados e operações expostos estão:

- Transações, receitas e despesas.
- Contas bancárias e saldos individuais/consolidados.
- Transferências e histórico de tentativas recusadas.
- Cartões de crédito, compras, faturas e pagamentos.
- Fechamentos de faturas e obrigações complementares.
- Limites de orçamento e categorias.
- Consultas de situação financeira e administrativa.
- Operações de cadastro, edição, exclusão, pagamento e recuperação.

A separação em componentes, composables, serviços e utilitários busca manter as responsabilidades organizadas e favorecer a reutilização.

---

## 4. Identidade visual e responsividade

A identidade visual **Premium Fintech** é o padrão visual do projeto:

- Sidebar azul-marinho.
- Verde-esmeralda para ações e destaques.
- Fundo geral cinza-claro.
- Cards brancos com cantos arredondados.
- Tipografia moderna e hierarquia visual consistente.
- Ícones e indicadores gráficos integrados à interface.

A interface utiliza Tailwind CSS 4 em conjunto com CSS personalizado, Flexbox, CSS Grid e media queries.

### 4.1 Computadores

- Menu lateral para navegação entre módulos.
- Conteúdo organizado em painéis e colunas conforme a página.
- Formulários, tabelas, indicadores e gráficos dimensionados para telas maiores.

### 4.2 Dispositivos móveis

- Navegação inferior para as áreas principais e acesso às demais opções.
- Conteúdo reorganizado em coluna quando necessário.
- Formulários e controles adaptados à largura disponível.
- Gráficos com dimensionamento e interação ajustados para telas estreitas.
- Rolagem do conteúdo preservada para evitar cortes de seções.

A responsividade deve ser verificada nas páginas e nos fluxos interativos, não apenas pela visualização estática inicial.

---

## 5. Funcionalidades por módulo

Esta seção descreve recursos presentes na implementação atual. A validação integral de cada regra depende da execução dos testes e da conferência funcional correspondente.

### 5.1 Visão geral — Dashboard

A página inicial reúne informações financeiras do período, incluindo:

- Saldo disponível.
- Total de receitas e despesas.
- Resultado financeiro.
- Movimentações recentes.
- Acompanhamento do orçamento.
- Distribuição de despesas por categoria.

Os indicadores são derivados dos dados disponibilizados pelo núcleo financeiro.

### 5.2 Transações

O módulo de transações contempla:

- Cadastro de receitas e despesas.
- Informações como descrição, valor, data e categoria.
- Pesquisa e filtragem de movimentações.
- Edição e exclusão de registros, conforme as validações aplicáveis.
- Categorias de receitas e despesas.
- Navegação por período.
- Atualização dos indicadores financeiros relacionados.

### 5.3 Orçamento

O módulo de orçamento contempla:

- Configuração de limite mensal.
- Acompanhamento das despesas do período.
- Cálculo do valor utilizado e do saldo do limite.
- Indicadores visuais de utilização.
- Alertas associados à aproximação, alcance ou ultrapassagem do limite.
- Distribuição dos gastos por categoria.

### 5.4 Relatórios

A página de relatórios apresenta recursos gráficos e analíticos, incluindo:

- Comparação entre receitas e despesas.
- Gráfico de despesas por categoria.
- Percentuais de participação das categorias.
- Análise do resultado financeiro mensal.
- Indicadores de receita preservada e despesas do período.
- Interação com os gráficos para destacar categorias e valores.

A exibição dos valores também considera o recurso de privacidade disponível na aplicação.

### 5.5 Contas bancárias

A página `ContasBancariasPage.vue` reúne recursos de administração de contas e transferências. A implementação inclui componentes específicos para:

- Cadastro de conta bancária (`FormularioContaBancaria.vue`).
- Seleção e identificação visual de instituições (`SeletorInstituicao.vue` e `identidadeBancosService.js`).
- Edição de contas.
- Definição de conta principal.
- Ativação e desativação controladas.
- Consulta de saldos individuais e consolidados.
- Vinculação de conta bancária a outros registros quando aplicável.
- Transferências entre contas (`FormularioTransferencia.vue`).
- Consulta do histórico de transferências recusadas (`HistoricoTransferenciasRecusadas.vue`).

O código também contém serviços de contas, bancos e migração (`contasService.js`, `bancosService.js` e `migracaoContasService.js`), além de testes específicos desses recursos.

**Regra de modelagem de transferências:** o planejamento do projeto prevê o registro de uma transferência como operação própria, com origem, destino e valor, sem representá-la como duas transações convencionais independentes de receita e despesa. Os saldos devem refletir os registros financeiros correspondentes.

**Atenção a versões candidatas:** existem arquivos `useFinancas.candidato-*.js` e testes com identificação de candidato. Eles são artefatos de desenvolvimento e validação isolada; não devem ser apresentados como prova de que a respectiva implementação candidata esteja integrada ao fluxo principal.

### 5.6 Cartões de crédito

A página `CartoesPage.vue` organiza o módulo em áreas de cartões, cadastro, faturas, compras e histórico. Entre os componentes ativos identificados estão:

- `FormularioCartao.vue` — cadastro e edição de cartões.
- `FormularioCompraCartao.vue` — registro de compras.
- `ConsultaFaturasCartao.vue` — consulta de faturas.
- `HistoricoCartoesCredito.vue` — histórico relacionado aos cartões.

O núcleo financeiro contém estados e operações para cartões, compras, faturas, pagamentos e fechamentos. Também existem utilitários para cálculo de limite, cálculo de encargos de mora, precisão monetária e validação do ciclo da fatura.

Os fluxos contemplados no código e nos testes incluem:

- Limite contratado, comprometido e disponível.
- Compras à vista e parceladas.
- Fechamento e consulta de faturas.
- Pagamentos integrais, parciais e antecipados.
- Registro de pagamentos e tentativas recusadas.
- Configuração e apuração de encargos quando as condições necessárias estão disponíveis.
- Obrigações complementares vinculadas à fatura.
- Recuperação e reconciliação de operações cujo resultado técnico precise ser confirmado.

A existência desses mecanismos não significa que toda combinação de cenários esteja homologada. O estado de validação deve ser confirmado pelos testes atuais e pela inspeção funcional.

### 5.7 Configurações, segurança e controle administrativo

A página `ConfiguracoesPage.vue` reúne configurações e recursos de segurança, privacidade e armazenamento. Ela também integra o componente `ControleAdministrativo.vue`.

O código do controle administrativo contempla consultas e procedimentos relacionados a:

- Solicitações e pendências administrativas.
- Decisões e responsáveis.
- Evidências e histórico.
- Auditoria de eventos.
- Permissões, independência e validação de transições.
- Tratamento de inconsistências e resultados técnicos indeterminados.

O planejamento funcional adotado exige decisões fundamentadas, preservação do histórico e bloqueios preventivos quando a consistência dos registros não puder ser comprovada. O controle administrativo não deve, isoladamente, executar movimentações financeiras nem efetuar desbloqueios financeiros automáticos.

---

## 6. Persistência e limites da aplicação

O código ativo de `useFinancas.js` utiliza **LocalStorage do navegador** para persistir dados financeiros localmente, com a chave de armazenamento `nexus-financas-dados-v1`.

O projeto também contém mecanismos de inicialização, validação, proteção do armazenamento e confirmação de persistência para operações relevantes.

### 6.1 Limites conhecidos

- O projeto não possui backend próprio identificado nesta versão.
- Os dados persistidos ficam no navegador e na origem local utilizada pela aplicação.
- Não há sincronização multiusuário ou sincronização automática entre dispositivos implementada por um servidor próprio.
- A integração com serviços externos não equivale à conexão bancária por Open Finance.
- A aplicação não deve ser apresentada como serviço financeiro de produção ou como substituta de sistemas bancários reais.
- A disponibilidade das consultas externas depende da conexão com a internet e dos serviços provedores.

Para demonstrações acadêmicas, recomenda-se utilizar dados fictícios. Não inserir números completos de cartões, CVV, senhas bancárias ou credenciais reais.

---

## 7. Integrações com APIs REST

As integrações externas utilizam Axios e serviços separados da camada visual.

### 7.1 ViaCEP — consulta de endereço

- Serviço: `src/services/viacepService.js`.
- Endpoint-base: `https://viacep.com.br/ws/`.
- Método: HTTP GET.
- O CEP é normalizado para oito dígitos antes da consulta.
- O serviço valida o formato e trata CEP não encontrado e falhas de comunicação.

### 7.2 AwesomeAPI — cotações de moedas

A integração de câmbio está organizada em `src/services/cambioService.js` e é utilizada pelo composable `src/composables/useCotacoes.js`.

A consulta contempla dólar americano (USD/BRL) e euro (EUR/BRL), com tratamento de valores, variação, data de referência, carregamento e falha da consulta.

### 7.3 Fluxo geral

1. Um componente ou composable solicita a consulta.
2. O serviço executa a requisição HTTP por Axios.
3. A resposta JSON é validada e transformada quando necessário.
4. O estado reativo é atualizado.
5. A interface apresenta os dados ou uma mensagem de erro.

---

## 8. Componentes e recursos reutilizáveis

Entre os componentes ativos identificados estão:

| Componente | Responsabilidade |
|---|---|
| `Cabecalho.vue` | Cabeçalho e informações de contexto |
| `MenuLateral.vue` | Navegação principal e móvel |
| `CardFinanceiro.vue` | Indicadores financeiros |
| `FormularioTransacao.vue` | Cadastro e edição de transações |
| `ListaTransacoes.vue` | Listagem e gerenciamento de movimentações |
| `ItemTransacao.vue` | Apresentação de uma movimentação |
| `ResumoOrcamento.vue` | Indicadores do orçamento |
| `EstadoVazio.vue` | Estado visual sem registros |
| `FormularioContaBancaria.vue` | Cadastro e edição de contas |
| `FormularioTransferencia.vue` | Solicitação de transferência |
| `HistoricoTransferenciasRecusadas.vue` | Histórico de tentativas recusadas |
| `SeletorInstituicao.vue` | Seleção de instituição bancária |
| `FormularioCartao.vue` | Cadastro e edição de cartões |
| `FormularioCompraCartao.vue` | Registro de compras no cartão |
| `ConsultaFaturasCartao.vue` | Consulta de faturas |
| `HistoricoCartoesCredito.vue` | Histórico de cartões |
| `ControleAdministrativo.vue` | Interface de procedimentos administrativos |
| `CotacoesMercado.vue` | Apresentação de cotações externas |
| `Rodape.vue` | Identificação e informações do projeto |

A composição efetiva de cada página pode ser conferida em `src/pages/`.

---

## 9. Testes e validação

O projeto utiliza **Vitest**, com configuração em `vite.config.js`. A inclusão de testes está configurada para `src/tests/**/*.test.{js,ts,jsx,tsx}`.

No ZIP analisado foram encontrados **69 arquivos de teste** com extensão `.test.js` ou `.spec.js` dentro de `src/`. Esse número representa arquivos existentes, não a quantidade de casos de teste nem o número de aprovações.

Os arquivos cobrem diferentes áreas, entre elas:

- Núcleo financeiro, perfil, preferências e privacidade.
- Cadastro, edição, situação e saldos de contas.
- Serviços bancários, identidade de instituições e migração.
- Transferências, tarifas, precisão monetária e recuperação.
- Compras, limites, fechamento e histórico de faturas.
- Pagamentos, encargos e obrigações complementares.
- Controle administrativo, auditoria, concorrência e bloqueios técnicos.

**Resultado da execução:** não foi realizada uma nova execução da suíte Vitest durante a atualização deste README. Portanto, não se declara aqui que os 69 arquivos estejam aprovados na versão recebida.

### 9.1 Executar os testes

```bash
npm run test
```

No Windows PowerShell, se necessário:

```powershell
npm.cmd run test
```

### 9.2 Compilar para produção

```bash
npm run build
```

No Windows PowerShell:

```powershell
npm.cmd run build
```

Os resultados e a data de cada validação devem ser registrados após a execução efetiva dos comandos. Avisos de tamanho de chunks devem ser avaliados separadamente de erros de compilação.

---

## 10. Como executar o projeto

### 10.1 Pré-requisitos

- Node.js compatível com as dependências do projeto.
- npm.
- Navegador atualizado.
- Conexão com a internet para consultar os serviços externos.

### 10.2 Obter o código-fonte

```bash
git clone https://github.com/fabricioecon12-dev/vitejs-vite-eygm1ahr.git
cd vitejs-vite-eygm1ahr
```

### 10.3 Instalar dependências

```bash
npm install
```

### 10.4 Iniciar o ambiente de desenvolvimento

```bash
npm run dev
```

Abra no navegador o endereço local informado pelo Vite, geralmente `http://localhost:5173`.

### 10.5 Compilar e visualizar a versão de produção

```bash
npm run build
npm run preview
```

O comando `preview` disponibiliza localmente a versão compilada para conferência. Isso não representa publicação em hospedagem pública.

No Windows PowerShell, os comandos também podem ser executados com `npm.cmd`.

---

## 11. Histórico acadêmico e evolução do projeto

O desenvolvimento foi organizado em etapas, acompanhando a evolução dos requisitos da disciplina e a ampliação funcional do sistema.

### 11.1 Primeira avaliação — fundamentos do Vue.js

Na etapa inicial, o projeto foi desenvolvido com Vue.js 3, JavaScript, HTML e CSS personalizado. O foco foi aplicar componentização, reatividade, comunicação entre componentes e diretivas estudadas em aula.

A orientação inicial previa uma aplicação de página única sem Vue Router, bibliotecas externas de interface ou frameworks CSS. Essa restrição correspondia à primeira avaliação e foi posteriormente ampliada conforme os requisitos das etapas seguintes.

### 11.2 Segunda avaliação — Tailwind CSS 4

Na etapa seguinte, o Tailwind CSS 4 foi incorporado por meio da integração com Vite. A adoção do framework ocorreu preservando os componentes Vue e a lógica existente. O CSS personalizado continuou sendo utilizado em conjunto com as classes utilitárias.

### 11.3 Terceira etapa — Vue Router

O Vue Router foi incorporado para organizar a navegação por rotas. A configuração atual está em `src/router/index.js`, e a aplicação utiliza `RouterView` para apresentar a página selecionada.

A apresentação original dessa etapa registrava quatro rotas principais — Visão geral, Transações, Orçamento e Relatórios. Posteriormente, foram adicionadas as páginas de Contas bancárias, Cartões e Configurações, totalizando sete rotas na configuração atual.

### 11.4 Quarta etapa — APIs REST

A etapa de integração de serviços externos incluiu ViaCEP para consulta de endereço e AwesomeAPI para cotações de moedas, utilizando Axios, respostas JSON e tratamento de erros.

### 11.5 Ampliação dos módulos financeiros

Após as etapas acadêmicas iniciais, o projeto evoluiu para incluir contas bancárias, transferências, cartões de crédito, compras parceladas, faturas, pagamentos, encargos e controle administrativo. Essa ampliação envolveu componentes, serviços, utilitários, regras de integridade e testes direcionados.

As regras detalhadas foram desenvolvidas de forma incremental. O histórico de decisões do projeto deve ser consultado em conjunto com o código e os testes antes de classificar cada cenário como integralmente concluído.

---

## 12. Utilização de inteligência artificial

**Ferramenta utilizada:** ChatGPT — OpenAI.

A inteligência artificial foi utilizada como ferramenta de apoio ao planejamento, à implementação, à análise de requisitos, à identificação de problemas, à elaboração de testes e à documentação. As sugestões foram avaliadas no contexto do projeto e submetidas a verificações no ambiente de desenvolvimento.

### 12.1 Prompt original da primeira avaliação

O texto a seguir registra a orientação inicial utilizada no desenvolvimento:

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

**Observação:** o nome “Nexux” aparece no texto do prompt original. O nome adotado no projeto é **Nexus Finanças**. A restrição inicial de não utilizar frameworks CSS ou Vue Router foi substituída nas etapas acadêmicas posteriores, conforme a evolução dos requisitos.

### 12.2 Etapas de utilização da IA

| Etapa | Aplicação | Resultado esperado |
|---|---|---|
| Planejamento | Definição de requisitos e funcionalidades | Escopo inicial |
| UX/UI | Cores, layout e navegação | Identidade visual |
| Prototipação | Organização das seções | Estrutura da interface |
| Componentização | Separação de responsabilidades | Componentes reutilizáveis |
| Implementação | Desenvolvimento e integração | Funcionalidades da aplicação |
| Reatividade | Estados, diretivas, props e eventos | Atualização dinâmica |
| Estilização | CSS e Tailwind CSS | Interface responsiva |
| Navegação | Configuração do Vue Router | Navegação por rotas |
| Integração | Consumo de APIs REST | Consultas externas |
| Testes | Verificações automatizadas e manuais | Evidências de validação |
| Documentação | Registro das decisões e recursos | Histórico do projeto |

### 12.3 Considerações sobre o uso da IA

A ferramenta foi utilizada como apoio. As decisões de escopo, as alterações realizadas, a interpretação dos requisitos e a validação do comportamento devem ser conferidas pela equipe responsável pelo projeto.

---

## 13. Estado atual e próximos passos

A versão analisada contém páginas e componentes para os sete módulos listados na seção de rotas, serviços de integração externa, persistência local, utilitários financeiros e uma suíte de testes automatizados.

Os próximos passos de desenvolvimento e entrega são:

1. Concluir a revisão funcional e de integração dos módulos de contas bancárias e cartões.
2. Distinguir implementações ativas de arquivos candidatos e experimentos isolados.
3. Executar a suíte Vitest e registrar o resultado real.
4. Executar o build de produção e avaliar eventuais avisos.
5. Revisar os arquivos modificados, novos arquivos, backups e artefatos temporários antes de preparar o Git.
6. Atualizar este documento quando houver novas validações ou mudanças de escopo.

### 13.1 Critérios para declarar uma funcionalidade concluída

Uma funcionalidade deve ser classificada como concluída somente quando:

- estiver integrada ao fluxo ativo da aplicação;
- respeitar as regras de negócio e os requisitos definidos;
- possuir validações adequadas;
- tiver seus cenários relevantes testados;
- não depender exclusivamente de um arquivo candidato ou teste isolado;
- apresentar comportamento coerente na interface.

---

## 14. Entrega acadêmica e acesso ao projeto

- **Integrantes:** Jefferson Cabral e Tiago Beckman.
- **Código-fonte:** https://github.com/fabricioecon12-dev/vitejs-vite-eygm1ahr
- **Execução:** local, por meio do servidor de desenvolvimento do Vite.
- **Publicação:** não há URL pública de produção confirmada nesta versão.

A documentação e a apresentação acadêmica devem refletir a versão efetivamente validada, evitando apresentar funcionalidades planejadas ou testes não executados como resultados concluídos.

---

## 15. Considerações finais

O Nexus Finanças evoluiu de uma aplicação acadêmica voltada aos fundamentos do Vue.js 3 para um sistema de controle financeiro pessoal com navegação por rotas, identidade visual Premium Fintech, integração com APIs REST e módulos de transações, orçamento, relatórios, contas bancárias, cartões de crédito e configurações.

A implementação utiliza componentes Vue, composables, serviços, utilitários e testes automatizados para organizar a interface e as regras financeiras. A persistência identificada nesta versão é local, baseada no armazenamento do navegador, e não há backend próprio ou publicação pública confirmada.

O desenvolvimento permanece incremental. A conclusão de cada módulo depende da integração efetiva, da validação das regras correspondentes e da execução dos testes pertinentes. Este documento deve acompanhar essa evolução e ser atualizado com resultados verificáveis.

---

*README revisado com base na estrutura do código-fonte recebida em 26/11/2026. A suíte de testes e o build não foram executados durante esta revisão documental.*
