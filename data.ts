
import { Person, FamilyTab } from './types';

export const familyData: Person = {
  id: 'root-seed',
  name: 'ریشه خاندان',
  children: []
};

export const defaultFamilyTabs: FamilyTab[] = [
  {
    id: 'tab-default',
    title: 'خاندان نمونه',
    data: familyData,
    owner: 'admin',
    isPublic: true
  }
];

export const defaultLayoutConfig = {};

export const defaultSettings = {
  marquee: "خوش آمدید."
};
