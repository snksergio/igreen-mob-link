/** Modelo novo da proposta gerada (prévia local): #proposta-v2/<número>?cenario=<etapa> */
export const isPropostaV2Hash = (hash: string) => /^#proposta-v2(\/|\?|$)/.test(hash)

/** Versão 2 do modelo novo (visual da proposta final do fluxo): #proposta-v3/<número>?cenario=<etapa> */
export const isPropostaV3Hash = (hash: string) => /^#proposta-v3(\/|\?|$)/.test(hash)
