import {useEffect, useRef, type ReactNode} from 'react';

export function Modal({titleId, onClose, children, className = ''}: {
  titleId: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const focusable = panel?.querySelector<HTMLElement>('input, textarea, select, button, [href], [tabindex]:not([tabindex="-1"])');
    focusable?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>('input, textarea, select, button, [href], [tabindex]:not([tabindex="-1"])')]
        .filter(item => !item.hasAttribute('disabled') && item.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
      previous?.focus();
    };
  }, [onClose]);

  return <div className="overlay" role="presentation" onMouseDown={onClose}>
    <div
      ref={panelRef}
      className={className}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={event => event.stopPropagation()}
    >
      {children}
    </div>
  </div>;
}
