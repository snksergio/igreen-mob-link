import { cn } from '../../lib/cn'
import { CLIENTES_DIA, MAX_CLIENTES_DIA, ocultaCapital } from '../guided'
import { useGerador } from '../state'
import styles from './Report.module.css'

const FONTES = [
  { t: 'Receita Federal · IRPJ', h: 'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/tributos/IRPJ' },
  { t: 'Receita Federal · CSLL', h: 'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/tributos/CSLL' },
  {
    t: 'Receita Federal · PIS/Cofins e créditos',
    h: 'https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/perguntas-e-respostas/ecf/perguntas-e-respostas-da-pessoa-juridica-2022/@@download/file/PeRPJ2022v1.pdf',
  },
  { t: 'Receita Federal · apuração das SCPs', h: 'https://normas.receita.fazenda.gov.br/sijut2consulta/consulta.action?termoBusca=SCP' },
  { t: 'Confaz · Convênio ICMS 182/25', h: 'https://www.confaz.fazenda.gov.br/legislacao/convenios/2025/CV182_25' },
  {
    t: 'Receita Federal · distribuição de lucros em 2026',
    h: 'https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/agosto/receita-federal-orienta-sobre-os-procedimentos-para-o-recolhimento-do-imposto-de-renda-retido-na-fonte-sobre-lucros-e-dividendos',
  },
]

