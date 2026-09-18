import React, { useState } from 'react';
import { X, Download, Laptop, Smartphone, Check, Sparkles, Monitor, Copy, QrCode, Share2, ExternalLink, ShieldCheck } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, isMac, isWindows, install } = usePWAInstall();
  const [copied, setCopied] = useState(false);
  const [showQrCode, setShowQrCode] = useState(true);

  if (!isOpen) return null;

  const appUrl = typeof window !== 'undefined' ? window.location.href : '';
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(appUrl || appOrigin)}`;

  const handleNativeInstall = async () => {
    const success = await install();
    if (success) {
      onClose();
    }
  };

  const handleCopyLink = () => {
    if (navigator.clipboard && (appUrl || appOrigin)) {
      navigator.clipboard.writeText(appUrl || appOrigin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleOpenInNewTab = () => {
    if (typeof window !== 'undefined') {
      window.open(window.location.href, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-slate-100 relative space-y-4 max-h-[92vh] overflow-y-auto"
        id="pwa-install-modal"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          title="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* App Logo & Header */}
        <div className="flex items-center gap-3.5 pr-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-900 p-1.5 shadow-md flex-shrink-0 flex items-center justify-center overflow-hidden border border-indigo-700">
            <img 
              src="/pwa-192x192.png" 
              alt="Logo ComptaDrive" 
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Installer ComptaDrive</h2>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Check className="w-3 h-3" />
                PWA Prête
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Installez ComptaDrive sur votre smartphone ou PC pour un accès plein écran direct comme une vraie app native.
            </p>
          </div>
        </div>

        {/* Alert if inside an iFrame (AI Studio Preview) */}
        {isInIframe && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2.5">
            <div className="flex items-center gap-2 text-amber-950 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>Pourquoi le téléchargement direct ne démarre pas ici ?</span>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed">
              Vous consultez l'application dans la <strong>fenêtre d'aperçu AI Studio (cadre intégré)</strong>. Par sécurité, les navigateurs (Chrome, Safari, Edge) <strong>interdisent l'installation d'une application depuis un cadre intégré</strong>.
            </p>
            <p className="text-[11px] text-amber-800">
              👉 Il vous suffit d'ouvrir l'application dans un <strong>nouvel onglet</strong> pour que le bouton d'installation apparaisse immédiatement !
            </p>
            <button
              onClick={handleOpenInNewTab}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Ouvrir dans un nouvel onglet pour installer</span>
            </button>
          </div>
        )}

        {/* Status: Already installed */}
        {isInstalled ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-900">Application déjà installée !</p>
              <p className="text-[11px] text-emerald-700">
                ComptaDrive est déjà configuré comme application autonome sur votre appareil.
              </p>
            </div>
          </div>
        ) : isInstallable ? (
          /* One-click native installation (triggered by browser) */
          <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100/60 rounded-2xl border border-indigo-200/80 space-y-2.5">
            <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Installation directe 1-clic disponible</span>
            </div>
            <p className="text-xs text-indigo-900 leading-relaxed">
              Votre navigateur prend en charge l'installation directe de ComptaDrive.
            </p>
            <button
              onClick={handleNativeInstall}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Installer ComptaDrive sur mon appareil</span>
            </button>
          </div>
        ) : null}

        {/* Logos & Assets Certification */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Logos & Manifest certifiés conformes</span>
            </span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
              Tous formats présents
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2 pt-1">
            <div className="p-2 bg-white rounded-xl border border-slate-200 flex flex-col items-center text-center gap-1">
              <img src="/pwa-192x192.png" alt="192x192" className="w-7 h-7 rounded-lg object-contain shadow-2xs" />
              <span className="text-[9px] font-mono text-slate-600 font-semibold">192x192 PNG</span>
            </div>
            <div className="p-2 bg-white rounded-xl border border-slate-200 flex flex-col items-center text-center gap-1">
              <img src="/pwa-512x512.png" alt="512x512" className="w-7 h-7 rounded-lg object-contain shadow-2xs" />
              <span className="text-[9px] font-mono text-slate-600 font-semibold">512x512 HD</span>
            </div>
            <div className="p-2 bg-white rounded-xl border border-slate-200 flex flex-col items-center text-center gap-1">
              <img src="/apple-touch-icon.png" alt="Apple Touch Icon" className="w-7 h-7 rounded-lg object-contain shadow-2xs" />
              <span className="text-[9px] font-mono text-slate-600 font-semibold">Apple iOS</span>
            </div>
            <div className="p-2 bg-white rounded-xl border border-slate-200 flex flex-col items-center text-center gap-1">
              <img src="/icon.svg" alt="Vectoriel SVG" className="w-7 h-7 rounded-lg object-contain shadow-2xs" />
              <span className="text-[9px] font-mono text-slate-600 font-semibold">Vectoriel SVG</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500">
            <span>Manifest : <code>manifest.webmanifest</code> &amp; <code>manifest.json</code></span>
            <a 
              href="/pwa-512x512.png" 
              download="comptadrive-logo-512x512.png"
              className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              <span>Télécharger le logo PNG</span>
            </a>
          </div>
        </div>

        {/* QR Code & Direct Mobile Link */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Smartphone className="w-4 h-4 text-indigo-600" />
              <span>Installer sur votre Smartphone</span>
            </div>
            <button
              onClick={() => setShowQrCode(!showQrCode)}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{showQrCode ? 'Masquer le QR' : 'Afficher le QR'}</span>
            </button>
          </div>

          {showQrCode && (
            <div className="flex flex-col sm:flex-row items-center justify-center p-3.5 bg-white rounded-xl border border-slate-200 gap-3">
              <img
                src={qrCodeUrl}
                alt="QR Code d'accès ComptaDrive"
                className="w-32 h-32 rounded-lg border border-slate-100 flex-shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="text-xs text-slate-600 space-y-1 text-center sm:text-left">
                <p className="font-bold text-slate-900">
                  Pointez l'appareil photo de votre téléphone :
                </p>
                <p className="text-[11px] leading-relaxed">
                  L'appareil photo de votre iPhone ou Android détecte le lien et vous propose d'ouvrir directement l'application dans Safari ou Chrome.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] text-slate-600 font-mono truncate select-all">
              {appUrl || appOrigin}
            </div>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer flex-shrink-0"
              title="Copier l'URL pour l'envoyer sur votre téléphone"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Copié !</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copier le lien</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Step-by-step per operating system */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Procédure d'installation par appareil :
          </h3>

          <div className="grid grid-cols-1 gap-2 text-xs">
            {/* Mobile iOS / iPhone */}
            <div className={`p-3 rounded-2xl border transition-all ${isIOS ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-slate-800 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Smartphone className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-slate-900 flex items-center gap-2">
                    <span>Sur iPhone &amp; iPad (Navigateur Safari)</span>
                    {isIOS && (
                      <span className="text-[10px] bg-indigo-600 text-white font-semibold px-1.5 py-0.2 rounded">
                        Votre appareil
                      </span>
                    )}
                  </p>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    1. Ouvrez l'adresse dans <strong>Safari</strong> (pas Chrome ni l'app mail).<br />
                    2. Touchez le bouton <strong>Partager 📤</strong> (le carré avec la flèche vers le haut au bas de Safari).<br />
                    3. Choisissez <strong className="text-slate-900">« Sur l'écran d'accueil »</strong> (Add to Home Screen).<br />
                    4. Touchez <strong>Ajouter</strong> en haut à droite : l'icône ComptaDrive apparaît sur votre écran d'accueil !
                  </p>
                </div>
              </div>
            </div>

            {/* Mobile Android */}
            <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-emerald-700 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Smartphone className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-slate-900">Sur Android (Google Chrome ou Samsung Internet)</p>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    1. Ouvrez l'adresse dans Chrome.<br />
                    2. Touchez la bannière <strong className="text-slate-900">« Installer l'application »</strong> ou ouvrez le menu <strong>⋮ &gt; « Installer l'application »</strong> (ou « Ajouter à l'écran d'accueil »).<br />
                    3. L'application est installée directement avec son icône haute résolution.
                  </p>
                </div>
              </div>
            </div>

            {/* Chrome / Edge on PC & Mac */}
            <div className={`p-3 rounded-2xl border transition-all ${isMac || isWindows ? 'border-indigo-200 bg-indigo-50/40' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-slate-900 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Laptop className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-slate-900 flex items-center gap-2">
                    <span>Sur PC &amp; Mac (Chrome, Edge ou Safari)</span>
                    {(isMac || isWindows) && (
                      <span className="text-[10px] bg-indigo-600 text-white font-semibold px-1.5 py-0.2 rounded">
                        Votre ordinateur
                      </span>
                    )}
                  </p>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    1. Ouvrez dans un onglet classique (hors iframe).<br />
                    2. Cliquez sur l'icône <strong className="text-slate-900">Installer</strong> (icône avec flèche) tout à droite dans la barre d'adresse URL.<br />
                    3. Ou Menu Chrome <strong>⋮ &gt; Enregistrer et partager &gt; Installer ComptaDrive</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits reminder */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            Plein écran sans barre navigateur
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            Accès instantané aux 3 structures
          </span>
        </div>
      </div>
    </div>
  );
};
