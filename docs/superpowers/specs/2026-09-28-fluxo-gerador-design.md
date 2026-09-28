# Fluxo "Gerador": simulação completa + cadastro

**Data:** 28/09/2026
**Status:** aprovado em conversa, aguardando revisão desta especificação
**Branch:** `novo-fluxo-gerador` (local, sem push até aprovação)

## Objetivo

Criar um segundo fluxo de cadastro do investidor, guiado pelo simulador de referência
"Simulador de investimento e DRE | iGreen Mob" (igreen-mob-retorno.thiago92261.chatgpt.site).
A pessoa simula tudo primeiro (eletroposto, movimento, preços, carteira, tributos) e os dados
da simulação seguem até a proposta. A escolha do eletroposto sai do cadastro e passa a fazer
parte do simulador.

O design deve ser bem mais intuitivo que o documento de referência e seguir o padrão visual
deste projeto (tokens, componentes, temas claro e escuro, mobile first).

## Restrições

- **O fluxo atual não muda.** Nenhum arquivo dele é alterado: `App.tsx`, `state/cadastro.tsx`,
  `screens/*`, `components/layout/PageShell.*`, `components/projection/*`,
  `components/investment/*`, `lib/simulation.ts`, `data/investment.ts` e seus estilos.
  O que precisar ser diferente é duplicado na pasta nova.
- Tudo do fluxo novo fica em `src/gerador/`.
- Componentes genéricos são reaproveitados sem alteração: `components/ui/*`,
  `components/address/*`, `lib/*` (exceto `simulation.ts`), `services/*`, `assets.ts`.
- Trabalho só local, na branch `novo-fluxo-gerador`. Nada é enviado ao GitHub sem pedido.

## Rotas

| Rota | Tela | Header |
| --- | --- | --- |
| `#gerador` | Início (duplicado) com botão "Simular gratuitamente" | — |
| `#gerador/simulador` | Simulador completo | ETAPA 1 DE 4 |
| `#gerador/dados` | Dados pessoais + endereço do investidor | ETAPA 2 DE 4 |
| `#gerador/eletroposto` | Endereço do eletroposto (mapa) + publicidade | ETAPA 3 DE 4 |
| `#gerador/resumo` | Resumo, assinatura, testemunha, aceite | ETAPA 4 DE 4 |
| `#gerador/proposta` | Proposta final gerada | — |

As rotas atuais (`/`, `#simulador`, `#step1`…`#step4`, `#proposta`) continuam idênticas.

Proteção de navegação (mesmo padrão do fluxo atual): abrir uma etapa sem os dados da anterior
redireciona para a etapa que falta (ex.: `#gerador/resumo` sem dados pessoais → `#gerador/dados`;
`#gerador/proposta` sem proposta gerada → `#gerador/resumo`).

## Arquitetura

```
src/
  Root.tsx                    novo: escolhe <App/> (atual, intacto) ou <GeradorApp/> pela rota
  main.tsx                    passa a renderizar <Root/> em vez de <App/> (única linha alterada fora da pasta nova)
  gerador/
    GeradorApp.tsx            provider + roteamento das telas do fluxo novo
    state.tsx                 GeradorProvider: estado, navegação, persistência (sessionStorage próprio)
    model.ts                  port em TypeScript do modelo de cálculo da referência
    model.test.ts             testes do modelo (Vitest)
    format.ts                 helpers de formatação que não existem em lib/format (ex.: meses de retorno, kWh)
    components/
      Shell.tsx(.module.css)  header (isotipo → #gerador, etapa, tema, responsável), stepper, página de etapa
      ChargerCarousel.tsx     carrossel dos 3 eletropostos
      ResultPanel.tsx         painel "Seu resultado"
      ReturnChart.tsx         gráfico de retorno em 36 meses
      DreTable.tsx            DRE + recebimentos do período
      MonthTable.tsx          mês a mês (abas Ano 1–3)
      SimulationSummary.tsx   cartão compacto "Sua simulação" (etapas 2–4)
      ...                     demais peças locais do simulador
    screens/
      Inicio.tsx(.module.css)         duplicado do Início atual (CTA e rota novos)
      Simulador.tsx(.module.css)
      Dados.tsx
      Eletroposto.tsx
      Resumo.tsx
      Proposta.tsx(.module.css)       duplicado da Proposta atual com dados do modelo novo
      Steps.module.css                duplicado dos estilos de etapa usados pelas telas acima
```

