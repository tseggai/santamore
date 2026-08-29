# EPC069-12 — Quick Response Code: Guidelines to Enable the Data Capture for the Initiation of a SEPA Credit Transfer

> Source: European Payments Council, EPC069-12, **Version 3.1**, issued/effective
> 19 March 2024 (www.epc-cep.eu). Converted to markdown from the text copy the
> team supplied (2026-08-29). The two example QR images from the original are
> not reproduced. This is the reference `lib/epc-qr.ts` is verified against.

## 0 Document information

| Issue | Dated | Reason for revision |
|---|---|---|
| V 1.0 | 2012 | Initial release. |
| V 2.0 | 02/07/2015 | Update in view of EU Regulation 260/2012. |
| V 2.1 | 09/02/2016 | Clarification and update. |
| V 3.0 | 13/09/2022 | Clarification in the introduction in which SCT use cases these guidelines are suitable. |
| V 3.1 | 19/03/2024 | Review by the September 2023 Payment Scheme Management Board meeting |

## 1 Introduction

A two-dimensional code consists of black modules arranged in a square pattern
on a white background. A Quick Response (QR) code is an example of a 2D code.

The purpose of this document is to deal with 2D codes as a means of data
capture enabling payment initiation whereby the code contains the required
data for the originator to initiate a SEPA Credit Transfer (SCT).

These specific guidelines are suitable for SCT use cases whereby the SCT
transaction data stored in the QR code is also shown at the same time in plain
text to the Originator (e.g., on an invoice presented/sent to the Originator).
This allows the Originator to verify whether the SCT transaction data in the
QR code corresponds with the SCT transaction data shown in plain text.

For payment use cases whereby the Beneficiary would only present a QR code to
the Originator at a Point-of-Interaction (e.g., at a payment terminal in a
shop, in the shopping cart purchase webpage of an online merchant), the
Beneficiaries concerned are advised to consult instead the document EPC 024-22
Standardisation of QR-codes for Mobile Initiated SEPA (Instant) Credit
Transfers.

The process starts with the payee printing the 2D code, for example, on the
invoice to be sent. Upon receipt of the invoice, the payer scans the 2D code
with a smartphone or another device via an appropriate feature in his/her
payment/banking application or scanning equipment provided by his/her Payment
Service Provider (PSP). By doing so, the contained payment details are
pre-filled automatically to the proper input elements. The payer validates the
transaction to complete the payment process by the authorisation means of
his/her PSP.

This document is of an informative nature only and describes how the data
capture prior to the initiation of an SCT can be made by means of a 2D code.
Therefore, it is optional for PSPs adhering to the SCT scheme to implement
this feature and offer it to their customers. Corporates or service providers
that are interested in making use of 2D codes for payment processing should
contact their PSP for additional information.

## 2 2D Code Guidelines

### 2.1 Definition

- QR code error level **M** (15% of code words can be restored)
- Maximum QR code **version 13**, equivalent to module size 69 or **331 byte** payload
- Character sets:

| Value | Set | Value | Set |
|---|---|---|---|
| 1 | UTF-8 | 5 | ISO 8859-5 |
| 2 | ISO 8859-1 | 6 | ISO 8859-7 |
| 3 | ISO 8859-2 | 7 | ISO 8859-10 |
| 4 | ISO 8859-4 | 8 | ISO 8859-15 |

### 2.2 Data elements

In payload order:

| O/M | \Or\ | Data type | Max chars | Content | Fixed |
|---|---|---|---|---|---|
| M | | 3..3a | 3 | Service Tag: `BCD` | |
| M | | 3..3an | 3 | Version: V1: `001` · V2: `002` | |
| M | | 1..1an | 1 | Character set (see §2.1) | |
| M | | 3..3an | 3 | Identification code: `SCT` | |
| V1: M · V2: O/M | | 8/11an | 11 | AT-C002 The BIC code of the Beneficiary PSP. **The BIC will continue to be mandatory for SEPA payment transactions involving SCT scheme participants from non-EEA countries.** | X |
| M | | 1..70an | 70 | AT-E001 The name of the Beneficiary | X |
| M | | 1..34an | 34 | AT-C001 The IBAN of the account of the Beneficiary. Only IBAN is allowed. | X |
| O | | 3..3an,1..12n | 12 | AT-T002 Amount of the SEPA Credit Transfer in euro. Amount must be larger than or equal to 0.01, and cannot be larger than 999999999.99 | |
| O | | 1..4an | 4 | AT-T007 Purpose of the SEPA Credit Transfer | X |
| O | \Or | 1..35an | 35 | AT-T009 The Remittance Information (Structured). Creditor Reference (ISO 11649 RF Creditor Reference may be used) | |
| O | Or\ | 1..140an | 140 | AT-T009 The Remittance Information (Unstructured) | |
| O | | 1..70an | 70 | Beneficiary to Originator information | |

- O: Optional; M: Mandatory; O/M: Conditional (see element description).
- \Or\: **only one** of the two remittance elements may be populated.
- X: fixed value, i.e. the originator should not change the element's content
  when initiating the payment.

The total payload is limited to **331 bytes**. Note that the number of
characters may be less than the number of bytes with UTF-8.

The element separator is either a line feed (LF) or a carriage return line
feed (CRLF). **The last populated element is not followed by any character or
element separator.**

### 2.3 Examples

V1 (96-byte UTF-8 payload → QR version 6, module size 41):

```
BCD
001
1
SCT
BHBLDEHHXXX
Franz Mustermänn
DE71110220330123456789
EUR12.3
GDDS
RF18539007547034
```

V2 (103-byte ISO 8859-1 payload → QR version 6, module size 41):

```
BCD
002
2
SCT

François D'Alsace S.A.
FR1420041010050500013M02606
EUR12.3


Client:Marie Louise La Lune
```

## Santamore implementation notes (not part of the EPC text)

Verified against `lib/epc-qr.ts` on 2026-08-29:

- We emit version `002`, charset `1` (UTF-8), error level M, and enforce the
  331-byte cap and the no-trailing-separator rule (trailing empty elements
  are dropped). ✓
- **BIC**: Montenegro is a non-EEA SCT participant, so per §2.2 the BIC is
  *mandatory* for our beneficiary account — `buildEpcQrPayload` requires a
  BIC whenever the IBAN's country is outside the EEA. Set
  `NEXT_PUBLIC_ORG_BIC`.
- **Remittance**: our `SM-MMYY-NNNN` reference goes in the *unstructured*
  element. The structured element is a Creditor Reference where "ISO 11649 RF
  Creditor Reference may be used"; banking apps commonly validate the RF
  format there, so unstructured is the interoperable choice for a non-RF
  reference. Only one of the two may be populated — we populate one. (The
  build brief §8 placed our reference in the structured slot; deviation
  flagged and kept.)
- Amount format `EUR` + up to 12 numeric chars, 0.01 ≤ amount ≤ 999999999.99:
  our cap (€100,000,000.00 = 12 chars) stays inside both limits. ✓
- Still pending: scan test with at least two real EU banking apps
  (docs/PLACEHOLDERS.md).
