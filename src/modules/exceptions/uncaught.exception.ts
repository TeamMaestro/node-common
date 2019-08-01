export class UncaughtException extends Error {
    constructor(error: Error) {
        super('UNCAUGHT EXCEPTION');

        if (error) {
            this.message = error.message;
            this.stack = error.stack;
        }
    }
}
