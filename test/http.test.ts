import { describe, it, expect } from 'vitest';
import {
    Bayarcash,
    ValidationError,
    NotFoundError,
    FailedActionError,
    RateLimitExceededError,
    PaymentIntentResource,
    TransactionResource,
} from '../src';
import type { FetchLike } from '../src';

interface CapturedRequest {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
}

/**
 * Build an SDK whose fetch returns the queued responses in order, capturing each
 * outgoing request for assertions.
 */
function sdkWithResponses(
    responses: Response[],
    captured: CapturedRequest[] = [],
): Bayarcash {
    let i = 0;
    const fetchImpl: FetchLike = async (input, init) => {
        const headers: Record<string, string> = {};
        if (init?.headers) {
            for (const [k, v] of Object.entries(init.headers as Record<string, string>)) {
                headers[k] = v;
            }
        }
        captured.push({
            url: String(input),
            method: init?.method,
            headers,
            body: typeof init?.body === 'string' ? init.body : init?.body?.toString(),
        });
        const res = responses[i] ?? responses[responses.length - 1];
        i += 1;
        return res;
    };
    return new Bayarcash('test-token', { fetch: fetchImpl });
}

const json = (status: number, body: unknown, headers?: Record<string, string>): Response =>
    new Response(typeof body === 'string' ? body : JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...headers },
    });

