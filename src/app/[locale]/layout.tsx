
import { redirect } from 'next/navigation';

// This layout is part of a removed internationalization setup.
// It now redirects all requests to the root of the site.
export default function LocaleLayout() {
  redirect('/');
}
