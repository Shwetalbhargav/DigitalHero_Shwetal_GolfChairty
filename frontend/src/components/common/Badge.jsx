export default function Badge({
  children,
  variant = 'neutral',
  className = '',
  ...props
}) {
  const tone = ['neutral', 'success', 'warning', 'error', 'info'].includes(
    variant,
  )
    ? variant
    : 'neutral';
  return (
    <span
      {...props}
      className={['badge', 'badge--' + tone, className]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="badge__dot" aria-hidden="true" />
      {children}
    </span>
  );
}
