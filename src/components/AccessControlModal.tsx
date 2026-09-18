import React, { useState } from 'react';
import { AccessControlConfig } from '../types';
import { 
  X, 
  ShieldCheck, 
  Lock, 
  UserCheck, 
  Mail, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Copy, 
  Check, 
  Globe, 
  Smartphone, 
  Users,
  KeyRound,
  Sparkles
} from 'lucide-react';
import { User } from 'firebase/auth';

interface AccessControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessConfig: AccessControlConfig;
  onSaveConfig: (config: AccessControlConfig) => void;
  currentUser: User | null;
}

export const AccessControlModal: React.FC<AccessControlModalProps> = ({
  isOpen,
  onClose,
  accessConfig,
  onSaveConfig,
  currentUser,
}) => {
  const [newEmailInput, setNewEmailInput] = useState('');
  const [restrictedMode, setRestrictedMode] = useState(accessConfig.restrictedMode);
  const [authorizedEmails, setAuthorizedEmails] = useState<string[]>(accessConfig.authorizedEmails);
  const [activeTab, setActiveTab] = useState<'USERS' | 'HOSTING_GUIDE'>('USERS');
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync state if accessConfig changes
  React.useEffect(() => {
    setAuthorizedEmails(accessConfig.authorizedEmails);
    setRestrictedMode(accessConfig.restrictedMode);
  }, [accessConfig]);

  if (!isOpen) return null;

  const appPublicUrl = window.location.origin.includes('run.app')
    ? window.location.origin
    : 'https://ais-pre-wzr4su6qny4nhaowoczgnr-146646501564.europe-west3.run.app';

  const handleAddEmail = (emailToAdd: string) => {
    const clean = emailToAdd.trim().toLowerCase();
    if (!clean || authorizedEmails.some(e => e.toLowerCase() === clean)) return;
    const updated = [...authorizedEmails, clean];
    setAuthorizedEmails(updated);
    onSaveConfig({
      restrictedMode,
      authorizedEmails: updated,
    });
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    // Keep at least dimitri.blanc@dryos.fr
    if (emailToRemove.toLowerCase() === 'dimitri.blanc@dryos.fr') return;
    const updated = authorizedEmails.filter(e => e.toLowerCase() !== emailToRemove.toLowerCase());
    setAuthorizedEmails(updated);
    onSaveConfig({
      restrictedMode,
      authorizedEmails: updated,
    });
  };

  const handleToggleRestrictedMode = (enabled: boolean) => {
    setRestrictedMode(enabled);
    onSaveConfig({
      restrictedMode: enabled,
      authorizedEmails,
    });
  };

  const copyAppUrl = () => {
    navigator.clipboard.writeText(appPublicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Sécurité, Hébergement & Accès Restreint
              </h2>
              <p className="text-xs text-slate-600">
                Gérez qui peut se connecter et découvrez comment accéder à l'application
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('USERS')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'USERS'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Associés & Utilisateurs autorisés</span>
          </button>
          <button
            onClick={() => setActiveTab('HOSTING_GUIDE')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'HOSTING_GUIDE'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Guide d'Hébergement & Sécurité Dryos</span>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {activeTab === 'USERS' ? (
            <>
              {/* Status Banner */}
              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 flex items-start gap-3.5">
                <ShieldCheck className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-indigo-950">
                    Contrôle d'accès strict & Base Dryos protégée
                  </p>
                  <p className="text-indigo-800 mt-0.5 leading-relaxed">
                    Seules les personnes connectées avec une adresse e-mail présente sur cette liste peuvent accéder aux comptes de vos sociétés. Toute autre tentative de connexion est automatiquement bloquée.
                  </p>
                </div>
              </div>

              {/* Central Dryos Base Notice */}
              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <p className="text-[11px] text-emerald-900 leading-relaxed">
                  <strong>Centralisation sur la base Dryos :</strong> Tous les documents et factures sont stockés dans le dossier partagé de l'entreprise Dryos (<span className="font-mono font-semibold">1XQTQInqkLF8S6IQYKRJJq-jNP2CE9WH-</span>). Les fichiers Google Drive personnels des associés connectés ne sont jamais consultés ni reliés.
                </p>
              </div>

              {/* Authorized Users List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900">
                    Comptes Google actuellement autorisés ({authorizedEmails.length})
                  </h3>
                </div>

                <div className="space-y-2">
                  {authorizedEmails.map((email) => {
                    const isOwner = email.toLowerCase() === 'dimitri.blanc@dryos.fr';
                    return (
                      <div
                        key={email}
                        className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                            isOwner ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            <Mail className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-900 font-mono">{email}</p>
                            <span className="text-[10px] text-slate-500">
                              {isOwner ? '👑 Dimitri Blanc (Administrateur Dryos)' : '👥 Associé(e) / Utilisateur autorisé'}
                            </span>
                          </div>
                        </div>

                        {!isOwner && (
                          <button
                            onClick={() => handleRemoveEmail(email)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Retirer l'accès"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add new authorized email */}
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Autoriser un compte Google (Associé, Co-gérant, Expert-comptable)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={newEmailInput}
                      onChange={(e) => setNewEmailInput(e.target.value)}
                      placeholder="ex: associe@dryos.fr ou contact@..."
                      className="flex-1 px-3 py-2 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddEmail(newEmailInput);
                          setNewEmailInput('');
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        handleAddEmail(newEmailInput);
                        setNewEmailInput('');
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Autoriser</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Ce compte pourra se connecter avec son bouton Google officiel et accéder directement aux dossiers de la base Dryos.
                  </p>
                </div>
              </div>
            </>
          ) : (
            /* Hosting & Share Guide Tab */
            <div className="space-y-5 text-xs text-slate-700">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">
                    URL d'accès permanente (Hébergement Cloud Run) :
                  </span>
                  <button
                    onClick={copyAppUrl}
                    className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Lien copié !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copier l'adresse</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-slate-200 font-mono text-[11px] text-slate-800 break-all select-all">
                  {appPublicUrl}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <Globe className="w-4 h-4 text-indigo-600" />
                    <span>Où est hébergée l'application ?</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    L'application est déployée sur l'infrastructure sécurisée <strong>Google Cloud Run</strong> en région Europe. Elle est accessible 24h/24, sans serveur à maintenir chez vous.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span>Accès Mobile & Ordinateur</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Vous et vos associés autorisés pouvez ouvrir l'URL sur n'importe quel navigateur (Chrome, Safari, etc.) sur PC, Mac, iPhone ou Android, et l'ajouter à votre écran d'accueil en raccourci.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
                <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Connexion des associés & Intégrité des données :</span>
                </p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-emerald-900 pl-1">
                  <li>Transmettez le lien de l'application à votre associé(e).</li>
                  <li>La personne clique sur <strong>"Connexion Google"</strong> en haut à droite.</li>
                  <li>Elle choisit son compte Google préalablement autorisé par vous.</li>
                  <li>L'accès est accordé : elle accède uniquement aux dossiers de la <strong>base Dryos partagée</strong> sans qu'aucun de ses fichiers personnels Google Drive ne soit affecté ni relié.</li>
                </ol>
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-mono">
              Utilisateur actif : {currentUser?.email || 'Non connecté'}
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Terminé
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
