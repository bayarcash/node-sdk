import { describe, it, expect } from 'vitest';
import { Bayarcash } from '../src';

const SECRET = 'sk_test_secret';

describe('callback verification', () => {
    const sdk = new Bayarcash('test-token');

    /**
     * Sign exactly the fields a verifier checks, using the SDK's own generic
     * checksum primitive (same sort + '|' + HMAC recipe the server uses).
     */
    const sign = (fields: Record<string, unknown>): string =>
        sdk.createChecksumValue(SECRET, fields);

    it('pre-transaction callback round-trips and rejects tampering', () => {
        const fields = {
            record_type: 'pre_transaction',
            exchange_reference_number: 'REF1',
            order_number: 'ORD1',
        };
        const callback: Record<string, unknown> = { ...fields, checksum: sign(fields) };

        expect(sdk.verifyPreTransactionCallbackData(callback, SECRET)).toBe(true);

        callback.order_number = 'TAMPERED';
        expect(sdk.verifyPreTransactionCallbackData(callback, SECRET)).toBe(false);
    });

    it('transaction callback round-trips and rejects a tampered amount', () => {
        const fields = {
            record_type: 'transaction',
            transaction_id: 'trx_1',
            exchange_reference_number: 'REF1',
            exchange_transaction_id: 'EX1',
            order_number: 'ORD1',
            currency: 'MYR',
            amount: '10.00',
            payer_name: 'John Doe',
            payer_email: 'john@example.com',
            payer_bank_name: 'Test Bank',
            status: '3',
            status_description: 'Approved',
            datetime: '2026-01-01 12:00:00',
        };
        const callback: Record<string, unknown> = { ...fields, checksum: sign(fields) };

        expect(sdk.verifyTransactionCallbackData(callback, SECRET)).toBe(true);

        callback.amount = '99.00';
        expect(sdk.verifyTransactionCallbackData(callback, SECRET)).toBe(false);
    });

    it('return-url (v3) callback round-trips', () => {
        const fields = {
            transaction_id: 'trx_1',
            exchange_reference_number: 'REF1',
            exchange_transaction_id: 'EX1',
            order_number: 'ORD1',
            currency: 'MYR',
            amount: '10.00',
            payer_bank_name: 'Test Bank',
            status: '3',
            status_description: 'Approved',
        };
        const callback = { ...fields, checksum: sign(fields) };

        expect(sdk.verifyReturnUrlCallbackData(callback, SECRET)).toBe(true);
    });

    it('direct-debit bank approval callback round-trips', () => {
        const fields = {
            record_type: 'bank_approval',
            approval_date: '2026-01-01',
            approval_status: 'approved',
            mandate_id: 'mdt_1',
            mandate_reference_number: 'MREF1',
            order_number: 'ORD1',
            payer_bank_code_hashed: 'hashed',
            payer_bank_code: 'ABB0233',
            payer_bank_account_no: '****1234',
            application_type: '01',
        };
        const callback = { ...fields, checksum: sign(fields) };

        expect(sdk.verifyDirectDebitBankApprovalCallbackData(callback, SECRET)).toBe(true);
    });

    it('direct-debit authorization callback includes application_type', () => {
        const fields = {
            record_type: 'authorization',
            transaction_id: 'trx_1',
            mandate_id: 'mdt_1',
            application_type: '01',
            exchange_reference_number: 'REF1',
            exchange_transaction_id: 'EX1',
            order_number: 'ORD1',
            currency: 'MYR',
            amount: '10.00',
            payer_name: 'John Doe',
            payer_email: 'john@example.com',
            payer_bank_name: 'Test Bank',
            status: '3',
            status_description: 'Approved',
            datetime: '2026-01-01 12:00:00',
        };
        const callback: Record<string, unknown> = { ...fields, checksum: sign(fields) };

        expect(sdk.verifyDirectDebitAuthorizationCallbackData(callback, SECRET)).toBe(true);

        // A callback missing application_type must NOT verify against a full-payload signature.
        const withoutAppType = { ...callback };
        delete withoutAppType.application_type;
        expect(sdk.verifyDirectDebitAuthorizationCallbackData(withoutAppType, SECRET)).toBe(false);
    });

    it('direct-debit transaction callback round-trips', () => {
        const fields = {
            record_type: 'dd_transaction',
            batch_number: 'B1',
            mandate_id: 'mdt_1',
            mandate_reference_number: 'MREF1',
            transaction_id: 'trx_1',
            datetime: '2026-01-01 12:00:00',
            reference_number: 'REF1',
            amount: '10.00',
            status: '3',
            status_description: 'Approved',
            cycle: '1',
        };
        const callback = { ...fields, checksum: sign(fields) };

        expect(sdk.verifyDirectDebitTransactionCallbackData(callback, SECRET)).toBe(true);
    });

    it('a missing checksum returns false without throwing', () => {
        expect(
            sdk.verifyPreTransactionCallbackData(
                { record_type: 'pre_transaction', order_number: 'ORD1' },
                SECRET,
            ),
        ).toBe(false);
    });

    it('a wrong secret fails verification', () => {
        const fields = {
            record_type: 'pre_transaction',
            exchange_reference_number: 'REF1',
            order_number: 'ORD1',
        };
        const callback = { ...fields, checksum: sign(fields) };

        expect(sdk.verifyPreTransactionCallbackData(callback, 'wrong_secret')).toBe(false);
    });
});
