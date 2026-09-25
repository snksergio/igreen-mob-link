# iGreen Mob · Cadastro de investidor

Fluxo completo de cadastro do investidor Green Mob, implementado a partir do Figma
**Sprint Setembro – SuperApp → seção "Cadastro - v1"**, usando os tokens e componentes do
Design System **Novo Link Cadastro iGreen**.

React 19 + Vite + TypeScript, com CSS Modules e tokens em CSS (sem framework de UI).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # build de produção em dist/
npm run lint
npm run compress:video -- <entrada.mp4> <saída.mp4> <largura> [crf]   # H.264 leve para a web
```

## Fluxo

| Tela | Rota (hash) | Frame no Figma |
| --- | --- | --- |
| Início: vídeo no desktop, imagem no mobile | `/` | `Inicio`, `Mobile - Inicio` |
| Simulador: entrada por CPF → resultado **na mesma tela** | `#simulador` | `02 · Simulador…`, `03 · Simulador…` |
| Passo 1: dados do investidor + endereço | `#step1` | `Step 1` |
| Passo 2: modelo do eletroposto (carregadores) | `#step2` | `Step 2` + AccordionSelect do DS |
| Passo 3: endereço do eletroposto com mapa | `#step3` | `Step 3` |
| Passo 4: resumo, assinatura e aceite | `#step4` | `Step 4` + `Modal detalhamento` |
| Proposta gerada | `#proposta` | `Proposta` |

- **Início:** no desktop o fundo é o vídeo `bg-car-igreen` (qualidade adaptativa, ver abaixo). Ele toca uma vez e fica parado no último quadro, que é idêntico à imagem estática, com altura de 100% da tela, alinhado à direita e fundo preto. Em notebooks com pouca altura (até 900, 820 e 700px), os espaçamentos e o título encolhem para a tela caber sem rolagem.
  - No mobile, ou com "reduzir movimento" ativo, fica a imagem do Figma. Ela fica alinhada ao topo e, em celulares mais altos que o frame do Figma, cresce proporcionalmente com a altura (corta só as laterais).
  - O botão "Simular meu investimento" nunca quebra linha: em telas muito estreitas a fonte diminui e, no limite, vira "Simular".
- **Simulador:** o aporte é um select de valores pré-definidos, e o range percorre a mesma lista.
- **Passos 1 e 3:** começam só com o CEP. O card do endereço, o mapa, o número e o complemento aparecem depois que o CEP é encontrado.
- **Passo 2:** mostra os 3 modelos de carregador no padrão AccordionSelect do Design System. Ao escolher, os outros se recolhem (o lápis reabre a lista) e aparece o resumo com "Quantos carregadores?".
- **Mapa do passo 3:** a prévia do card é clicável ("Ampliar mapa") e abre o mapa grande com os campos do endereço ao lado.
  - Editar os campos move o pino.
  - Arrastar o pino ou clicar no mapa preenche o endereço daquele ponto (Nominatim).
- **Proposta:** a imagem do topo é um vídeo gerado no Magnific (Seedance 2.5 + upscale com 48 fps): a cidade brota do chão, o carregador sobe, o carro chega e o cabo conecta. Ele toca uma vez e termina no mesmo quadro da imagem estática.
  - As bordas de cima e de baixo do vídeo se dissolvem por máscara no próprio elemento. Isso evita as "faixas" que apareciam no Windows quando o navegador jogava o vídeo para a camada de overlay de hardware.
  - "Ver detalhamento da proposta" abre o modal de detalhamento com um resumo da proposta (ID, investidor, carregadores, participação, contrato e local) acima da projeção.
  - O card "Detalhamento do investimento" mostra a mesma projeção direto na página.
- **Responsável pelo cadastro:** o selo ao lado do logo vem do link (`?responsavel=Nome Sobrenome`, fica salvo na sessão). Sem o parâmetro, mostra um nome de exemplo (`services/responsavel.ts`).
- O botão voltar do navegador funciona, e os dados ficam em `sessionStorage`, então um F5 não apaga o que foi preenchido.

## Estrutura

```
src/
  styles/tokens.css          tokens do Design System (primitives → semantic)
  styles/global.css          reset + estilos de texto (t-page-title, t-label...)
  components/ui/             Field, SelectField, Button, Tabs, Checkbox, Toggle, Slider, QuantityStepper, Modal
  components/layout/         HeaderController (isotipo + stepper), PageHeader, StepPage
  components/address/        AddressSection, AddressCard, MapView (Leaflet), AddressModal, AddressMapModal, CepModal
  components/investment/     CategorySelect (AccordionSelect dos carregadores)
  components/projection/     card verde, divisão do faturamento, modal de detalhamento
  screens/                   uma tela por arquivo
  state/cadastro.tsx         estado do fluxo + navegação
  lib/simulation.ts          cálculo da projeção
  data/investment.ts         carregadores, aportes pré-definidos e premissas
  services/                  ViaCEP, geocoding, consulta por CPF (mock) e proposta (mock)
public/assets/             ícones (SVG), imagens (WebP) e vídeo
```

## Regras de investimento (`data/investment.ts`)

