import { describe, it, expect } from 'vitest';
import {
    PaymentIntentResource,
    PortalResource,
    TransactionResource,
    camelCase,
} from '../src';

describe('Resource', () => {
    it('fills snake_case API keys as camelCase properties', () => {
        const resource = new TransactionResource({
            order_number: 'ORDER123',
            payer_email: 'customer@example.com',
        });

        expect(resource.orderNumber).toBe('ORDER123');
        expect(resource.payerEmail).toBe('customer@example.com');
    });

    it('omitted fields are undefined rather than throwing', () => {
        const resource = new PaymentIntentResource({ order_number: 'ORDER123' });

        expect(resource.orderNumber).toBe('ORDER123');
        expect(resource.url).toBeUndefined();
        expect(resource.amount).toBeUndefined();
        expect(resource.status).toBeUndefined();
    });

    it('accepts unknown API fields as dynamic properties', () => {
        const resource = new PortalResource({
            portal_key: 'abc',
            brand_new_field_from_api: 'value',
        });

        expect(resource.portalKey).toBe('abc');
        expect(resource.brandNewFieldFromApi).toBe('value');
    });

    it('toArray excludes the SDK instance and returns attributes', () => {
        const resource = new TransactionResource({ id: 'trx_1', amount: 10.5 });

        const array = resource.toArray();

        expect(array).not.toHaveProperty('bayarcash');
        expect(array.id).toBe('trx_1');
        expect(array.amount).toBe(10.5);
    });

    it('toArray recurses into nested resources and arrays of resources', () => {
        const parent = new TransactionResource({ id: 'trx_1' });
        parent.child = new TransactionResource({ id: 'child_1' });
        parent.items = [new TransactionResource({ id: 'item_1' })];

        const array = parent.toArray();

        expect(array.child).toEqual({ id: 'child_1' });
        expect(array.items).toEqual([{ id: 'item_1' }]);
    });

    it('camelCase mirrors the PHP conversion', () => {
        expect(camelCase('payer_bank_name')).toBe('payerBankName');
        expect(camelCase('order_number')).toBe('orderNumber');
        expect(camelCase('id')).toBe('id');
    });
});
