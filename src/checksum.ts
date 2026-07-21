import { createHmac } from 'node:crypto';

/**
 * Cast a value to a string the way PHP does inside `implode()`:
 *   - null / undefined -> ''
 *   - true -> '1', false -> ''
 *   - everything else -> String(value)
 */
function phpImplodeCast(value: unknown): string {
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value === 'boolean') {
        return value ? '1' : '';
    }
    return String(value);
}

/**
 * Generic checksum primitive, byte-compatible with the gateway server:
 * sort the payload by KEY ascending, join the VALUES with `|`, then HMAC-SHA256
 * with the secret key (hex output).
 */
export function createChecksumValue(
    secretKey: string,
    payload: Record<string, unknown>,
): string {
    const sortedKeys = Object.keys(payload).sort();
    const payloadString = sortedKeys.map((key) => phpImplodeCast(payload[key])).join('|');

    return createHmac('sha256', secretKey ?? '').update(payloadString, 'utf8').digest('hex');
}

/**
 * Normalise a `payment_channel` value (omitted, single, or an array of ids) to a
 * comma-joined string — the exact representation signed by the server.
 */
function normalisePaymentChannel(paymentChannel: unknown): string {
    if (paymentChannel === undefined || paymentChannel === null) {
        return '';
    }
    const list = Array.isArray(paymentChannel) ? paymentChannel : [paymentChannel];
    return list.map((value) => phpImplodeCast(value)).join(',');
}

/**
 * Payment-intent checksum. Signs `payment_channel` (comma-joined),
 * `order_number`, `amount`, `payer_name`, and `payer_email`.
 */
export function createPaymentIntentChecksumValue(
    secretKey: string,
    data: Record<string, unknown>,
): string {
    const payload = {
        payment_channel: normalisePaymentChannel(data['payment_channel']),
        order_number: data['order_number'],
        amount: data['amount'],
        payer_name: data['payer_name'],
        payer_email: data['payer_email'],
    };

    return createChecksumValue(secretKey, payload);
}

/**
 * FPX Direct Debit enrolment checksum.
 */
export function createFpxDirectDebitEnrolmentChecksumValue(
    secretKey: string,
    data: Record<string, unknown>,
): string {
    const payload = {
        order_number: data['order_number'],
        amount: data['amount'],
        payer_name: data['payer_name'],
        payer_email: data['payer_email'],
        payer_telephone_number: data['payer_telephone_number'],
        payer_id_type: data['payer_id_type'],
        payer_id: data['payer_id'],
        application_reason: data['application_reason'],
        frequency_mode: data['frequency_mode'],
    };

    return createChecksumValue(secretKey, payload);
}

/**
 * FPX Direct Debit maintenance checksum.
 */
export function createFpxDirectDebitMaintenanceChecksumValue(
    secretKey: string,
    data: Record<string, unknown>,
): string {
    const payload = {
        amount: data['amount'],
        payer_email: data['payer_email'],
        payer_telephone_number: data['payer_telephone_number'],
        application_reason: data['application_reason'],
        frequency_mode: data['frequency_mode'],
    };

    return createChecksumValue(secretKey, payload);
}
