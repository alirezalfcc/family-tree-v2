
import { Person } from '../types';

export interface ExtendedPerson extends Person {
  depth: number;
  parentId: string | null;
  fatherName?: string; // نام والد
  parentGender?: 'male' | 'female'; // جنسیت والد برای تشخیص پدر یا مادر
  grandFatherName?: string;
}

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

// تابع کمکی برای یافتن شخص بر اساس نام (جستجوی فازی)
const findPersonByName = (name: string | undefined, allMembers: ExtendedPerson[]): ExtendedPerson | undefined => {
    if (!name || name.trim().length < 2) return undefined;
    const cleanName = name.trim();
    // ابتدا جستجوی دقیق
    let found = allMembers.find(m => {
        const fullName = `${m.name} ${m.surname || ''}`.trim();
        return fullName === cleanName || m.name === cleanName;
    });
    
    if (!found) {
        // جستجوی شامل بودن
        found = allMembers.find(m => {
             const fullName = `${m.name} ${m.surname || ''}`.trim();
             return fullName.includes(cleanName) || cleanName.includes(fullName);
        });
    }
    return found;
};

/**
 * منطق داخلی محاسبه مسیر و عنوان نسبت بین دو نفر در یک ساختار درختی واحد
 */
const calculateDirectPath = (p1: ExtendedPerson, p2: ExtendedPerson, allMembers: ExtendedPerson[]) => {
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
        return path;
    };

    const path1 = getPath(p1);
    const path2 = getPath(p2);

    let lca: ExtendedPerson | null = null;
    let dist1 = -1;
    let dist2 = -1;

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

    if (!lca) return null;

    const p2IsFemale = getDerivedGender(p2) === 'female';
    let relationshipString = "";

    // --- اولویت با نسبت‌های نزدیک و اصلی ---

    // 1. فرزند / والد
    if (dist1 === 0 && dist2 === 1) return { label: p2IsFemale ? "دختر" : "پسر", distance: 1 };
    if (dist1 === 1 && dist2 === 0) return { label: p2IsFemale ? "مادر" : "پدر", distance: 1 };

    // 2. خواهر / برادر
    if (dist1 === 1 && dist2 === 1) return { label: p2IsFemale ? "خواهر" : "برادر", distance: 2 };

    // 3. نوه / پدربزرگ و مادربزرگ
    if (dist1 === 0 && dist2 === 2) return { label: p2IsFemale ? "نوه (دختری/پسری)" : "نوه (دختری/پسری)", distance: 2 };
    if (dist1 === 2 && dist2 === 0) return { label: p2IsFemale ? "مادربزرگ" : "پدربزرگ", distance: 2 };

    // 4. عمو / عمه / دایی / خاله
    if (dist1 === 2 && dist2 === 1) {
        const p1Parent = path1[1];
        const p1ParentGender = getDerivedGender(p1Parent);
        // اگر والدِ P1 مرد باشد (پدر) -> برادر پدر (عمو) / خواهر پدر (عمه)
        // اگر والدِ P1 زن باشد (مادر) -> برادر مادر (دایی) / خواهر مادر (خاله)
        if (p1ParentGender === 'male') return { label: p2IsFemale ? "عمه" : "عمو", distance: 3 };
        else return { label: p2IsFemale ? "خاله" : "دایی", distance: 3 };
    }

    // 5. برادرزاده / خواهرزاده
    if (dist1 === 1 && dist2 === 2) {
        const p2Parent = path2[1]; // والدِ P2 که خواهر/برادر P1 است
        const p2ParentGender = getDerivedGender(p2Parent);
        if (p2ParentGender === 'male') return { label: p2IsFemale ? "برادرزاده (دختر)" : "برادرزاده (پسر)", distance: 3 };
        else return { label: p2IsFemale ? "خواهرزاده (دختر)" : "خواهرزاده (پسر)", distance: 3 };
    }

    // 6. دخترعمو/پسرعمو/دخترخاله/پسرخاله و ... (First Cousins)
    if (dist1 === 2 && dist2 === 2) {
        const p1Parent = path1[1];
        const p2Parent = path2[1];
        const p1ParentGender = getDerivedGender(p1Parent);
        const p2ParentGender = getDerivedGender(p2Parent);
        
        const childTitle = p2IsFemale ? "دختر" : "پسر";
        
        if (p1ParentGender === 'male') { 
             // سمت پدری
             if (p2ParentGender === 'male') return { label: `${childTitle} عمو`, distance: 4 };
             else return { label: `${childTitle} عمه`, distance: 4 };
        } else { 
             // سمت مادری
             if (p2ParentGender === 'male') return { label: `${childTitle} دایی`, distance: 4 };
             else return { label: `${childTitle} خاله`, distance: 4 };
        }
    }

    // --- محاسبات دورتر ---
    if (dist1 === 0 && dist2 > 2) relationshipString = `نوه (نتیجه - نسل ${dist2}م)`;
    else if (dist2 === 0 && dist1 > 2) relationshipString = `جد (${dist1} نسل قبل)`;
    else {
        // Generic recursive naming
        for (let i = 0; i < dist2 - 1; i++) {
            const currentPerson = path2[i];
            const gender = getDerivedGender(currentPerson);
            relationshipString += gender === 'female' ? "دخترِ " : "پسرِ ";
        }

        const p1RootRelative = path1[dist1 - 1];
        const p2RootRelative = path2[dist2 - 1];

        if (dist1 === 1) {
            const siblingGender = getDerivedGender(p2RootRelative);
            relationshipString += siblingGender === 'female' ? "خواهر" : "برادر";
        } else {
            const p1RootGender = getDerivedGender(p1RootRelative);
            const p2RootGender = getDerivedGender(p2RootRelative);
            let baseTitle = "";
            if (p1RootGender === 'male') baseTitle = p2RootGender === 'male' ? "عمو" : "عمه";
            else baseTitle = p2RootGender === 'male' ? "دایی" : "خاله";
            
            relationshipString += baseTitle;

            if (dist1 > 2) {
                for (let k = dist1 - 2; k >= 1; k--) {
                    const ancestor = path1[k];
                    const g = getDerivedGender(ancestor);
                    relationshipString += "ِ " + (g === 'male' ? "پدر" : "مادر");
                }
            }
        }
    }

    return { label: relationshipString, distance: dist1 + dist2 };
};

