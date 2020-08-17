import { UncaughtException, UnhandledPromiseException } from '../exceptions';
import { ErrorHandler } from '../interfaces';
import { getLogger } from '../utility/get-logger';

export class NodeEventHandler {
    static logUnhandledRejection() {
        process.on('unhandledRejection', NodeEventHandler.logRejection);
    }

    static logUncaughtException() {
        process.on('uncaughtException', NodeEventHandler.logException);
    }

    static handleUnhandledRejection(errorHandler: ErrorHandler) {
        process.removeListener('unhandledRejection', NodeEventHandler.logRejection);

        process.on('unhandledRejection', async (error: any) => {
            try {
                await errorHandler.captureException(new UnhandledPromiseException(error));
            } catch (error) {
                this.logRejection(error);
            }
        });
    }

    static handleUncaughtException(errorHandler: ErrorHandler) {
        process.removeListener('uncaughtException', NodeEventHandler.logException);

        process.on('uncaughtException', async (error: any) => {
            try {
                await errorHandler.captureException(new UncaughtException(error));
            } catch (error) {
                this.logException(error);
            }
        });
    }

    private static logRejection(error: any) {
        getLogger().error('UNHANDLED REJECTION:', error);
    }

    private static logException(error: any) {
        getLogger().error('UNCAUGHT EXCEPTION:', error);
    }
}
