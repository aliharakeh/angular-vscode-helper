export type ExtensionData = {
  packagesTags: PackageComponentData[];
  localTags: string[];
};

export type PackageComponentData = {
  component: string;
  selector: string;
  imports: string[];
};
