import { describe, it, expect } from 'vitest';
import { Bayarcash } from '../src';
import type { FetchLike } from '../src';

interface Captured {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
}

function sdk(response: Response, captured: Captured[] = []): Bayarcash {
    const fetchImpl: FetchLike = async (input, init) => {
        captured.push({
            url: String(input),
            method: init?.method,
            headers: init?.headers as Record<string, string>,
            body: init?.body,
        });
        return response;
    };
    return new Bayarcash('test-token', { fetch: fetchImpl });
}

const validData = {
    portal_key: 'pk',
    payment_gateway: 2,
    order_no: 'MT-1',
    order_amount: '10.00',
    buyer_name: 'John',
    buyer_email: 'john@example.com',
    merchant_bank_name: 'Maybank',
    merchant_bank_account: '1234567890',
    merchant_bank_account_holder: 'Acme Sdn Bhd',
    bank_transfer_type: 'Internet Banking',
    bank_transfer_notes: 'Payment for MT-1',
};

describe('Manual Bank Transfer', () => {
    it('parses an HTML form response into structured data', () => {
        const client = new Bayarcash('t');
        const html =
            '<form id="redirectForm" action="https://console.bayar.cash/return">' +
            '<input name="order_no" type="hidden" value="MT-1">' +
            '<input name="amount" type="hidden" value="10.00">' +
            '</form>';

        const parsed = client.parseManualBankTransferResponse(html);
        expect(parsed.form_id).toBe('redirectForm');
        expect(parsed.return_url).toBe('https://console.bayar.cash/return');
        expect(parsed.order_no).toBe('MT-1');
        expect(parsed.amount).toBe('10.00');
    });

    it('rejects missing required fields', async () => {
        const client = new Bayarcash('t');
        await expect(client.createManualBankTransfer({ portal_key: 'pk' })).rejects.toThrow(
            /Required field/,
        );
    });

    it('rejects a wrong payment_gateway value', async () => {
        const client = new Bayarcash('t');
        await expect(
            client.createManualBankTransfer({ ...validData, payment_gateway: 1 }),
        ).rejects.toThrow(/payment gateway/i);
    });

    it('posts multipart to the manual-transfer endpoint and returns the parsed form', async () => {
        const captured: Captured[] = [];
        const html = '<form id="f1" action="https://console.bayar.cash/return"></form>';
        const client = sdk(new Response(html, { status: 200 }), captured);

        const result = (await client.createManualBankTransfer(validData)) as Record<string, unknown>;

        expect(captured[0].url).toBe('https://console.bayar.cash/api/manual-bank-transfer');
        expect(captured[0].method).toBe('POST');
        expect((captured[0].headers as Record<string, string>).Authorization).toBe(
            'Bearer test-token',
        );
        expect(captured[0].body).toBeInstanceOf(FormData);
        expect(result.success).toBe(true);
        expect(result.return_url).toBe('https://console.bayar.cash/return');
    });

    it('defaults bank_transfer_date to today', async () => {
        const captured: Captured[] = [];
        const client = sdk(new Response('{"ok":true}', { status: 200 }), captured);
        await client.createManualBankTransfer(validData);

        const form = captured[0].body as FormData;
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        expect(form.get('bank_transfer_date')).toBe(`${yyyy}-${mm}-${dd}`);
    });

    it('updateManualBankTransferStatus posts form-urlencoded and decodes JSON', async () => {
        const captured: Captured[] = [];
        const client = sdk(new Response('{"status":"updated"}', { status: 200 }), captured);

        const result = (await client.updateManualBankTransferStatus('REF1', '3', '10.00')) as Record<
            string,
            unknown
        >;

        expect(captured[0].url).toBe(
            'https://console.bayar.cash/api/manual-bank-transfer/update-status',
        );
        expect((captured[0].headers as Record<string, string>)['Content-Type']).toBe(
            'application/x-www-form-urlencoded',
        );
        expect(String(captured[0].body)).toContain('ref_no=REF1');
        expect(result.status).toBe('updated');
    });

    it('sandbox uses the sandbox manual-transfer base url', async () => {
        const captured: Captured[] = [];
        const client = sdk(new Response('{"ok":true}', { status: 200 }), captured).useSandbox();
        await client.updateManualBankTransferStatus('REF1', '3', '10.00');
        expect(captured[0].url).toBe(
            'https://console.bayarcash-sandbox.com/api/manual-bank-transfer/update-status',
        );
    });
});
