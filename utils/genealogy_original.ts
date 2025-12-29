
import { Person } from '../types';

export interface ExtendedPerson extends Person {
  depth: number;
  parentId: string | null;
  fatherName?: string; // نام والد
  parentGender?: 'male' | 'female'; // جنسیت والد برای تشخیص پدر یا مادر
  grandFatherName?: string;
}

/**
 * محاسبه سن بر اساس تاریخ شمسی
 */
export const calculatePersianAge = (birthDate?: string, deathDate?: string, status?: string[]): string | null => {
    if (!birthDate) return null;

    // استخراج سال از رشته (فرض بر فرمت YYYY/MM/DD یا YYYY)
    // تبدیل اعداد فارسی به انگلیسی اگر وجود داشته باشد
    const toEnglishDigits = (str: string) => str.replace(/[۰-۹]/g, w => String.fromCharCode(w.charCodeAt(0) - 1728));
    
    const birthYearStr = toEnglishDigits(birthDate).match(/^(\d{4})/);
    if (!birthYearStr) return null;
    
    const birthYear = parseInt(birthYearStr[1]);
    
    // محاسبه سال جاری شمسی به صورت تقریبی
    // سال میلادی - 621 = سال شمسی تقریبی
    const currentGregorianYear = new Date().getFullYear();
    const currentPersianYear = currentGregorianYear - 621;

    // اگر تاریخ وفات دارد
    if (deathDate) {
        const deathYearStr = toEnglishDigits(deathDate).match(/^(\d{4})/);
        if (deathYearStr) {
            const deathYear = parseInt(deathYearStr[1]);
            return `${deathYear - birthYear} سال`;
        }
    }

    // اگر وضعیت مرحوم دارد اما تاریخ وفات ندارد
    if (status && status.includes('مرحوم')) {
        return null; // سن نامشخص (فوت شده)
    }

    // زنده است
    const age = currentPersianYear - birthYear;
    return `${age} سال`;
};

/**
 * تشخیص جنسیت
 */
export const getDerivedGender = (p: Person): 'male' | 'female' => {
    if (p.gender) return p.gender;
    return 'male';
};

/**
 * الگوریتم پیشرفته محاسبه نسبت فامیلی فارسی
 */
