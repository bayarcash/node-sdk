# Bayarcash Payment Gateway SDK for Node.js

[![npm version](https://img.shields.io/npm/v/bayarcash.svg)](https://www.npmjs.com/package/bayarcash)
[![npm downloads](https://img.shields.io/npm/dm/bayarcash.svg)](https://www.npmjs.com/package/bayarcash)
[![node](https://img.shields.io/node/v/bayarcash.svg)](https://www.npmjs.com/package/bayarcash)
[![license](https://img.shields.io/npm/l/bayarcash.svg)](LICENSE)

The [Bayarcash](https://bayarcash.com/) SDK provides an expressive interface for
interacting with Bayarcash's Payment Gateway API from Node.js. It is a
feature-parity, idiomatic TypeScript port of the official
[Bayarcash PHP SDK](https://packagist.org/packages/bayarcash/php-sdk) and
supports both API **v2** (default) and **v3**, with additional query features
available in v3.

- Written in TypeScript, ships with type declarations.
- Framework-agnostic. Works with CommonJS (`require`) and ESM (`import`).
- Zero runtime dependencies — uses the built-in `fetch` (Node 18+) and `crypto`.
- Checksums and callback verification are **byte-compatible** with the gateway
  (verified against the PHP SDK).

## Table of Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Quick Start: Accept a Payment](#quick-start-accept-a-payment)
- [Payment Channels](#payment-channels)
- [Creating a Payment Intent](#creating-a-payment-intent)
- [Handling Callbacks](#handling-callbacks)
- [Payment & Transaction Status](#payment--transaction-status)
- [Transactions](#transactions)
- [FPX Direct Debit](#fpx-direct-debit)
- [Manual Bank Transfer](#manual-bank-transfer)
- [Portals & FPX Banks](#portals--fpx-banks)
- [Error Handling](#error-handling)
- [Response Objects](#response-objects)
- [Security Recommendations](#security-recommendations)
- [Support](#support)

## Requirements

- Node.js **>= 18** (for the built-in `fetch`)

## Installation

```bash
npm install bayarcash
```

You will need two credentials from your Bayarcash console:

- **API token** — used to authenticate SDK requests.
- **API secret key** — used to generate request checksums and verify callbacks.

## Getting Started

```ts
import { Bayarcash } from 'bayarcash';

const bayarcash = new Bayarcash('YOUR_API_TOKEN');
bayarcash.useSandbox(); // remove this line in production
```

CommonJS:

```js
const { Bayarcash } = require('bayarcash');

const bayarcash = new Bayarcash('YOUR_API_TOKEN');
```

## Configuration

Configure via the constructor:

```ts
const bayarcash = new Bayarcash('YOUR_API_TOKEN', {
    sandbox: true,        // use the sandbox environment (default false)
    apiVersion: 'v3',     // 'v2' (default) or 'v3'
    timeout: 60,          // request timeout in seconds (default 30)
    secretKey: 'YOUR_API_SECRET_KEY', // optional; per-call secret still takes precedence
});
```

…or with fluent setters (call them **before** making requests):

```ts
bayarcash
    .useSandbox()          // switch to the sandbox environment
    .setApiVersion('v3')   // 'v2' (default) or 'v3'
    .setTimeout(60);       // request timeout in seconds

bayarcash.getApiVersion(); // read back the current version
```

> Omit `useSandbox()` in production to hit the live gateway.

**Base URIs**

| Version | Environment | Base URI |
|---|---|---|
| v2 | production | `https://console.bayar.cash/api/v2/` |
| v2 | sandbox | `https://console.bayarcash-sandbox.com/api/v2/` |
| v3 | production | `https://api.console.bayar.cash/v3/` |
| v3 | sandbox | `https://api.console.bayarcash-sandbox.com/v3/` |

## Quick Start: Accept a Payment

A complete FPX payment flow, from creating the payment to redirecting the payer:

```ts
import { Bayarcash } from 'bayarcash';

const bayarcash = new Bayarcash('YOUR_API_TOKEN');
bayarcash.useSandbox();

const apiSecretKey = 'YOUR_API_SECRET_KEY';

// 1. Build the payment request
const data = {
    portal_key: 'your_portal_key',
    payment_channel: Bayarcash.FPX,
    order_number: 'INV-1001',
    amount: '10.00',
    payer_name: 'Ahmad bin Abdullah',
    payer_email: 'ahmad@example.com',
    payer_telephone_number: '0123456789',
    return_url: 'https://your-site.com/payment/return',
    callback_url: 'https://your-site.com/payment/callback',
};

// 2. Sign it (recommended)
data.checksum = bayarcash.createPaymentIntentChecksumValue(apiSecretKey, data);

// 3. Create the payment intent and redirect the payer to Bayarcash
const paymentIntent = await bayarcash.createPaymentIntent(data);

response.redirect(paymentIntent.url); // e.g. Express
```

After payment, Bayarcash calls your `callback_url` (server-to-server) and
redirects the payer to your `return_url`. Verify both — see
[Handling Callbacks](#handling-callbacks).

## Payment Channels

Pass one of these constants (or an array of them) as `payment_channel`:

```ts
Bayarcash.FPX                 // 1  — FPX Online Banking
Bayarcash.MANUAL_TRANSFER     // 2  — Manual Bank Transfer
Bayarcash.FPX_DIRECT_DEBIT    // 3  — FPX Direct Debit
Bayarcash.FPX_LINE_OF_CREDIT  // 4  — FPX Line of Credit
Bayarcash.DUITNOW_DOBW        // 5  — DuitNow Online Banking
Bayarcash.DUITNOW_QR          // 6  — DuitNow QR
Bayarcash.SPAYLATER           // 7  — ShopeePayLater
Bayarcash.BOOST_PAYFLEX       // 8  — Boost PayFlex
Bayarcash.QRISOB              // 9  — QRIS Online Banking
Bayarcash.QRISWALLET          // 10 — QRIS Wallet
Bayarcash.NETS                // 11 — NETS
Bayarcash.CREDIT_CARD         // 12 — Credit Card
Bayarcash.ALIPAY              // 13 — Alipay
Bayarcash.WECHATPAY           // 14 — WeChat Pay
Bayarcash.PROMPTPAY           // 15 — PromptPay
Bayarcash.TOUCH_N_GO          // 16 — Touch 'n Go eWallet
Bayarcash.BOOST_WALLET        // 17 — Boost Wallet
Bayarcash.GRABPAY             // 18 — GrabPay
Bayarcash.GRABPL              // 19 — Grab PayLater
Bayarcash.SHOPEE_PAY          // 21 — ShopeePay
```

## Creating a Payment Intent

```ts
const paymentIntent = await bayarcash.createPaymentIntent(data);
```

**Request fields:**

| Field | Required | Description |
|---|---|---|
| `portal_key` | ✅ | Your portal key. |
| `order_number` | ✅ | Your reference. Max 30 chars. |
| `amount` | ✅ | String with up to 2 decimals, e.g. `'10.00'`. |
| `payer_name` | ✅ | Max 150 chars. |
| `payer_email` | ✅ | Valid email, max 250 chars. |
| `payment_channel` | ➖ | A `Bayarcash.*` channel id, or an array of ids. |
| `payer_telephone_number` | ➖ | Required for e-wallet / DuitNow channels. |
| `return_url` | ➖ | Where the payer's browser is redirected after payment. |
| `callback_url` | ➖ | Server-to-server notification URL. |
| `metadata` | ➖ | Any extra data you want echoed back. |
| `checksum` | ➖ | Recommended. See below. |

### Checksum

The checksum protects the request from tampering. Generate it **after** building
the request and append it as `checksum`:

```ts
data.checksum = bayarcash.createPaymentIntentChecksumValue(apiSecretKey, data);
```

The checksum is computed from `payment_channel`, `order_number`, `amount`,
`payer_name`, and `payer_email` (sort by key, join values with `|`,
HMAC-SHA256 with your secret key).

## Handling Callbacks

Bayarcash sends **two kinds** of notification. Always verify them with your API
secret key before trusting the data.

| Notification | How it arrives | Read it from |
|---|---|---|
| `callback_url` (transaction) | Server-to-server **POST** (form-encoded) | request body |
| `return_url` (payer redirect) | Browser redirect — **POST** on v2, **GET** query on v3 | request body / query |

```ts
const callbackData = request.body; // the parsed form body (or query for v3 return_url)

// Transaction callback (sent to your callback_url)
if (bayarcash.verifyTransactionCallbackData(callbackData, apiSecretKey)) {
    // Data is authentic — safe to process.
}

// Payer redirect (sent to your return_url)
if (bayarcash.verifyReturnUrlCallbackData(callbackData, apiSecretKey)) {
    // ...
}

// Pre-transaction callback (sent before the transaction record)
if (bayarcash.verifyPreTransactionCallbackData(callbackData, apiSecretKey)) {
    // ...
}
```

Each verifier returns `true` only when the checksum matches (using a
constant-time comparison). See [FPX Direct Debit](#fpx-direct-debit) for
mandate-specific callback verifiers.

## Payment & Transaction Status

Transaction status is an integer code. Use the `Fpx` helper instead of
hardcoding numbers:

```ts
import { Fpx } from 'bayarcash';

Fpx.STATUS_NEW;        // 0
Fpx.STATUS_PENDING;    // 1
Fpx.STATUS_FAILED;     // 2
Fpx.STATUS_SUCCESS;    // 3
Fpx.STATUS_CANCELLED;  // 4

if (Number(callbackData.status) === Fpx.STATUS_SUCCESS) {
    // Payment successful
}

Fpx.getStatusText(Number(callbackData.status)); // e.g. "Successful"
```

DuitNow Online Banking/Wallet has an equivalent helper: `DuitNow.Dobw`.

## Transactions

```ts
// Get a single transaction (v2 and v3)
const transaction = await bayarcash.getTransaction('transaction_id');
```

The following query helpers require **API v3** and throw on v2:

```ts
bayarcash.setApiVersion('v3');

const result = await bayarcash.getAllTransactions({
    order_number: 'INV-1001',
    status: '3',
    payment_channel: Bayarcash.FPX,
    exchange_reference_number: 'REF123',
    payer_email: 'ahmad@example.com',
});
// result.data => TransactionResource[], result.meta => pagination meta

const byOrder   = await bayarcash.getTransactionByOrderNumber('INV-1001');
const byEmail   = await bayarcash.getTransactionsByPayerEmail('ahmad@example.com');
const byStatus  = await bayarcash.getTransactionsByStatus('3');
const byChannel = await bayarcash.getTransactionsByPaymentChannel(Bayarcash.FPX);
const byRef     = await bayarcash.getTransactionByReferenceNumber('REF123'); // single or null

// Get a payment intent by id (v3 only)
const intent = await bayarcash.getPaymentIntent('payment_intent_id');

// Cancel a payment intent (v3 only)
await bayarcash.cancelPaymentIntent('payment_intent_id');
```

## FPX Direct Debit

FPX Direct Debit lets you set up a recurring mandate and later maintain or
terminate it. Constants live on the `FpxDirectDebit` class:

```ts
import { FpxDirectDebit } from 'bayarcash';

// Payer ID type
FpxDirectDebit.NRIC;                  // 1 (New IC)
FpxDirectDebit.OLD_IC;                // 2
FpxDirectDebit.PASSPORT;              // 3
FpxDirectDebit.BUSINESS_REGISTRATION; // 4
FpxDirectDebit.OTHERS;                // 5

// Frequency mode
FpxDirectDebit.MODE_DAILY;   // 'DL'
FpxDirectDebit.MODE_WEEKLY;  // 'WK'
FpxDirectDebit.MODE_MONTHLY; // 'MT'
FpxDirectDebit.MODE_YEARLY;  // 'YR'
```

### 1. Enrolment

```ts
const data = {
    portal_key: 'your_portal_key',
    order_number: 'DD-1001',
    amount: '10.00',
    payer_name: 'Ahmad bin Abdullah',
    payer_id_type: FpxDirectDebit.NRIC,
    payer_id: '900101011234',
    payer_email: 'ahmad@example.com',
    payer_telephone_number: '0123456789',
    application_reason: 'Monthly subscription',
    frequency_mode: FpxDirectDebit.MODE_MONTHLY,
    effective_date: '2026-08-01', // optional, YYYY-MM-DD
    expiry_date: '2027-08-01',    // optional, YYYY-MM-DD
    return_url: 'https://your-site.com/mandate/return',
};

data.checksum = bayarcash.createFpxDirectDebitEnrolmentChecksumValue(apiSecretKey, data);

const mandate = await bayarcash.createFpxDirectDebitEnrollment(data);
response.redirect(mandate.url); // redirect payer to the enrolment page
```

### 2. Maintenance

```ts
const data = {
    amount: '15.00',
    payer_email: 'ahmad@example.com',
    payer_telephone_number: '0123456789',
    application_reason: 'Update amount',
    frequency_mode: FpxDirectDebit.MODE_MONTHLY,
};

data.checksum = bayarcash.createFpxDirectDebitMaintenanceChecksumValue(apiSecretKey, data);

const mandate = await bayarcash.createFpxDirectDebitMaintenance(mandateId, data);
response.redirect(mandate.url);
```

### 3. Termination

```ts
const mandate = await bayarcash.createFpxDirectDebitTermination(mandateId, {
    application_reason: 'Customer cancelled',
});
response.redirect(mandate.url);
```

### Retrieving mandates & verifying mandate callbacks

```ts
const mandate     = await bayarcash.getFpxDirectDebit(mandateId);
const transaction = await bayarcash.getFpxDirectDebitTransaction(transactionId);

// Mandate callback verifiers
bayarcash.verifyDirectDebitBankApprovalCallbackData(callbackData, apiSecretKey);
bayarcash.verifyDirectDebitAuthorizationCallbackData(callbackData, apiSecretKey);
bayarcash.verifyDirectDebitTransactionCallbackData(callbackData, apiSecretKey);
```

## Manual Bank Transfer

Submit a manual (offline) bank transfer with proof of payment:

```ts
const result = await bayarcash.createManualBankTransfer({
    portal_key: 'your_portal_key',
    payment_gateway: Bayarcash.MANUAL_TRANSFER, // must be 2
    order_no: 'MT-1001',
    buyer_name: 'Ahmad bin Abdullah',
    buyer_email: 'ahmad@example.com',
    buyer_tel_no: '0123456789', // optional
    order_amount: '10.00',
    merchant_bank_name: 'Maybank',
    merchant_bank_account: '1234567890',
    merchant_bank_account_holder: 'Your Company Sdn Bhd',
    bank_transfer_type: 'Internet Banking', // or 'Cash Deposit Machine (CDM)'
    bank_transfer_notes: 'Payment for order MT-1001',
    bank_transfer_date: '2026-07-22', // optional, defaults to today
    proof_of_payment: '/path/to/receipt.jpg', // jpeg/png/gif/pdf
});
```

Update the status of an existing transfer:

```ts
import { Fpx } from 'bayarcash';

await bayarcash.updateManualBankTransferStatus(
    'ref_no_here',
    String(Fpx.STATUS_SUCCESS),
    '10.00',
);
```

## Portals & FPX Banks

```ts
const portals  = await bayarcash.getPortals();       // all portals for your account
const channels = await bayarcash.getChannels('your_portal_key'); // channels for a portal
const banks    = await bayarcash.fpxBanksList();      // FPX banks (bank selector)
```

## Error Handling

Failed API calls throw typed errors. Catch them to handle failures gracefully:

```ts
import {
    ValidationError,
    FailedActionError,
    NotFoundError,
    RateLimitExceededError,
} from 'bayarcash';

try {
    const paymentIntent = await bayarcash.createPaymentIntent(data);
} catch (e) {
    if (e instanceof ValidationError) {
        // 422 — invalid request data
        const errors = e.errors;
    } else if (e instanceof NotFoundError) {
        // 404 — resource not found
    } else if (e instanceof RateLimitExceededError) {
        // 429 — too many requests
        const resetAt = e.rateLimitResetsAt; // unix timestamp or null
    } else if (e instanceof FailedActionError) {
        // 400 — request failed
        const message = e.message;
    } else {
        throw e;
    }
}
```

| Error | HTTP | Meaning |
|---|---|---|
| `ValidationError` | 422 | Invalid data. `.errors` has the details. |
| `FailedActionError` | 400 | Request failed. `.message` has the reason. |
| `NotFoundError` | 404 | Resource not found. |
| `RateLimitExceededError` | 429 | Rate limited. `.rateLimitResetsAt` holds the reset time. |
| `TimeoutError` | — | Thrown by the optional `retry()` helper after a timeout. |

## Response Objects

API methods resolve to typed resource objects with camelCase properties.

**`PaymentIntentResource`** (from `createPaymentIntent` / `getPaymentIntent`)

```ts
paymentIntent.url;          // checkout URL to redirect the payer to
paymentIntent.id;
paymentIntent.status;
paymentIntent.amount;
paymentIntent.orderNumber;
paymentIntent.payerName;
paymentIntent.payerEmail;
```

**`TransactionResource`** (from `getTransaction` / transaction queries)

```ts
transaction.id;
transaction.status;                   // status code — see Fpx constants
transaction.statusDescription;
transaction.amount;
transaction.orderNumber;
transaction.exchangeReferenceNumber;
transaction.payerName;
transaction.payerEmail;
```

Any missing field is `undefined`. Convert a resource (including nested
resources) to a plain object:

```ts
transaction.toArray();
```

## Security Recommendations

1. Always send a `checksum` with payment and mandate requests.
2. Verify **every** callback with the provided verification methods before acting on it.
3. Store and check transaction ids to prevent duplicate processing.
4. Use HTTPS for your `return_url` and `callback_url`.
5. Keep your API token and secret key out of source control.

## API Documentation

For full API details, see the
[Official Bayarcash API Documentation](https://api.webimpian.support/bayarcash).

## Support

For support questions, contact Bayarcash support or open an issue in this
repository.

## License

Open-sourced software licensed under the [MIT license](LICENSE).
