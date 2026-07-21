import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, extname } from 'node:path';

import {
    createChecksumValue,
    createPaymentIntentChecksumValue,
    createFpxDirectDebitEnrolmentChecksumValue,
    createFpxDirectDebitMaintenanceChecksumValue,
} from './checksum';
import {
    verifyDirectDebitBankApprovalCallbackData,
    verifyDirectDebitAuthorizationCallbackData,
    verifyDirectDebitTransactionCallbackData,
    verifyTransactionCallbackData,
    verifyReturnUrlCallbackData,
    verifyPreTransactionCallbackData,
} from './callbacks';
import {
    FailedActionError,
    NotFoundError,
    RateLimitExceededError,
    TimeoutError,
    ValidationError,
} from './exceptions';
import {
    FpxBankResource,
    FpxDirectDebitApplicationResource,
    FpxDirectDebitResource,
    PaymentIntentResource,
    PortalResource,
    Resource,
    TransactionResource,
} from './resources';
import type {
    ApiVersion,
    BayarcashConfig,
    CallbackData,
    FetchLike,
    FpxDirectDebitEnrolmentData,
    FpxDirectDebitMaintenanceData,
    ManualBankTransferData,
    PaymentIntentData,
    TransactionQueryParameters,
} from './types';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

const ALLOWED_TRANSACTION_FILTERS = [
    'order_number',
    'status',
    'payment_channel',
    'exchange_reference_number',
    'payer_email',
] as const;

const FILE_CONTENT_TYPES: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    pdf: 'application/pdf',
};

/**
 * The Bayarcash SDK. An idiomatic TypeScript port of the Bayarcash PHP SDK,
 * mirroring its public surface and behavior. Supports API v2 (default) and v3.
 */
export class Bayarcash {
    /* Payment Channels */
    static readonly FPX = 1;
    static readonly MANUAL_TRANSFER = 2;
    static readonly FPX_DIRECT_DEBIT = 3;
    static readonly FPX_LINE_OF_CREDIT = 4;
    static readonly DUITNOW_DOBW = 5;
    static readonly DUITNOW_QR = 6;
    static readonly SPAYLATER = 7;
    static readonly BOOST_PAYFLEX = 8;
    static readonly QRISOB = 9;
    static readonly QRISWALLET = 10;
    static readonly NETS = 11;
    static readonly CREDIT_CARD = 12;
    static readonly ALIPAY = 13;
    static readonly WECHATPAY = 14;
    static readonly PROMPTPAY = 15;
    static readonly TOUCH_N_GO = 16;
    static readonly BOOST_WALLET = 17;
    static readonly GRABPAY = 18;
    static readonly GRABPL = 19;
    static readonly SHOPEE_PAY = 21;

    /** Request timeout in seconds. */
    public timeout = 30;

    private token: string;
    private sandbox = false;
    private apiVersion: ApiVersion = 'v2';
    private secretKey?: string;
    private fetchImpl: FetchLike;

    /**
     * Create a new Bayarcash instance.
     *
     * @param token  Your Bayarcash API token.
     * @param config Optional configuration (sandbox, apiVersion, timeout, secretKey, fetch).
     */
    constructor(token: string, config: BayarcashConfig = {}) {
        this.token = token;
        this.sandbox = config.sandbox ?? false;
        this.apiVersion = config.apiVersion ?? 'v2';
        this.timeout = config.timeout ?? 30;
        this.secretKey = config.secretKey;
        this.fetchImpl = config.fetch ?? (globalThis.fetch as FetchLike);

        if (typeof this.fetchImpl !== 'function') {
            throw new Error(
                'No fetch implementation available. Use Node 18+ or pass a `fetch` in the config.',
            );
        }
    }

    /* ------------------------------------------------------------------ */
    /* Configuration                                                       */
    /* ------------------------------------------------------------------ */

