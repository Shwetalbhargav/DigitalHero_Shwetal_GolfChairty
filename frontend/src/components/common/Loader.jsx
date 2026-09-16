export default function Loader({ label = 'Loading…', variant = 'spinner' }) {
  return (
    <div
      className={
        'loader loader--' + (variant === 'skeleton' ? 'skeleton' : 'spinner')
      }
      role="status"
      aria-live="polite"
    >
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
      {variant === 'skeleton' && (
        <div className="skeleton-lines" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      )}
    </div>
  );
}
