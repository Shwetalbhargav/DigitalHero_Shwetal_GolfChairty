import { expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import Button from './Button.jsx';
import Input from './Input.jsx';
import Modal from './Modal.jsx';
import Loader from './Loader.jsx';
import ErrorState from './ErrorState.jsx';
import ComponentLibrary from '../../pages/foundation/ComponentLibrary.jsx';
test('loading and disabled buttons cannot invoke actions; button defaults to non-submit', async () => {
  const action = vi.fn();
  const user = userEvent.setup();
  render(
    <>
      <Button onClick={action} disabled>
        Disabled
      </Button>
      <Button onClick={action} loading loadingText="Saving…">
        Save
      </Button>
    </>,
  );
  await user.click(screen.getByRole('button', { name: 'Disabled' }));
  await user.click(screen.getByRole('button', { name: 'Saving…' }));
  expect(action).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Saving…' })).toHaveAttribute(
    'aria-busy',
    'true',
  );
  expect(screen.getByRole('button', { name: 'Disabled' })).toHaveAttribute(
    'type',
    'button',
  );
});
test('input joins hints, caller descriptions and validation errors with unique IDs', () => {
  render(
    <>
      <p id="external">Shared guidance.</p>
      <Input
        label="Name"
        hint="Use your name."
        error="Name is required."
        aria-describedby="external"
        required
      />
      <Input label="Other name" />
    </>,
  );
  const input = screen.getByRole('textbox', { name: 'Name' });
  expect(input).toHaveAccessibleDescription(
    'Shared guidance. Use your name. Name is required.',
  );
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(input).toBeRequired();
  expect(input.id).not.toEqual(
    screen.getByRole('textbox', { name: 'Other name' }).id,
  );
});
test('local validation focuses the labelled error and never claims persistence', async () => {
  const user = userEvent.setup();
  render(<ComponentLibrary />);
  await user.click(screen.getByRole('button', { name: 'Validate example' }));
  const field = screen.getByRole('textbox', { name: 'Display name' });
  expect(field).toHaveFocus();
  expect(field).toHaveAccessibleDescription(
    expect.stringContaining('between 2 and 50'),
  );
  await user.type(field, 'Taylor');
  await user.click(screen.getByRole('button', { name: 'Validate example' }));
  expect(
    screen.getByText(/passes local validation. Nothing was saved/),
  ).toBeInTheDocument();
  expect(field).not.toHaveAttribute('aria-invalid');
});
test('dialog traps both tab directions, closes and restores its trigger', async () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open</Button>
        <Modal
          open={open}
          title="Example dialog"
          onClose={() => setOpen(false)}
          footer={<Button onClick={() => setOpen(false)}>Done</Button>}
        >
          <Input label="Note" />
        </Modal>
      </>
    );
  }
  const user = userEvent.setup();
  render(<Harness />);
  const trigger = screen.getByRole('button', { name: 'Open' });
  await user.click(trigger);
  expect(
    screen.getByRole('dialog', { name: 'Example dialog' }),
  ).toBeInTheDocument();
  await user.tab({ shift: true });
  expect(screen.getByRole('button', { name: 'Done' })).toHaveFocus();
  await user.tab();
  expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus();
  await user.tab({ shift: true });
  expect(screen.getByRole('button', { name: 'Done' })).toHaveFocus();
  await user.click(screen.getByRole('button', { name: 'Done' }));
  expect(trigger).toHaveFocus();
  expect(document.body.style.overflow).toBe('');
});
test('loader is announced and retry callbacks are real', async () => {
  const retry = vi.fn();
  const user = userEvent.setup();
  render(
    <>
      <Loader label="Loading records" variant="skeleton" />
      <ErrorState message="Connection lost" onRetry={retry} />
    </>,
  );
  expect(screen.getByRole('status')).toHaveTextContent('Loading records');
  expect(screen.getByRole('alert')).toHaveTextContent('Connection lost');
  await user.click(screen.getByRole('button', { name: 'Try again' }));
  expect(retry).toHaveBeenCalledOnce();
});
