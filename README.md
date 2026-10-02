# ⚡ Pix EMV Code Generator — Gerador e Parser de BR Code Pix com CRC16-CCITT

Gerador e validador de cobranças do arranjo de pagamentos brasileiro **Pix (Banco Central do Brasil)**, implementando a codificação e decodificação do padrão **EMVCo TLV (Type-Length-Value)** e o algoritmo de verificação de integridade **CRC16-CCITT (0xFFFF)** executado inteiramente no navegador sem dependência de APIs externas.

---

## 📌 Que Problema Resolve?

Para criar um código "Pix Copia e Cola" ou renderizar um QR Code estático/dinâmico de pagamento, muitos desenvolvedores recorrem a APIs pagas de gateways terceiros ou bibliotecas com dependências pesadas. 

O **Pix EMV Code Generator** demonstra como a especificação oficial do Banco Central do Brasil pode ser implementada de ponta a ponta em TypeScript puro:
1. Montagem do payload EMVCo estruturado em blocos TLV.
2. Formatação das chaves (CPF/CNPJ, Telefone, E-mail, Chave Aleatória EVP) e valores com ponto flutuante seguro.
3. Cálculo do checksum CRC16-CCITT de 16 bits para garantir que qualquer caractere alterado invalide a leitura bancária.
4. Geração instantânea de QR Code vetorial e texto Copia e Cola.

---

## ⚙️ Diferencial Técnico: Estrutura EMVCo & CRC16

### 1. Padrão TLV (Tag-Length-Value)
Cada campo do payload Pix é estruturado no formato:
`[Tag: 2 dígitos][Length: 2 dígitos][Value: N caracteres]`

Exemplo de montagem:
- **Payload Format Indicator (Tag 00):** `000201` (Tag 00, Tam 02, Valor 01)
- **Merchant Account Information (Tag 26):** Sub-tags para domínio do BACEN (`br.gov.bcb.pix`) e chave Pix.
- **Transaction Currency (Tag 53):** `5303986` (Código ISO 4217 para Real brasileiro: 986).
- **CRC16 (Tag 63):** `6304` seguido pelos 4 caracteres hexadecimais do checksum.

### 2. Algoritmo CRC16-CCITT (Polinômio 0x1021)
O cálculo do checksum final utiliza deslocamento de bits (bitwise operations):
- Polinômio padrão: `0x1021` ($x^{16} + x^{12} + x^5 + 1$).
- Valor inicial: `0xFFFF`.
- Cada byte da string (incluindo o prefixo `6304`) passa pela operação XOR com a tabela pré-calculada ou deslocamento bit a bit, gerando o hash hexadecimal final de 4 dígitos.

---

## 🏗️ Stack Tecnológica

- **Core:** TypeScript puro sem dependências externas para parsing e CRC16.
- **Frontend:** React 18, Tailwind CSS, Lucide Icons.
- **Deploy:** Cloudflare Pages (Serverless Edge).

---

## 🚀 Como Executar Localmente

```bash
# 1. Clone o repositório
git clone https://github.com/HenriMafra/pix-emv-code-generator.git
cd pix-emv-code-generator

# 2. Instale as dependências
npm install

# 3. Inicie o servidor de desenvolvimento
npm run dev
```

---

## 📄 Licença

Distribuído sob a licença **MIT**. Desenvolvido por **Henri Mafra**.
