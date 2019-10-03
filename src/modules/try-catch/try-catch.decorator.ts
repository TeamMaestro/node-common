import { TryCatchEmitter } from './try-catch-emitter';
import { TryCatchException } from './try-catch-exception.interface';
import { TryCatchOptions } from './try-catch-options.interface';

export function TryCatch(exception: TryCatchException, options?: TryCatchOptions): MethodDecorator;
export function TryCatch(options: TryCatchOptions): MethodDecorator;
export function TryCatch(optionsOrException = {} as TryCatchOptions | TryCatchException, options = {} as TryCatchOptions) {
    // set exception based off of type of first param
    let exception: TryCatchException;
    // set options equal to optionsOrException if that param is an object
    const firstParamOptions = optionsOrException as TryCatchOptions;
    if (firstParamOptions.customResponseMessage || firstParamOptions.customResponseMessage || firstParamOptions.handleOnly !== undefined) {
        options = firstParamOptions;
    }
    else {
        exception = optionsOrException as TryCatchException;
    }

    // helper function to pass appropriate arguments to exception
    const getException = (error: any, Exception: TryCatchException) => {
        if (TryCatchEmitter.baseErrorClass) {
            if (Array.isArray(TryCatchEmitter.baseErrorClass)) {
                for (const baseErrorClass of TryCatchEmitter.baseErrorClass) {
                    if (error instanceof baseErrorClass) {
                        return error;
                    }
                }
            }
            else if (error instanceof TryCatchEmitter.baseErrorClass) {
                return error;
            }
        }
        if (new Exception(error).error) {
            if (options.customResponseMessage) {
                return new Exception(error, options.customResponseMessage);
            }
            return new Exception(error);
        }

        if (options.customResponseMessage) {
            return new Exception(options.customResponseMessage);
        }
        return new Exception();
    };

    const catchError = (error: any, handleOnly: boolean) => {
        // wrap the error if wrapper passed
        if (firstParamOptions.errorWrapperClass) {
            error = new firstParamOptions.errorWrapperClass(error);
        }

        let scopedException;

        // get exception instance if there is an exception passed in
        if (exception) {
            scopedException = getException(error, exception);
        }

        // if handler passed in capture the exception, otherwise throw it
        if (handleOnly) {
            // emit for app to subscribe to and handle
            TryCatchEmitter.emit(scopedException || error);
        }
        else {
            throw scopedException || error;
        }
    };

    // return the decorator function
    return (_target: any, _key: any, descriptor: any) => {
        // store original method
        const originalMethod = descriptor.value;

        // check if original methods is async
        if (!options.isSynchronous) {
            descriptor.value = async function(...args: any[]) {
                // try catch the original method passing in args it was called with
                try {
                    return await originalMethod.apply(this, args);
                }
                catch (error) {
                    catchError(error, !!options.handleOnly);
                }
            };
        }
        else {
            descriptor.value = function(...args: any[]) {
                // try catch the original method passing in args it was called with
                try {
                    return originalMethod.apply(this, args);
                }
                catch (error) {
                    catchError(error, !!options.handleOnly);
                }
            };
        }

        return descriptor;
    };
}