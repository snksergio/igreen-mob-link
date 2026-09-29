import { moneyCents } from '../lib/format'
import { compactMoney, fixed, num, pct, signedMoney } from './format'
import { CONEXOES, POTENCIA, clientesPorDia, recebidoAcumulado, totaisRecebidos } from './guided'
import { TERMS, recurrenceProjection, type SimInputs, type SimResult } from './model'
import { embedPayload, resumoDe, type SimulationPayload } from './share'

/*
 * Documento da simulação (HTML único, sem dependências): abre no navegador, e-mail e WhatsApp, imprime bem
 * e traz tudo para analisar — resultado, premissas (com os mesmos nomes dos campos do simulador, para
 * preencher lado a lado), gráfico de 36 meses, DRE do mês 1, carteira e mês a mês. As premissas vão
 * embutidas no fim do arquivo para "Importar simulação" preencher o simulador automaticamente.
 */

type DocMeta = { codigo: string; geradoEm: Date; responsavel: string; logoSvg: string }

const esc = (value: string) => value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const dataBr = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

function niceStep(range: number, target = 4) {
  const raw = range / target
  const pow = 10 ** Math.floor(Math.log10(raw || 1))
  const n = raw / pow
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow
}

/** Gráfico do saldo acumulado em 36 meses (carteira + recargas × só recargas), em SVG estático */
function chartSvg(result: SimResult, combined: boolean) {
  const W = 720
  const H = 240
  const m = { top: 16, right: 78, bottom: 28, left: 64 }
  // Recebido acumulado (começa em zero): o documento não mostra investimento, retorno nem ROI
  const a = recebidoAcumulado(result, true)
  const b = recebidoAcumulado(result, false)
  const same = a.every((v, i) => Math.abs(v - b[i]) < 0.5)
  const all = same ? a : [...a, ...b]
  const step = niceStep(Math.max(...all, 0) - Math.min(...all, 0))
  const yMin = Math.floor(Math.min(...all, 0) / step) * step
  const yMax = Math.ceil(Math.max(...all, 0) / step) * step
  const x = (i: number) => m.left + (i / 36) * (W - m.left - m.right)
  const y = (v: number) => m.top + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - m.top - m.bottom)
  const path = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const ticks: string[] = []
  for (let v = yMin; v <= yMax + step / 2; v += step) {
    ticks.push(
      `<line x1="${m.left}" x2="${W - m.right}" y1="${y(v)}" y2="${y(v)}" stroke="${v === 0 ? '#b8bcc4' : '#eceef1'}" ${v === 0 ? 'stroke-dasharray="4 4"' : ''}/>` +
        `<text x="${m.left - 8}" y="${y(v)}" dy="0.32em" text-anchor="end" class="ax">${esc(compactMoney(v))}</text>`,
    )
  }
  const xs = [0, 6, 12, 18, 24, 30, 36]
    .map((mo) => `<text x="${x(mo)}" y="${H - 8}" text-anchor="middle" class="ax">${mo === 0 ? 'Início' : `${mo} m`}</text>`)
    .join('')
  const main = combined || same ? a : b
  const areaPath = `${path(main)}L${x(36)},${y(0)}L${x(0)},${y(0)}Z`
  const second = same ? '' : `<path d="${path(combined ? b : a)}" fill="none" stroke="#5b6fd6" stroke-width="2"/>`
  const end = (vals: number[], color: string, dy: number) =>
    `<circle cx="${x(36)}" cy="${y(vals[36])}" r="4" fill="${color}"/><text x="${x(36) + 8}" y="${y(vals[36]) + dy}" class="end">${esc(compactMoney(vals[36]))}</text>`
  const closeEnds = !same && Math.abs(y(a[36]) - y(b[36])) < 16
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Recebido acumulado em 36 meses">${ticks.join('')}${xs}
<path d="${areaPath}" fill="#00a859" fill-opacity="0.1"/>${second}<path d="${path(main)}" fill="none" stroke="#00a859" stroke-width="2.5"/>
${end(main, '#00a859', closeEnds && main[36] < (combined ? b : a)[36] ? 12 : 4)}${same ? '' : end(combined ? b : a, '#5b6fd6', closeEnds ? -8 : 4)}
</svg>`
}

const row = (label: string, value: string, extra = '') => `<tr class="${extra}"><th>${label}</th><td>${value}</td></tr>`
/** Premissa com o rótulo igual ao do campo no simulador (em maiúsculas, também sem CSS) */
const field = (label: string, value: string) => row(label.toLocaleUpperCase('pt-BR'), value)

/** HTML completo do documento */
export function buildSimulationDocument({ inputs: s, result, codigo, geradoEm, responsavel, logoSvg }: { inputs: SimInputs; result: SimResult } & DocMeta) {
  const combined = s.incomeMode === 'combined'
  const m1 = result.months[0]
  const receipt = combined ? m1.totalInvestor : m1.investorRechargeCash
  const totais = totaisRecebidos(result, combined)
  const acumulado = recebidoAcumulado(result, true)
  const { charger, capacity } = result
  const solo = charger.investorShare === 1
  const sociedade = solo ? '100% do investidor' : `Você ${charger.investorShare * 100}% · iGreen ${charger.igreenShare * 100}%`
  const rec = recurrenceProjection(s)
  const localModo = { unset: 'A definir (prévia sem tributo local adicional)', provision: `Provisão de ${pct(s.localRate, 1)} sobre a receita`, included: 'Regime validado · encargo incluído no custo/kWh' }[s.localMode]
  const comissaoModo = s.commissionMode === 'rate' ? `Provisão de ${pct(s.commissionRate, 1)} sobre as comissões` : 'A definir (comissões antes de tributos)'

  const dre = [
    row('Faturamento bruto de recargas', moneyCents(m1.revenue), 'total'),
    row(`Administração iGreen <small>${pct(TERMS.administration * 100, 0)}</small>`, `− ${moneyCents(m1.administration)}`),
    row(`PIS <small>${pct(s.pisRate, 2)}</small>`, `− ${moneyCents(m1.pis)}`),
    row(`Cofins <small>${pct(s.cofinsRate, 2)}</small>`, `− ${moneyCents(m1.cofins)}`),
    m1.creditUsed > 0 ? row('Créditos PIS/Cofins', `+ ${moneyCents(m1.creditUsed)}`) : '',
    m1.localTax > 0 ? row(`Tributo local provisionado <small>${pct(s.localRate, 1)}</small>`, `− ${moneyCents(m1.localTax)}`) : '',
    row('Receita após tributos e administração', moneyCents(m1.revenue - m1.federalRevenueTax - m1.localTax - m1.administration), 'total'),
    row(`Custo de energia <small>≈ ${num(m1.purchased, 3)} kWh × R$ ${fixed(s.cost)}/kWh · ${num(s.loss)}% de perdas</small>`, `− ${moneyCents(m1.energy)}`),
    row('Despesas operacionais', `− ${moneyCents(m1.fixed)}`),
    row('Resultado antes de IRPJ/CSLL', moneyCents(m1.beforeRent), 'total'),
    row('IRPJ <small>15%</small>', `− ${moneyCents(m1.irpj)}`),
    row('Adicional de IRPJ <small>10% do excedente</small>', `− ${moneyCents(m1.additionalIrpj)}`),
    row('CSLL <small>9%</small>', `− ${moneyCents(m1.csll)}`),
    row('Lucro líquido estimado da SCP', moneyCents(m1.netProfit), 'total'),
    row(`Repasse ao dono do ponto <small>${pct(s.share, 0)} do lucro líquido</small>`, `− ${moneyCents(m1.rent)}`),
    row('Lucro disponível aos sócios', moneyCents(m1.distributions), 'total'),
    solo ? '' : row(`Participação iGreen <small>${pct(charger.igreenShare * 100, 0)}</small>`, moneyCents(m1.igreenDistribution)),
    row(`Investidor <small>${pct(charger.investorShare * 100, 0)}</small>`, moneyCents(m1.investorDistribution), 'hl'),
  ].join('')

  const recebimentos = [
    row(`Lucros da SCP <small>${pct(charger.investorShare * 100, 0)}</small>`, moneyCents(m1.investorRechargeCash)),
    combined ? row('Comissões de energia <small>4%</small>', `+ ${moneyCents(m1.energyCommission)}`) : '',
    combined ? row('Comissões de seguros <small>5%</small>', `+ ${moneyCents(m1.insuranceCommission)}`) : '',
    combined ? row('Comissões telecom <small>R$ 7/linha</small>', `+ ${moneyCents(m1.telecomCommission)}`) : '',
    combined ? row(`Provisão sobre comissões <small>${s.commissionMode === 'rate' ? pct(s.commissionRate, 1) : 'a definir'}</small>`, `− ${moneyCents(m1.commissionTax)}`) : '',
    row('Recebimento total estimado', moneyCents(receipt), 'hl'),
  ].join('')

  const meses = result.months
    .map(
      (r) =>
        // Total e acumulado primeiro: é o que se lê no celular sem precisar deslizar
        `<tr><th>${r.month}</th><td><b>${moneyCents(r.totalInvestor)}</b></td><td>${moneyCents(acumulado[r.month])}</td><td>${signedMoney(
          r.investorRechargeCash,
        )}</td><td>${moneyCents(r.energyCommission + r.insuranceCommission + r.telecomCommission)}</td></tr>`,
    )
    .join('')

  const payload: SimulationPayload = { app: 'igreen-mob', tipo: 'simulacao-eletroposto', versao: 1, codigo, geradoEm: geradoEm.toISOString(), inputs: s, resumo: resumoDe(s, result) }

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Simulação iGreen Mob · ${esc(charger.name)} · ${esc(codigo)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Inter:wght@600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Geist,system-ui,-apple-system,'Segoe UI',sans-serif;color:#141416;background:#f4f5f7;-webkit-print-color-adjust:exact;print-color-adjust:exact}
html,body{overflow-x:hidden}
.page{max-width:860px;margin:0 auto;padding:32px 20px 48px;display:flex;flex-direction:column;gap:16px}
.page>*,.grid>*,.fields>*{min-width:0}
header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap}
header .brand svg{height:28px;width:auto;display:block}
header h1{margin-top:14px;font-size:26px;line-height:32px;letter-spacing:-.03em}
header h1 span{color:#00a859}
header p{color:#6b6f76;font-size:13px;line-height:20px;margin-top:4px}
.meta{font-size:12px;line-height:18px;color:#6b6f76;text-align:right}
.meta b{color:#141416}
.hero{border-radius:20px;padding:24px;background:linear-gradient(135deg,#0a8a3c,#00a859);color:#fff;display:grid;grid-template-columns:1.3fr 1fr;gap:20px}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{font:700 10px/14px Inter,sans-serif;letter-spacing:.02em;text-transform:uppercase;padding:5px 9px;border-radius:8px;background:rgba(0,179,39,.4);border:1px solid rgba(255,255,255,.14)}
.amount{font:800 40px/46px Inter,sans-serif;letter-spacing:-.02em;margin-top:16px}
.amount small{font-size:22px;color:rgba(255,255,255,.55)}
.over{font:600 11px/14px Inter,sans-serif;color:#00e405;margin-top:4px}
.flag{display:inline-block;margin-top:14px;background:#fff;color:#008949;border-radius:999px;padding:8px 14px;font-size:12px;line-height:18px}
.kpis{display:grid;grid-template-columns:1fr 1fr;gap:8px;align-content:center}
.kpi{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.16);border-radius:12px;padding:12px}
.kpi span{display:block;font-size:11px;color:rgba(255,255,255,.75);font-weight:600}
.kpi b{display:block;font-size:17px;line-height:22px;margin-top:2px}
section{background:#fff;border:1px solid #e6e7ea;border-radius:16px;padding:20px}
section h2{font-size:16px;line-height:22px;letter-spacing:-.02em}
section h2 + p{color:#6b6f76;font-size:12px;line-height:18px;margin-top:2px}
.over2{font:700 10px/14px Inter,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#00a859;margin-bottom:4px}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:14px}
table{width:100%;border-collapse:collapse;font-size:13px;line-height:18px}
th,td{padding:8px 0;border-bottom:1px solid #eef0f2;text-align:left;vertical-align:top}
td{text-align:right;font-variant-numeric:tabular-nums;font-weight:600;white-space:nowrap}
th{font-weight:500;color:#4b4d52}
th small{display:block;font-size:11px;color:#8a8d93;font-weight:500}
tr.total th,tr.total td{color:#141416;font-weight:700}
tr.hl th,tr.hl td{color:#008949;font-weight:700;background:#e8f7ef}
tr.hl th{padding-left:10px}tr.hl td{padding-right:10px}
.fields{margin-top:14px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}
.fields td{white-space:normal;overflow-wrap:anywhere}
.fields h3{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#6b6f76;margin-bottom:4px}
.fields th{font:600 11px/16px Geist,sans-serif;letter-spacing:.02em;text-transform:uppercase;color:#4b4d52}
/* Largos (mês a mês, gráfico): rolam dentro do próprio bloco no celular, sem empurrar a página */
.x{overflow-x:auto;-webkit-overflow-scrolling:touch;margin-top:12px}
.x>table{min-width:540px}
.x>svg{display:block;width:100%;min-width:560px;height:auto}
.swipe{display:none;font-size:11px;color:#8a8d93;margin-top:8px}
.ax{font:500 10px Geist,sans-serif;fill:#8a8d93}.end{font:700 11px Geist,sans-serif;fill:#141416}
.legend{display:flex;gap:16px;font-size:12px;color:#4b4d52;margin-top:10px;flex-wrap:wrap}
.legend i{display:inline-block;width:14px;height:3px;border-radius:2px;margin-right:6px;vertical-align:middle}
.months{max-height:none}
.months th,.months td{padding:6px 6px;font-size:12px}
.months tbody th,.months thead th:first-child{position:sticky;left:0;background:#fff;z-index:1}
.months thead th{font-size:11px;color:#8a8d93;text-transform:uppercase;letter-spacing:.04em;font-weight:600;text-align:right}
.months thead th:first-child{text-align:left}
.neg{color:#d64545}.pos{color:#008949}
.strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px}
.strip div{background:#f4f5f7;border-radius:12px;padding:10px 12px}
.strip span{display:block;font-size:11px;color:#6b6f76;font-weight:600}
.strip b{display:block;font-size:14px;margin-top:2px}
.strip small{display:block;font-size:11px;color:#8a8d93;margin-top:2px}
.notes{font-size:12px;line-height:19px;color:#4b4d52}
.notes li{margin:0 0 6px 16px}
.import{background:#e8f7ef;border:1px solid #bfe8d1;border-radius:12px;padding:12px 14px;font-size:12px;line-height:18px;color:#1d5c3a;margin-top:12px}
footer{text-align:center;font-size:11px;color:#8a8d93}
@media (max-width:640px){
.page{padding:20px 14px 36px}
section{padding:16px}
.hero{grid-template-columns:1fr;padding:20px}
.grid,.fields{grid-template-columns:1fr}
.strip{grid-template-columns:1fr 1fr}
.amount{font-size:32px;line-height:38px}
.meta{text-align:left}
header h1{font-size:22px;line-height:28px}
/* Premissas: rótulo em cima, valor embaixo (nada cortado) */
.fields tr{display:flex;flex-direction:column;gap:2px;padding:9px 0;border-bottom:1px solid #eef0f2}
.fields th,.fields td{padding:0;border:0;text-align:left}
.fields td{font-size:14px}
.swipe{display:block}
}
@media print{body{background:#fff}.page{padding:0}section,.hero{break-inside:avoid}}
</style>
</head>
<body>
<div class="page">
<header>
  <div>
    <div class="brand">${logoSvg}</div>
    <h1>Simulação de <span>eletroposto</span></h1>
    <p>Projeção estimada com as premissas abaixo. Não é proposta, contrato nem rendimento garantido.</p>
  </div>
  <div class="meta">Código <b>${esc(codigo)}</b><br>Gerada em <b>${dataBr(geradoEm)}</b><br>Responsável <b>${esc(responsavel)}</b></div>
</header>

<div class="hero">
  <div>
    <div class="chips"><span class="chip">${esc(charger.name)} · ${POTENCIA[s.charger]}</span><span class="chip">${solo ? '100% seu' : `Sociedade ${charger.investorShare * 100}/${charger.igreenShare * 100}`}</span><span class="chip">${combined ? 'Carteira + recargas' : 'Só recargas'}</span></div>
    <p class="amount">${esc(moneyCents(receipt).replace(/,(\d\d)$/, ''))}<small>,${moneyCents(receipt).slice(-2)}</small></p>
    <p class="over">RECEBIMENTO ESTIMADO NO MÊS 1</p>
    <span class="flag"><b>${compactMoney(totais.total36)}</b> recebidos em 36 meses</span>
  </div>
  <div class="kpis">
    <div class="kpi"><span>Recebido no ano 1</span><b>${compactMoney(totais.ano1)}</b></div>
    <div class="kpi"><span>Recebido em 36 meses</span><b>${compactMoney(totais.total36)}</b></div>
    <div class="kpi"><span>Média por mês</span><b>${compactMoney(totais.mediaMes)}</b></div>
    <div class="kpi"><span>Recargas por mês</span><b>${num(s.cars * s.days)}</b></div>
  </div>
</div>

<section>
  <p class="over2">Premissas da simulação</p>
  <h2>Os mesmos campos do simulador</h2>
  <p>Use para conferir ou preencher lado a lado. Para retomar automaticamente, veja “Importar simulação” no fim do documento.</p>
  <div class="fields">
    <div><h3>Eletroposto</h3><table>
      ${field('Modelo', `${esc(charger.name)} · ${POTENCIA[s.charger]}`)}
      ${field('Sociedade', sociedade)}
      ${field('Limite estimado', `${capacity.maxCars} carros/dia`)}
    </table></div>
    <div><h3>Movimento</h3><table>
      ${field('Carros por dia', `${s.cars} carros`)}
      ${field('Dias de operação', `${s.days} por mês`)}
      ${field('Energia por recarga', `${num(s.kwh, 1)} kWh`)}
      ${field('Capacidade usada', pct(capacity.utilization * 100))}
    </table></div>
    <div><h3>Preços</h3><table>
      ${field('Custo da energia', `R$ ${fixed(s.cost)}/kWh`)}
      ${field('Preço de venda', `R$ ${fixed(s.sale)}/kWh`)}
      ${field('Margem bruta', `R$ ${fixed(s.sale - s.cost)}/kWh`)}
      ${field('Participação do dono do ponto', pct(s.share, 0))}
      ${field('Administração iGreen', `${pct(TERMS.administration * 100, 0)} (fixa)`)}
    </table></div>
    <div><h3>Carteira iGreen</h3><table>
      ${field('Novos clientes por dia', `${clientesPorDia(s)} por dia · ${num(s.monthlyClients)} por mês`)}
      ${CONEXOES.map((c) => field(c.nome, s[c.key] ? `Sim · ${moneyCents(c.valor)}/mês por cliente` : 'Não')).join('')}
      ${field('Por cliente (conexões escolhidas)', `${moneyCents(rec.perClient)}/mês`)}
    </table></div>
    <div><h3>Tributos · Lucro Real 2026</h3><table>
      ${field('PIS sobre a base fiscal', pct(s.pisRate, 2))}
      ${field('Cofins sobre a base fiscal', pct(s.cofinsRate, 2))}
      ${field('Créditos PIS/Cofins por mês', moneyCents(s.taxCredit))}
      ${field('Exclusões da base PIS/Cofins', moneyCents(s.pisExclusion))}
      ${field('Adições fiscais líquidas / mês', moneyCents(s.taxAdditions))}
    </table></div>
    <div><h3>Tributação</h3><table>
      ${field('Tributo local da recarga', localModo)}
      ${field('Comissões do licenciado', comissaoModo)}
      ${field('IRPJ · adicional · CSLL', '15% · 10% acima de R$ 20 mil/mês · 9%')}
    </table></div>
  </div>
</section>

<section>
  <p class="over2">Recebimentos</p>
  <h2>Recebido acumulado em 36 meses</h2>
  <p>Quanto você recebe, somado mês a mês. Em 36 meses: <b>${moneyCents(totais.total36)}</b>.</p>
  <div class="legend"><span><i style="background:#00a859"></i>Carteira + recargas</span><span><i style="background:#5b6fd6"></i>Somente recargas</span></div>
  <div class="x">${chartSvg(result, combined)}</div>
  <p class="swipe">Deslize para o lado para ver o gráfico inteiro →</p>
</section>

<section>
  <p class="over2">DRE · mês 1</p>
  <h2>Como o resultado é formado</h2>
  <p>${num(s.cars * s.days)} recargas e ${num(s.cars * s.kwh * s.days)} kWh vendidos no mês · SCP do eletroposto · Lucro Real estimado.</p>
  <div class="grid">
    <table>${dre}</table>
    <div><table>${recebimentos}</table></div>
  </div>
</section>

<section>
  <p class="over2">Carteira iGreen</p>
  <h2>Quanto a carteira rende por mês</h2>
  <div class="strip">
    <div><span>No 1º mês</span><b>${moneyCents(rec.firstMonth)}</b><small>${num(s.monthlyClients)} clientes</small></div>
    ${rec.periods
      .map((p, i) => `<div><span>Fim do ${[1, 5, 10][i]}º ano</span><b>${moneyCents(p.monthly)}</b><small>acumulado ${moneyCents(p.accumulated)}</small></div>`)
      .join('')}
  </div>
</section>

<section>
  <p class="over2">Mês a mês</p>
  <h2>Mês a mês · 36 meses</h2>
  <p class="swipe">Deslize para o lado para ver recargas e carteira →</p>
  <div class="x"><table class="months">
    <thead><tr><th>Mês</th><th>Total do mês</th><th>Recebido acumulado</th><th>Recargas</th><th>Carteira</th></tr></thead>
    <tbody>${meses}</tbody>
  </table></div>
</section>

<section>
  <p class="over2">Observações</p>
  <h2>Premissas e limites da projeção</h2>
  <ul class="notes" style="margin-top:10px">
    <li>Valores nominais, premissas constantes por 36 meses e antes de eventual IR pessoal do investidor.</li>
    <li>Capacidade estimada com ${s.powerUse}% da potência nominal e ${s.turnoverMinutes} min entre carros; capacidade não garante movimento.</li>
    <li>Comissões da carteira: energia 4% de R$ 500, seguros 5% de R$ 500 e telecom R$ 7 por linha, por cliente ativo.</li>
    <li>Tributos em prévia gerencial (Lucro Real · base 2026); alíquotas, créditos e escrituração da SCP devem ser confirmados pela contabilidade.</li>
  </ul>
  <div class="import"><b>Importar simulação:</b> no simulador iGreen Mob, use “Importar simulação” no topo da tela e escolha este arquivo. Os campos são preenchidos com as premissas acima, dentro dos limites do simulador, e o cálculo é refeito com as regras atuais.</div>
</section>

<footer>iGreen Mob · Simulação ${esc(codigo)} · gerada em ${dataBr(geradoEm)}</footer>
</div>
${embedPayload(payload)}
</body>
</html>`
}
