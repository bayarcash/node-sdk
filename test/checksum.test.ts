import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { Bayarcash } from '../src';

const SECRET = 'sk_test_secret';

/**
 * Reference recipe from the gateway server: sort by key, join values with '|',
 * then HMAC-SHA256 with the merchant secret. Pins the SDK to that contract.
 */
function expected(fields: Record<string, string>): string {
    const payloadString = Object.keys(fields)
        .sort()
        .map((k) => fields[k])
        .join('|');
    return createHmac('sha256', SECRET).update(payloadString).digest('hex');
}

describe('checksum generation', () => {
    const sdk = new Bayarcash('test-token');

    it('payment intent checksum matches the server recipe (known vector)', () => {
        const data = {
            payment_channel: 5,
            order_number: 'ORD1',
            amount: '10.00',
            payer_name: 'John Doe',
            payer_email: 'john@example.com',
        };

        const want = expected({
            payment_channel: '5',
            order_number: 'ORD1',
            amount: '10.00',
            payer_name: 'John Doe',
            payer_email: 'john@example.com',
        });

        expect(sdk.createPaymentIntentChecksumValue(SECRET, data)).toBe(want);
    });

    it('pins the exact hex digest for a fixed vector', () => {
        // Guards against accidental changes to the recipe (sort + '|' + HMAC-SHA256).
        const data = {
            payment_channel: 5,
            order_number: 'ORD1',
            amount: '10.00',
            payer_name: 'John Doe',
            payer_email: 'john@example.com',
        };
        // amount|order_number|payer_email|payer_name|payment_channel
        const string = '10.00|ORD1|john@example.com|John Doe|5';
        const digest = createHmac('sha256', SECRET).update(string).digest('hex');

        expect(sdk.createPaymentIntentChecksumValue(SECRET, data)).toBe(digest);
    });

    it('treats an int and a single-element array payment_channel as equivalent', () => {
        const base = {
            order_number: 'ORD1',
            amount: '10.00',
            payer_name: 'John',
            payer_email: 'a@b.com',
        };

        const asInt = sdk.createPaymentIntentChecksumValue(SECRET, { ...base, payment_channel: 5 });
        const asArray = sdk.createPaymentIntentChecksumValue(SECRET, {
            ...base,
            payment_channel: [5],
        });

        expect(asInt).toBe(asArray);
    });

    it('comma-joins multiple payment channels', () => {
        const data = {
            order_number: 'ORD1',
            amount: '10.00',
            payer_name: 'John',
            payer_email: 'a@b.com',
            payment_channel: [1, 2],
        };

        const want = expected({
            payment_channel: '1,2',
            order_number: 'ORD1',
            amount: '10.00',
            payer_name: 'John',
            payer_email: 'a@b.com',
        });

        expect(sdk.createPaymentIntentChecksumValue(SECRET, data)).toBe(want);
    });

    it('omitted payment_channel signs an empty string', () => {
        const data = {
            order_number: 'ORD1',
            amount: '10.00',
            payer_name: 'John',
            payer_email: 'a@b.com',
        };

        const want = expected({
            payment_channel: '',
            order_number: 'ORD1',
            amount: '10.00',
            payer_name: 'John',
            payer_email: 'a@b.com',
        });

        expect(sdk.createPaymentIntentChecksumValue(SECRET, data)).toBe(want);
    });

    it('misspelled alias matches the correct method', () => {
        const data = {
            order_number: 'ORD1',
            amount: '10.00',
            payer_name: 'John',
            payer_email: 'a@b.com',
            payment_channel: 5,
        };

        expect(sdk.createPaymentIntenChecksumValue(SECRET, data)).toBe(
            sdk.createPaymentIntentChecksumValue(SECRET, data),
        );
    });

    it('direct debit enrolment checksum matches the server recipe', () => {
        const data = {
            order_number: 'ORD1',
            amount: '10.00',
            payer_name: 'John Doe',
            payer_email: 'john@example.com',
            payer_telephone_number: '0123456789',
            payer_id_type: 1,
            payer_id: '900101011234',
            application_reason: 'Monthly subscription',
            frequency_mode: 'MT',
        };

        const want = expected({
            order_number: 'ORD1',
            amount: '10.00',
            payer_name: 'John Doe',
            payer_email: 'john@example.com',
            payer_telephone_number: '0123456789',
            payer_id_type: '1',
            payer_id: '900101011234',
            application_reason: 'Monthly subscription',
            frequency_mode: 'MT',
        });

        expect(sdk.createFpxDirectDebitEnrolmentChecksumValue(SECRET, data)).toBe(want);
    });

    it('direct debit maintenance checksum matches the server recipe', () => {
        const data = {
            amount: '10.00',
            payer_email: 'john@example.com',
            payer_telephone_number: '0123456789',
            application_reason: 'Update amount',
            frequency_mode: 'MT',
        };

        const want = expected({
            amount: '10.00',
            payer_email: 'john@example.com',
            payer_telephone_number: '0123456789',
            application_reason: 'Update amount',
            frequency_mode: 'MT',
        });

        expect(sdk.createFpxDirectDebitMaintenanceChecksumValue(SECRET, data)).toBe(want);
    });
});