/**
 * الگوریتم پیشرفته محاسبه نسبت فامیلی فارسی
 * با قابلیت بررسی همسران و مسیرهای اصلی
 */
export const findRelationship = (p1: ExtendedPerson, p2: ExtendedPerson, allMembers: ExtendedPerson[]): string => {
    if (p1.id === p2.id) return "این خود شخص است!";

    // 0. بررسی مستقیم همسری (اولویت اول)
    if (p1.spouseId === p2.id || p2.spouseId === p1.id || (p1.secondSpouseId && p1.secondSpouseId === p2.id) || (p2.secondSpouseId && p2.secondSpouseId === p1.id)) {
        return "همسر";
    }
    // اگر ID ست نشده بود، چک کردن نام
    const normalize = (s?: string) => s?.trim().toLowerCase();
    if (p1.spouseName && (normalize(p1.spouseName) === normalize(p2.name) || normalize(p1.spouseName) === normalize(getFullIdentityLabel(p2)))) return "همسر";
    if (p2.spouseName && (normalize(p2.spouseName) === normalize(p1.name) || normalize(p2.spouseName) === normalize(getFullIdentityLabel(p1)))) return "همسر";


    const results: string[] = [];

    // 1. محاسبه مسیر مستقیم (ساختاری/پدری)
    const directResult = calculateDirectPath(p1, p2, allMembers);
    if (directResult) {
        // حذف پیشوند و افزودن نتیجه مستقیم
        results.push(directResult.label);
        
        // اصلاح مهم: اگر نسبت مستقیم و نزدیک (فاصله کم) پیدا شد، همان را برگردان و مسیرهای پیچیده مادری/همسری را چک نکن.
        // فاصله 4 شامل فرزند، والد، خواهر/برادر، نوه، پدربزرگ/مادربزرگ، عمو/عمه/دایی/خاله و فرزندانشان است.
        if (directResult.distance <= 4) {
            return directResult.label;
        }
    }

    // 2. محاسبه مسیرهای غیرمستقیم از طریق همسران والد (مادر، نامادری و...)
    // فقط اگر نتیجه مستقیم خیلی دور بود یا پیدا نشد، این بخش اجرا شود
    if (p1.parentId) {
        const structuralParent = allMembers.find(m => m.id === p1.parentId);
        if (structuralParent) {
            // لیست همسران والد (نام همسر اول و دوم)
            const spousesToCheck = [
                { name: structuralParent.spouseName, label: 'مادر/همسر اول پدر' },
                { name: structuralParent.secondSpouseName, label: 'مادر/همسر دوم پدر' }
            ];

            spousesToCheck.forEach(spouseInfo => {
                if (spouseInfo.name) {
                    // یافتن نود همسر در درخت
                    const spouseNode = findPersonByName(spouseInfo.name, allMembers);
                    if (spouseNode) {
                        // اگر خود همسر والد، شخص دوم باشد
                        if (spouseNode.id === p2.id) {
                             results.push("مادر (همسر پدر)");
                             return;
                        }

                        // محاسبه نسبت بین همسر والد و نفر دوم
                        const spouseResult = calculateDirectPath(spouseNode, p2, allMembers);
                        
                        if (spouseResult) {
                            // اگر نتیجه محاسبات مادری هم خیلی دور بود، نادیده بگیر تا گیج کننده نشود
                            if (spouseResult.distance > 5) return;

                            // تبدیل نسبت: اگر P2 نسبت X با مادر P1 دارد، چه نسبتی با P1 دارد؟
                            let relationLabel = spouseResult.label;
                            
                            // تبدیل‌های خاص مادری
                            let adjustedLabel = relationLabel;
                            if (relationLabel === 'برادر') adjustedLabel = 'دایی';
                            else if (relationLabel === 'خواهر') adjustedLabel = 'خاله';
                            else if (relationLabel === 'پدر') adjustedLabel = 'پدربزرگ (مادری)';
                            else if (relationLabel === 'مادر') adjustedLabel = 'مادربزرگ (مادری)';
                            
                            // اگر P2 فرزند دایی/خاله باشد (پسر دایی/دختر دایی...)
                            else if (relationLabel.includes('دایی') || relationLabel.includes('خاله') || relationLabel.includes('عمو') || relationLabel.includes('عمه')) {
                                if (relationLabel.includes('برادرزاده')) {
                                    adjustedLabel = relationLabel.replace('برادرزاده', '').trim() + ' دایی';
                                } else if (relationLabel.includes('خواهرزاده')) {
                                    adjustedLabel = relationLabel.replace('خواهرزاده', '').trim() + ' خاله';
                                }
                            }

                            // تشخیص اینکه کدام مادر است (نامش را در پرانتز می‌آوریم)
                            const sourceLabel = `از طرف مادر (${spouseInfo.name})`;
                            results.push(`${sourceLabel}: ${adjustedLabel}`);
                        }
                    }
                }
            });
        }
    }

    if (results.length === 0) return "نسبت خونی مستقیم یا سببی نزدیک یافت نشد.";
    
    // نمایش نتایج یکتا
    return Array.from(new Set(results)).join('\n');
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
