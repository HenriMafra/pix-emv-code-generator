import { describe, it, expect } from "vitest";
import {
  crc16,
  crc16Hex,
  tlv,
  gerarBRCode,
  decodificarBRCode,
  resumoDecodificado,
  cpfValido,
  cnpjValido,
  normalizarTexto,
  normalizarChave,
  normalizarCobranca,
  formatarValor,
  sanitizarCobranca,
  IDS,
  SUB_IDS,
} from "../engine";
import type { Cobranca } from "../../types";

describe("CRC16 / CCITT-FALSE", () => {
  it("vetor canônico: crc16(\"123456789\") === 0x29B1", () => {
    expect(crc16("123456789")).toBe(0x29b1);
    expect(crc16Hex("123456789")).toBe("29B1");
  });

  it("formata sempre em 4 hex maiúsculos com zero-pad", () => {
    // valor pequeno para forçar padding à esquerda
    expect(crc16Hex("6304").length).toBe(4);
    expect(crc16Hex("6304")).toBe(crc16Hex("6304").toUpperCase());
  });
});

describe("TLV — montagem de campos", () => {
  it("len é zero-pad de 2 dígitos (valor de 5 chars → \"05\")", () => {
    // "BRASIL" tem 6 → "06"; usamos 5 chars explicitamente:
    expect(tlv("59", "FULAN")).toBe("5905FULAN");
    expect(tlv("00", "01")).toBe("000201");
    // valor com exatamente 5 chars → comprimento "05"
    expect(tlv("54", "10.50").slice(2, 4)).toBe("05");
  });
});

describe("gerarBRCode + decodificarBRCode (round-trip)", () => {
  const payload = gerarBRCode({
    chave: "teste@exemplo.com",
    nome: "FULANO DE TAL",
    cidade: "BRASILIA",
    valor: 10.5,
  });

  it("decodifica com CRC válido (crcOk === true)", () => {
    const d = decodificarBRCode(payload);
    expect(d.crcOk).toBe(true);
    expect(d.crcLido).toBe(d.crcEsperado);
  });

  it("preserva o valor formatado 54 = \"10.50\"", () => {
    const d = decodificarBRCode(payload);
    const valor = d.nodes.find((n) => n.id === IDS.AMOUNT);
    expect(valor?.valor).toBe("10.50");
  });

  it("subcampo 26-01 contém a chave informada", () => {
    const d = decodificarBRCode(payload);
    const conta = d.nodes.find((n) => n.id === IDS.MERCHANT_ACCOUNT);
    const chave = conta?.filhos?.find((c) => c.id === SUB_IDS.CHAVE);
    expect(chave?.valor).toBe("teste@exemplo.com");
    // e o GUI obrigatório está presente
    const gui = conta?.filhos?.find((c) => c.id === SUB_IDS.GUI);
    expect(gui?.valor).toBe("br.gov.bcb.pix");
  });

  it("o resumo extrai chave, nome, cidade e valor", () => {
    const r = resumoDecodificado(decodificarBRCode(payload).nodes);
    expect(r.chave).toBe("teste@exemplo.com");
    expect(r.nome).toBe("FULANO DE TAL");
    expect(r.cidade).toBe("BRASILIA");
    expect(r.valor).toBe("10.50");
  });

  it("alterar 1 caractere quebra o CRC (crcOk === false)", () => {
    // troca o primeiro dígito do CRC final por um diferente
    const ultimo = payload.slice(-1);
    const trocado = ultimo === "0" ? "1" : "0";
    const adulterado = payload.slice(0, -1) + trocado;
    expect(decodificarBRCode(adulterado).crcOk).toBe(false);
  });
});

describe("Validação de chave Pix", () => {
  it("CPF \"52998224725\" é válido e \"11111111111\" é inválido", () => {
    expect(cpfValido("52998224725")).toBe(true);
    expect(cpfValido("529.982.247-25")).toBe(true); // aceita máscara
    expect(cpfValido("11111111111")).toBe(false);
    expect(cpfValido("12345678900")).toBe(false);
  });

  it("CNPJ valida pelos dígitos verificadores reais", () => {
    expect(cnpjValido("11222333000181")).toBe(true);
    expect(cnpjValido("11111111111111")).toBe(false);
  });

  it("telefone vira +55DDDXXXXXXXXX", () => {
    expect(normalizarChave("telefone", "(61) 99999-8888").valor).toBe("+5561999998888");
    // já com 55 na frente: não duplica o prefixo
    expect(normalizarChave("telefone", "55 61 99999-8888").valor).toBe("+5561999998888");
    // fixo (10 dígitos) também é aceito
    expect(normalizarChave("telefone", "(11) 3030-4040").valor).toBe("+551130304040");
  });

  it("e-mail é normalizado para minúsculas", () => {
    const r = normalizarChave("email", "Fulano@Exemplo.COM");
    expect(r.ok).toBe(true);
    expect(r.valor).toBe("fulano@exemplo.com");
  });

  it("chave aleatória exige UUID", () => {
    expect(normalizarChave("aleatoria", "123e4567-e89b-12d3-a456-426614174000").ok).toBe(true);
    expect(normalizarChave("aleatoria", "nao-eh-uuid").ok).toBe(false);
  });
});