export const findRelationship = (p1: ExtendedPerson, p2: ExtendedPerson, allMembers: ExtendedPerson[]): string => {
    if (p1.id === p2.id) return "این خود شخص است!";

    // 1. یافتن مسیر اجدادی برای هر دو نفر (از پایین به بالا تا ریشه)
    const getPath = (person: ExtendedPerson): ExtendedPerson[] => {
        const path = [person];
        let current = person;
        while (current.parentId) {
            const parent = allMembers.find(m => m.id === current.parentId);
            if (parent) {
                path.push(parent);
                current = parent;
            } else {
                break;
            }
        }
        return path; // [خودش, پدر, پدربزرگ, ...]
    };

    const path1 = getPath(p1);
    const path2 = getPath(p2);

    // 2. پیدا کردن جد مشترک (LCA)
    let lca: ExtendedPerson | null = null;
    let dist1 = -1; // فاصله نفر اول تا جد مشترک
    let dist2 = -1; // فاصله نفر دوم تا جد مشترک

    for (let i = 0; i < path1.length; i++) {
        const ancestor1 = path1[i];
        const j = path2.findIndex(a => a.id === ancestor1.id);
        if (j !== -1) {
            lca = ancestor1;
            dist1 = i;
            dist2 = j;
            break;
        }
    }

    if (!lca) return "نسبت خونی مستقیم در این درخت یافت نشد (خاندان‌های متفاوت).";

    const p2Gender = getDerivedGender(p2);
    const p2IsFemale = p2Gender === 'female';

    // --- حالت‌های مستقیم و نزدیک (فاصله‌های کم) ---

    // هم‌مسیر (والد/فرزند/نوه مستقیم)
    if (dist1 === 0) {
        if (dist2 === 1) return p2IsFemale ? "دختر" : "پسر";
        if (dist2 === 2) return p2IsFemale ? "نوه (دختری/پسری)" : "نوه (دختری/پسری)";
        // برای نوه‌های دورتر
        if (dist2 > 2) return `نوه (نتیجه/نبیره - نسل ${dist2}م)`;
    }
    if (dist2 === 0) {
        if (dist1 === 1) return p2IsFemale ? "مادر" : "پدر";
        if (dist1 === 2) return p2IsFemale ? "مادربزرگ" : "پدربزرگ";
        if (dist1 > 2) return `جد (${dist1} نسل قبل)`;
    }

    // خواهر/برادر
    if (dist1 === 1 && dist2 === 1) {
        return p2IsFemale ? "خواهر" : "برادر";
    }

    // عمو/عمه/دایی/خاله (فرزندانِ پدربزرگ/مادربزرگِ P1)
    if (dist1 === 2 && dist2 === 1) {
        const p1Parent = path1[1]; // والد P1
        const p1ParentGender = getDerivedGender(p1Parent);
        if (p1ParentGender === 'male') {
            return p2IsFemale ? "عمه" : "عمو";
        } else {
            return p2IsFemale ? "خاله" : "دایی";
        }
    }

    // --- تولید مسیر دقیق برای روابط دورتر (Generic Algorithm) ---
    
    // 1. ساخت بخش اول: مسیر از P2 بالا می‌رود تا به انشعاب برسد
    let relationshipString = "";
    
    for (let i = 0; i < dist2 - 1; i++) {
        const currentPerson = path2[i];
        const gender = getDerivedGender(currentPerson);
        const term = gender === 'female' ? "دخترِ " : "پسرِ ";
        relationshipString += term;
    }

    // 2. تعیین نقطه اتصال (پایه نسبت)
    const p1RootRelative = path1[dist1 - 1]; // کسی که در شاخه P1، فرزند LCA است
    const p2RootRelative = path2[dist2 - 1]; // کسی که در شاخه P2، فرزند LCA است

    // اگر dist1 == 1 باشد، یعنی LCA پدر/مادر P1 است. پس p2RootRelative خواهر/برادر P1 است.
    if (dist1 === 1) {
        const siblingGender = getDerivedGender(p2RootRelative);
        relationshipString += siblingGender === 'female' ? "خواهر" : "برادر";
        return relationshipString;
    }

    // اگر dist1 >= 2 باشد، یعنی LCA پدربزرگ یا بالاتر است.
    
    const p1RootGender = getDerivedGender(p1RootRelative); // جنسیتِ جدِ P1 (در سطح فرزند LCA)
    const p2RootGender = getDerivedGender(p2RootRelative); // جنسیتِ جدِ P2 (در سطح فرزند LCA)

    let baseTitle = "";
    // تعیین عمو/عمه/دایی/خاله بر اساس جنسیتِ جدِ سمتِ P1
    if (p1RootGender === 'male') {
        // شاخه پدری (برای نسل بعد)
        baseTitle = p2RootGender === 'male' ? "عمو" : "عمه";
    } else {
        // شاخه مادری (برای نسل بعد)
        baseTitle = p2RootGender === 'male' ? "دایی" : "خاله";
    }
    
    relationshipString += baseTitle;

    // 3. تکمیل مسیر به سمت پایین برای P1 (اضافه کردن "...ِ پدرِ ...")
    if (dist1 > 2) {
        for (let k = dist1 - 2; k >= 1; k--) {
            const ancestor = path1[k];
            const g = getDerivedGender(ancestor);
            // اضافه کردن کسره و نسبت
            relationshipString += "ِ " + (g === 'male' ? "پدر" : "مادر");
        }
    }
    
    return relationshipString;
};

export const flattenTree = (
  node: Person,
  depth: number = 0,
  parentId: string | null = null,
  fatherName?: string,
  grandFatherName?: string,
  parentGender?: 'male' | 'female'
): ExtendedPerson[] => {
  const members: ExtendedPerson[] = [];
  members.push({ ...node, depth, parentId, fatherName, grandFatherName, parentGender });
  
  if (node.children) {
    node.children.forEach(child => {
      members.push(...flattenTree(child, depth + 1, node.id, node.name, fatherName, getDerivedGender(node)));
    });
  }
  
  return members;
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
  const findNode = (node: Person, id: string): Person | null => {
    if (node.id === id) return node;
    if (node.children) {
      for (const c of node.children) {
        const found = findNode(c, id);
        if (found) return found;
      }
    }
    return null;
  };

  const nodeToMove = findNode(root, childId);
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