Fora de `src/gerador/`, as únicas alterações são: `main.tsx` (renderiza `<Root/>`), o arquivo novo `Root.tsx` e o `package.json` (Vitest como dependência de desenvolvimento e script `test`). O `App.tsx` atual não é tocado.

### Estado (`gerador/state.tsx`)

Chave de sessão própria: `igreen-mob-gerador-v1`. Seções:

- `simulacao`: entradas do modelo (ver abaixo) + visão do resultado
  (`incomeMode`, `view`, `month`, `year`).
- `investidor`: tipo PF/PJ, documento, nome, nascimento, e-mail, WhatsApp, endereço.
- `eletroposto`: endereço (com lat/lng) e `publicidade` (sim/não).
- `assinatura`: data, nome, documento, testemunha (nome, CPF), aceite.
- `proposta`: `{ id }` ou `null`.

A simulação é recalculada com `calculate()` a cada mudança (memoizada) e exposta no contexto.

### Motor de cálculo (`gerador/model.ts`)

Port fiel de `model.mjs` da referência, com tipos:

- **Carregadores:**

  | Modelo | Potência | Investimento do investidor | Participação | Carros/dia padrão |
  | --- | --- | --- | --- | --- |
  | Lento | 7 kW | R$ 9.997 | 100% investidor | 3 |
  | DUO | 7 + 40 kW (47) | R$ 59.997 | 80% investidor / 20% iGreen | 7 |
  | Ultra rápido | 80 kW | R$ 129.900 | 80/20 | 15 |

  Valor total = investimento ÷ participação do investidor.
- **Termos:** administração 15% do faturamento de recarga. Comissões por cliente: energia 4% de
  R$ 500 (R$ 20), seguros 5% de R$ 500 (R$ 25), telecom R$ 7/linha.
- **Padrões:** DUO, 7 carros/dia, 25 kWh, custo R$ 0,80/kWh, venda R$ 2,20/kWh, ponto 0%,
  30 dias, 24 h, aproveitamento 80%, 10 min entre carros, perdas 5%, despesas fixas 0,
  15% das sessões do DUO em 7 kW, 90 clientes/mês, as 3 conexões ligadas, PIS 1,65%,
  Cofins 7,6%, créditos 0, exclusões 0, tributo local "a definir" (provisão 18% se ativada),
  comissões "a definir" (provisão 0%), adições fiscais 0.
- **Limites:** os mesmos da referência (ex.: carros 1–1000 inteiro, dias 1–31, ponto 0–20%,
  clientes 0–500 inteiro).
- **Capacidade:** sessão = kWh ÷ (potência × aproveitamento) + intervalo. O DUO divide as sessões
  entre os conectores de 7 e 40 kW (simultâneos). A capacidade máxima vem de 24 h/dia.
- **DRE mensal:**
  1. faturamento;
  2. administração;
  3. PIS/Cofins sobre a base menos exclusões, menos créditos limitados ao débito;
  4. tributo local, se for provisão;
  5. energia comprada com perdas;
  6. despesas fixas;
  7. resultado;
  8. IRPJ 15% + adicional de 10% acima de R$ 20 mil + CSLL 9% (sobre resultado + adições);
  9. lucro líquido;
  10. repasse ao ponto (% do lucro positivo);
  11. divisão investidor/iGreen;
  12. aporte do investidor em caso de déficit.
- **Carteira:** clientes acumulam por mês (sem cancelamentos). Comissão integral no mês da
  contratação. Provisão sobre as comissões se ativada.
- **36 meses:** recebimento do investidor = recargas líquidas + comissões líquidas. Saldo =
  acumulado − investimento. Payback interpolado dentro do mês, em dois cenários: com carteira e
  só recargas. ROI de 36 meses = saldo ÷ investimento.
