export interface IElectronAPI {
    setAlwaysOnTop: (state: boolean) => Promise<void>;
}

declare global {
  interface Window {
    api: IElectronAPI;
  }
}