    /**
     * Set the API token. Optionally inject a custom fetch implementation (useful
     * for testing) — this mirrors the PHP SDK's `setToken($token, $guzzle)`.
     */
    setToken(token: string, fetchImpl?: FetchLike): this {
        this.token = token;
        if (fetchImpl) {
            this.fetchImpl = fetchImpl;
        }
        return this;
    }

    /** Switch to the sandbox environment. */
    useSandbox(fetchImpl?: FetchLike): this {
        this.sandbox = true;
        if (fetchImpl) {
            this.fetchImpl = fetchImpl;
        }
        return this;
    }

    /** Set the request timeout (in seconds). */
    setTimeout(timeout: number): this {
        this.timeout = timeout;
        return this;
    }

    /** Get the request timeout (in seconds). */
    getTimeout(): number {
        return this.timeout;
    }

    /** Set the API version (`'v2'` or `'v3'`). */
    setApiVersion(version: ApiVersion): this {
        this.apiVersion = version;
        return this;
    }

    /** Get the API version currently in use. */
    getApiVersion(): ApiVersion {
        return this.apiVersion;
    }

    /**
     * Get the base URI for the current API version and environment.
     */
    private getBaseUri(): string {
        if (this.apiVersion === 'v3') {
            return this.sandbox
                ? 'https://api.console.bayarcash-sandbox.com/v3/'
                : 'https://api.console.bayar.cash/v3/';
        }

        return this.sandbox
            ? 'https://console.bayarcash-sandbox.com/api/v2/'
            : 'https://console.bayar.cash/api/v2/';
    }

    private resolveSecret(secretKey?: string | null): string {
        return secretKey || this.secretKey || '';
    }

    /* ------------------------------------------------------------------ */
    /* Checksum generation                                                 */
    /* ------------------------------------------------------------------ */

    createChecksumValue(secretKey: string, payload: Record<string, unknown>): string {
        return createChecksumValue(this.resolveSecret(secretKey), payload);
    }

    createPaymentIntentChecksumValue(secretKey: string, data: Record<string, unknown>): string {
        return createPaymentIntentChecksumValue(this.resolveSecret(secretKey), data);
    }

    /** @deprecated Misspelled alias, kept for parity. Use `createPaymentIntentChecksumValue`. */
    createPaymentIntenChecksumValue(secretKey: string, data: Record<string, unknown>): string {
        return this.createPaymentIntentChecksumValue(secretKey, data);
    }

    createFpxDirectDebitEnrolmentChecksumValue(
        secretKey: string,
        data: Record<string, unknown>,
    ): string {
        return createFpxDirectDebitEnrolmentChecksumValue(this.resolveSecret(secretKey), data);
    }

    createFpxDirectDebitMaintenanceChecksumValue(
        secretKey: string,
        data: Record<string, unknown>,
    ): string {
        return createFpxDirectDebitMaintenanceChecksumValue(this.resolveSecret(secretKey), data);
    }

    /* ------------------------------------------------------------------ */
    /* Callback verification                                               */
    /* ------------------------------------------------------------------ */

    verifyDirectDebitBankApprovalCallbackData(
        callbackData: CallbackData,
        secretKey: string,
    ): boolean {
        return verifyDirectDebitBankApprovalCallbackData(callbackData, this.resolveSecret(secretKey));
    }

    verifyDirectDebitAuthorizationCallbackData(
        callbackData: CallbackData,
        secretKey: string,
    ): boolean {
        return verifyDirectDebitAuthorizationCallbackData(
            callbackData,
            this.resolveSecret(secretKey),
        );
    }

    verifyDirectDebitTransactionCallbackData(
        callbackData: CallbackData,
        secretKey: string,
    ): boolean {
        return verifyDirectDebitTransactionCallbackData(callbackData, this.resolveSecret(secretKey));
    }

    verifyTransactionCallbackData(callbackData: CallbackData, secretKey: string): boolean {
        return verifyTransactionCallbackData(callbackData, this.resolveSecret(secretKey));
    }