- **Recorrência de 10 anos:** projeções de 12, 60 e 120 meses (mensal e acumulado).
- **Visões:** mensal (mês 1–36) ou anual (ano 1–3, somando o período). Cenário combinado ou só
  recargas.

Valores de referência do cenário padrão (usados nos testes):

- **Recargas:** 210 no mês, 5.250 kWh, faturamento R$ 11.550,00.
- **Lucro da SCP:** R$ 3.289,34. Investidor 80%: R$ 2.631,47.
- **Carteira no mês 1:** R$ 4.680,00. Total no mês 1: R$ 7.311,47.
- **Retorno:** payback em 4,1 meses. Saldo em 36 meses: R$ 3.151.615,85. ROI de 5.253%.
- **Capacidade:** uso de 23,7%, limite de 30 carros/dia.

## Telas

### Início (`#gerador`)

Duplicado da tela inicial atual: vídeo, textos, estatísticas, comportamento mobile e desktop.
Muda só o botão, que passa a ser **"Simular gratuitamente"** com um apoio curto logo abaixo
("Sem custo e sem contrato nesta etapa"), levando a `#gerador/simulador`.

### Simulador (`#gerador/simulador`)

Título "Simule seu eletroposto", com subtítulo reforçando que a simulação é gratuita e não gera
contrato.

**Desktop (≥ 1024px):** duas colunas. A configuração fica à esquerda e o painel "Seu resultado"
à direita, fixo durante a rolagem.

1. **Escolha seu eletroposto:** carrossel horizontal (scroll-snap) de 3 cards altos. Setas no
   desktop, arrastar no touch, indicador de pontos. Cada card mostra:
   - ícone, nome e potência;
   - conectores;
   - "até X carros/dia", calculado com as premissas atuais;
   - seu investimento em destaque;
   - uma barra de sociedade "Você X% · iGreen Y%" com o valor total.

   O card selecionado usa o verde fraco com contorno e um check. Abaixo, os selos do que está
   incluso: equipamento, instalação, pintura e licença iGreen.
2. **Movimento e recarga:**
   - carros por dia com número grande e slider de 1 até o limite de capacidade, com o limite
     indicado;
   - dias de operação com botões − e +;
   - kWh por recarga, com as baterias de referência (BYD Dolphin Mini 38 kWh, BYD Seal
     82,56 kWh, Geely EX2 39,4 kWh, com links);
   - medidor de capacidade usada, com a explicação da premissa.
3. **Preços e ponto:**
   - custo e preço de venda do kWh, com a margem bruta por kWh;
   - linha informativa "Administração iGreen 15%, que inclui plataforma, atendimento e taxas de
     cartão";
   - slider da participação do dono do ponto (0–20%), com a regra explicada.
4. **Carteira iGreen:**
   - novos clientes por mês (slider 0–500 e campo);
   - 3 cards para ligar e desligar energia (R$ 20/mês), seguros (R$ 25/mês) e telecom
     (R$ 7/linha);
   - faixa de projeção em 1º mês, 1 ano, 5 anos e 10 anos, com o mensal e o acumulado.
5. **Avançado · Tributos (Lucro Real 2026):** seção recolhida com todos os campos fiscais da
   referência:
   - PIS, Cofins, créditos, exclusões;
   - tributação local: a definir, provisão (%) ou incluída no custo;
   - adições fiscais;
   - tributação das comissões: a definir ou provisão (%);
   - notas da referência.

**Painel "Seu resultado"** (cartão verde do nosso padrão):
- alternância "Carteira + recargas" / "Só recargas";
- período mensal ou anual, com seletor de mês (1–36) ou de ano (1–3);
- recebimento estimado do período em destaque, com a divisão entre recargas líquidas e carteira;
- retorno (payback), saldo e ROI em 36 meses;
- avisos: tributo local ou comissões "a definir", e cenário acima da capacidade;
- botão **"Seguir para proposta"** → `#gerador/dados`.

