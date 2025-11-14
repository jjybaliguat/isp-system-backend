"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocalDate = getLocalDate;
/**
 * Returns the current date adjusted to local timezone
 */
function getLocalDate(date) {
    const d = new Date(date);
    const tzOffset = d.getTimezoneOffset() * 60000; // offset in ms
    return new Date(d.getTime() - tzOffset);
}
//# sourceMappingURL=getTimeOffset.js.map