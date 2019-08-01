import { UncaughtException, UnhandledPromiseException } from '../exceptions';
import { ErrorHandler } from '../interfaces';

export class NodeEventHandler {

    static logUnhandleRejection() {
        process.on('unhandledRejection', NodeEventHandler.logRejection);
    }

    static logUncaughtException() {
        process.on('uncaughtException', NodeEventHandler.logException);
    }

    static handleUnhandledRejection(errorHandler: ErrorHandler) {
        process.removeListener('unhandledRejection', NodeEventHandler.logRejection);

        process.on('unhandledRejection', (error: any) => {
            errorHandler.captureException(new UnhandledPromiseException(error));
        });
    }

    static handleUncaughtException(errorHandler: ErrorHandler) {
        process.removeListener('uncaughtException', NodeEventHandler.logException);

        process.on('uncaughtException', (error: any) => {
            errorHandler.captureException(new UncaughtException(error));
            process.exit(1);
        });
    }

    private static logRejection(error: any) {
        // tslint:disable-next-line
        console.error('UNHANDLED REJECTION: ' + error);
    }

    private static logException(error: any) {
        // tslint:disable-next-line
        console.error('UNCAUGHT EXCEPTION: ' + error);
        process.exit(1);
    }
}
