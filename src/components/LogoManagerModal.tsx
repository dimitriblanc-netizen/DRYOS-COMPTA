import React, { useState, useRef } from 'react';
import { X, UploadCloud, Image as ImageIcon, Check, Trash2, ShieldCheck, Sparkles } from 'lucide-react';

interface LogoManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLogoUrl?: string | null;
  onSaveLogo: (logoUrl: string | null) => void;
  onShowToast: (text: string, type?: 'success' | 'info') => void;
}

export const LogoManagerModal: React.FC<LogoManagerModalProps> = ({
  isOpen,
  onClose,
  currentLogoUrl,
  onSaveLogo,
  onShowToast,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl || null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      onShowToast('Veuillez sélectionner un fichier image valide (PNG, SVG, JPG)', 'info');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreviewUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSave = () => {
    onSaveLogo(previewUrl);
    onShowToast('Logo officiel du Groupe DRYOS enregistré !', 'success');
    onClose();
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onSaveLogo(null);
    onShowToast('Logo réinitialisé au blason par défaut DRYOS', 'info');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-950 text-white flex items-center justify-center shadow-xs">
              <ImageIcon className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Logo Officiel du Groupe DRYOS</h3>
              <p className="text-xs text-slate-500">Ajoutez ou modifiez le logo du groupe pour l'en-tête, l'organigramme et les exports.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drop zone / preview */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/50'
              : previewUrl
              ? 'border-emerald-300 bg-slate-50'
              : 'border-slate-300 bg-slate-50 hover:bg-slate-100/70'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileChange(e.target.files[0]);
              }
            }}
          />

          {previewUrl ? (
            <div className="space-y-3">
              <div className="w-28 h-28 mx-auto p-2 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden">
                <img src={previewUrl} alt="Aperçu logo DRYOS" className="max-w-full max-h-full object-contain" />
              </div>
              <p className="text-xs font-semibold text-emerald-800">
                Aperçu du logo chargé • Cliquez ou glissez pour remplacer
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-100/70 text-indigo-700 flex items-center justify-center">
                <UploadCloud className="w-8 h-8" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">Déposez votre logo ici</p>
                <p className="text-xs text-slate-500">ou cliquez pour sélectionner un fichier (SVG, PNG ou JPG)</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-3.5 text-xs text-indigo-950 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
          <p>
            Dès validation, le logo sera affiché instantanément dans la barre supérieure de <strong>Compta DRYOS</strong>, sur l'organigramme officiel et lors des sorties d'impression.
          </p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          {previewUrl ? (
            <button
              type="button"
              onClick={handleRemove}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Supprimer le logo</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs cursor-pointer"
            >
              Appliquer le logo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