    verifyReturnUrlCallbackData(callbackData: CallbackData, secretKey: string): boolean {
        return verifyReturnUrlCallbackData(callbackData, this.resolveSecret(secretKey));
    }

    verifyPreTransactionCallbackData(
        callbackData: CallbackData,
        secretKey: string | null | undefined,
    ): boolean {
        return verifyPreTransactionCallbackData(callbackData, this.resolveSecret(secretKey));
    }

    /* ------------------------------------------------------------------ */
    /* HTTP verbs                                                          */
    /* ------------------------------------------------------------------ */

    async get(uri: string): Promise<unknown> {
        return this.request('GET', uri);
    }

    async post(uri: string, payload: Record<string, unknown> = {}): Promise<unknown> {
        return this.request('POST', uri, payload);
    }

    async put(uri: string, payload: Record<string, unknown> = {}): Promise<unknown> {
        return this.request('PUT', uri, payload);
    }

    async delete(uri: string, payload: Record<string, unknown> = {}): Promise<unknown> {
        return this.request('DELETE', uri, payload);
    }

    /* ------------------------------------------------------------------ */
    /* Portals & banks                                                     */
    /* ------------------------------------------------------------------ */

    /** Get the list of FPX banks. */
    async fpxBanksList(): Promise<FpxBankResource[]> {
        const response = await this.get('banks');
        return this.transformCollection(this.asArray(response), FpxBankResource);
    }

    /** Get the list of portals for your account. */
    async getPortals(): Promise<PortalResource[]> {
        const response = await this.get('portals');
        const data =
            response && typeof response === 'object' && !Array.isArray(response) &&
            (response as Record<string, unknown>)['data'] !== undefined
                ? (response as Record<string, unknown>)['data']
                : response;

        return this.transformCollection(this.asArray(data), PortalResource);
    }

    /** Get the payment channels available for a portal, by portal key. */
    async getChannels(portalKey: string): Promise<unknown[]> {
        const portals = await this.getPortals();
        for (const portal of portals) {
            if (portal.portalKey === portalKey) {
                return (portal.paymentChannels as unknown[]) ?? [];
            }
        }
        return [];
    }

    /* ------------------------------------------------------------------ */
    /* Payment intents & transactions                                      */
    /* ------------------------------------------------------------------ */

    /** Create a new payment intent. */
    async createPaymentIntent(data: PaymentIntentData): Promise<PaymentIntentResource> {
        const response = await this.post('payment-intents', data as Record<string, unknown>);
        return new PaymentIntentResource(this.asObject(response), this);
    }

    /** Get a single transaction by id (v2 and v3). */
    async getTransaction(id: string): Promise<TransactionResource> {
        const response = await this.get('transactions/' + id);
        return new TransactionResource(this.asObject(response), this);
    }

    /** Get a payment intent by id (v3 only). */
    async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResource> {
        this.ensureV3('getPaymentIntent');
        const response = await this.get('payment-intents/' + paymentIntentId);
        return new PaymentIntentResource(this.asObject(response), this);
    }

    /** Cancel a payment intent (v3 only). */
    async cancelPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResource> {
        this.ensureV3('cancelPaymentIntent');
        const response = await this.delete('payment-intents/' + paymentIntentId);
        return new PaymentIntentResource(this.asObject(response), this);
    }

    /** Get all transactions with optional filters (v3 only). */
    async getAllTransactions(
        parameters: TransactionQueryParameters = {},
    ): Promise<{ data: TransactionResource[]; meta: Record<string, unknown> }> {
        this.ensureV3('getAllTransactions');

        const queryParams: Record<string, unknown> = {};
        for (const key of ALLOWED_TRANSACTION_FILTERS) {
            if (parameters[key] !== undefined && parameters[key] !== null) {
                queryParams[key] = parameters[key];
            }
        }

        const queryString = this.buildQueryString(queryParams);
        const endpoint = 'transactions' + (queryString ? '?' + queryString : '');
        const response = (await this.get(endpoint)) as Record<string, unknown>;

        return {
            data: this.transformCollection(
                this.asArray(response?.['data'] ?? []),
                TransactionResource,
            ),
            meta: (response?.['meta'] as Record<string, unknown>) ?? {},
        };
    }

