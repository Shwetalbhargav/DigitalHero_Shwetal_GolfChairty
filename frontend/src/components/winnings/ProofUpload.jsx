import { useEffect, useRef, useState } from 'react';
import Button from '../common/Button.jsx';
import { uploadProof } from '../../modules/winnings/winnings.api.js';
export function validateProofFile(file) {
  if (!file) return 'Choose a proof image.';
  if (!['image/png', 'image/jpeg'].includes(file.type))
    return 'Choose a PNG or JPEG image.';
  if (!file.size || file.size > 5 * 1024 * 1024)
    return 'Choose an image between 1 byte and 5 MB.';
  return null;
}
export default function ProofUpload({ winning, onSaved }) {
  const [file, setFile] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0);
  const pending = useRef(false);
  const errorRef = useRef(null);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  async function submit(event) {
    event.preventDefault();
    if (pending.current) return;
    const invalid = validateProofFile(file);
    setError(invalid || '');
    if (invalid) return;
    pending.current = true;
    setBusy(true);
    setProgress(0);
    try {
      await uploadProof(winning.id, file, setProgress);
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="stack-form">
      <h2>
        {winning.verification === 'rejected'
          ? 'Resubmit winning proof'
          : 'Submit winning proof'}
      </h2>
      <p>
        One clear PNG or JPEG scorecard image, up to 5 MB. Images are checked
        and metadata removed on the server. Maximum five submissions; resubmit
        only after rejection.
      </p>
      <p>
        {winning.proofStorage === 'local'
          ? 'Local development storage — this is not a Cloudinary upload.'
          : 'Private authenticated evidence storage.'}
      </p>
      {error && (
        <p role="alert" tabIndex={-1} ref={errorRef}>
          {error}
        </p>
      )}
      <label>
        Winning scorecard proof
        <input
          type="file"
          accept="image/png,image/jpeg"
          disabled={busy}
          onChange={(e) => setFile(e.target.files[0] || null)}
        />
      </label>
      {busy && (
        <div role="status">
          <progress
            max="100"
            value={progress}
            aria-label="Proof upload progress"
          />
          {progress < 100
            ? `Uploading ${progress}%`
            : 'Upload sent; validating and saving evidence…'}
        </div>
      )}
      <Button type="submit" loading={busy}>
        Submit proof for review
      </Button>
    </form>
  );
}
