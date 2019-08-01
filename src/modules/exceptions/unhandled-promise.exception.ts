export class UnhandledPromiseException extends Error {
    constructor(error: Error) {
        super('UNHANDLED PROMISE EXCEPTION');

        if (error) {
            this.message = error.message;
            this.stack = error.stack;
        }
    }
}
