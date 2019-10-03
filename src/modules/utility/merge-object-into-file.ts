import * as deepmerge from 'deepmerge';
import * as path from 'path';

export function mergeObjectIntoFile(currentDir: string, pathName: string, object, random) {
    const filePath = path.join(currentDir, pathName);
    let fileObj;
    try {
        fileObj = require(filePath);
    }
    catch (e) {
        fileObj = {};
    }
    return deepmerge(fileObj, object);
}
