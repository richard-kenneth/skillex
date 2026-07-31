declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module "*.css";

declare module "better-auth/plugins/expo" {
  export function expoClient(options?: any): any;
}

interface Window {
  localStorage: Storage;
}
