import { AngularComponent } from "./components";

export type ExtensionData = {
  packagesComponents: AngularComponent[];
  localComponents: AngularComponent[];
};

export type ExtensionCommand = {
  key: string;
  title: string;
  callback: (...args: any[]) => any;
};
