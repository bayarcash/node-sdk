/**
 * Status enums / helpers mirroring the PHP SDK's `Fpx`, `FpxDirectDebit` and
 * `DuitNow\Dobw` classes.
 */

/**
 * FPX payment status codes and their human-readable labels.
 */
export class Fpx {
    static readonly STATUS_NEW = 0;
    static readonly STATUS_PENDING = 1;
    static readonly STATUS_FAILED = 2;
    static readonly STATUS_SUCCESS = 3;
    static readonly STATUS_CANCELLED = 4;

    private static getStatusLabels(): Record<number, string> {
        return {
            [Fpx.STATUS_NEW]: 'New',
            [Fpx.STATUS_PENDING]: 'Pending',
            [Fpx.STATUS_CANCELLED]: 'Cancelled',
            [Fpx.STATUS_SUCCESS]: 'Successful',
            [Fpx.STATUS_FAILED]: 'Failed',
        };
    }

    static getStatusText(statusCode: number): string {
        return Fpx.getStatusLabels()[statusCode] ?? 'UNKNOWN STATUS';
    }
}

/**
 * FPX Direct Debit constants: application types, payer id types, frequency
 * modes and status codes, plus text helpers.
 */
export class FpxDirectDebit {
    /* Application Type */
    static readonly ENROLMENT = '01';
    static readonly MAINTENANCE = '02';
    static readonly TERMINATION = '03';

    /* Buyer ID Type */
    static readonly NRIC = 1;
    static readonly OLD_IC = 2;
    static readonly PASSPORT = 3;
    static readonly BUSINESS_REGISTRATION = 4;
    static readonly OTHERS = 5;

    /* Frequency Mode */
    static readonly MODE_DAILY = 'DL';
    static readonly MODE_WEEKLY = 'WK';
    static readonly MODE_MONTHLY = 'MT';
    static readonly MODE_YEARLY = 'YR';

    /* Status Code */
    static readonly STATUS_NEW = 0;
    static readonly STATUS_WAITING_APPROVAL = 1;
    static readonly STATUS_FAILED_BANK_VERIFICATION = 2;
    static readonly STATUS_ACTIVE = 3;
    static readonly STATUS_TERMINATED = 4;
    static readonly STATUS_APPROVED = 5;
    static readonly STATUS_REJECTED = 6;
    static readonly STATUS_CANCELLED = 7;
    static readonly STATUS_ERROR = 8;

    private static getStatusLabels(): Record<number, string> {
        return {
            [FpxDirectDebit.STATUS_NEW]: 'New',
            [FpxDirectDebit.STATUS_WAITING_APPROVAL]: 'Waiting Approval',
            [FpxDirectDebit.STATUS_FAILED_BANK_VERIFICATION]: 'Bank Verification Failed',
            [FpxDirectDebit.STATUS_APPROVED]: 'Approved',
            [FpxDirectDebit.STATUS_REJECTED]: 'Rejected',
            [FpxDirectDebit.STATUS_CANCELLED]: 'Cancelled',
            [FpxDirectDebit.STATUS_ERROR]: 'Error',
            [FpxDirectDebit.STATUS_ACTIVE]: 'Active',
            [FpxDirectDebit.STATUS_TERMINATED]: 'Terminated',
        };
    }

    static getStatusText(statusCode: number): string {
        return FpxDirectDebit.getStatusLabels()[statusCode] ?? 'UNKNOWN STATUS';
    }

    static getApplicationTypeText(applicationType: string): string | undefined {
        switch (applicationType) {
            case FpxDirectDebit.ENROLMENT:
                return 'Enrollment';
            case FpxDirectDebit.MAINTENANCE:
                return 'Maintenance';
            case FpxDirectDebit.TERMINATION:
                return 'Termination';
            default:
                return undefined;
        }
    }

    static getFrequencyModeText(frequencyModeCode: string): string | undefined {
        switch (frequencyModeCode) {
            case FpxDirectDebit.MODE_DAILY:
                return 'Daily';
            case FpxDirectDebit.MODE_WEEKLY:
                return 'Weekly';
            case FpxDirectDebit.MODE_MONTHLY:
                return 'Monthly';
            case FpxDirectDebit.MODE_YEARLY:
                return 'Yearly';
            default:
                return undefined;
        }
    }
}

/**
 * DuitNow Online Banking/Wallet (DOBW) constants and status helpers.
 */
export class Dobw {
    static readonly CASA = '01';
    static readonly CREDIT_CARD = '02';
    static readonly EWALLET = '03';

    /* Status Code */
    static readonly STATUS_NEW = 0;
    static readonly STATUS_PENDING = 1;
    static readonly STATUS_FAILED = 2;
    static readonly STATUS_SUCCESS = 3;
    static readonly STATUS_CANCELLED = 4;

    private static getStatusLabels(): Record<number, string> {
        return {
            [Dobw.STATUS_NEW]: 'New',
            [Dobw.STATUS_PENDING]: 'Pending',
            [Dobw.STATUS_CANCELLED]: 'Cancelled',
            [Dobw.STATUS_SUCCESS]: 'Successful',
            [Dobw.STATUS_FAILED]: 'Failed',
        };
    }

    static getStatusText(statusCode: number): string {
        return Dobw.getStatusLabels()[statusCode] ?? 'UNKNOWN STATUS';
    }
}

/**
 * `DuitNow` namespace object mirroring `Webimpian\BayarcashSdk\DuitNow\Dobw`.
 * Access as `DuitNow.Dobw`.
 */
export const DuitNow = { Dobw } as const;