/** Premissas, regras de cálculo e fontes (textos da referência), na aba do relatório. Na v2: sem o valor do investimento e com clientes por dia */
export function Premissas() {
  const { version } = useGerador()
  const hideCapital = ocultaCapital(version)
  const porDia = version === 'v2'
  return (
    <section className={cn(styles.card, styles.embedded)} aria-labelledby="premissas-titulo">
      <header className={styles.cardHead}>
        <div className={styles.cardText}>
          <span className={styles.overline}>Transparência</span>
          <h2 id="premissas-titulo" className={cn('t-section-title', styles.cardTitle)}>
            Premissas, regras de cálculo e fontes
          </h2>
        </div>
      </header>

      <div className={styles.premissasBody}>
        <article className={styles.prose}>
          <h3>Recargas e sociedade</h3>
          <p>
            No 7 kW, o investimento{hideCapital ? '' : ' de R$ 9.997'} é integralmente do investidor; a iGreen fornece o sistema e recebe a taxa de administração, sem participação
            societária. No DUO e no Ultra, a composição de capital é uma proposta: o investimento do usuário corresponde a 80% do total proposto, e os 20% restantes
            são uma contrapartida iGreen a formalizar. O simulador não comprova aporte realizado.{hideCapital ? '' : ' Payback e ROI usam apenas o investimento do usuário.'}
          </p>
          <p>
            Capacidade: tempo por sessão = kWh por carro ÷ (potência nominal × aproveitamento informado) + intervalo entre carros. O número máximo de sessões
            completas considera a premissa de 24 horas disponíveis por dia. No DUO, as sessões são distribuídas e arredondadas entre os conectores de 7 e 40 kW,
            considerados simultâneos. As premissas iniciais de 80% e 10 minutos são ilustrativas. A procura de clientes precisa ser estimada separadamente.{' '}
            <a href="https://afdc.energy.gov/fuels/electricity-stations" target="_blank" rel="noreferrer">
              Referência: fatores que afetam o tempo de recarga ↗
            </a>
          </p>
          <p>
            Carros/dia × kWh por recarga × dias de operação forma a energia vendida. A compra de energia considera as perdas. As premissas iniciais consideram 5% de
            perdas de energia e despesas operacionais adicionais zeradas. Os 15% de administração incidem sobre o faturamento bruto da recarga e já incluem cartão,
            plataforma e atendimento.
          </p>
          <p>
            O repasse ao ponto é limitado a 20% do lucro contábil positivo após impostos. Nesta simulação é uma destinação contratual após a apuração, sem dedução
            fiscal. Após esse repasse, o saldo pertence 100% ao investidor no 7 kW. No DUO e no Ultra, é dividido em 80% para o investidor e 20% para a iGreen. A
            contabilidade deve validar a classificação do pagamento ao ponto. Comissões do licenciado são separadas da SCP, sem essa divisão.
          </p>
          <p>
            Em déficit de caixa, o modelo considera 100% do déficit a cargo do investidor no 7 kW e 80% no DUO e no Ultra; confirme as obrigações no contrato
            aplicável. Não há distribuição sobre prejuízo.
          </p>
        </article>

        <article className={styles.prose}>
          <h3>Tributos e escrituração</h3>
          <p>
            PIS/Cofins são calculados sobre a base informada, menos créditos validados. IRPJ de 15%, CSLL de 9% e adicional de IRPJ de 10% sobre o excedente do
            equivalente a R$ 20 mil/mês são provisões gerenciais. As bases fiscais podem divergir do lucro contábil.
          </p>
          <p>
            Nas operações em SCP, a SCP e a sócia ostensiva exigem apuração segregada. Validar a dedutibilidade e documentação dos 15% de administração; essa receita
            da iGreen também tem tributação própria fora deste DRE. O lucro distribuído à iGreen não é despesa dedutível da SCP.
          </p>
          <p>
            Não existe uma alíquota nacional única de ICMS para esta simulação. O Convênio 182/25 prevê tratamento por substituição tributária sujeito à
            regulamentação e condições locais. Não duplique encargos já considerados no custo da energia.
          </p>
        </article>

        <article className={styles.prose}>
          <h3>{hideCapital ? 'Carteira e recebimentos' : 'Carteira e retorno'}</h3>
          <p>
            {porDia
              ? `Entram de 0 a ${MAX_CLIENTES_DIA} novos clientes por dia de operação, conforme o valor informado (sugestão inicial: ${CLIENTES_DIA.lento} no 7 kW, ${CLIENTES_DIA.duo} no DUO e ${CLIENTES_DIA.ultra} no Ultra rápido). Por mês, são os clientes por dia × os dias de operação.`
              : 'Entram de 0 a 500 novos clientes por mês, conforme a meta informada.'}{' '}
            Cada cliente contrata todas as soluções selecionadas, com uma linha telecom por
            cliente; a contagem de clientes não é multiplicada pela quantidade de produtos. A carteira começa em zero e acumula sem cancelamentos e sem ajuste por
            repetição de visitantes. Comissão integral já no mês da contratação: 4% de energia, 5% de seguro e R$ 7 por linha telecom. Sem bônus inicial de seguro. O
            simulador de 10 anos usa apenas comissões brutas; seus valores não são somados outra vez ao DRE.
          </p>
          <p>
            {hideCapital
              ? 'O recebido acumulado soma, mês a mês, o que o investidor recebe das recargas e da carteira, sem descontar o investimento.'
              : 'Payback é o primeiro mês em que os recebimentos acumulados cobrem o investimento, com interpolação no mês. O ROI de 36 meses desconta o investimento uma única vez.'}{' '}
            Não há financiamento, inflação, reajustes, valor de revenda ou reinvestimento.
          </p>
          <p>
            O modelo não calcula o IR final do investidor. Desde 2026, distribuições mensais acima de R$ 50 mil da mesma PJ para a mesma PF residente podem ter IRRF
            de 10% sobre o total. A tributação anual de altas rendas e a agregação de fontes/SCPs exigem análise do beneficiário.
          </p>
        </article>

        <div className={styles.sources}>
          <span className={styles.groupTitle}>Fontes fiscais · consulta em 27/09/2026</span>
          <ul>
            {FONTES.map((f) => (
              <li key={f.t}>
                <a href={f.h} target="_blank" rel="noreferrer">
                  {f.t} ↗
                </a>
              </li>
            ))}
          </ul>
          <p className={styles.footnote}>
            Referência de apresentação no mercado: a{' '}
            <a href="https://www.integramobilidade.com.br/" target="_blank" rel="noreferrer">
              Integra Mobilidade ↗
            </a>{' '}
            apresenta cenários por sessões/dia, tarifa, kWh por sessão e repasses ao ponto. É um modelo diferente (o anfitrião não investe no equipamento); seus
            valores não foram usados como custo ou rentabilidade da iGreen.
          </p>
        </div>
      </div>
    </section>
  )
}
