import * as Raven from 'raven';
import { Breadcrum } from '../interfaces';
import { getLogger } from '../utility/get-logger';

/**
 * This ErrorHandler works as a static class with an app configured for Raven.  No instance has to be
 * created for this error handler.
 */

export const RAVEN_DISPLAY_LIMIT = 32752;

export class StaticErrorHandlerService {

    static logger = getLogger();

    static captureBreadcrumb(breadcrumb: Breadcrum) {
        if (process.env.DEPLOYMENT) {
            Raven.captureBreadcrumb(breadcrumb);
        }
        else {
            this.logger.info(breadcrumb.message, breadcrumb.data);
        }
    }

    static captureException(error: Error) {
        if (process.env.DEPLOYMENT) {
            if (this.sizeInBites(error) > RAVEN_DISPLAY_LIMIT) {
                this.captureMessage(`Error with message "${error.message}" is too large and will not have all data displayed.`);
            }

            Raven.captureException(error, (e: any) => {
                if (e) {
                    this.logger.error(e);
                }
            });
        }
        else {
            this.logger.error(error);
        }
    }

    static captureMessage(message: string) {
        if (process.env.DEPLOYMENT) {
            Raven.captureMessage(message, (e: any) => {
                if (e) {
                    this.logger.error(e);
                }
            });
        }
        else {
            this.logger.info(message);
        }
    }

    private static sizeInBites(object: any) {
        const objectList = [];
        const stack = [object];
        let bytes = 0;

        while (stack.length) {
            const value = stack.pop();

            if (typeof value === 'boolean') {
                bytes += 4;
            }
            else if (typeof value === 'string') {
                bytes += value.length * 2;
            }
            else if (typeof value === 'number') {
                bytes += 8;
            }
            else if (typeof value === 'object' && value !== null) {
                objectList.push(value);
                Object.getOwnPropertyNames(value).forEach((key) => stack.push(value[key]));
            }
        }
        return bytes;
    }
}
