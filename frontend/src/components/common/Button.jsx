const variants = ['primary', 'secondary', 'ghost', 'danger'];
export default function Button({
  children,
  variant = 'primary',
  size = 'default',
  loading = false,
  loadingText = 'Working…',
  disabled = false,
  type = 'button',
  className = '',
  ...props
}) {
  const style = variants.includes(variant) ? variant : 'primary';
  return (
    <button
      {...props}
      type={type}
      className={[
        'button',
        'button--' + style,
        size === 'small' ? 'button--small' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading && <span className="spinner" aria-hidden="true" />}
      {loading ? loadingText : children}
    </button>
  );
}