describe('MakesHttpRequests', () => {
    it('decodes a successful JSON response to an object', async () => {
        const sdk = sdkWithResponses([json(200, { foo: 'bar' })]);
        await expect(sdk.get('anything')).resolves.toEqual({ foo: 'bar' });
    });

    it('422 throws ValidationError carrying the errors', async () => {
        const sdk = sdkWithResponses([
            json(422, { error: { amount: ['The amount field is required.'] } }),
        ]);
        try {
            await sdk.get('anything');
            throw new Error('expected throw');
        } catch (e) {
            expect(e).toBeInstanceOf(ValidationError);
            expect((e as ValidationError).errors).toHaveProperty('error');
        }
    });

    it('404 throws NotFoundError', async () => {
        const sdk = sdkWithResponses([new Response('', { status: 404 })]);
        await expect(sdk.get('anything')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('400 throws FailedActionError with the message key', async () => {
        const sdk = sdkWithResponses([json(400, { message: 'Bad request happened' })]);
        try {
            await sdk.get('anything');
            throw new Error('expected throw');
        } catch (e) {
            expect(e).toBeInstanceOf(FailedActionError);
            expect((e as FailedActionError).message).toBe('Bad request happened');
        }
    });

    it('400 extracts the error key message', async () => {
        const sdk = sdkWithResponses([json(400, { error: 'Something went wrong' })]);
        try {
            await sdk.get('anything');
            throw new Error('expected throw');
        } catch (e) {
            expect(e).toBeInstanceOf(FailedActionError);
            expect((e as FailedActionError).message).toBe('Something went wrong');
        }
    });

    it('400 with a non-JSON body still throws FailedActionError', async () => {
        const sdk = sdkWithResponses([new Response('plain text error', { status: 400 })]);
        await expect(sdk.get('anything')).rejects.toBeInstanceOf(FailedActionError);
    });

    it('429 throws RateLimitExceededError with the reset timestamp', async () => {
        const sdk = sdkWithResponses([
            new Response('', { status: 429, headers: { 'x-ratelimit-reset': '1700000000' } }),
        ]);
        try {
            await sdk.get('anything');
            throw new Error('expected throw');
        } catch (e) {
            expect(e).toBeInstanceOf(RateLimitExceededError);
            expect((e as RateLimitExceededError).rateLimitResetsAt).toBe(1700000000);
        }
    });

    it('defaults to v2 and reflects the setter', () => {
        const sdk = new Bayarcash('test-token');
        expect(sdk.getApiVersion()).toBe('v2');
        sdk.setApiVersion('v3');
        expect(sdk.getApiVersion()).toBe('v3');
    });

    it('a v3-only method throws on v2', async () => {
        const sdk = new Bayarcash('test-token');
        await expect(sdk.getAllTransactions()).rejects.toThrow(/only available for API version v3/);
    });

    it('uses the correct base URI per version and environment', async () => {
        const captured: CapturedRequest[] = [];

        const v2 = sdkWithResponses([json(200, {})], captured);
        await v2.get('banks');
        expect(captured[0].url).toBe('https://console.bayar.cash/api/v2/banks');

        const v2sandbox = new Bayarcash('t', {
            sandbox: true,
            fetch: async (input) => {
                captured.push({ url: String(input) });
                return json(200, {});
            },
        });
        await v2sandbox.get('banks');
        expect(captured[1].url).toBe('https://console.bayarcash-sandbox.com/api/v2/banks');

        const v3 = new Bayarcash('t', {
            apiVersion: 'v3',
            fetch: async (input) => {
                captured.push({ url: String(input) });
                return json(200, {});
            },
        });
        await v3.get('transactions');
        expect(captured[2].url).toBe('https://api.console.bayar.cash/v3/transactions');

        const v3sandbox = new Bayarcash('t', {
            apiVersion: 'v3',
            sandbox: true,
            fetch: async (input) => {
                captured.push({ url: String(input) });
                return json(200, {});
            },
        });
        await v3sandbox.get('transactions');
        expect(captured[3].url).toBe('https://api.console.bayarcash-sandbox.com/v3/transactions');
    });

    it('sends an authorization bearer header and form-encoded POST body', async () => {
        const captured: CapturedRequest[] = [];
        const sdk = sdkWithResponses([json(200, { url: 'https://pay.example/redirect' })], captured);

        const intent = await sdk.createPaymentIntent({
            portal_key: 'pk',
            order_number: 'INV-1',
            amount: '10.00',
            payer_name: 'John',
            payer_email: 'john@example.com',
            payment_channel: 1,
        });

        expect(intent).toBeInstanceOf(PaymentIntentResource);
        expect(intent.url).toBe('https://pay.example/redirect');

        const req = captured[0];
        expect(req.method).toBe('POST');
        expect(req.url).toBe('https://console.bayar.cash/api/v2/payment-intents');
        expect(req.headers?.Authorization).toBe('Bearer test-token');
        expect(req.headers?.['Content-Type']).toBe('application/x-www-form-urlencoded');
        expect(req.body).toContain('order_number=INV-1');
        expect(req.body).toContain('payer_email=john%40example.com');
    });

    it('array payment_channel is serialised with bracket notation', async () => {
        const captured: CapturedRequest[] = [];
        const sdk = sdkWithResponses([json(200, {})], captured);
        await sdk.createPaymentIntent({
            order_number: 'INV-1',
            amount: '10.00',
            payer_name: 'John',
            payer_email: 'a@b.com',
            payment_channel: [1, 2],
        });
        expect(captured[0].body).toContain('payment_channel%5B0%5D=1');
        expect(captured[0].body).toContain('payment_channel%5B1%5D=2');
    });

    it('getAllTransactions returns transformed data and meta (v3)', async () => {
        const sdk = sdkWithResponses([
            json(200, {
                data: [{ id: 'trx_1', order_number: 'INV-1' }],
                meta: { current_page: 1, total: 1 },
            }),
        ]);
        sdk.setApiVersion('v3');

        const result = await sdk.getAllTransactions({ order_number: 'INV-1' });
        expect(result.data).toHaveLength(1);
        expect(result.data[0]).toBeInstanceOf(TransactionResource);
        expect(result.data[0].orderNumber).toBe('INV-1');
        expect(result.meta).toEqual({ current_page: 1, total: 1 });
    });

    it('getTransactionByReferenceNumber returns null when there is no data (v3)', async () => {
        const sdk = sdkWithResponses([json(200, { data: [] })]);
        sdk.setApiVersion('v3');
        await expect(sdk.getTransactionByReferenceNumber('REF404')).resolves.toBeNull();
    });

    it('getPortals unwraps a data envelope and getChannels resolves channels', async () => {
        const sdk = sdkWithResponses([
            json(200, {
                data: [{ portal_key: 'pk1', payment_channels: [{ id: 1 }, { id: 5 }] }],
            }),
            json(200, {
                data: [{ portal_key: 'pk1', payment_channels: [{ id: 1 }, { id: 5 }] }],
            }),
        ]);

        const portals = await sdk.getPortals();
        expect(portals[0].portalKey).toBe('pk1');

        const channels = await sdk.getChannels('pk1');
        expect(channels).toEqual([{ id: 1 }, { id: 5 }]);
    });
});