**Abaixo, em largura total:**
1. **Retorno do capital:** gráfico de 36 meses, "com carteira" × "só recargas". Mostra a linha
   do zero, o ponto do retorno marcado e a legenda.
2. **DRE do período:**
   - recargas: quantidade, kWh, faturamento, deduções, resultado, IRPJ/CSLL, lucro, repasse,
     divisão;
   - recebimentos: lucros da SCP, comissões, provisão e total.
3. **Mês a mês:** tabela com abas Ano 1, 2 e 3 (recargas, energia, seguros, telecom, total,
   saldo). No celular vira lista em cards.
4. **Premissas, regras e fontes:** recolhido, com o texto e os links da referência.

**Celular:** uma coluna. O carrossel é arrastável e o cartão de resultado aparece depois do
bloco 4. Uma barra fixa embaixo mostra "R$ X/mês · retorno em N meses" e o botão "Seguir".

### Dados (`#gerador/dados`)

- No topo, o cartão "Sua simulação" (modelo, seu investimento, recebimento/mês, retorno), com
  o link "Editar simulação" → `#gerador/simulador`, preservando tudo.
- Campos iguais ao passo 1 atual: PF/PJ, CPF/CNPJ, nome, nascimento, e-mail, WhatsApp e
  endereço do investidor (CEP → card → número/complemento).
- Validação e foco no primeiro erro iguais aos atuais.

### Eletroposto (`#gerador/eletroposto`)

- Igual ao passo 3 atual: CEP → card com mapa, "Ampliar mapa" (modal com mapa e campos
  sincronizados), número e complemento.
- Pergunta "Faturamento de publicidade (Sim/Não)".
- Cartão "Sua simulação" compacto no topo.

### Resumo (`#gerador/resumo`)

A tela do passo 4 atual, com os números do modelo novo:

- **Banner verde:**
  - valor: seu investimento;
  - selos: modelo e potência, e "Sociedade 80/20" ou "100% seu";
  - tarja: recebimento estimado por mês.
- **"Ver detalhamento completo":** abre modal com o DRE e os recebimentos.
- **Cards e formulário:** investidor (editar → dados); eletroposto (editar → eletroposto);
  assinatura e testemunha; "Como funciona" com o texto do modelo novo; avisos; aceite;
  "Gerar proposta" → `#gerador/proposta`.
- Sem "5 anos de contrato"; usa "projeção de 36 meses".

### Proposta (`#gerador/proposta`)

A página de proposta atual duplicada: vídeo claro ou escuro, cards e compartilhar. O cartão de
valor mostra seu investimento, os selos do modelo e do retorno, e "Ver detalhamento da
proposta" com o resumo (ID, investidor, modelo, sociedade, valor total, local) mais os
recebimentos e o retorno. Os detalhes (ID, detalhamento, investidor, local) usam os dados novos.

## Tratamento de erros e bordas

- As entradas respeitam os limites do modelo. Campos numéricos são limitados ao sair do campo.
- Se o limite de capacidade cair abaixo dos carros/dia atuais (ex.: aumentar o kWh), o valor é
  ajustado ao novo limite, com um aviso.
- Payback inexistente em 36 meses aparece como "sem retorno no período".
- Déficit (lucro negativo) mostra o aporte estimado do investidor, como na referência.
- Pendências fiscais ("a definir") aparecem como aviso, nunca bloqueiam.

## Testes

- **Vitest:** o modelo contra os valores de referência acima, mais:
  - Lento com 100% do investidor;
  - adicional de IRPJ acima de R$ 20 mil;
  - repasse de 20% ao ponto;
  - limite de capacidade e cenário inviável;
  - só recargas;
  - visão anual.
- **Playwright:** o fluxo novo de ponta a ponta no desktop (1440) e no celular (390), nos temas
  claro e escuro.
- **Regressão:** o teste do fluxo atual (`flow3.js`) deve continuar passando.
- Varredura de responsividade (notebooks e celulares), build e lint.

## Fora do escopo

- Integração com backend (a proposta continua gerando um ID mock).
- Mudanças no fluxo atual ou no Design System externo.
- Publicação no GitHub/Vercel (só quando pedido).
