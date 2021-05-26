import { getTryCatchOptions } from './get-try-catch-options';
import { TryCatchEmitter } from './try-catch-emitter';
import { TryCatchException } from './try-catch-exception.interface';
import { TryCatchOptions } from './try-catch-options.interface';


export function catchError(error: any, optionsOrException = {} as TryCatchOptions | TryCatchException, options = {} as TryCatchOptions) {
    const {exception, tryCatchOptions} = getTryCatchOptions(optionsOrException, options);
    options = tryCatchOptions;

    // append tags to exception or error and return
    const appendTags = (error: any) => {
        if (options && options.tags) {
            // the preexisting tag values override any added since they are closer
            // to where the error was thrown
            error.tags = {
                ...options.tags,
                ...(error['tags'] || {})
            };
        }
        return error;
    };
    
    // helper function to pass appropriate arguments to exception
    const getException = (error: any, Exception: TryCatchException) => {
        if (TryCatchEmitter.baseErrorClass) {
            if (Array.isArray(TryCatchEmitter.baseErrorClass)) {
                for (const baseErrorClass of TryCatchEmitter.baseErrorClass) {
                    if (error instanceof baseErrorClass) {
                        return appendTags(error);
                    }
                }
            }
            else if (error instanceof TryCatchEmitter.baseErrorClass) {
                return appendTags(error);
            }
        }
        if (new Exception(error).error) {
            if (options.customResponseMessage) {
                return appendTags(new Exception(error, options.customResponseMessage));
            }
            return appendTags(new Exception(error));
        }
    
        if (options.customResponseMessage) {
            return appendTags(new Exception(options.customResponseMessage));
        }
        return appendTags(new Exception());
    };

    // wrap the error if wrapper passed
    if (options.errorWrapperClass) {
        error = new options.errorWrapperClass(error);
    }

    let scopedException;

    // get exception instance if there is an exception passed in
    if (exception) {
        scopedException = getException(error, exception);
    }

    // if handler passed in capture the exception, otherwise throw it
    if (options.handleOnly) {
        // emit for app to subscribe to and handle
        TryCatchEmitter.emit(appendTags(scopedException || error));
    }
    else {
        throw appendTags(scopedException || error);
    }
}