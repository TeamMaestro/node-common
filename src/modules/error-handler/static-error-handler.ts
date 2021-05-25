import { Logger } from 'log4js';
import * as Raven from 'raven';
import * as Sentry from '@sentry/node';
import * as config from 'config';
import { Breadcrum } from '../interfaces';
import { TryCatchEmitter, TryCatchException, TryCatchOptions } from '../try-catch';
import { getLogger } from '../utility/get-logger';
import { catchError as catchErrorUtil } from '../try-catch/catch-error.util'; 

const DEFAULT_SANITIZE_STACK_LENGTH = 100;

export interface StaticErrorHandlerConfiguration {
    /**
     * Default true
     */
    sanitizeException: boolean;
    sanitizeStack: {
        /**
         * Default true
         */
        enabled: boolean;
        /**
         * Default 10000
         */
        length: number;
    };
}

/**
 * This ErrorHandler works as a static class with an app configured for Raven.  No instance has to be
 * created for this error handler.
 */

export const RAVEN_DISPLAY_LIMIT = 32752;

export class StaticErrorHandlerService {
    static logger = getLogger();
    static configuration: StaticErrorHandlerConfiguration = {
        sanitizeException: true,
        sanitizeStack: {
            enabled: true,
            length: DEFAULT_SANITIZE_STACK_LENGTH
        }
    };

    static setConfiguration(configuration: StaticErrorHandlerConfiguration) {
        this.configuration = configuration;
    }

    static captureBreadcrumb(breadcrumb: Breadcrum | Sentry.Breadcrumb, logger?: Logger) {
        if (process.env.DEPLOYMENT) {
            if (config.get<boolean>('useSentry')) {
                Sentry.addBreadcrumb(breadcrumb);
            }
            else {
                Raven.captureBreadcrumb(breadcrumb);
            }
        }

        (logger || this.logger).info(breadcrumb.message, breadcrumb.data ? breadcrumb.data : '');
    }

    static captureException(errorOrException: Error | typeof TryCatchEmitter.baseErrorClass, logger?: Logger, configuration?: StaticErrorHandlerConfiguration) {
        // extract error from exception if exception passed in
        const { error, tags } = this.parseException(errorOrException);

        if (process.env.DEPLOYMENT) {
            if (this.sizeInBites(error) > RAVEN_DISPLAY_LIMIT) {
                this.captureMessage(
                    `Error with message "${error.message}" is too large and will not have all data displayed.`
                );
            }

            if (config.get<boolean>('useSentry')) {
                return Sentry.captureException(error, { tags });
            } else {
                return Raven.captureException(error, (e: any) => {
                    if (e) {
                        this.logger.error(e);
                    }
                });
            }
        }

        (logger || this.logger).error(error);
    }

    static captureMessage(message: string, logger?: Logger) {
        if (process.env.DEPLOYMENT) {
            if (config.get<boolean>('useSentry')) {
                Sentry.captureMessage(message);
            }
            else {
                Raven.captureMessage(message, (e: any) => {
                    if (e) {
                        this.logger.error(e);
                    }
                });
            }
        }

        (logger || this.logger).info(message);
    }

    /**
     * Use this to catch an error and handle it the same way as the TryCatch decorator outside of situations where
     * a decorator can be used / is practical
     */
    static catchError(error: any, exception: TryCatchException, options?: TryCatchOptions);
    static catchError(error: any, options: TryCatchOptions);
    static catchError(error: any, optionsOrException = {} as TryCatchOptions | TryCatchException, options = {} as TryCatchOptions) {
        catchErrorUtil(error, optionsOrException, options);
    }

    private static parseException(errorOrException: Error | typeof TryCatchEmitter.baseErrorClass) {
        let error: Error;
        let tags: { [key: string]: any } ;

        if (errorOrException instanceof TryCatchEmitter.baseErrorClass) {
            const exception = errorOrException;
            const subError = exception.error;
            subError.name = exception.constructor ? exception.constructor.name : subError.name;
            error = subError;
            tags = exception.tags;
        }
        else {
            error = errorOrException;
            tags = errorOrException.tags;
        }
        
        return { error, tags: tags || {} };
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
}
