import { X } from '@phosphor-icons/react';
import { useEffect, useRef, type ReactNode } from 'react';
import { Brand } from './Brand';

interface OverlayProps {
  label: string;
  onClose: () => void;
  children: ReactNode;
}

export function Overlay({ label, onClose, children }: OverlayProps) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element || element.open) return;
    element.showModal();
    element.querySelector<HTMLElement>('[data-autofocus]')?.focus();
  }, []);

  return (
    <dialog ref={dialog} className="overlay" aria-label={label} onClose={onClose}>
      <div className="overlay__bar">
        <Brand />
        <button className="overlay__close" type="button" onClick={() => dialog.current?.close()}>
          <X size={22} aria-hidden="true" />
          Close
        </button>
      </div>
      {children}
    </dialog>
  );
}
