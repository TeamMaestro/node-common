import { TryCatchException } from './try-catch-exception.interface';
import { TryCatchOptions } from './try-catch-options.interface';

export function getTryCatchOptions( optionsOrException = {} as TryCatchOptions | TryCatchException, options = {} as TryCatchOptions) {
    // set exception based off of type of second param
    let exception: TryCatchException;
    // set options equal to optionsOrException if that param is an object
    const secondParamOptions = optionsOrException as TryCatchOptions;
    if (secondParamOptions.customResponseMessage ||
        secondParamOptions.errorWrapperClass ||
        secondParamOptions.isSynchronous !== undefined ||
        secondParamOptions.handleOnly !== undefined ||
        secondParamOptions.tags) {
        options = secondParamOptions;
    }
    else {
        exception = optionsOrException as TryCatchException;
    }
    return {
        exception,
        tryCatchOptions: options
    };
}