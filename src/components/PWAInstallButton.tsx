import React, { useState } from 'react';
import { Download, Laptop } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

interface PWAInstallButtonProps {
  variant?: 'navbar' | 'compact' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'navbar' }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setIsModalOpen(true);
      }
    } else {
      setIsModalOpen(true);
    }
  };

  if (isInstalled) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <>
        <button
          onClick={handleClick}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
          title="Installer l'application sur votre ordinateur ou mobile"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Installer l'app</span>
        </button>
        <PWAInstallModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 border border-indigo-200/70 transition-all shadow-2xs cursor-pointer group"
        title="Télécharger / installer ComptaDrive sur votre appareil (PC & Mobile)"
        id="btn-pwa-install"
      >
        <div className="w-4 h-4 rounded-md bg-indigo-600 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
          <Download className="w-2.5 h-2.5" />
        </div>
        <span className="whitespace-nowrap hidden sm:inline">Télécharger l'app</span>
        <span className="whitespace-nowrap sm:hidden">App</span>
      </button>

      <PWAInstallModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
