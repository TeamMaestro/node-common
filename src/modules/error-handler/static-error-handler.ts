import { Logger } from 'log4js';
import * as Raven from 'raven';
import { Breadcrum } from '../interfaces';
import { getConfig } from '../utility/get-config';
import { getLogger } from '../utility/get-logger';

/**
 * This ErrorHandler works as a static class with an app configured for Raven.  No instance has to be
 * created for this error handler.
 */

export const RAVEN_DISPLAY_LIMIT = 32752;

export class StaticErrorHandlerService {
    static logger = getLogger();

    static captureBreadcrumb(breadcrumb: Breadcrum, logger?: Logger) {
        if (process.env.DEPLOYMENT) {
            Raven.captureBreadcrumb(breadcrumb);
        }

        (logger || this.logger).info(breadcrumb.message, breadcrumb.data ? breadcrumb.data : '');
    }

    static captureException(error: Error, logger?: Logger) {
        const sanitizedError = this.sanitizeError(error);
        sanitizedError.stack = this.sanitizeStack(sanitizedError.stack);
        if (process.env.DEPLOYMENT) {
            if (this.sizeInBites(sanitizedError) > RAVEN_DISPLAY_LIMIT) {
                this.captureMessage(
                    `Error with message "${sanitizedError.message}" is too large and will not have all data displayed.`
                );
            }

            Raven.captureException(sanitizedError, (e: any) => {
                if (e) {
                    this.logger.error(e);
                }
            });
        }

        (logger || this.logger).error(sanitizedError);
    }

    static captureMessage(message: string, logger?: Logger) {
        if (process.env.DEPLOYMENT) {
            Raven.captureMessage(message, (e: any) => {
                if (e) {
                    this.logger.error(e);
                }
            });
        }

        (logger || this.logger).info(message);
    }

    private static sizeInBites(object: any) {
        const objectList = [];
        const stack = [object];
        let bytes = 0;

        while (stack.length) {
            const value = stack.pop();

            if (typeof value === 'boolean') {
                bytes += 4;
            } else if (typeof value === 'string') {
                bytes += value.length * 2;
            } else if (typeof value === 'number') {
                bytes += 8;
            } else if (typeof value === 'object' && value !== null) {
                objectList.push(value);
                Object.getOwnPropertyNames(value).forEach(key => stack.push(value[key]));
            }
        }
        return bytes;
    }

    private static sanitizeError(originalError: Error) {
        const sanitizeException = getConfig('logger.sanitizeException', true);
        if (sanitizeException) {
            const error = new Error(originalError.message);
            error.message = originalError.message;
            error.name = originalError.name;
            error.stack = originalError.stack;
            (error as any).loggedMetadata = (originalError as any).loggedMetadata;
            (error as any).__proto__ = Object.getPrototypeOf(originalError);
            return error;
        }
        else {
            return originalError;
        }

    }

    private static sanitizeStack(stack: string) {
        if (!stack) {
            return stack;
        }
        const sanitizeStack: { enabled: boolean; length: number } = getConfig('logger.sanitizeStack', { enabled: true, length: 10000 });
        if (sanitizeStack.enabled) {
            if (stack.length < sanitizeStack.length) {
                return stack;
            }
            else {
                const slimmedStack = stack.slice(0, sanitizeStack.length);
                const lastLineBreak = slimmedStack.lastIndexOf('\n');
                return slimmedStack.slice(0, lastLineBreak);
            }
        }
        return stack;
    }
}
