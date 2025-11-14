declare module "marked" {
  export function parse(markdown: string, options?: any): string | Promise<string>;
  export function parseSync(markdown: string, options?: any): string;
  export const Renderer: any;
  export const Lexer: any;
  export const Parser: any;
  export const Tokenizer: any;
  export const Slugger: any;
}
