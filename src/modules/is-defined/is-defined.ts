export function isDefined(obj: any) {
    if (obj === null) {
        return false;
    }
    if (obj === undefined) {
        return false;
    }
    return true;
}
