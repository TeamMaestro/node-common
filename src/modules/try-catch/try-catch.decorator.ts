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
                const runFunctionAsync = async (finallyFn?: () => void) => {
                    try {
                        return await originalMethod.apply(this, args);
                    }
                    catch (error) {
                        catchError(error, optionsOrException, options);
                    } finally {
                        if (finallyFn) {
                            finallyFn()
                        }
                    }
                }

                const {tryCatchOptions} = getTryCatchOptions(optionsOrException, options);

                if (beelineEnabled && tryCatchOptions.createTrace) {

                    // if there is no active trace, create one
                    if (!beeline.getTraceContext()) {
                        const trace = beeline.startTrace(tryCatchOptions.createTrace);
                        return await runFunctionAsync(() => {
                            beeline.finishSpan(trace);
                        });
                    }
                    // if there is an active trace, add a span to the trace 
                    else {
                        return await beeline.startAsyncSpan(tryCatchOptions.createTrace, async (span) => {
                            return await runFunctionAsync(() => {
                                beeline.finishSpan(span);
                            })
                        })
                    }
                } 
                // if tracing is not enabled, just run the function
                else {
                    return await runFunctionAsync();
                }
            };
        }
        else {
            descriptor.value = function(...args: any[]) {

                const runFunction = (finallyFn?: () => void) => {
                    try {
                        return originalMethod.apply(this, args);
                    }
                    catch (error) {
                        catchError(error, optionsOrException, options);
                    } finally {
                        if (finallyFn) {
                            finallyFn()
                        }
                    }
                }

                const {tryCatchOptions} = getTryCatchOptions(optionsOrException, options);
                if (beelineEnabled && tryCatchOptions.createTrace) {

                    // if there is no active trace, create one
                    if (!beeline.getTraceContext()) {
                        const trace = beeline.startTrace(tryCatchOptions.createTrace);
                        return runFunction(() => {
                            beeline.finishSpan(trace);
                        });
                    }
                    // if there is an active trace, add a span to the trace 
                    else {
                        const span = beeline.startSpan()
                        return runFunction(() => {
                                beeline.finishSpan(span);
                        });
                    }
                } 
                // if tracing is not enabled, just run the function
                else {
                    return runFunction()
                }
            };
        }

        return descriptor;
    };
}
