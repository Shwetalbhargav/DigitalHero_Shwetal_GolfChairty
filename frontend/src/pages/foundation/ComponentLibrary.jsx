import { useRef, useState } from 'react';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import Card from '../../components/common/Card.jsx';
import Badge from '../../components/common/Badge.jsx';
import Modal from '../../components/common/Modal.jsx';
import Loader from '../../components/common/Loader.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import SectionTitle from '../../components/common/SectionTitle.jsx';
export default function ComponentLibrary() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [validated, setValidated] = useState('');
  const [selected, setSelected] = useState('primary');
  const inputRef = useRef(null);
  const fieldRef = useRef(null);
  function validate(event) {
    event.preventDefault();
    const value = name.trim();
    if (value.length < 2 || value.length > 50) {
      setError('Enter a display name between 2 and 50 characters.');
      setValidated('');
      fieldRef.current.focus();
      return;
    }
    setError('');
    setValidated(
      'The name “' + value + '” passes local validation. Nothing was saved.',
    );
  }
  return (
    <div className="stack stack--large">
      <SectionTitle
        as="h1"
        eyebrow="COMPONENT LIBRARY · B02"
        title="Small details. A shared language."
        description="Reusable controls, calm feedback and responsive foundations. All examples on this page are labelled demonstrations."
        action={<Badge variant="info">Interactive reference</Badge>}
      />
      <nav className="section-jumps" aria-label="Component sections">
        <a href="#controls">Controls</a>
        <a href="#forms">Form fields</a>
        <a href="#feedback">Feedback</a>
        <a href="#dialogs">Dialogs</a>
      </nav>
      <section aria-labelledby="tokens-title">
        <SectionTitle
          id="tokens-title"
          eyebrow="01 / VISUAL FOUNDATION"
          title="Grounded in green."
          description="Sage surfaces, forest accents and warm, legible typography."
        />
        <div className="token-grid">
          {[
            ['Canvas', 'surface'],
            ['Deep forest', 'primary'],
            ['Soft sage', 'soft'],
            ['Charcoal', 'ink'],
            ['Error', 'error'],
          ].map(([label, tone]) => (
            <div className="token" key={tone}>
              <span className={'swatch swatch--' + tone} />
              <strong>{label}</strong>
              <small>{tone}</small>
            </div>
          ))}
        </div>
      </section>
      <section id="controls" aria-labelledby="controls-title">
        <SectionTitle
          id="controls-title"
          eyebrow="02 / ACTIONS & STATUS"
          title="A clear next step."
          description="Select an action style to inspect it. Disabled and busy examples cannot be activated."
        />
        <Card tone="soft">
          <div className="button-row">
            {['primary', 'secondary', 'ghost', 'danger'].map((variant) => (
              <Button
                key={variant}
                variant={variant}
                aria-pressed={selected === variant}
                onClick={() => setSelected(variant)}
              >
                {variant.charAt(0).toUpperCase() + variant.slice(1)} action
              </Button>
            ))}
            <Button disabled>Unavailable</Button>
            <Button loading loadingText="Loading example">
              Busy action
            </Button>
          </div>
          <p className="small muted" role="status">
            Selected style: {selected}. This control only changes the example
            selection.
          </p>
          <div className="badge-row">
            {['neutral', 'success', 'warning', 'error', 'info'].map(
              (variant) => (
                <Badge key={variant} variant={variant}>
                  {variant.charAt(0).toUpperCase() + variant.slice(1)} example
                </Badge>
              ),
            )}
          </div>
        </Card>
      </section>
      <section id="forms" aria-labelledby="forms-title">
        <SectionTitle
          id="forms-title"
          eyebrow="03 / LABELS & VALIDATION"
          title="Helpful at every step."
          description="A local form example with explicit labels, hints and inline errors."
        />
        <Card>
          <form noValidate onSubmit={validate}>
            <div className="two-grid">
              <Input
                ref={fieldRef}
                label="Display name"
                name="displayName"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setError('');
                  setValidated('');
                }}
                hint="Required. Use 2–50 characters. This example does not save a profile."
                error={error}
                required
                autoComplete="off"
              />
              <Input
                label="Membership reference"
                value="Not connected"
                disabled
                hint="Example of an unavailable field."
              />
            </div>
            <div className="form-actions">
              <Button type="submit">Validate example</Button>
              <p role="status" className="small">
                {validated}
              </p>
            </div>
          </form>
        </Card>
      </section>
      <section id="feedback" aria-labelledby="feedback-title">
        <SectionTitle
          id="feedback-title"
          eyebrow="04 / SYSTEM FEEDBACK"
          title="Every state deserves care."
          description="Static component examples below; service status in the navigation uses the real API."
        />
        <div className="three-grid">
          <Card>
            <Badge>Loading example</Badge>
            <h3>A little work in progress</h3>
            <Loader label="Loading example content…" variant="skeleton" />
          </Card>
          <Card>
            <Badge>Empty example</Badge>
            <EmptyState
              title="No records to show"
              description="Explain what belongs here and offer a next step only when it is available."
            />
          </Card>
          <Card>
            <Badge variant="error">Error example</Badge>
            <ErrorState
              title="Unable to load this example"
              message="Keep the reason readable and recovery close at hand."
            />
          </Card>
        </div>
      </section>
      <section id="dialogs" aria-labelledby="dialogs-title">
        <SectionTitle
          id="dialogs-title"
          eyebrow="05 / FOCUSED INTERACTIONS"
          title="A moment to focus."
          description="Open the dialog with a keyboard. Tab stays inside; Escape closes it and returns focus."
        />
        <Card tone="soft" className="dialog-preview">
          <div>
            <h3>Space for a considered action</h3>
            <p className="muted">
              Named dialog, visible focus and a clear way back.
            </p>
          </div>
          <Button onClick={() => setOpen(true)}>Open example dialog</Button>
        </Card>
      </section>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="A moment to focus"
        description="This is a dialog demonstration. Nothing entered here is stored or submitted."
        initialFocusRef={inputRef}
        footer={
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Close example
          </Button>
        }
      >
        <Input
          ref={inputRef}
          label="Example note"
          placeholder="Try keyboard navigation"
          hint="Tab moves between this field and the close buttons."
        />
      </Modal>
    </div>
  );
}
