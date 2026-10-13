/** Modelo novo da proposta gerada (prévia local): #proposta-v2/<número>?cenario=<etapa> */
export const isPropostaV2Hash = (hash: string) => /^#proposta-v2(\/|\?|$)/.test(hash)