    /** Get transactions by order number (v3 only). */
    async getTransactionByOrderNumber(orderNumber: string): Promise<TransactionResource[]> {
        this.ensureV3('getTransactionByOrderNumber');
        const response = (await this.get('transactions?order_number=' + orderNumber)) as Record<
            string,
            unknown
        >;
        return this.transformCollection(this.asArray(response?.['data'] ?? []), TransactionResource);
    }

    /** Get transactions by payer email (v3 only). */
    async getTransactionsByPayerEmail(email: string): Promise<TransactionResource[]> {
        this.ensureV3('getTransactionsByPayerEmail');
        const response = (await this.get(
            'transactions?payer_email=' + encodeURIComponent(email),
        )) as Record<string, unknown>;
        return this.transformCollection(this.asArray(response?.['data'] ?? []), TransactionResource);
    }

    /** Get transactions by status (v3 only). */
    async getTransactionsByStatus(status: string): Promise<TransactionResource[]> {
        this.ensureV3('getTransactionsByStatus');
        const response = (await this.get('transactions?status=' + status)) as Record<
            string,
            unknown
        >;
        return this.transformCollection(this.asArray(response?.['data'] ?? []), TransactionResource);
    }

    /** Get transactions by payment channel (v3 only). */
    async getTransactionsByPaymentChannel(channel: number): Promise<TransactionResource[]> {
        this.ensureV3('getTransactionsByPaymentChannel');
        const response = (await this.get('transactions?payment_channel=' + channel)) as Record<
            string,
            unknown
        >;
        return this.transformCollection(this.asArray(response?.['data'] ?? []), TransactionResource);
    }

    /** Get a single transaction by exchange reference number, or null (v3 only). */
    async getTransactionByReferenceNumber(
        referenceNumber: string,
    ): Promise<TransactionResource | null> {
        this.ensureV3('getTransactionByReferenceNumber');
        const response = (await this.get(
            'transactions?exchange_reference_number=' + encodeURIComponent(referenceNumber),
        )) as Record<string, unknown>;
        const data = this.asArray(response?.['data'] ?? []);
        if (data.length === 0) {
            return null;
        }
        return this.transformCollection(data, TransactionResource)[0] ?? null;
    }

    /* ------------------------------------------------------------------ */
    /* FPX Direct Debit                                                    */
    /* ------------------------------------------------------------------ */

    /** Create an FPX Direct Debit enrolment (mandate). */
    async createFpxDirectDebitEnrollment(
        data: FpxDirectDebitEnrolmentData,
    ): Promise<FpxDirectDebitApplicationResource> {
        const response = await this.post('mandates', data as Record<string, unknown>);
        return new FpxDirectDebitApplicationResource(this.asObject(response), this);
    }

    /** Maintain (update) an existing FPX Direct Debit mandate. */
    async createFpxDirectDebitMaintenance(
        mandateId: string,
        data: FpxDirectDebitMaintenanceData,
    ): Promise<FpxDirectDebitApplicationResource> {
        const response = await this.put('mandates/' + mandateId, data as Record<string, unknown>);
        return new FpxDirectDebitApplicationResource(this.asObject(response), this);
    }

    /** Terminate an existing FPX Direct Debit mandate. */
    async createFpxDirectDebitTermination(
        mandateId: string,
        data: Record<string, unknown> = {},
    ): Promise<FpxDirectDebitApplicationResource> {
        const response = await this.delete('mandates/' + mandateId, data);
        return new FpxDirectDebitApplicationResource(this.asObject(response), this);
    }

