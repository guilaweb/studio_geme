
import { redirect } from 'next/navigation';

// This page is part of a removed internationalization setup.
// It now redirects all requests to the root of the site.
export default function LocalePage() {
  redirect('/');
}
