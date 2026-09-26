import type { Rendition } from './lib/adaptiveVideo'

/** Caminhos dos assets exportados do Figma (public/assets). */
const icon = (name: string) => `/assets/icons/${name}.svg`
const img = (name: string) => `/assets/img/${name}`

export const ICONS = {
  addressPin: icon('icon-address-pin'),
  alert: icon('icon-alert-white'),
  arrowRight: icon('icon-arrow-right'),
  building: icon('icon-building'),
  calendar: icon('icon-calendar-subtle'),
  check: icon('icon-check-primary'),
  checkInput: icon('icon-check-input'),
  checkSmall: icon('icon-check-white-sm'),
  checkBold: icon('icon-check-white'),
  chevronDown: icon('icon-chevron-down'),
  circleArrowRight: icon('icon-circle-arrow-right'),
  close: icon('icon-close'),
  discountBadge: icon('icon-discount-badge'),
  dollarCircle: icon('icon-dollar-circle'),
  dollarWhite: icon('icon-dollar-white'),
  dot: icon('dot-primary'),
  dotSeparator: icon('dot-separator'),
  edit: icon('icon-edit'),
  fileDollar: icon('icon-file-dollar-white'),
  fuel: icon('icon-fuel'),
  fuelWhite: icon('icon-fuel-white'),
  fuelWhiteAlt: icon('icon-fuel-white-2'),
  handMoney: icon('icon-hand-money'),
  help: icon('icon-help-white'),
  id: icon('icon-id'),
  idWhite: icon('icon-id-white'),
  instagram: icon('icon-instagram'),
  light: icon('icon-fill-light'),
  lightning: icon('icon-lightning'),
  link: icon('icon-link'),
  mail: icon('icon-mail-subtle'),
  mailShare: icon('icon-mail'),
  moneyBag: icon('icon-money-bag'),
  phone: icon('icon-phone-subtle'),
  pin: icon('icon-pin-primary'),
  plusCircle: icon('icon-plus-circle'),
  search: icon('icon-search-white'),
  user: icon('icon-user-subtle'),
  userGreen: icon('icon-user-green'),
  userWhite: icon('icon-user-white'),
  whatsapp: icon('icon-whatsapp'),
  sliderHandle: icon('slider-handle'),
  mapPinShape: icon('map-pin-shape'),
  mapPinCircle: icon('map-pin-circle'),
  mapPinShadow: icon('map-pin-shadow'),
  energyCircle: icon('icon-fill-energy-circle'),
  eletric: icon('icon-fill-eletric'),
  energyLink: icon('icon-fill-energy-link'),
  lineEdit: icon('icon-line-edit'),
  add: icon('icon-add'),
  logoIsotipo: icon('logo-isotipo'),
  logoEnergy: icon('logo-igreen-energy'),
  /** alternar tema (Lucide, licença ISC) */
  sun: icon('icon-sun'),
  moon: icon('icon-moon'),
} as const

const video = (name: string) => `/assets/video/${name}`

/**
 * Escadas de qualidade dos vídeos (mesmo clipe em larguras diferentes), usadas por lib/adaptiveVideo.
 * `bytes` é o tamanho aproximado do arquivo — regenerar com `npm run compress:video` e atualizar aqui.
 */
export const VIDEOS = {
  /** Eletroposto acendendo (desktop) — termina no mesmo quadro de hero-bg.webp */
  hero: [
    { src: video('bg-car-igreen.mp4'), width: 1762, bytes: 515_000 },
    { src: video('bg-car-igreen-1280.mp4'), width: 1280, bytes: 266_000 },
    { src: video('bg-car-igreen-960.mp4'), width: 960, bytes: 126_000 },
  ],
  /** Cidade brotando + carro + carregador (Magnific/Seedance, 48 fps) — termina no mesmo quadro de proposta-hero.webp */
  proposta: [
    { src: video('proposta-car.mp4'), width: 1920, bytes: 639_000 },
    { src: video('proposta-car-1280.mp4'), width: 1280, bytes: 239_000 },
    { src: video('proposta-car-960.mp4'), width: 960, bytes: 107_000 },
    { src: video('proposta-car-720.mp4'), width: 720, bytes: 53_000 },
  ],
  /** Mesma cena à noite (tema escuro) — termina no mesmo quadro de proposta-hero-dark.webp */
  propostaDark: [
    { src: video('proposta-car-dark.mp4'), width: 1920, bytes: 563_000 },
    { src: video('proposta-car-dark-1280.mp4'), width: 1280, bytes: 240_000 },
    { src: video('proposta-car-dark-960.mp4'), width: 960, bytes: 117_000 },
    { src: video('proposta-car-dark-720.mp4'), width: 720, bytes: 60_000 },
  ],
} as const satisfies Record<string, readonly Rendition[]>

export const IMAGES = {
  heroDesktop: img('hero-bg.webp'),
  /** versões leves, usadas quando a conexão está ruim demais para o vídeo */
  heroDesktopLite: img('hero-bg-lite.webp'),
  heroMobile: img('hero-mobile.webp'),
  battery: img('battery-3d.webp'),
  greenCard: img('card-green-bg.webp'),
  logoMob: img('logo-mob-mask.png'),
  mapBase: img('map-base.webp'),
  mapStreets: img('map-streets.webp'),
  propostaHero: img('proposta-hero.webp'),
  propostaHeroLite: img('proposta-hero-lite.webp'),
  propostaHeroDark: img('proposta-hero-dark.webp'),
  propostaHeroDarkLite: img('proposta-hero-dark-lite.webp'),
} as const
