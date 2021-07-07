import { catchError } from './catch-error.util';
import { getTryCatchOptions } from './get-try-catch-options';
import { TryCatchException } from './try-catch-exception.interface';
import { TryCatchOptions } from './try-catch-options.interface';
import beeline = require('@teamhive/honeycomb-beeline');

export function TryCatch(exception: TryCatchException, options?: TryCatchOptions): MethodDecorator;
export function TryCatch(options: TryCatchOptions): MethodDecorator;
export function TryCatch(optionsOrException = {} as TryCatchOptions | TryCatchException, options = {} as TryCatchOptions) {
    // return the decorator function
    return (_target: any, _key: any, descriptor: any) => {
        const beelineEnabled = !!beeline['_apiForTesting']();
        // store original method
        const originalMethod = descriptor.value;

        // check if original methods is async
        if (!options.isSynchronous) {
            descriptor.value = async function(...args: any[]) {
                const {tryCatchOptions} = getTryCatchOptions(optionsOrException, options);
                if (beelineEnabled && tryCatchOptions.createTrace) {

                    return await beeline.startAsyncSpan(tryCatchOptions.createTrace, async (span) => {
                        // try catch the original method passing in args it was called with
                        try {
                            return await originalMethod.apply(this, args);
                        }
                        catch (error) {
                            catchError(error, optionsOrException, options);
                        } finally {
                                beeline.finishTrace(span);
                        }
                    })
                } else {
                    try {
                        return await originalMethod.apply(this, args);
                    }
                    catch (error) {
                        catchError(error, optionsOrException, options);
                    }
                }
            };
        }
        else {
            descriptor.value = function(...args: any[]) {
                const {tryCatchOptions} = getTryCatchOptions(optionsOrException, options);
                let span: beeline.Span;
                if (tryCatchOptions.createTrace) {
                    span = beeline.startSpan(tryCatchOptions.createTrace)
                }
                // try catch the original method passing in args it was called with
                try {
                    return originalMethod.apply(this, args);
                }
                catch (error) {
                    catchError(error, optionsOrException, options);
                } finally {
                    if (span) {
                        beeline.finishSpan(span);
                    }
                }
            };
        }

        return descriptor;
    };
}