describe("Normalização de texto", () => {
  it("\"João\" é normalizado para \"Joao\" com aviso de acento", () => {
    const r = normalizarTexto("João", 25, { rotulo: "Nome" });
    expect(r.valor).toBe("Joao");
    expect(r.aviso).toContain("acentos");
  });

  it("cidade vira MAIÚSCULA, sem acento e truncada em 15", () => {
    const r = normalizarTexto("São José dos Campos", 15, { upper: true });
    expect(r.valor).toBe("SAO JOSE DOS CA"); // 15 chars
    expect(r.valor.length).toBeLessThanOrEqual(15);
  });

  it("nome obrigatório vazio gera erro", () => {
    const r = normalizarTexto("   ", 25, { obrigatorio: true, rotulo: "Nome" });
    expect(r.ok).toBe(false);
    expect(r.erro).toBeTruthy();
  });
});

describe("formatarValor", () => {
  it("aceita number e strings com vírgula/ponto", () => {
    expect(formatarValor(10.5)).toBe("10.50");
    expect(formatarValor("10,50")).toBe("10.50");
    expect(formatarValor("1.234,56")).toBe("1234.56");
    expect(formatarValor("")).toBe("");
    expect(formatarValor(0)).toBe("");
  });

  it("trata ponto como separador decimal en-US (\"10.5\" → 10.50, não 105)", () => {
    // regressão: antes o ponto era removido como milhar e \"10.5\" virava 105.00
    expect(formatarValor("10.5")).toBe("10.50");
    expect(formatarValor("10.50")).toBe("10.50");
    expect(formatarValor("1234.56")).toBe("1234.56");
  });

  it("rejeita valores não finitos e negativos", () => {
    expect(formatarValor(NaN)).toBe("");
    expect(formatarValor(Infinity)).toBe("");
    expect(formatarValor(-5)).toBe("");
    expect(formatarValor("abc")).toBe("");
  });

  it("limita valores extremos para nunca gerar notação científica", () => {
    const out = formatarValor(1e21);
    expect(out).not.toContain("e");
    expect(out).not.toContain("+");
    expect(Number(out)).toBeLessThanOrEqual(9_999_999.99);
  });
});

describe("tlv — guarda de comprimento (EMV usa 2 dígitos)", () => {
  it("trunca valores acima de 99 chars para não corromper o campo de tamanho", () => {
    const campo = tlv("59", "X".repeat(150));
    // len declarado deve continuar com 2 dígitos
    expect(campo.slice(0, 2)).toBe("59");
    expect(campo.slice(2, 4)).toBe("99");
    expect(campo.length).toBe(2 + 2 + 99);
  });
});

describe("decodificarBRCode — robustez contra payload malformado", () => {
  it("não lança exceção e retorna crcOk=false em lixo aleatório", () => {
    const d = decodificarBRCode("isto-nao-e-um-pix-!!!");
    expect(d.crcOk).toBe(false);
    expect(typeof d.erro).toBe("string");
  });

  it("string vazia retorna estrutura tratada (sem throw)", () => {
    const d = decodificarBRCode("");
    expect(d.crcOk).toBe(false);
    expect(d.nodes).toEqual([]);
    expect(d.erro).toBeTruthy();
  });

  it("payload sem campo 63 é sinalizado com erro amigável", () => {
    // campos válidos, mas sem o CRC final
    const semCrc = tlv(IDS.PAYLOAD_FORMAT, "01") + tlv(IDS.MERCHANT_NAME, "FULANO");
    const d = decodificarBRCode(semCrc);
    expect(d.crcOk).toBe(false);
    expect(d.erro).toContain("CRC");
  });
});

describe("sanitizarCobranca — saneamento de dados externos", () => {
  it("aceita objeto válido coagindo campos ausentes para string", () => {
    const c = sanitizarCobranca({ tipoChave: "email", chave: "a@b.com" });
    expect(c).not.toBeNull();
    expect(c?.tipoChave).toBe("email");
    expect(c?.nome).toBe("");
  });

  it("rejeita tipoChave inválido, não-objetos e campos de tipo errado", () => {
    expect(sanitizarCobranca(null)).toBeNull();
    expect(sanitizarCobranca("string")).toBeNull();
    expect(sanitizarCobranca({ tipoChave: "xpto" })).toBeNull();
    expect(sanitizarCobranca({ chave: "x" })).toBeNull(); // sem tipoChave
    // campos com tipo errado não quebram: viram "" (string vazia)
    const c = sanitizarCobranca({ tipoChave: "cpf", nome: 123, chave: { x: 1 } });
    expect(c?.nome).toBe("");
    expect(c?.chave).toBe("");
  });
});

describe("normalizarCobranca — integração", () => {
  it("monta uma cobrança válida ponta a ponta", () => {
    const c: Cobranca = {
      tipoChave: "cpf",
      chave: "529.982.247-25",
      nome: "José da Silva",
      cidade: "São Paulo",
      valor: "99,90",
      txid: "PEDIDO#123!",
      descricao: "Conta do mês",
    };
    const n = normalizarCobranca(c);
    expect(n.valido).toBe(true);
    expect(n.chave.valor).toBe("52998224725");
    expect(n.nome.valor).toBe("Jose da Silva");
    expect(n.cidade.valor).toBe("SAO PAULO");
    expect(n.valor.valor).toBe("99.90");
    expect(n.txid.valor).toBe("PEDIDO123"); // só a-zA-Z0-9
  });
});
