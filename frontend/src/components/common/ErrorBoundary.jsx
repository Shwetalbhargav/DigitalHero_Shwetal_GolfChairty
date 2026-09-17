import { Component, createRef } from 'react';
export default class ErrorBoundary extends Component {
  state = { failed: false };
  heading = createRef();
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.heading.current?.focus();
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="page-container">
        <h1 ref={this.heading} tabIndex={-1}>
          This page could not be displayed
        </h1>
        <p>
          No action has been retried. Reloading may discard unsaved input. Check
          your payment or draw status before submitting an action again.
        </p>
        <button type="button" onClick={() => window.location.reload()}>
          Reload page
        </button>{' '}
        <a href="/">Return to homepage</a>
      </main>
    );
  }
}
