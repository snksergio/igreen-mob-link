# Fluxo Gerador Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar o fluxo "Gerador" (`#gerador/...`): simulador completo guiado pelo modelo da referência → dados → eletroposto → resumo → proposta, sem alterar o fluxo atual.

**Architecture:** Pasta isolada `src/gerador/` com estado próprio (`GeradorProvider`, sessionStorage `igreen-mob-gerador-v1`), motor de cálculo portado de `model.mjs` e telas próprias (as que já existem são duplicadas e adaptadas). Um `Root.tsx` novo escolhe entre `<App/>` (atual, intacto) e `<GeradorApp/>` pela rota. Componentes genéricos (`components/ui`, `components/address`, `lib`, `services`) são reaproveitados sem alteração.

**Tech Stack:** React 19 + Vite 8 + TypeScript 6, CSS Modules, tokens CSS; Vitest (novo, só para testes); Playwright MCP para validação de telas.

**Spec:** `docs/superpowers/specs/2026-09-28-fluxo-gerador-design.md`

## Global Constraints

- Não alterar nenhum arquivo do fluxo atual. Exceções permitidas fora de `src/gerador/`: `src/main.tsx` (renderizar `<Root/>`), `src/Root.tsx` (novo) e `package.json` (Vitest + script `test`).
- Reaproveitar sem modificar: `components/ui/*`, `components/address/*`, `lib/*` (exceto `simulation.ts`), `services/*`, `assets.ts`, e os exports genéricos de `components/layout/PageShell.tsx` (`ThemeToggle`, `ResponsavelBadge`, `Stack`, `Highlight`, `Stepper`, `TOTAL_STEPS`).
- Textos em português do Brasil, no tom atual. Botão da home: **"Simular gratuitamente"**. CTA do simulador: **"Seguir para proposta"**.
- Header das etapas: "ETAPA N DE 4". Sem "5 anos de contrato"; usar "projeção de 36 meses".
- Temas claro e escuro, mobile first, sem rolagem horizontal, validação igual à atual.
- Trabalho na branch local `novo-fluxo-gerador`. Nada de push.

---

### Task 1: Motor de cálculo + testes

**Files:**
- Modify: `package.json` (devDependency `vitest`, script `"test": "vitest run"`)
- Create: `src/gerador/model.ts`
- Test: `src/gerador/model.test.ts`

**Interfaces:**
- Produces:
  - `type ChargerId = 'lento' | 'duo' | 'ultra'`
  - `CHARGERS: Record<ChargerId, { name, power, price, defaultCars, investorShare, igreenShare }>`
  - `TERMS`, `DEFAULTS: SimInputs`, `LIMITS`
  - `type SimInputs` (todas as chaves de `defaults` da referência)
  - `validate(s): string[]`
  - `capacityFor(s): Capacity`
  - `calculate(s): SimResult` (com `months: MonthRow[]` de 36 itens, `payback`, `chargingPayback`, `net36`, `roi36`, `capital`, `capacity`, `maxCars`, `feasible`, `localTaxPending`, `commissionTaxPending`)
  - `periodResult(r, view, month, year): MonthRow`
  - `scenarioResult(r, mode, view, month, year): { period, receipt, net36, roi36, payback }`
  - `recurrenceProjection(s): { perClient, firstMonth, periods: { months, clients, monthly, accumulated }[] }`
  - `clampInputs(s): SimInputs` (novo: aplica LIMITS e ajusta `cars` ao `maxCars`)

- [ ] **Step 1:** `npm i -D vitest` e adicionar `"test": "vitest run"` em `package.json`.
- [ ] **Step 2:** Escrever `model.test.ts` com o cenário padrão da referência:

