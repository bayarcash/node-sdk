import type { Bayarcash } from './Bayarcash';

/**
 * Convert a snake_case (or space-separated) key to camelCase, mirroring the PHP
 * SDK's `Resource::camelCase()`.
 */
export function camelCase(key: string): string {
    const parts = key.split('_');
    return parts
        .map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
        .join('')
        .replace(/ /g, '');
}

/**
 * Base resource. Fills the instance with camelCased attributes from the API
 * response and provides `toArray()`. Unknown API fields are accepted and set as
 * dynamic properties.
 */
export class Resource {
    /** Allow dynamic, API-driven properties. */
    [key: string]: unknown;

    constructor(attributes: Record<string, unknown> = {}, bayarcash?: Bayarcash | null) {
        // Keep the SDK reference non-enumerable so it never leaks into toArray().
        Object.defineProperty(this, 'bayarcash', {
            value: bayarcash ?? null,
            enumerable: false,
            writable: true,
            configurable: true,
        });
        this.fill(attributes);
    }

    protected fill(attributes: Record<string, unknown>): void {
        for (const [key, value] of Object.entries(attributes)) {
            this[camelCase(key)] = value;
        }
    }

    /**
     * Get the instance as a plain object, recursively converting nested
     * resources and arrays of resources. Excludes the internal SDK reference.
     */
    toArray(): Record<string, unknown> {
        const out: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(this)) {
            if (key === 'bayarcash') {
                continue;
            }
            if (value instanceof Resource) {
                out[key] = value.toArray();
            } else if (Array.isArray(value)) {
                out[key] = value.map((item) => (item instanceof Resource ? item.toArray() : item));
            } else {
                out[key] = value;
            }
        }
        return out;
    }
}

/**
 * A payment intent (from `createPaymentIntent` / `getPaymentIntent`).
 */
export class PaymentIntentResource extends Resource {
    declare payerName?: string | null;
    declare payerEmail?: string | null;
    declare payerTelephoneNumber?: string | null;
    declare orderNumber?: string | null;
    declare amount?: number | string | null;
    declare url?: string | null;
    declare type?: string | null;
    declare id?: string | null;
    declare status?: string | null;
    declare lastAttempt?: unknown;
    declare paidAt?: string | null;
    declare currency?: string | null;
    declare attempts?: unknown[] | null;
}

/**
 * A transaction (from `getTransaction` and the v3 transaction queries).
 */
export class TransactionResource extends Resource {
    declare id?: string | null;
    declare updatedAt?: string | null;
    declare createdAt?: string | null;
    declare datetime?: string | null;
    declare payerName?: string | null;
    declare payerEmail?: string | null;
    declare payerTelephoneNumber?: string | null;
    declare orderNumber?: string | null;
    declare currency?: string | null;
    declare amount?: number | string | null;
    declare exchangeReferenceNumber?: string | null;
    declare exchangeTransactionId?: string | null;
    declare payerBankName?: string | null;
    declare status?: string | null;
    declare statusDescription?: string | null;
    declare returnUrl?: string | null;
    declare metadata?: Record<string, unknown> | null;
    declare payout?: Record<string, unknown> | null;
    declare paymentGateway?: Record<string, unknown> | null;
    declare portal?: string | null;
    declare merchant?: Record<string, unknown> | null;
    declare mandate?: Record<string, unknown> | null;
}

/**
 * A portal (from `getPortals`).
 */
export class PortalResource extends Resource {
    declare id?: string | null;
    declare createdAt?: string | null;
    declare portalKey?: string | null;
    declare portalName?: string | null;
    declare websiteUrl?: string | null;
    declare transactionNotificationEmail?: string | null;
    declare secondaryTransactionNotificationEmail?: string | null;
    declare customPaymentButtonText?: string | null;
    declare enabledSmsOnSuccessfulTransaction?: number | null;
    declare splitPaymentEnabled?: boolean | null;
    declare splitPaymentMerchants?: unknown[] | null;
    declare paymentChannels?: unknown[] | null;
    declare merchant?: Record<string, unknown> | null;
    declare url?: string | null;
    declare merchantId?: string | null;
}

/**
 * An FPX bank (from `fpxBanksList`).
 */
export class FpxBankResource extends Resource {
    declare bankName?: string | null;
    declare bankDisplayName?: string | null;
    declare bankCode?: string | null;
    declare bankCodeHashed?: string | null;
    declare bankAvailability?: boolean | null;
}

/**
 * An FPX Direct Debit mandate (from `getFpxDirectDebit`).
 */
export class FpxDirectDebitResource extends Resource {
    declare id?: string | null;
    declare updatedAt?: string | null;
    declare mandateReferenceNumber?: string | null;
    declare orderNumber?: string | null;
    declare applicationReason?: string | null;
    declare frequencyMode?: string | null;
    declare frequencyModeLabel?: string | null;
    declare effectiveDate?: string | null;
    declare expiryDate?: string | null;
    declare currency?: string | null;
    declare amount?: number | string | null;
    declare payerName?: string | null;
    declare payerId?: string | null;
    declare payerIdType?: number | null;
    declare payerBankAccountNumber?: string | null;
    declare payerEmail?: string | null;
    declare payerTelephoneNumber?: string | null;
    declare status?: string | null;
    declare statusDescription?: string | null;
    declare returnUrl?: string | null;
    declare metadata?: Record<string, unknown> | null;
    declare portal?: string | null;
    declare merchant?: Record<string, unknown> | null;
}

/**
 * An FPX Direct Debit application result (from enrolment/maintenance/termination).
 */
export class FpxDirectDebitApplicationResource extends Resource {
    declare payerName?: string | null;
    declare payerIdType?: number | null;
    declare payerId?: string | null;
    declare payerEmail?: string | null;
    declare payerTelephoneNumber?: string | null;
    declare orderNumber?: string | null;
    declare amount?: number | string | null;
    declare applicationType?: string | null;
    declare applicationReason?: string | null;
    declare frequencyMode?: string | null;
    declare effectiveDate?: string | null;
    declare expiryDate?: string | null;
    declare url?: string | null;
}
