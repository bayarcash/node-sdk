/**
 * Bayarcash payment gateway SDK for Node.js.
 *
 * An idiomatic TypeScript port of the official Bayarcash PHP SDK, mirroring its
 * public surface and behavior. Supports API v2 (default) and v3.
 */

export { Bayarcash } from './Bayarcash';
export { Bayarcash as default } from './Bayarcash';

// Status enums / helpers
export { Fpx, FpxDirectDebit, Dobw, DuitNow } from './constants';

// Resource classes
export {
    Resource,
    PaymentIntentResource,
    TransactionResource,
    PortalResource,
    FpxBankResource,
    FpxDirectDebitResource,
    FpxDirectDebitApplicationResource,
    camelCase,
} from './resources';

// Error classes
export {
    ValidationError,
    NotFoundError,
    FailedActionError,
    RateLimitExceededError,
    TimeoutError,
} from './exceptions';

// Standalone checksum helpers (tree-shakeable)
export {
    createChecksumValue,
    createPaymentIntentChecksumValue,
    createFpxDirectDebitEnrolmentChecksumValue,
    createFpxDirectDebitMaintenanceChecksumValue,
} from './checksum';

// Standalone callback verifiers (tree-shakeable)
export {
    verifyDirectDebitBankApprovalCallbackData,
    verifyDirectDebitAuthorizationCallbackData,
    verifyDirectDebitTransactionCallbackData,
    verifyTransactionCallbackData,
    verifyReturnUrlCallbackData,
    verifyPreTransactionCallbackData,
} from './callbacks';

// Types
export type {
    ApiVersion,
    BayarcashConfig,
    FetchLike,
    PaymentChannel,
    PaymentIntentData,
    FpxDirectDebitEnrolmentData,
    FpxDirectDebitMaintenanceData,
    ManualBankTransferData,
    TransactionQueryParameters,
    CallbackData,
    PaymentIntent,
    Transaction,
    Portal,
    FpxBank,
    FpxDirectDebitMandate,
    FpxDirectDebitApplication,
} from './types';