```ts
import { describe, expect, it } from 'vitest'
import { DEFAULTS, calculate, capacityFor, recurrenceProjection, scenarioResult, clampInputs, CHARGERS } from './model'

describe('cenário padrão (DUO)', () => {
  const r = calculate(DEFAULTS)
  const m1 = r.months[0]
  it('DRE do mês 1', () => {
    expect(m1.revenue).toBeCloseTo(11550, 2)
    expect(m1.administration).toBeCloseTo(1732.5, 2)
    expect(m1.pis).toBeCloseTo(190.575, 3)
    expect(m1.cofins).toBeCloseTo(877.8, 2)
    expect(m1.energy).toBeCloseTo(4421.05, 2)
    expect(m1.beforeRent).toBeCloseTo(4328.07, 2)
    expect(m1.irpj).toBeCloseTo(649.21, 2)
    expect(m1.csll).toBeCloseTo(389.53, 2)
    expect(m1.netProfit).toBeCloseTo(3289.34, 2)
    expect(m1.investorRechargeCash).toBeCloseTo(2631.47, 2)
    expect(m1.igreenDistribution).toBeCloseTo(657.87, 2)
  })
  it('carteira e total do mês 1', () => {
    expect(m1.commissionGross).toBeCloseTo(4680, 2)
    expect(m1.totalInvestor).toBeCloseTo(7311.47, 2)
  })
  it('retorno e 36 meses', () => {
    expect(r.payback).toBeCloseTo(4.1, 1)
    expect(r.net36).toBeCloseTo(3151615.85, 2)
    expect(Math.round(r.roi36)).toBe(5253)
  })
  it('capacidade', () => {
    const c = capacityFor(DEFAULTS)
    expect(c.utilization).toBeCloseTo(0.237, 3)
    expect(c.maxCars).toBe(30)
  })
  it('recorrência de 10 anos', () => {
    const p = recurrenceProjection(DEFAULTS)
    expect(p.firstMonth).toBe(4680)
    expect(p.periods.map((x) => x.accumulated)).toEqual([365040, 8564400, 33976800])
  })
})

describe('outros cenários', () => {
  it('Lento: 100% do investidor', () => {
    const r = calculate({ ...DEFAULTS, charger: 'lento', cars: CHARGERS.lento.defaultCars })
    expect(r.capital.total).toBe(9997)
    expect(r.months[0].igreenDistribution).toBe(0)
  })
  it('adicional de IRPJ acima de R$ 20 mil', () => {
    const r = calculate({ ...DEFAULTS, charger: 'ultra', cars: 40, kwh: 40, sale: 3 })
    const m = r.months[0]
    expect(m.additionalIrpj).toBeCloseTo(Math.max(0, m.ebt - 20000) * 0.1, 6)
    expect(m.additionalIrpj).toBeGreaterThan(0)
  })
  it('repasse de 20% ao ponto', () => {
    const m = calculate({ ...DEFAULTS, share: 20 }).months[0]
    expect(m.rent).toBeCloseTo(m.netProfit * 0.2, 6)
  })
  it('só recargas usa o payback de recargas', () => {
    const r = calculate(DEFAULTS)
    expect(scenarioResult(r, 'charging').payback).toBe(r.chargingPayback)
  })
  it('visão anual soma o ano', () => {
    const r = calculate(DEFAULTS)
    const y1 = scenarioResult(r, 'combined', 'year', 1, 1).period
    expect(y1.revenue).toBeCloseTo(11550 * 12, 2)
  })
  it('clampInputs ajusta carros ao limite de capacidade', () => {
    const s = clampInputs({ ...DEFAULTS, cars: 999 })
    expect(s.cars).toBe(capacityFor(s).maxCars)
  })
})
```

- [ ] **Step 3:** `npm test` → FAIL (módulo inexistente).
- [ ] **Step 4:** Criar `model.ts` portando `model.mjs` linha a linha (mesmas fórmulas e nomes), com tipos. Adicionar `clampInputs`: limita cada chave a `LIMITS` (arredonda as inteiras) e, se `cars > maxCars`, usa `maxCars`.
- [ ] **Step 5:** `npm test` → PASS. `npx tsc -b` e `npx oxlint` limpos.
- [ ] **Step 6:** Commit `feat(gerador): motor de cálculo portado da referência + testes`.

### Task 2: Rotas, estado e shell

