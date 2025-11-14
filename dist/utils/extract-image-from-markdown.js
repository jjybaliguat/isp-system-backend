"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractImageUrls = extractImageUrls;
function extractImageUrls(markdown) {
    const regex = /!\[.*?\]\((.*?)\)/g;
    const urls = [];
    let match;
    while ((match = regex.exec(markdown)) !== null) {
        urls.push(match[1]);
    }
    return urls;
}
//# sourceMappingURL=extract-image-from-markdown.js.map