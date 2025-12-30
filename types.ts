
import * as d3 from 'd3';

export interface SharedChild {
  id?: string;
  name: string;
}

export interface Person {
  id: string;
  name: string;
  surname?: string;
  gender?: 'male' | 'female';
  mobile?: string;
  email?: string;
  imageUrl?: string;
  avatarIndex?: number;
  birthDate?: string;
  deathDate?: string;
  parent?: string;
  spouseName?: string;
  spouseId?: string;
  secondSpouseName?: string;
  secondSpouseId?: string;
  status?: string[];
  title?: string;
  description?: string;
  children?: Person[];
  sharedChildren?: (string | SharedChild)[];
}

export interface HierarchyNode extends d3.HierarchyPointNode<Person> {
  x: number;
  y: number;
}

export interface FamilyTab {
  id: string;
  title: string;
  data: Person;
  owner?: string; // نام کاربری سازنده
  isPublic?: boolean; // آیا برای همه قابل نمایش است؟
  deleted?: boolean; // برای حذف موقت (سطل بازیافت)
  deletedAt?: number;
}

export type ViewMode = 'rich_tree' | 'simple_tree' | 'vertical_tree';
export type ListFilter = 'all' | 'male' | 'female';

export interface User {
  username: string;
  role: 'admin' | 'user';
  createdAt?: number;
}
