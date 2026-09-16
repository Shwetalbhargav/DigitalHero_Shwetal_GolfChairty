import Button from './Button.jsx';
export default function ErrorState({
  title = 'Something went wrong',
  message = 'Please try again.',
  requestId,
  onRetry,
  retrying = false,
  headingLevel = 'h3',
}) {
  const Heading = headingLevel;
  return (
    <div className="feedback feedback--error">
      <div role="alert">
        <span className="feedback__icon" aria-hidden="true">
          !
        </span>
        <Heading>{title}</Heading>
        <p>{message}</p>
        {requestId && <p className="request-id">Reference: {requestId}</p>}
      </div>
      {onRetry && (
        <Button
          variant="secondary"
          onClick={onRetry}
          loading={retrying}
          loadingText="Retrying…"
        >
          Try again
        </Button>
      )}
    </div>
  );
}
