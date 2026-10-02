# Pix EMV Code Generator: Native Bitwise CRC16-CCITT and EMVCo TLV Serialization

**Author:** Henri Mafra  
**License:** MIT License  
**Domain:** Financial Cryptography, Bitwise Algorithms, Mobile Payment Standards  

---

## 1. Overview

Pix EMV Code Generator is a client-side serialization and verification engine for Brazilian Instant Payments (Pix - Central Bank of Brazil). It implements strict **EMVCo Tag-Length-Value (TLV)** encoding and bitwise **CRC16-CCITT** integrity checksum calculation natively in the browser, eliminating reliance on third-party payment gateway APIs.

---

## 2. EMVCo Specification and Data Representation

The payload conforms to the EMVCo Merchant-Presented QR Code Standard. Every field is serialized as an atomic TLV block:

$$\text{Block} = [\text{Tag}]_{2\text{ chars}} \parallel [\text{Length}]_{2\text{ chars}} \parallel [\text{Value}]_{L\text{ chars}}$$

### Essential Payload Schema:
- **Tag 00 (Payload Format Indicator):** Constant value `01` (`000201`).
- **Tag 26 (Merchant Account Information):** Nested TLV specifying reverse domain `br.gov.bcb.pix` (Tag 00) and the recipient key (Tag 01).
- **Tag 52 (Merchant Category Code):** Constant `0000` (`52040000`).
- **Tag 53 (Transaction Currency):** ISO 4217 numeric code `986` for BRL (`5303986`).
- **Tag 54 (Transaction Amount):** Fixed-point decimal string representation.
- **Tag 58 (Country Code):** ISO 3166-1 alpha-2 code `BR` (`5802BR`).
- **Tag 63 (CRC16 Checksum):** Tag `63`, length `04`, followed by 4 hexadecimal characters.

---

## 3. Mathematical Formulation of CRC16-CCITT

The integrity verification uses the CCITT cyclic redundancy check polynomial:

$$G(x) = x^{16} + x^{12} + x^5 + 1 \quad (\text{Hexadecimal: } 0x1021)$$

### Algorithm Specifications:
- **Initial Value:** `0xFFFF`
- **Input Reflection:** None
- **Output Reflection:** None
- **Final XOR:** `0x0000`

For each input byte $B_k$, the 16-bit register $R$ updates via bitwise operations:

$$R \leftarrow (R \ll 8) \oplus \text{Table}\left[(R \gg 8) \oplus B_k\right]$$

The resulting 16-bit unsigned integer is converted into a 4-character uppercase hexadecimal string, appended directly to the `6304` descriptor.

---

## 4. Architecture and Verification

- **Encoding Engine:** Zero-dependency TypeScript module operating with bit-level operations.
- **Rendering Pipeline:** Vector SVG QR Code generation with error correction level M (15% redundancy).
- **Validation Suite:** Automated unit tests cross-verifying generated strings against BACEN reference test vectors.

---

## 5. Setup and Execution

```bash
# 1. Clone repository
git clone https://github.com/HenriMafra/pix-emv-code-generator.git
cd pix-emv-code-generator

# 2. Install dependencies
npm install

# 3. Start local development environment
npm run dev
```

---

## 6. References

- EMVCo. (2017). *EMV Integrated Circuit Card Specifications for Payment Systems: QR Code Specification for Payment Systems (CPM/MPM)*.
- Central Bank of Brazil (BACEN). (2020). *Manual de Padrões para Iniciação do Pix*.

---

## 7. License

Licensed under the MIT License. Copyright (c) Henri Mafra.
