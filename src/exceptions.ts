/**
 * Typed error classes thrown by the SDK, mirroring the exceptions raised by the
 * Bayarcash PHP SDK. Each maps to a specific HTTP status returned by the API.
 */

/**
 * Thrown on HTTP 422 responses. Carries the validation errors returned by the API.
 */
export class ValidationError extends Error {
    /** The array/object of validation errors returned by the API. */
    public readonly errors: Record<string, unknown>;

    constructor(errors: Record<string, unknown>) {
        super('The given data failed to pass validation.');
        this.name = 'ValidationError';
        this.errors = errors ?? {};
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}

/**
 * Thrown on HTTP 404 responses.
 */
export class NotFoundError extends Error {
    constructor(message = 'The resource you are looking for could not be found.') {
        super(message);
        this.name = 'NotFoundError';
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}

/**
 * Thrown on HTTP 400 responses. The message contains the reason extracted from
 * the response body (the `message` or `error` key when present).
 */
export class FailedActionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FailedActionError';
        Object.setPrototypeOf(this, FailedActionError.prototype);
    }
}

/**
 * Thrown on HTTP 429 responses. Exposes the timestamp when the rate limit resets.
 */
export class RateLimitExceededError extends Error {
    /** The unix timestamp at which the rate limit resets, or null when unknown. */
    public readonly rateLimitResetsAt: number | null;

    constructor(rateLimitReset: number | null) {
        super('Too Many Requests.');
        this.name = 'RateLimitExceededError';
        this.rateLimitResetsAt = rateLimitReset;
        Object.setPrototypeOf(this, RateLimitExceededError.prototype);
    }
}

/**
 * Thrown by the optional `retry()` helper when the operation times out.
 */
export class TimeoutError extends Error {
    /** The output returned from the operation. */
    public readonly output: unknown[];

    constructor(output: unknown[]) {
        super('Script timed out while waiting for the process to complete.');
        this.name = 'TimeoutError';
        this.output = output;
        Object.setPrototypeOf(this, TimeoutError.prototype);
    }
}
