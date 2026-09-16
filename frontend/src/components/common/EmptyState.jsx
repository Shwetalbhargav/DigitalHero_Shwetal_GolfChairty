export default function EmptyState({
  title = 'Nothing here yet',
  description,
  action,
  headingLevel = 'h3',
}) {
  const Heading = headingLevel;
  return (
    <div className="feedback feedback--empty">
      <span className="feedback__icon" aria-hidden="true">
        ◇
      </span>
      <Heading>{title}</Heading>
      {description && <p>{description}</p>}
      {action && <div className="feedback__action">{action}</div>}
    </div>
  );
}
