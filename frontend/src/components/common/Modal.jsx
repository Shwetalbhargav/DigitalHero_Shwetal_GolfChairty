import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import Button from './Button.jsx';
// Multiple dialogs can share the scroll lock without releasing one another's lock.
let locks = 0;
let previousOverflow = '';
export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  initialFocusRef,
  className = '',
}) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    dialog.showModal();
    if (locks++ === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    const target =
      initialFocusRef?.current || dialog.querySelector('[data-modal-title]');
    (target || dialog).focus();
    return () => {
      dialog.close();
      if (--locks === 0) document.body.style.overflow = previousOverflow;
      // Restore the trigger on cancel/close, including when the dialog unmounts.
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open, initialFocusRef]);
  function trapFocus(event) {
    if (event.key !== 'Tab') return;
    const dialog = dialogRef.current;
    const items = [
      ...dialog.querySelectorAll(
        'a[href],button,input,select,textarea,[tabindex]',
      ),
    ].filter((element) => {
      if (
        element.tabIndex < 0 ||
        element.matches(':disabled') ||
        element.closest('[hidden],[inert]')
      )
        return false;
      // Hidden containers must not leave an invisible control at a trap boundary.
      for (
        let ancestor = element;
        ancestor && ancestor !== dialog;
        ancestor = ancestor.parentElement
      ) {
        const style = getComputedStyle(ancestor);
        if (style.display === 'none' || style.visibility === 'hidden')
          return false;
      }
      return true;
    });
    const first = items[0],
      last = items.at(-1);
    if (!first) {
      event.preventDefault();
      dialog.focus();
      return;
    }
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        !items.includes(document.activeElement))
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === last ||
        !items.includes(document.activeElement))
    ) {
      event.preventDefault();
      first.focus();
    }
  }
  return createPortal(
    <dialog
      ref={dialogRef}
      className={['modal', className].filter(Boolean).join(' ')}
      tabIndex={-1}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={trapFocus}
    >
      <div className="modal__header">
        <h2 id={titleId} data-modal-title tabIndex={-1}>
          {title}
        </h2>
        <Button variant="ghost" onClick={onClose} aria-label="Close dialog">
          ×
        </Button>
      </div>
      {description && (
        <p className="muted" id={descriptionId}>
          {description}
        </p>
      )}
      <div className="modal__body">{children}</div>
      {footer && <div className="modal__footer">{footer}</div>}
    </dialog>,
    document.body,
  );
}
