# node-common
This repo houses our shared node functions and node handlers


### @TryCatch(optionsOrException = {} as TryCatchOptions | TryCatchException, options = {} as TryCatchOptions )
This decorator will wrap your whole function into a try/catch and you can pass an optional custom error class for it to throw! If you only want to handle the error and not throw an excxeption, you can pass in `handleOnly: true`. When using this option, it will emit an event with the error through the TryCatchEmitter, which you should use to listen and handle these errors in your application. If you want to sanitize the error itself, like in case of taking unecessary propereties off of it, you can pass in a class that accepts an error as a parameter to `errorWrapperClass` or even have that class be the first parameter

```typescript
    // Main file, right after bootstrap of application **caught error will be handled here**
    import { TryCatchEmitter } from '@teamhive/node-common';
    // This will setup any baseExceptions that may get thrown that you dont want to wrap with the wrapping class
    TryCatchEmitter.baseException = [MyBaseException, HttpException];
    TryCatchEmitter.listen((error) => errorHandler.captureException(error));

    // Options interface
    interface TryCatchOptions {
        handleOnly?: boolean;
        customResponseMessage?: string;
        errorWrapperClass?: { new (param1: Error) };
        isSynchronous?: boolean;
    }

    // Only pass in exception (this will throw an SqlException)
    @TryCatch(SqlException)
    async fetchAll() {
        return await this.usersRepository.fetchAll()
    }

    OR

    // Only pass in options (this will not throw but only report the SqlExceptionError)
    @TryCatch({ handleOnly: true, errorWrapperClass: SqlExceptionError })
    async fetchAll() {
        return await this.usersRepository.fetchAll()
    }

    OR

    // Pass in exception with options
    @TryCatch(SqlException, { handleOnly: true, customResponseMessage: 'error creating content' })
    async fetchAll() {
        return await this.usersRepository.fetchAll()
    }
```



### NodeEventHandler
This statis class is designed to help you catch unhandled promise rejections and uncaught exceptions from the highest node process event listeners. You can als pass in a function to handle these exceptions gracefully.

At the very beginning in your index file you should setup our very basic event listeners
```typescript
    'use strict'

    // setup uncaught exception handling
    try {
        const NodeEventHandler = require('@teamhive/node-common').NodeEventHandler;

        NodeEventHandler.logUncaughtException();
        NodeEventHandler.logUnhandleRejection();
    } catch (error) {
        console.error('ERROR SETTING UP EVENT HANDLER: ' + error);
        process.exit(1);
    }

    // start application
    require('./dist/main');
```

Once your app bootstraps and you have access to your error handler, you can pass that to it
```typescript
    import { NodeEventHandler } from '@teamhive/node-common';

    // Get you errorHandler our of Reflector or whereever it is constructed

    NodeEventHandler.handleUnhandledRejection(errorHandler);
    NodeEventHandler.handleUncaughtException(errorHandler);
```




### Distribution
```
npm pack
npm version (major|minor|patch)
npm publish
```

_Note: This will also automatically push changes and tags post-publish_