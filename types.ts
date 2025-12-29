
import * as d3 from 'd3';

export interface SharedChild {
  id?: string;
  name: string;
}

export interface Person {
  id: string;
  name: string;
  surname?: string;
  gender?: 'male' | 'female'; // فیلد جدید جنسیت
  mobile?: string; // فیلد جدید موبایل
  email?: string; // فیلد جدید ایمیل
  imageUrl?: string; // فیلد تصویر (Base64)
  avatarIndex?: number; // ایندکس آواتار انتخابی (0 تا 4)
  birthDate?: string; // تاریخ تولد شمسی
  deathDate?: string; // تاریخ وفات شمسی
  parent?: string;
  spouseName?: string;
  spouseId?: string; // فیلد جدید: اگر همسر در درخت موجود باشد، شناسه او ذخیره می‌شود
  secondSpouseName?: string; // نام همسر دوم
  secondSpouseId?: string; // شناسه همسر دوم
  status?: string[]; // e.g., "Single", "Deceased", "Martyr", "Married"
  title?: string;
  description?: string;
  children?: Person[];
  sharedChildren?: (string | SharedChild)[]; // لیست نام فرزندان (یا آبجکت شامل شناسه) جهت نمایش متنی
}

export interface HierarchyNode extends d3.HierarchyPointNode<Person> {
  x: number;
  y: number;
}

export interface FamilyTab {
  id: string;
  title: string;
  data: Person;
}

export type ViewMode = 'rich_tree' | 'simple_tree' | 'vertical_tree';
export type ListFilter = 'all' | 'male' | 'female';