**Files:**
- Create: `src/Root.tsx`, `src/gerador/GeradorApp.tsx`, `src/gerador/state.tsx`, `src/gerador/components/Shell.tsx`, `src/gerador/components/Shell.module.css`
- Modify: `src/main.tsx` (render `<Root/>`)

**Interfaces:**
- Consumes: `calculate`, `DEFAULTS`, `SimInputs` (Task 1).
- Produces:
  - `type GeradorScreen = 'inicio' | 'simulador' | 'dados' | 'eletroposto' | 'resumo' | 'proposta'`
  - `useGerador(): { state, result, go(screen), patch(section, value), setSim(partial), setProposta }`, onde `result = calculate(state.simulacao.inputs)` memoizado
  - Estado: `{ simulacao: { inputs: SimInputs; incomeMode; view; month; year }, investidor, eletroposto: { endereco, publicidade }, assinatura, proposta }`
  - Hash ↔ tela: `#gerador` ↔ `inicio`; `#gerador/<tela>` ↔ tela
  - Componentes do shell:
    - `GeradorHeader({ step?, label? })`: isotipo → `go('inicio')`
    - `GeradorStepPage({ step, title, subtitle?, children, footer, onSubmit, wide? })`: badge "ETAPA N DE 4"; `wide` libera a largura para o simulador

- [ ] **Step 1:** `Root.tsx`: ouve `hashchange`/`popstate`. Se a rota começa com `#gerador`, renderiza `<GeradorApp/>`; senão, o `<App/>` atual.
- [ ] **Step 2:** `state.tsx`: mesmo padrão de `state/cadastro.tsx` (reducer, merge por seção ao carregar, persistência, `pushState`, scroll ao topo). `setSim` aplica `clampInputs`.
- [ ] **Step 3:** `Shell.tsx` duplicando `HeaderController`, `PageHeader` e `StepPage` (com os mesmos estilos, copiados para `Shell.module.css`). Isotipo navega para `#gerador`. Reaproveita `ThemeToggle`, `ResponsavelBadge` e `Stepper` do PageShell (sem alterá-lo).
- [ ] **Step 4:** `GeradorApp.tsx` com as telas (placeholders mínimos para cada rota, até as tasks seguintes) e as proteções de navegação da spec.
- [ ] **Step 5:** Verificar: `#gerador` renderiza, `/` e `#simulador` continuam iguais e `flow3.js` passa.
- [ ] **Step 6:** Commit `feat(gerador): rotas, estado e shell do fluxo`.

### Task 3: Início duplicado

**Files:** Create `src/gerador/screens/Inicio.tsx` e `Inicio.module.css` (cópias do atual).

- [ ] **Step 1:** Copiar `screens/Inicio.tsx` e `screens/Inicio.module.css`, trocando o import de estado para `useGerador`, o destino do CTA para `go('simulador')` e o texto para "Simular gratuitamente", com a linha de apoio "Sem custo e sem contrato nesta etapa". O rótulo curto do CTA estreito continua "Simular".
- [ ] **Step 2:** Verificar desktop e celular (a mesma tela, com o novo CTA). Commit.

### Task 4: Simulador: blocos de configuração

**Files:**
- Create:
  - `src/gerador/screens/Simulador.tsx` e `Simulador.module.css`
  - `src/gerador/components/ChargerCarousel.tsx` e `.module.css`
  - `src/gerador/components/SimSection.tsx`: bloco numerado com título e subtítulo
  - `src/gerador/components/RecurrenceStrip.tsx`
  - `src/gerador/components/AdvancedTaxes.tsx`

**Interfaces:**
- Consumes: `useGerador` (`state.simulacao.inputs`, `setSim`, `result`), `CHARGERS`, `capacityFor`, `recurrenceProjection`.
- Produces:
  - `<ChargerCarousel value onChange />`
  - `<SimSection index title subtitle>{children}</SimSection>`
  - `<RecurrenceStrip inputs />`
  - `<AdvancedTaxes inputs onChange />`

