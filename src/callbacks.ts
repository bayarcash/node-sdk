import { timingSafeEqual } from 'node:crypto';
import { createChecksumValue } from './checksum';
import type { CallbackData } from './types';

/**
 * Constant-time string comparison. Returns false when lengths differ (which
 * `crypto.timingSafeEqual` would otherwise throw on).
 */
function hashEquals(known: string, provided: string): boolean {
    const a = Buffer.from(String(known), 'utf8');
    const b = Buffer.from(String(provided), 'utf8');
    if (a.length !== b.length) {
        return false;
    }
    return timingSafeEqual(a, b);
}

/**
 * Build the checksum payload from the exact field list a verifier signs
 * (missing fields default to null, matching the PHP `?? null`), compute the
 * HMAC, and compare it against the callback's `checksum` in constant time.
 */
function verifyCallback(
    callbackData: CallbackData,
    secretKey: string | null | undefined,
    fields: readonly string[],
): boolean {
    const callbackChecksum = (callbackData?.['checksum'] as string | undefined) ?? '';

    const payload: Record<string, unknown> = {};
    for (const field of fields) {
        payload[field] = callbackData?.[field] ?? null;
    }

    const computed = createChecksumValue(secretKey ?? '', payload);

    return hashEquals(computed, String(callbackChecksum));
}

/** Fields signed by the direct-debit bank-approval callback. */
const DIRECT_DEBIT_BANK_APPROVAL_FIELDS = [
    'record_type',
    'approval_date',
    'approval_status',
    'mandate_id',
    'mandate_reference_number',
    'order_number',
    'payer_bank_code_hashed',
    'payer_bank_code',
    'payer_bank_account_no',
    'application_type',
] as const;

/** Fields signed by the direct-debit authorization callback (includes application_type). */
const DIRECT_DEBIT_AUTHORIZATION_FIELDS = [
    'record_type',
    'transaction_id',
    'mandate_id',
    'application_type',
    'exchange_reference_number',
    'exchange_transaction_id',
    'order_number',
    'currency',
    'amount',
    'payer_name',
    'payer_email',
    'payer_bank_name',
    'status',
    'status_description',
    'datetime',
] as const;

/** Fields signed by the direct-debit transaction callback. */
const DIRECT_DEBIT_TRANSACTION_FIELDS = [
    'record_type',
    'batch_number',
    'mandate_id',
    'mandate_reference_number',
    'transaction_id',
    'datetime',
    'reference_number',
    'amount',
    'status',
    'status_description',
    'cycle',
] as const;

/** Fields signed by the transaction (callback_url) callback. */
const TRANSACTION_FIELDS = [
    'record_type',
    'transaction_id',
    'exchange_reference_number',
    'exchange_transaction_id',
    'order_number',
    'currency',
    'amount',
    'payer_name',
    'payer_email',
    'payer_bank_name',
    'status',
    'status_description',
    'datetime',
] as const;

/** Fields signed by the return-url (payer redirect) callback. */
const RETURN_URL_FIELDS = [
    'transaction_id',
    'exchange_reference_number',
    'exchange_transaction_id',
    'order_number',
    'currency',
    'amount',
    'payer_bank_name',
    'status',
    'status_description',
] as const;

/** Fields signed by the pre-transaction callback. */
const PRE_TRANSACTION_FIELDS = ['record_type', 'exchange_reference_number', 'order_number'] as const;

export function verifyDirectDebitBankApprovalCallbackData(
    callbackData: CallbackData,
    secretKey: string,
): boolean {
    return verifyCallback(callbackData, secretKey, DIRECT_DEBIT_BANK_APPROVAL_FIELDS);
}

export function verifyDirectDebitAuthorizationCallbackData(
    callbackData: CallbackData,
    secretKey: string,
): boolean {
    return verifyCallback(callbackData, secretKey, DIRECT_DEBIT_AUTHORIZATION_FIELDS);
}

export function verifyDirectDebitTransactionCallbackData(
    callbackData: CallbackData,
    secretKey: string,
): boolean {
    return verifyCallback(callbackData, secretKey, DIRECT_DEBIT_TRANSACTION_FIELDS);
}

export function verifyTransactionCallbackData(
    callbackData: CallbackData,
    secretKey: string,
): boolean {
    return verifyCallback(callbackData, secretKey, TRANSACTION_FIELDS);
}

export function verifyReturnUrlCallbackData(
    callbackData: CallbackData,
    secretKey: string,
): boolean {
    return verifyCallback(callbackData, secretKey, RETURN_URL_FIELDS);
}

export function verifyPreTransactionCallbackData(
    callbackData: CallbackData,
    secretKey: string | null | undefined,
): boolean {
    return verifyCallback(callbackData, secretKey, PRE_TRANSACTION_FIELDS);
}
