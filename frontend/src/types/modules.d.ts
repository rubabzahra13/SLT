declare module "*.module.css" {
  const classes: { [key: string]: string };
  export default classes;
}

declare module "@paper-design/shaders-react" {
  export const PaperTexture: any;
  export const GrainGradient: any;
}