- [ ] **Step 1:** `ChargerCarousel`: trilho `overflow-x: auto` com `scroll-snap-type: x mandatory`; cards `scroll-snap-align: start`, 280px no celular e 3 colunas quando cabem. Setas (desktop) rolam o trilho e os pontos acompanham via `IntersectionObserver`. Cada card é um `role="radio"` com:
  - ícone (`FancyIcon`), nome, potência e conectores;
  - "Até X carros/dia" (`capacityFor({...inputs, charger}).maxCars`);
  - investimento em destaque;
  - barra de sociedade e valor total.

  Estados: selecionado com verde fraco, contorno e check; foco visível. Ao trocar de modelo, `setSim({ charger, cars: CHARGERS[id].defaultCars })`.
- [ ] **Step 2:** Bloco 2, Movimento e recarga:
  - carros por dia: número grande + `Slider` de 1 a `maxCars`, com o limite indicado;
  - dias: `QuantityStepper` de 1 a 31;
  - kWh por recarga: campo numérico;
  - baterias de referência: 3 chips com link;
  - medidor de capacidade: barra com `utilization`, texto da referência e aviso se ajustado ao limite.
- [ ] **Step 3:** Bloco 3, Preços e ponto:
  - custo e preço de venda (campos numéricos com R$/kWh);
  - "margem bruta R$ X/kWh" (venda − custo);
  - linha fixa da administração de 15%;
  - participação do ponto: `Slider` de 0 a 20 + valor.
- [ ] **Step 4:** Bloco 4, Carteira: clientes por mês (`Slider` de 0 a 500 + campo), 3 cards de conexão (checkbox visual) e `RecurrenceStrip` (1º mês, 1, 5 e 10 anos: mensal e acumulado).
- [ ] **Step 5:** Bloco 5, `AdvancedTaxes` recolhido (`details`/`summary` estilizado):
  - PIS, Cofins, créditos, exclusões;
  - tributação local (3 opções + % quando provisão);
  - adições;
  - comissões (2 opções + % quando provisão);
  - notas da referência.
- [ ] **Step 6:** Verificar visualmente no desktop e no celular, nos dois temas. Commit.

### Task 5: Simulador: resultado, gráfico, DRE, mês a mês

**Files:**
- Create:
  - `src/gerador/components/ResultPanel.tsx` e `.module.css`
  - `src/gerador/components/ReturnChart.tsx`: SVG próprio, seguindo a skill `dataviz`
  - `src/gerador/components/DreTable.tsx`
  - `src/gerador/components/MonthTable.tsx`
  - `src/gerador/components/Premissas.tsx`
  - `src/gerador/components/MobileResultBar.tsx`

**Interfaces:**
- Consumes: `result`, `scenarioResult`, `state.simulacao.{incomeMode,view,month,year}`, `setSim`/`patch`.
- Produces:
  - `<ResultPanel />`
  - `<ReturnChart months payback chargingPayback mode />`
  - `<DreTable period chargerShare />`
  - `<MonthTable months />`
  - `<Premissas />`
  - `<MobileResultBar onContinue />`

- [ ] **Step 1:** `ResultPanel` (cartão verde do padrão `investCard`/`ProjectionHero`):
  - `SegmentedTabs` do cenário;
  - período mensal ou anual + `SelectField` do mês ou do ano;
  - recebimento em destaque (count-up leve), com as linhas de recargas líquidas e carteira;
  - KPIs de retorno, saldo e ROI em 36 meses;
  - avisos (`Flag` warning) para tributo local ou comissões a definir e para inviável;
  - `Button` "Seguir para proposta".

  No desktop fica `position: sticky; top: 24px`.
- [ ] **Step 2:** `ReturnChart`: área e linha de 36 pontos, "com carteira" (verde) e "só recargas" (neutro). Linha do zero, marcador do payback, eixos com rótulos compactos (R$ mil/mi), legenda e tooltip no hover/toque por mês. Deve funcionar nos dois temas.
- [ ] **Step 3:** `DreTable`: grupos "Recargas · SCP" e "Recebimentos", com linhas hierárquicas: rótulo, detalhe e valor; negativos com "−"; totais em destaque. Cobre todas as linhas da referência.
- [ ] **Step 4:** `MonthTable`: abas Ano 1, 2 e 3; tabela no desktop, cards no celular (≤ 560px); notas de rodapé ¹²³ da referência.
- [ ] **Step 5:** `Premissas`: recolhido, com os textos e links da referência (Recargas e sociedade; Tributos e escrituração; Carteira e retorno; Fontes).
- [ ] **Step 6:** `MobileResultBar`: fixo embaixo no celular (≤ 1023px), com o recebimento do período, o retorno e o botão "Seguir". Esconde quando o `ResultPanel` inline está visível (`IntersectionObserver`).
- [ ] **Step 7:** Montar a tela completa, verificar no desktop e no celular, nos dois temas, e conferir se os números batem com a referência. Commit.

