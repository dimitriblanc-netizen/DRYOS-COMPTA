import React from 'react';
import { User } from 'firebase/auth';
import { ShieldAlert, LogOut, Lock, Mail } from 'lucide-react';

interface AccessRestrictedScreenProps {
  user: User;
  onLogout: () => void;
  authorizedCount: number;
}

export const AccessRestrictedScreen: React.FC<AccessRestrictedScreenProps> = ({
  user,
  onLogout,
  authorizedCount,
}) => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-slate-800/90 border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20">
            Accès Privé Restreint
          </span>
          <h1 className="text-xl font-bold text-white tracking-tight">
            ComptaDrive Groupe
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Cette application contient la comptabilité privée et les factures confidentielles du groupe (Holding SAS, Société Immo SAS et SCI).
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700 text-left space-y-2">
          <p className="text-[11px] text-slate-400">Compte Google actuellement connecté :</p>
          <div className="flex items-center gap-2 font-mono text-xs text-amber-300 break-all font-semibold">
            <Mail className="w-4 h-4 flex-shrink-0" />
            <span>{user.email || 'Adresse inconnue'}</span>
          </div>
          <p className="text-[11px] text-rose-400 pt-1">
            Ce compte Google n'est pas autorisé. Seuls Dimitri Blanc et les associés habilités ont accès à la base Dryos.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-slate-900 hover:bg-slate-100 transition-colors shadow-sm cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Se déconnecter / Changer de compte Google</span>
          </button>
        </div>

        <p className="text-[10px] text-slate-500">
          Pour obtenir l'accès à la comptabilité Dryos, demandez à l'administrateur (dimitri.blanc@dryos.fr) d'ajouter votre adresse Google à la liste des associés autorisés.
        </p>
      </div>
    </div>
  );
};
