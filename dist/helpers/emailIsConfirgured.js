"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailIsConfigured = void 0;
const emailIsConfigured = (settings) => {
    return !!(settings?.enabled && settings.emailHost && settings.emailPort && settings.emailUser && settings.emailPass && settings.senderName);
};
exports.emailIsConfigured = emailIsConfigured;
//# sourceMappingURL=emailIsConfirgured.js.map