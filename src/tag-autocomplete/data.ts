import { AngularComponent } from './components';

export type TagData = {
    packagesComponents: AngularComponent[];
    localComponents: AngularComponent[];
};

export const data: TagData = {
    packagesComponents: [],
    localComponents: []
};
