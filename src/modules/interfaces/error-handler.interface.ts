import { Breadcrumb } from './breadcrumb.interface';

export interface ErrorHandler {

    captureBreadcrumb(breadcrumb: Breadcrumb);

    captureException(error: Error);

    captureMessage(message: string);
}
