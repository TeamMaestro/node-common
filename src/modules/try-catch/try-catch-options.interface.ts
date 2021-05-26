import beeline = require("@teamhive/honeycomb-beeline");

export interface TryCatchOptions {
    handleOnly?: boolean;
    customResponseMessage?: string;
    errorWrapperClass?: { new (param1: Error) };
    isSynchronous?: boolean;
    tags?: { [key: string]: number | string | boolean | bigint | symbol | null | undefined }
    createTrace?: beeline.MetadataContext
}
