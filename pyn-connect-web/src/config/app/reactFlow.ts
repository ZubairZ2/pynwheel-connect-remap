import { baseURLGenerator } from './urls';

/**
 * The React-vs-legacy switch.
 *
 * The reference implementation (`ezofficeinventory`,
 * `ApplicationController#react_supported_controller_action?`) makes this
 * decision inside Rails, because there React and the ERB views are rendered by
 * the same app at the same URL, and the escape hatch is a commented-out
 * `# return false` at the top of that method.
 *
 * Pynwheel Connect is laid out differently: the React flow is a separate Next
 * app and the legacy ERB flow is the Rails app itself, each on its own origin.
 * Nothing in Rails ever chooses between them, so the equivalent switch lives
 * here — same shape, same escape hatch, one place.
 *
 * To force every visitor back to the legacy ERB flow, uncomment the first line.
 * Rails is untouched either way: its HTML routes have never stopped working.
 */
export const reactFlowEnabled = (): boolean => {
  // return false; // legacy ERB fallback — uncomment to force the Rails UI

  return (process.env.PYN_CONNECT_REACT_FLOW ?? 'on').toLowerCase() !== 'off';
};

/** Where a visitor lands when the React flow is switched off. */
export const legacyFlowURL = (): string => baseURLGenerator();
