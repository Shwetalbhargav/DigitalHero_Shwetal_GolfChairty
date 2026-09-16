export default function SectionTitle({
  as: Heading = 'h2',
  eyebrow,
  title,
  description,
  action,
  id,
}) {
  return (
    <div className="section-title">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <Heading id={id}>{title}</Heading>
        {description && <p className="muted">{description}</p>}
      </div>
      {action && <div className="section-title__action">{action}</div>}
    </div>
  );
}
