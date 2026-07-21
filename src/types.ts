/**
 * Shared type definitions for the Bayarcash SDK.
 */

/** Supported API versions. */
export type ApiVersion = 'v2' | 'v3';

/**
 * A minimal `fetch` signature. Defaults to the global `fetch` (Node 18+) but can
 * be overridden — e.g. to inject a mock implementation in tests.
 */
export type FetchLike = (
    input: string | URL,
    init?: RequestInit,
) => Promise<Response>;

/**
 * Options accepted when constructing a {@link Bayarcash} instance.
 */
export interface BayarcashConfig {
    /** Use the sandbox environment. Defaults to `false` (production). */
    sandbox?: boolean;
    /** API version, `'v2'` (default) or `'v3'`. */
    apiVersion?: ApiVersion;
    /** Request timeout in seconds. Defaults to `30`. */
    timeout?: number;
    /**
     * The API secret key. Optional — checksum/verify methods accept the secret
     * per call; when a per-call secret is omitted or empty this value is used.
     */
    secretKey?: string;
    /** Custom fetch implementation. Defaults to the global `fetch`. */
    fetch?: FetchLike;
}

/**
 * A payment channel id, or an array of ids. See the `Bayarcash` payment-channel
 * constants (e.g. `Bayarcash.FPX`).
 */
export type PaymentChannel = number | string | Array<number | string>;

/** Data used to build a payment intent. Additional fields are passed through. */
export interface PaymentIntentData {
    portal_key?: string;
    payment_channel?: PaymentChannel;
    order_number?: string;
    amount?: string | number;
    payer_name?: string;
    payer_email?: string;
    payer_telephone_number?: string;
    return_url?: string;
    callback_url?: string;
    metadata?: Record<string, unknown>;
    checksum?: string;
    [key: string]: unknown;
}

/** Data used to enrol an FPX Direct Debit mandate. */
export interface FpxDirectDebitEnrolmentData {
    portal_key?: string;
    order_number?: string;
    amount?: string | number;
    payer_name?: string;
    payer_id_type?: number | string;
    payer_id?: string;
    payer_email?: string;
    payer_telephone_number?: string;
    application_reason?: string;
    frequency_mode?: string;
    effective_date?: string;
    expiry_date?: string;
    return_url?: string;
    checksum?: string;
    [key: string]: unknown;
}

/** Data used to maintain (update) an existing FPX Direct Debit mandate. */
export interface FpxDirectDebitMaintenanceData {
    amount?: string | number;
    payer_email?: string;
    payer_telephone_number?: string;
    application_reason?: string;
    frequency_mode?: string;
    checksum?: string;
    [key: string]: unknown;
}

/** Data used to create a manual bank transfer. */
export interface ManualBankTransferData {
    portal_key?: string;
    payment_gateway?: number | string;
    order_no?: string;
    order_amount?: string | number;
    buyer_name?: string;
    buyer_email?: string;
    buyer_tel_no?: string;
    merchant_bank_name?: string;
    merchant_bank_account?: string;
    merchant_bank_account_holder?: string;
    bank_transfer_type?: string;
    bank_transfer_notes?: string;
    bank_transfer_date?: string;
    /** Absolute path to the proof-of-payment file (jpeg/png/gif/pdf). */
    proof_of_payment?: string;
    [key: string]: unknown;
}

/** Filters accepted by `getAllTransactions` (v3 only). */
export interface TransactionQueryParameters {
    order_number?: string;
    status?: string | number;
    payment_channel?: number | string;
    exchange_reference_number?: string;
    payer_email?: string;
    [key: string]: unknown;
}

/** Arbitrary callback payload received from Bayarcash. */
export type CallbackData = Record<string, unknown> & { checksum?: string };

/* -------------------------------------------------------------------------- */
/* Response DTOs                                                              */
/* -------------------------------------------------------------------------- */

/** Shape of a payment intent returned by the API. All fields may be omitted. */
export interface PaymentIntent {
    payerName?: string | null;
    payerEmail?: string | null;
    payerTelephoneNumber?: string | null;
    orderNumber?: string | null;
    amount?: number | string | null;
    url?: string | null;
    type?: string | null;
    id?: string | null;
    status?: string | null;
    lastAttempt?: unknown;
    paidAt?: string | null;
    currency?: string | null;
    attempts?: unknown[] | null;
}

/** Shape of a transaction returned by the API. All fields may be omitted. */
export interface Transaction {
    id?: string | null;
    updatedAt?: string | null;
    createdAt?: string | null;
    datetime?: string | null;
    payerName?: string | null;
    payerEmail?: string | null;
    payerTelephoneNumber?: string | null;
    orderNumber?: string | null;
    currency?: string | null;
    amount?: number | string | null;
    exchangeReferenceNumber?: string | null;
    exchangeTransactionId?: string | null;
    payerBankName?: string | null;
    status?: string | null;
    statusDescription?: string | null;
    returnUrl?: string | null;
    metadata?: Record<string, unknown> | null;
    payout?: Record<string, unknown> | null;
    paymentGateway?: Record<string, unknown> | null;
    portal?: string | null;
    merchant?: Record<string, unknown> | null;
    mandate?: Record<string, unknown> | null;
}

/** Shape of a portal returned by the API. All fields may be omitted. */
export interface Portal {
    id?: string | null;
    createdAt?: string | null;
    portalKey?: string | null;
    portalName?: string | null;
    websiteUrl?: string | null;
    transactionNotificationEmail?: string | null;
    secondaryTransactionNotificationEmail?: string | null;
    customPaymentButtonText?: string | null;
    enabledSmsOnSuccessfulTransaction?: number | null;
    splitPaymentEnabled?: boolean | null;
    splitPaymentMerchants?: unknown[] | null;
    paymentChannels?: unknown[] | null;
    merchant?: Record<string, unknown> | null;
    url?: string | null;
    merchantId?: string | null;
}

/** Shape of an FPX bank returned by the API. All fields may be omitted. */
export interface FpxBank {
    bankName?: string | null;
    bankDisplayName?: string | null;
    bankCode?: string | null;
    bankCodeHashed?: string | null;
    bankAvailability?: boolean | null;
}

/** Shape of an FPX Direct Debit mandate returned by the API. */
export interface FpxDirectDebitMandate {
    id?: string | null;
    updatedAt?: string | null;
    mandateReferenceNumber?: string | null;
    orderNumber?: string | null;
    applicationReason?: string | null;
    frequencyMode?: string | null;
    frequencyModeLabel?: string | null;
    effectiveDate?: string | null;
    expiryDate?: string | null;
    currency?: string | null;
    amount?: number | string | null;
    payerName?: string | null;
    payerId?: string | null;
    payerIdType?: number | null;
    payerBankAccountNumber?: string | null;
    payerEmail?: string | null;
    payerTelephoneNumber?: string | null;
    status?: string | null;
    statusDescription?: string | null;
    returnUrl?: string | null;
    metadata?: Record<string, unknown> | null;
    portal?: string | null;
    merchant?: Record<string, unknown> | null;
}

/** Shape of an FPX Direct Debit application (enrolment/maintenance/termination). */
export interface FpxDirectDebitApplication {
    payerName?: string | null;
    payerIdType?: number | null;
    payerId?: string | null;
    payerEmail?: string | null;
    payerTelephoneNumber?: string | null;
    orderNumber?: string | null;
    amount?: number | string | null;
    applicationType?: string | null;
    applicationReason?: string | null;
    frequencyMode?: string | null;
    effectiveDate?: string | null;
    expiryDate?: string | null;
    url?: string | null;
}
