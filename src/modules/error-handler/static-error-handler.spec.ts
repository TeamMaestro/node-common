import * as Sentry from '@sentry/node';
import * as faker from 'faker';
import { Logger } from 'log4js';
import * as Raven from 'raven';
import { StaticErrorHandlerService } from './static-error-handler';

class StubError extends Error {

    extraData: any;

    tags?: any;
    
    constructor(message: string, extraData: any, tags?: any) {
        super(message);

        this.extraData = extraData;

        this.tags = tags;
    }
}

describe('StaticErrorHandlerService', () => {

    const OLD_ENV = process.env;

    beforeEach(() => {

        jest.resetModules() // Most important - it clears the cache
        process.env = { ...OLD_ENV, DEPLOYMENT: 'aws' }; // Make a copy

        jest.spyOn(Sentry, 'captureException').mockImplementation(() => {
            return faker.datatype.uuid()
        });
        jest.spyOn(Raven, 'captureException').mockImplementation(() => {
            return faker.datatype.uuid()
        });

        StaticErrorHandlerService.logger = {
            error: jest.fn(),
            info: jest.fn()
        } as any as Logger;
        StaticErrorHandlerService.setConfiguration({
            useSentry: true
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
        process.env = OLD_ENV;
    })

    describe('isAcceptableSize', () => {
        it('should return false when given data is larger than the limit', async () => {
            const extraData = new Array(1000).map(() => faker.lorem.paragraph());
            
            const error = new StubError('Test Error', extraData);
            
            const result: boolean = StaticErrorHandlerService.isAcceptableSize(error, 1000);

            expect(result).toBe(false)
        });

        it('should return true when given data smaller than the limit', async () => {
            
            const error = new StubError('Test Error', []);
            
            const result: boolean = StaticErrorHandlerService.isAcceptableSize(error, 1000);

            expect(result).toBe(false)
        });
    });

    describe('sanitizeUnacceptablyLargeError', () => {
        it('should remove any key that is not stack or message', () => {
            let error = new StubError('test', ['data'], 'otherData');

            error = StaticErrorHandlerService.sanitizeUnacceptablyLargeError(error);

            expect(error.extraData).toBeUndefined();
            expect(error.tags).toBeUndefined();

            expect(error.stack).toBeDefined();
            expect(error.message).toEqual('test');
        })
    });

    describe('sanitizeException', () => {

        it('should sanitize an exception that is unacceptably large', () => {
            const extraData = new Array(1000).map(() => faker.lorem.paragraph());
            const largeError = new StubError('Test Error', extraData, {tag1: 'value'});
            const sanitizedError = new StubError('Sanitized Test Error', undefined);

            jest.spyOn(StaticErrorHandlerService, 'isAcceptableSize').mockImplementation(() => false);
            jest.spyOn(StaticErrorHandlerService, 'sanitizeUnacceptablyLargeError').mockImplementation(() => sanitizedError);

            StaticErrorHandlerService.captureException(largeError);
            
            expect(Sentry.captureException).toBeCalledWith(sanitizedError, {tags: {tag1: 'value'}});
        });

        it('should not sanitize an exception that is acceptably large', () => {
            const extraData = new Array(1000).map(() => faker.lorem.paragraph());
            const largeError = new StubError('Test Error', extraData, {tag1: 'value'});
            const sanitizedError = new StubError('Sanitized Error', undefined);

            jest.spyOn(StaticErrorHandlerService, 'isAcceptableSize').mockImplementation(() => true);
            jest.spyOn(StaticErrorHandlerService, 'sanitizeUnacceptablyLargeError').mockImplementation(() => sanitizedError);

            StaticErrorHandlerService.captureException(largeError);
            
            expect(Sentry.captureException).toBeCalledWith(largeError, {tags: {tag1: 'value'}});
        });


        it('it should create an error to capture if the function is called with an undefined error', () => {
            jest.spyOn(StaticErrorHandlerService, 'captureUndefinedException').mockImplementation(() =>{})
            StaticErrorHandlerService.captureException(undefined);
            
            expect(StaticErrorHandlerService.captureUndefinedException).toBeCalled()
        })
    })
});