### Task 6: Dados e eletroposto

**Files:**
- Create:
  - `src/gerador/components/SimulationSummary.tsx`
  - `src/gerador/screens/Dados.tsx`: adaptado de `screens/Step1Dados.tsx`
  - `src/gerador/screens/Eletroposto.tsx`: adaptado de `screens/Step3Endereco.tsx`
  - `src/gerador/screens/Steps.module.css`: cópia de `screens/Steps.module.css`

- [ ] **Step 1:** `SimulationSummary`: cartão compacto com o modelo e a potência, seu investimento, o recebimento/mês (mês 1, cenário escolhido) e o retorno. Link "Editar simulação" → `go('simulador')`.
- [ ] **Step 2:** `Dados`: cópia do passo 1 com `useGerador`, `GeradorStepPage step={2}` e `SimulationSummary` no topo. Ao enviar → `go('eletroposto')`.
- [ ] **Step 3:** `Eletroposto`: cópia do passo 3 + "Faturamento de publicidade" (`YesNoToggle`, igual ao passo 2 atual) + `SimulationSummary`. Ao enviar, pré-preenche a assinatura (como hoje) → `go('resumo')`.
- [ ] **Step 4:** Verificar a validação, o CEP, o mapa e o modal. Commit.

### Task 7: Resumo e proposta

**Files:**
- Create:
  - `src/gerador/screens/Resumo.tsx`: adaptado de `screens/Step4Resumo.tsx`
  - `src/gerador/components/GeradorDetailModal.tsx`
  - `src/gerador/screens/Proposta.tsx` e `Proposta.module.css`: cópias adaptadas

- [ ] **Step 1:** `GeradorDetailModal`: `Modal` com o recebimento em destaque, os KPIs, `DreTable` do período e, opcionalmente, o resumo da proposta (prop `resumo`).
- [ ] **Step 2:** `Resumo`:
  - **Banner:** valor = investimento do investidor. Chips: modelo e potência + "SOCIEDADE 80/20" ou "100% SEU". Tarja: "R$ X/mês estimado".
  - **Formulário e cards:** "Ver detalhamento completo" → modal; cards do investidor (editar → dados) e do eletroposto (editar → eletroposto); assinatura, testemunha, "Como funciona" com os textos do modelo novo, aceite.
  - **Envio:** "Gerar proposta" → `setProposta` → `go('proposta')`.
- [ ] **Step 3:** `Proposta`: cópia com os dados novos.
  - **Cartão:** seu investimento; badges do modelo e do retorno em N meses.
  - **Modal:** resumo com ID, investidor, modelo, sociedade, valor total, recebimento/mês, retorno e local.
  - **Collapsibles:** ID, detalhamento com `DreTable`, investidor, local com publicidade.
- [ ] **Step 4:** Verificar. Commit.

### Task 8: Validação final

- [ ] **Step 1:** Script Playwright `.playwright-mcp/flow-gerador.js`: `#gerador` → simular (troca de modelo, carros, clientes, cenário) → dados → eletroposto (CEP + mapa) → resumo → proposta. Sem erros no console.
- [ ] **Step 2:** `flow3.js` (fluxo atual) continua passando.
- [ ] **Step 3:** Varredura de responsividade (notebooks e celulares) nas telas novas, nos dois temas.
- [ ] **Step 4:** `npm test`, `npm run build` e `npx oxlint` limpos. Atualizar o README com uma seção curta sobre o fluxo Gerador. Commit.
