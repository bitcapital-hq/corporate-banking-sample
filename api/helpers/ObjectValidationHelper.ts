/**
 * Checks if is UUID.
 *
 * @param check The string to be checked
 */
export function isUUID(check: string) {
    return check.match(/^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i);
}