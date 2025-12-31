
import React, { useState, useEffect } from 'react';
import { Person } from '../types';
import { ExtendedPerson } from '../utils/genealogy';
import { useAuthContext } from '../context/AuthContext';
import ProfileView from './PersonProfileView';
import EditForm from './PersonEditForm';

interface PersonDetailsProps {
  person: Person | null;
  allMembers: ExtendedPerson[]; 
  searchScopeMembers?: ExtendedPerson[]; 
  onClose: () => void;
  onUpdate: (id: string, updatedFields: Partial<Person>) => void;
  onAddChild: (parentId: string, childName: string) => void;
  onAddExistingChild: (parentId: string, childId: string) => void;
  onDelete?: (id: string) => void; 
  onMoveSubtree?: (nodeId: string, newParentId: string) => void;
  onExtractSubtree?: (personId: string) => void;
  onLoginSuccess: () => void;
  canEdit?: boolean;
}

const PersonDetails: React.FC<PersonDetailsProps> = ({ 
  person, allMembers, searchScopeMembers, onClose, onUpdate, onAddChild, onAddExistingChild, 
  onDelete, onMoveSubtree, onExtractSubtree, onLoginSuccess, canEdit = false 
}) => {
  const { isAuthenticated } = useAuthContext();
  const [isEditing, setIsEditing] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [formData, setFormData] = useState<Partial<Person>>({});
  const [newChildName, setNewChildName] = useState('');
  const [existingChildSearch, setExistingChildSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // If searchScopeMembers is provided (from connected tabs), use it. Otherwise fallback to allMembers (current tab).
  const searchableMembers = searchScopeMembers || allMembers;

  useEffect(() => {
    if (person) {
      setFormData({
        name: person.name, surname: person.surname || '', gender: person.gender || 'male', mobile: person.mobile || '', email: person.email || '', imageUrl: person.imageUrl || '', avatarIndex: person.avatarIndex, birthDate: person.birthDate || '', deathDate: person.deathDate || '', title: person.title || '', spouseName: person.spouseName || '', spouseId: person.spouseId, secondSpouseName: person.secondSpouseName || '', secondSpouseId: person.secondSpouseId, description: person.description || '', status: person.status || [], sharedChildren: person.sharedChildren || [], children: person.children || []
      });
      setIsEditing(false); setShowLogin(false); setNewChildName(''); setExistingChildSearch(''); setDeleteConfirm(false); 
    }
  }, [person]);

  const handleEditClick = () => {
    if (isAuthenticated) { if (canEdit) setIsEditing(true); else alert("شما دسترسی ویرایش این خاندان را ندارید."); } 
    else setShowLogin(true);
  };
  const handleSave = () => { onUpdate(person!.id, formData); setIsEditing(false); };

  if (!person) return null;

  return (
    <div className="person-details-sidebar fixed inset-y-0 right-0 w-full sm:w-[500px] bg-white/95 backdrop-blur-xl shadow-[-20px_0_50px_rgba(0,0,0,0.1)] z-50 transform transition-all duration-500 ease-out border-l border-slate-200 overflow-y-auto pb-20" dir="rtl" onClick={e => e.stopPropagation()}>
      <div className="p-8 pb-24"> 
        <header className="flex justify-between items-center mb-8 border-b pb-4">
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-amber-100 transition-all">
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          {!isEditing && !showLogin && canEdit && (
            <button onClick={handleEditClick} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-all shadow-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              ویرایش پروفایل
            </button>
          )}
        </header>

        {showLogin ? (
          <div className="space-y-4 animate-in fade-in zoom-in-95">
             <div className="flex gap-3 pt-2"><button onClick={() => setShowLogin(false)} className="px-6 bg-slate-100 text-slate-600 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-all w-full">لغو</button></div>
          </div>
        ) : isEditing ? (
          <EditForm 
            formData={formData} setFormData={setFormData} allMembers={searchableMembers} personId={person.id}
            onSave={handleSave} onCancel={() => setIsEditing(false)} onDelete={onDelete} onMoveSubtree={onMoveSubtree}
            deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm}
          />
        ) : (
          <ProfileView 
            person={person} allMembers={searchableMembers} newChildName={newChildName} setNewChildName={setNewChildName}
            existingChildSearch={existingChildSearch} setExistingChildSearch={setExistingChildSearch}
            onAddChild={onAddChild} onAddExistingChild={onAddExistingChild} isAuthenticated={isAuthenticated}
            canEdit={canEdit} onRequestEdit={() => isAuthenticated ? (canEdit ? setIsEditing(true) : alert("دسترسی ندارید")) : onLoginSuccess()}
            onExtractSubtree={onExtractSubtree}
          />
        )}
      </div>
    </div>
  );
};

export default PersonDetails;
