import * as Sentry from '@sentry/node';
import { Logger } from 'log4js';
import * as Raven from 'raven';
import { Breadcrum } from '../interfaces';
import { TryCatchEmitter, TryCatchException, TryCatchOptions } from '../try-catch';
import { catchError as catchErrorUtil } from '../try-catch/catch-error.util';
import { getLogger } from '../utility/get-logger';
import beeline = require('@teamhive/honeycomb-beeline');


export interface StaticErrorHandlerConfiguration {
    useSentry: boolean;
    errorTags?: {
        [key: string]: string;
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
        useSentry: true,
        errorTags: {}
    };

    static setConfiguration(configuration: StaticErrorHandlerConfiguration) {
        this.configuration = configuration;
    }

    static captureBreadcrumb(breadcrumb: Breadcrum | Sentry.Breadcrumb, logger?: Logger, configuration: StaticErrorHandlerConfiguration = this.configuration) {
        if (process.env.DEPLOYMENT) {
            if (configuration.useSentry) {
                Sentry.addBreadcrumb(breadcrumb);
            }
            else {
                Raven.captureBreadcrumb(breadcrumb);
            }
        }

        (logger || this.logger).info(breadcrumb.message, breadcrumb.data ? breadcrumb.data : '');
    }

    static captureException(errorOrException: Error | typeof TryCatchEmitter.baseErrorClass, logger?: Logger, configuration: StaticErrorHandlerConfiguration = this.configuration) {
        // extract error from exception if exception passed in
        let { error, tags = {} } = this.parseException(errorOrException);
        const {errorTags = {}} = configuration;
        if (process.env.DEPLOYMENT && error) {
            if (!this.isAcceptableSize(error, RAVEN_DISPLAY_LIMIT)) {
                this.captureMessage(
                    `Error with message "${error.message}" is too large and will not have all data displayed.`
                );
                error = this.sanitizeUnacceptablyLargeError(error);
            }

            if (configuration.useSentry) {
                return Sentry.captureException(error, { tags: {
                    ...this.getTraceTag(),
                    ...errorTags,
                    ...tags,
                } });
            } else {
                return Raven.captureException(error, (e: any) => {
                    if (e) {
                        this.logger.error(e);
                    }
                });
            }
        } else if (!error) {
            
            this.captureUndefinedException();
        }

        if (error) {
            (logger || this.logger).error(error);
        }
    }

    /**
     * capture an error so a stack trace is generated that can indicate where in the application called capture exception with no error
     */
    static captureUndefinedException() {
        this.captureException(new Error('captureException was called and no error was provided'));
    }

    static captureMessage(message: string, logger?: Logger, configuration: StaticErrorHandlerConfiguration = this.configuration, tags: {[key: string]: string} = {}) {
        const {errorTags = {}} = configuration;
        if (process.env.DEPLOYMENT) {
            if (configuration.useSentry) {
                Sentry.captureMessage(message, {
                    tags: {
                        ...this.getTraceTag(),
                        ...errorTags,
                        ...tags,
                        
                    }
                });
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

        if (TryCatchEmitter.baseErrorClass && errorOrException instanceof TryCatchEmitter.baseErrorClass) {
            const exception = errorOrException;
            const subError = exception.error;
            if (subError && exception.constructor) {
                subError.name = exception.constructor.name;
                error = subError;
            } else {
                error = exception;
            }
            tags = exception.tags;
        }
        else {
            error = errorOrException;
            tags = errorOrException?.tags;
        }
        
        return { error, tags: tags ?? {} };
    }

    static isAcceptableSize(object: any, acceptableSizeInBytes: number) {
        const objectList = [];
        const stack = [object];
        let bytes = 0;

        while (stack.length && bytes < acceptableSizeInBytes) {
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
        return bytes < acceptableSizeInBytes;
    }

    /**
     * Removes extraneous data from the error. Only the message and the stack
     * is left
     */
    static sanitizeUnacceptablyLargeError(object: any) {
        // get a list of all keys except the message and the stack 
        const keys = Object.keys(object).filter(key => !['message', 'stack'].includes(key));

        // remove all other keys
        keys.forEach((key) => {
            delete object[key];
        });

        return object;
    }

    /**
     * Appends the traceId as a tag that can be sent to sentry
     */
    private static getTraceTag() {
        const beelineEnabled = !!beeline['_apiForTesting']();

        if (beelineEnabled) {
            const traceContext = beeline.getTraceContext();
            if (traceContext && traceContext.id) {
                return {
                    traceId: traceContext.id
                }
            }
        }
        return {};
    }
}