    /** Get an FPX Direct Debit transaction by id. */
    async getFpxDirectDebitTransaction(id: string): Promise<TransactionResource> {
        const response = await this.get('mandates/transactions/' + id);
        return new TransactionResource(this.asObject(response), this);
    }

    /** @deprecated Misspelled alias, kept for parity. Use `getFpxDirectDebitTransaction`. */
    async getfpxDirectDebitransaction(id: string): Promise<TransactionResource> {
        return this.getFpxDirectDebitTransaction(id);
    }

    /** Get an FPX Direct Debit mandate by id. */
    async getFpxDirectDebit(id: string): Promise<FpxDirectDebitResource> {
        const response = await this.get('mandates/' + id);
        return new FpxDirectDebitResource(this.asObject(response), this);
    }

    /* ------------------------------------------------------------------ */
    /* Manual Bank Transfer                                                */
    /* ------------------------------------------------------------------ */

    /**
     * Create a manual bank transfer, optionally with a proof-of-payment file.
     *
     * @param data          Payment and customer details.
     * @param allowRedirect Whether to auto-follow HTTP redirects.
     */
    async createManualBankTransfer(
        data: ManualBankTransferData,
        allowRedirect = false,
    ): Promise<unknown> {
        this.validateManualTransferData(data);

        const payload: ManualBankTransferData = { ...data };
        payload.bank_transfer_date = payload.bank_transfer_date ?? this.today();

        const form = new FormData();
        for (const [key, value] of Object.entries(payload)) {
            if (key === 'proof_of_payment') {
                continue;
            }
            if (value === null || value === undefined) {
                continue;
            }
            form.append(key, String(value));
        }

        if (payload.proof_of_payment && existsSync(payload.proof_of_payment)) {
            const buffer = await readFile(payload.proof_of_payment);
            const blob = new Blob([buffer], {
                type: this.getFileContentType(payload.proof_of_payment),
            });
            form.append('proof_of_payment', blob, basename(payload.proof_of_payment));
        }

        const response = await this.doFetch(this.getManualTransferBaseUrl() + '/manual-bank-transfer', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                Authorization: 'Bearer ' + this.token,
            },
            body: form,
            redirect: allowRedirect ? 'follow' : 'manual',
        });

        const body = await response.text();
        return this.processManualTransferResponse(body, response.status, allowRedirect);
    }

    /**
     * Update the status of an existing manual bank transfer.
     */
    async updateManualBankTransferStatus(
        refNo: string,
        status: string,
        amount: string,
    ): Promise<unknown> {
        const params = new URLSearchParams({ ref_no: refNo, status, amount });

        const response = await this.doFetch(
            this.getManualTransferBaseUrl() + '/manual-bank-transfer/update-status',
            {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    Authorization: 'Bearer ' + this.token,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params,
            },
        );

        const body = await response.text();
        return this.handleManualApiResponse(body, response.status);
    }

    /**
     * Extract structured data (form id, return url, hidden inputs) from an HTML
     * form response.
     */
    parseManualBankTransferResponse(htmlResponse: string): Record<string, string | undefined> {
        const data: Record<string, string | undefined> = {};

        const formIdMatch = /id="([^"]+)"/.exec(htmlResponse);
        if (formIdMatch) {
            data.form_id = formIdMatch[1];
        }

        const actionMatch = /action="([^"]+)"/.exec(htmlResponse);
        if (actionMatch) {
            data.return_url = actionMatch[1];
        }

        const inputRegex = /<input name="([^"]+)" type="hidden" value="([^"]*)">/g;
        let match: RegExpExecArray | null;
        while ((match = inputRegex.exec(htmlResponse)) !== null) {
            data[match[1]] = match[2];
        }

        return data;
    }

    private getManualTransferBaseUrl(): string {
        return this.sandbox
            ? 'https://console.bayarcash-sandbox.com/api'
            : 'https://console.bayar.cash/api';
    }

    private validateManualTransferData(data: ManualBankTransferData): void {
        const requiredFields = [
            'portal_key',
            'buyer_name',
            'buyer_email',
            'order_amount',
            'order_no',
            'payment_gateway',
            'merchant_bank_name',
            'merchant_bank_account',
            'merchant_bank_account_holder',
            'bank_transfer_type',
            'bank_transfer_notes',
        ];

        for (const field of requiredFields) {
            if (data[field] === undefined || data[field] === null) {
                throw new Error(`Required field '${field}' is missing`);
            }
        }

        // eslint-disable-next-line eqeqeq
        if (data.payment_gateway === undefined || data.payment_gateway != 2) {
            throw new Error('Invalid payment gateway. Value must be 2 for manual bank transfers.');
        }

        if (data.proof_of_payment && !existsSync(data.proof_of_payment)) {
            throw new Error('Proof of payment file does not exist');
        }
    }

    private processManualTransferResponse(
        response: string,
        httpCode: number,
        allowRedirect: boolean,
    ): unknown {
        if (httpCode >= 200 && httpCode < 300) {
            if (response.includes('<form')) {
                const parsedData = this.parseManualBankTransferResponse(response);
                return {
                    success: true,
                    html_form: response,
                    form_data: parsedData,
                    return_url: parsedData.return_url ?? null,
                };
            }

            const decoded = this.tryJsonParse(response);
            if (decoded !== undefined && decoded !== null && decoded !== false) {
                return decoded;
            }
            return response;
        }

        if (httpCode >= 300 && httpCode < 400 && !allowRedirect) {
            return { redirect_url: response };
        }

        return this.handleManualApiError(response, httpCode);
    }

    private handleManualApiResponse(response: string, httpCode: number): unknown {
        if (httpCode >= 200 && httpCode < 300) {
            const decoded = this.tryJsonParse(response);
            return decoded !== undefined && decoded !== null ? decoded : response;
        }
        return this.handleManualApiError(response, httpCode);
    }

    private handleManualApiError(response: string, httpCode: number): never {
        const decoded = this.tryJsonParse(response);
        if (decoded && typeof decoded === 'object' && 'message' in decoded) {
            throw new Error(String((decoded as Record<string, unknown>).message));
        }
        throw new Error(`API Error (HTTP ${httpCode}): ${response.slice(0, 200)}`);
    }

    private getFileContentType(filePath: string): string {
        const extension = extname(filePath).slice(1).toLowerCase();
        return FILE_CONTENT_TYPES[extension] ?? 'application/octet-stream';
    }

    /* ------------------------------------------------------------------ */
    /* Retry helper                                                        */
    /* ------------------------------------------------------------------ */

    /**
     * Retry a callback until it returns a truthy value or the timeout elapses.
     * Throws {@link TimeoutError} on timeout.
     */
    async retry<T>(
        timeout: number,
        callback: () => T | Promise<T>,
        sleepSeconds = 5,
    ): Promise<T> {
        const start = Date.now();

        for (;;) {
            const output = await callback();
            if (output) {
                return output;
            }

            if ((Date.now() - start) / 1000 < timeout) {
                await this.sleep(sleepSeconds * 1000);
                continue;
            }

            let out: unknown = output;
            if (out === null || out === undefined || out === false) {
                out = [];
            }
            throw new TimeoutError(Array.isArray(out) ? out : [out]);
        }
    }

    /* ------------------------------------------------------------------ */
    /* Internals                                                           */
    /* ------------------------------------------------------------------ */

    private ensureV3(method: string): void {
        if (this.apiVersion !== 'v3') {
            throw new Error(`The ${method} method is only available for API version v3.`);
        }
    }

    /** Transform a collection of raw records into resource instances. */
    private transformCollection<T extends Resource>(
        collection: unknown[],
        ResourceClass: new (attributes: Record<string, unknown>, bayarcash?: Bayarcash) => T,
    ): T[] {
        return collection.map((item) => new ResourceClass(this.asObject(item), this));
    }

    private asArray(value: unknown): unknown[] {
        return Array.isArray(value) ? value : [];
    }

    private asObject(value: unknown): Record<string, unknown> {
        return value && typeof value === 'object' && !Array.isArray(value)
            ? (value as Record<string, unknown>)
            : {};
    }

    /**
     * Build an `application/x-www-form-urlencoded` query/body string with PHP's
     * `http_build_query` bracket semantics for nested arrays/objects. Null values
     * are skipped; booleans become '1'/'0'.
     */
    private buildQueryString(data: Record<string, unknown>): string {
        const params = new URLSearchParams();
        const append = (key: string, value: unknown): void => {
            if (value === null || value === undefined) {
                return;
            }
            if (Array.isArray(value)) {
                value.forEach((item, index) => append(`${key}[${index}]`, item));
            } else if (typeof value === 'object') {
                for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
                    append(`${key}[${k}]`, v);
                }
            } else if (typeof value === 'boolean') {
                params.append(key, value ? '1' : '0');
            } else {
                params.append(key, String(value));
            }
        };

        for (const [key, value] of Object.entries(data)) {
            append(key, value);
        }
        return params.toString();
    }

    private tryJsonParse(text: string): unknown {
        if (text === '') {
            return undefined;
        }
        try {
            return JSON.parse(text);
        } catch {
            return undefined;
        }
    }

    private today(): string {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Perform a request against the Bayarcash API and decode the response,
     * mirroring the PHP SDK's request handling.
     */
    private async request(
        method: HttpMethod,
        uri: string,
        payload: Record<string, unknown> = {},
    ): Promise<unknown> {
        const headers: Record<string, string> = {
            Authorization: 'Bearer ' + this.token,
            Accept: 'application/json',
        };

        let body: RequestInit['body'];

        if (payload && Object.prototype.hasOwnProperty.call(payload, 'json')) {
            body = JSON.stringify((payload as Record<string, unknown>).json);
            headers['Content-Type'] = 'application/json';
        } else if (payload && Object.keys(payload).length > 0) {
            body = this.buildQueryString(payload);
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }

        const response = await this.doFetch(this.getBaseUri() + uri, { method, headers, body });
        const statusCode = response.status;
        const responseBody = await response.text();

        if (statusCode < 200 || statusCode > 299) {
            return this.handleRequestError(statusCode, responseBody, response.headers);
        }

        return this.decodeBody(responseBody);
    }

    private decodeBody(responseBody: string): unknown {
        const parsed = this.tryJsonParse(responseBody);
        return parsed === undefined || parsed === null ? responseBody : parsed;
    }

    private handleRequestError(status: number, body: string, headers: Headers): never {
        if (status === 422) {
            const decoded = this.tryJsonParse(body);
            throw new ValidationError(
                decoded && typeof decoded === 'object'
                    ? (decoded as Record<string, unknown>)
                    : { message: body },
            );
        }

        if (status === 404) {
            throw new NotFoundError();
        }

        if (status === 400) {
            const decoded = this.tryJsonParse(body);
            let message: unknown = body;
            if (decoded && typeof decoded === 'object') {
                const obj = decoded as Record<string, unknown>;
                message = obj.message ?? obj.error ?? body;
                if (message !== null && typeof message === 'object') {
                    message = JSON.stringify(message);
                }
            }
            throw new FailedActionError(String(message));
        }

        if (status === 429) {
            const reset = headers.get('x-ratelimit-reset');
            throw new RateLimitExceededError(reset !== null ? parseInt(reset, 10) : null);
        }

        throw new Error(body);
    }

    private async doFetch(url: string, init: RequestInit): Promise<Response> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeout * 1000);
        try {
            return await this.fetchImpl(url, { ...init, signal: controller.signal });
        } finally {
            clearTimeout(timer);
        }
    }
}
