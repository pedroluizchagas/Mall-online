import { StripeProvider } from '@stripe/stripe-react-native'

export const STRIPE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!

// Usado no _layout.tsx raiz para envolver o app inteiro
export { StripeProvider }
