/**
 * The card on file through Stripe.js (October 28, 2026): the card number,
 * expiry and CVC are typed into Stripe's own card Element (an iframe Stripe
 * serves) and turned into a `tok_…` token with the account's publishable
 * key; only that token goes to the Pynwheel server, which keeps the Stripe
 * customer id and the last four digits (`Verification::Card`). The card
 * never passes through this app's state, storage or logs. Stripe.js is
 * loaded from js.stripe.com only when the card step is shown.
 */

export interface StripeCardElement {
  mount(target: HTMLElement): void;
  unmount(): void;
  destroy(): void;
  on(event: 'change', handler: (event: { complete: boolean; error?: { message: string } }) => void): void;
}

export interface StripeInstance {
  elements(): { create(type: 'card', options?: Record<string, unknown>): StripeCardElement };
  createToken(element: StripeCardElement): Promise<{ token?: { id: string; card?: { last4?: string } }; error?: { message?: string } }>;
}

type StripeFactory = (publishableKey: string) => StripeInstance;

declare global {
  interface Window {
    Stripe?: StripeFactory;
  }
}

const STRIPE_JS = 'https://js.stripe.com/v3/';
let loading: Promise<StripeFactory> | null = null;

/** Stripe.js, loaded once; rejects when the script cannot be fetched (offline, a blocked host). */
export const loadStripeJs = (): Promise<StripeFactory> => {
  if (typeof window !== 'undefined' && window.Stripe) return Promise.resolve(window.Stripe);
  if (loading) return loading;
  loading = new Promise<StripeFactory>((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('stripe_unavailable'));
      return;
    }
    const script = document.createElement('script');
    script.src = STRIPE_JS;
    script.async = true;
    script.onload = () => (window.Stripe ? resolve(window.Stripe) : reject(new Error('stripe_unavailable')));
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error('stripe_unavailable'));
    };
    document.head.appendChild(script);
  });
  return loading;
};

export const CARD_ELEMENT_STYLE = {
  base: { fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', fontSize: '16px', color: '#111', '::placeholder': { color: '#9aa0a6' } },
  invalid: { color: '#c62828' }
};

/** Tokenizes the card in the Element; the message is Stripe's own when it refuses. */
export const tokenizeCard = async (stripe: StripeInstance, element: StripeCardElement): Promise<{ token: string } | { error: string }> => {
  const result = await stripe.createToken(element);
  if (result.error || !result.token) return { error: result.error?.message || 'The card could not be read. Please check it and try again.' };
  return { token: result.token.id };
};
