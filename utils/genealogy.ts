
import { Person } from '../types';

export interface ExtendedPerson extends Person {
  depth: number;
  parentId: string | null;
  fatherName?: string; // نام والد
  parentGender?: 'male' | 'female'; // جنسیت والد برای تشخیص پدر یا مادر
  grandFatherName?: string;
}

/**
 * تشخیص جنسیت
 * (Kept here as it's used by both genealogy and relationship logic)
 */
export const getDerivedGender = (p: Person): 'male' | 'female' => {
    if (p.gender) return p.gender;
    return 'male';
};

/**
 * جستجوی یک نود در درخت بر اساس ID
 */
export const findNodeById = (root: Person, id: string): Person | null => {
  if (root.id === id) return root;
  if (root.children) {
    for (const child of root.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }
  return null;
};

/**
 * بازسازی شناسه‌های کل درخت برای کپی کردن
 * این تابع یک کپی عمیق از درخت ایجاد کرده و تمام IDها را تغییر می‌دهد
 * تا از تداخل در هنگام کپی کردن خاندان جلوگیری شود.
 */
export const regenerateTreeIds = (node: Person): Person => {
    const newId = `p-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // کپی کردن شیء (بدون children فعلا)
    const newNode: Person = { ...node, id: newId };
    
    // پاک کردن ارجاعات همسری (چون همسر ممکن است در این درخت نباشد یا ID اش تغییر کند)
    // در نسخه پیشرفته می‌توان مپینگ ID قدیم به جدید ساخت، اما برای کپی ساده، قطع ارتباط امن‌تر است
    delete newNode.spouseId;
    delete newNode.secondSpouseId;
    
    // بازسازی فرزندان به صورت بازگشتی
    if (node.children && node.children.length > 0) {
        newNode.children = node.children.map(child => regenerateTreeIds(child));
    } else {
        newNode.children = [];
    }
    
    // پاک کردن فرزندان مشترک (Shared Children) چون به ID های قدیم اشاره دارند
    newNode.sharedChildren = [];

    return newNode;
};

export const flattenTree = (
  node: Person,
  depth: number = 0,
  parentId: string | null = null,
  fatherName?: string,
  grandFatherName?: string,
  parentGender?: 'male' | 'female'
): ExtendedPerson[] => {
  const results: ExtendedPerson[] = [];
  
  const traverse = (
      n: Person, 
      d: number, 
      pId: string | null, 
      fName: string | undefined, 
      gfName: string | undefined, 
      pGender: 'male' | 'female' | undefined
  ) => {
      const extended: ExtendedPerson = {
          ...n,
          depth: d,
          parentId: pId,
          fatherName: fName,
          grandFatherName: gfName,
          parentGender: pGender
      };
      results.push(extended);
      
      if (n.children) {
          const currentGender = getDerivedGender(n);
          for (const child of n.children) {
              traverse(child, d + 1, n.id, n.name, fName, currentGender);
          }
      }
  };

  traverse(node, depth, parentId, fatherName, grandFatherName, parentGender);
  return results;
};

export const filterTree = (node: Person, filter: 'male' | 'female' | 'all'): Person | null => {
  if (filter === 'all') return node;

  const derivedGender = getDerivedGender(node);
  const isFemale = derivedGender === 'female';
  
  if (filter === 'male') {
    if (isFemale) return null;
    let filteredChildren: Person[] = [];
    if (node.children) {
      filteredChildren = node.children
        .map(child => filterTree(child, filter))
        .filter((child): child is Person => child !== null);
    }
    return { ...node, children: filteredChildren };
  }

  if (filter === 'female') {
    const matchSelf = isFemale;
    let filteredChildren: Person[] = [];
    if (node.children) {
      filteredChildren = node.children
        .map(child => filterTree(child, filter))
        .filter((child): child is Person => child !== null);
    }
    if (matchSelf || filteredChildren.length > 0) {
      return { ...node, children: filteredChildren };
    }
    return null;
  }

  return node;
};

export const getFullIdentityLabel = (person: ExtendedPerson | undefined): string => {
  if (!person) return '';
  let label = `${person.name} ${person.surname || ''}`.trim();
  const gender = getDerivedGender(person);
  if (person.fatherName) {
    const childRelation = gender === 'female' ? 'دخترِ' : 'پسرِ';
    label += ` (${childRelation} ${person.fatherName}`;
  }
  if (person.grandFatherName) {
    const grandRelation = 'نوهٔ';
    label += `، ${grandRelation} ${person.grandFatherName}`;
  }
  if (person.fatherName) label += `)`;
  return label;
};

export const updatePersonInTree = (node: Person, targetId: string, fields: Partial<Person>): Person => {
  if (node.id === targetId) return { ...node, ...fields };
  if (node.children) {
    return { ...node, children: node.children.map(c => updatePersonInTree(c, targetId, fields)) };
  }
  return node;
};

export const addChildToTree = (node: Person, parentId: string, childName: string): Person => {
  if (node.id === parentId) {
    const newChild: Person = {
      id: `p-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: childName,
      gender: 'male',
      status: [],
      children: []
    };
    return { ...node, children: [...(node.children || []), newChild] };
  }
  if (node.children) {
    return { ...node, children: node.children.map(c => addChildToTree(c, parentId, childName)) };
  }
  return node;
};

export const removePersonFromTree = (node: Person, targetId: string): Person | null => {
  if (node.id === targetId) return null;
  if (node.children) {
    const newChildren = node.children
      .map(c => removePersonFromTree(c, targetId))
      .filter((c): c is Person => c !== null);
    return { ...node, children: newChildren };
  }
  return node;
};

export const movePersonInTree = (root: Person, parentId: string, childId: string): Person => {
  const nodeToMove = findNodeById(root, childId);
  if (!nodeToMove) return root;

  const isDescendant = (node: Person, targetId: string): boolean => {
    if (node.id === targetId) return true;
    if (node.children) return node.children.some(c => isDescendant(c, targetId));
    return false;
  };

  if (isDescendant(nodeToMove, parentId)) {
    throw new Error("امکان جابجایی والد به زیرمجموعه فرزند خودش وجود ندارد.");
  }

  const treeWithoutNode = removePersonFromTree(root, childId);
  if (!treeWithoutNode) return root;

  const addNodeToParent = (node: Person, pid: string, nodeToAdd: Person): Person => {
    if (node.id === pid) return { ...node, children: [...(node.children || []), nodeToAdd] };
    if (node.children) return { ...node, children: node.children.map(c => addNodeToParent(c, pid, nodeToAdd)) };
    return node;
  };

  return addNodeToParent(treeWithoutNode, parentId, nodeToMove);
};
