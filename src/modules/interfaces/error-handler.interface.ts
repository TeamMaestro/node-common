import { Breadcrum } from './breadcrum.interface';

export interface ErrorHandler {

    captureBreadcrumb(breadcrumb: Breadcrum);

    captureException(error: Error);

    captureMessage(message: string);
}
