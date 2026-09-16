export default function Card({
  as: Element = 'div',
  tone = 'default',
  className = '',
  children,
  ...props
}) {
  const variant = ['default', 'soft', 'forest', 'outline'].includes(tone)
    ? tone
    : 'default';
  return (
    <Element
      {...props}
      className={['card', 'card--' + variant, className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </Element>
  );
}
