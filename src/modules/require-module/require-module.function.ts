export function requireModule<T>(moduleLocation: string): T {
    // tslint:disable-next-line: no-var-requires
    return require(moduleLocation);
}
