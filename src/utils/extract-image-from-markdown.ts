export function extractImageUrls(markdown: string) {
  const regex = /!\[.*?\]\((.*?)\)/g;
  const urls: string[] = [];
  let match: any;
  while ((match = regex.exec(markdown)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}