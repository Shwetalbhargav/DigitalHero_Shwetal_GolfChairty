import { useId } from 'react';
export default function Input({
  label,
  id,
  hint,
  error,
  required = false,
  className = '',
  'aria-describedby': describedBy,
  ...props
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const description =
    [describedBy, hint && inputId + '-hint', error && inputId + '-error']
      .filter(Boolean)
      .join(' ') || undefined;
  return (
    <div className={['field', className].filter(Boolean).join(' ')}>
      <label htmlFor={inputId}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <input
        {...props}
        id={inputId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={description}
      />
      {hint && (
        <p className="field__hint" id={inputId + '-hint'}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field__error" id={inputId + '-error'}>
          {error}
        </p>
      )}
    </div>
  );
}
