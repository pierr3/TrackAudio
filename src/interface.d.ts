import { IElectronAPIType } from "./preload";

declare global {
  interface Window {
    api: IElectronAPIType;
  }
}

export {};