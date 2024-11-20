import { AngularComponent } from './components/angular-component';

export type TagData = {
    packagesComponents: AngularComponent[];
    localComponents: AngularComponent[];
};

export const data: TagData = {
    packagesComponents: [],
    localComponents: []
};