- **Carregadores:** Carga Lenta (R$ 10.000 · 7 kW AC), Carga Rápida (R$ 80.000 · 40 kW DC) e Carga Ultra-Rápida (R$ 110.000 · 80 kW DC), todos com 70% do faturamento líquido.
- **Investimento:** modelo × quantidade (1 a 20).
- **Aportes do simulador:** lista `APORTES` (combinações de modelo × quantidade). O padrão é R$ 100.000 = 10 × Carga Lenta, exatamente o "R$ 100.000 · (7kw AC)" do Figma.
- **Troca de modelo no passo 2:** mantém o aporte o mais próximo possível do simulado (ex.: R$ 80.000 → 8 × Carga Lenta).
- **Projeção:** participação = aporte / R$ 1.000.000 (valor da rede). Com as premissas do Figma, aporte de R$ 100.000 dá R$ 2.016/mês, R$ 24.189/ano e R$ 120.946 em 5 anos.

## O que é mock (integrar com o backend)

| Onde | Situação |
| --- | --- |
| `services/document.ts` | Consulta de endereço por CPF/CNPJ **desligada** (`AUTO_ENDERECO_POR_DOCUMENTO = false`), porque o mock devolvia sempre o endereço do Figma. Ligar quando houver consulta real. |
| `services/proposal.ts` → `createProposal` | Gera um ID aleatório. Trocar pelo POST que cria a proposta. |
| `data/investment.ts` | Preços, modelos, lista de aportes e premissas. |
| `services/responsavel.ts` | Nome do responsável: vem do parâmetro `?responsavel=` do link. Sem ele, mostra um nome de exemplo. |
| `screens/Inicio.tsx` → `STATS` | "+R$ 1,2 mi" e "68%" fixos. |
| Links "Memorando de Entendimento" e "Termos de Uso" | Ainda sem destino. |

As integrações reais que já funcionam:
- **ViaCEP:** busca pelo CEP e busca de CEP por endereço.
- **AwesomeAPI CEP e Nominatim:** coordenadas do endereço e endereço a partir do pino.
- **Esri Light Gray Canvas:** tiles do mapa. Para produção, confirme os termos de uso ou troque por um provedor contratado (constantes em `components/address/MapView.tsx`).

## Vídeos adaptativos à conexão (`lib/adaptiveVideo.ts`)

Mesma ideia do *adaptive loading* (Network Information API) e do ABR dos players de streaming, simplificada para clipes curtos:

1. **Escada de qualidades:** cada vídeo tem vários arquivos (`VIDEOS` em `assets.ts`).
   - Início: 1762 / 1280 / 960 px (503 / 260 / 123 KB).
   - Proposta: 1920 / 1280 / 960 / 720 px (624 / 234 / 104 / 52 KB).
2. **Escolha inicial:** pega a menor largura que ainda cobre a área do vídeo na tela (pixels físicos, até 2×).
   - Rebaixa até caber em ~3 s pela banda estimada: a medida real da sessão ou, se não houver, `navigator.connection.downlink` (Chrome/Edge/Android).
   - Em 3G pula a qualidade mais alta.
3. **Medição durante o download:** se a previsão passa do orçamento, cancela e desce um degrau.
4. **Imagem no lugar do vídeo:** com economia de dados ligada, rede 2G ou quando nem o menor arquivo chega a tempo.
   - Nesse caso usa uma versão leve da imagem (`hero-bg-lite.webp`, `proposta-hero-lite.webp`).
5. **Memória da sessão:** a banda medida fica salva, então o vídeo da proposta já começa na qualidade certa.

O arquivo é baixado inteiro antes de tocar, então a animação não trava no meio. Testado com a rede limitada no Chrome:
- Sem limite: vídeo.
- 1,6 Mbps: desce de degrau e toca em ~2,6 s.
- 750 e 400 kbps: imagem leve.

Os arquivos são gerados com `scripts/compress-videos.mjs` (H.264, sem áudio, `faststart`). Ao regenerar, atualize os `bytes` em `assets.ts`:

```bash
npm run compress:video -- original.mp4 public/assets/video/proposta-car-1280.mp4 1280 27
```

## Deploy (Vercel)

Importe o repositório na Vercel. O `vercel.json` já define:
- **Framework:** Vite.
- **Build:** `npm run build`, saída em `dist/`.
- **Instalação:** `npm ci --ignore-scripts`. Isso pula o download do ffmpeg, que só é usado no script local de compressão.

As rotas são por hash (`#simulador`, `#step1`...), então não precisa de rewrites.

## Ajustes em relação ao Figma

- **Passo 2:** o select "Categoria de investimento" e os campos "Valor do eletroposto / Percentual de faturamento líquido" viraram a lista de modelos + o resumo com quantidade. O percentual de 70% aparece nos cards e no resumo.
- **Unidade do investimento:** "Cotas" virou "Carregadores" (chip do passo 4, badge e detalhes da proposta), já que o investimento passou a ser por carregador.
- **Textos:** correções de digitação ("ENDENREÇO", "ELEROPOSTO", "Testeminha", "investimentos", "trato"). O subtítulo de "Assinatura e Testemunha" foi trocado.
- **Valores:** são calculados, e não fixos. A barra "68% das cotas" é preenchida em 68%.
- **Assinatura:** o campo vira "CPF para assinatura" quando o investidor é Pessoa Física.
- **Ícones:** os de "Número" (usuário), "Complemento" (calendário) e das abas "Por energia/Por recarga" foram mantidos como estão no Figma.
- **Telas só desktop no Figma:** no celular, o formulário fica em coluna única, os modais viram bottom sheet e a projeção do simulador aparece abaixo dos campos.
