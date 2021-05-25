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
        // store original method
        const originalMethod = descriptor.value;

        const startTrace = (context: beeline.MetadataContext) => {
            const traceContext = beeline.getTraceContext()
            let parentSpanId, traceId: string;
            if (traceContext) {
                const traceContextString = beeline.honeycomb.marshalTraceContext(traceContext);
                let parsedContext = beeline.honeycomb.unmarshalTraceContext(traceContextString);
                parentSpanId = parsedContext.parentSpanId;
                traceId = parsedContext.traceId;
            }
            return beeline.startTrace(context, traceId, parentSpanId);
        }

        // check if original methods is async
        if (!options.isSynchronous) {
            descriptor.value = async function(...args: any[]) {
                const {tryCatchOptions} = getTryCatchOptions(optionsOrException, options);
                let span: beeline.Span;
                if (tryCatchOptions.createTrace) {
                    span = startTrace(tryCatchOptions.createTrace);
                }
                // try catch the original method passing in args it was called with
                try {
                    return await originalMethod.apply(this, args);
                }
                catch (error) {
                    catchError(error, optionsOrException, options);
                } finally {
                    beeline.finishTrace(span);
                }
            };
        }
        else {
            descriptor.value = function(...args: any[]) {
                const {tryCatchOptions} = getTryCatchOptions(optionsOrException, options);
                let span: beeline.Span;
                if (tryCatchOptions.createTrace) {
                    span = startTrace(tryCatchOptions.createTrace);
                }
                // try catch the original method passing in args it was called with
                try {
                    return originalMethod.apply(this, args);
                }
                catch (error) {
                    catchError(error, optionsOrException, options);
                } finally {
                    beeline.finishTrace(span);
                }
            };
        }

        return descriptor;
    };
}
