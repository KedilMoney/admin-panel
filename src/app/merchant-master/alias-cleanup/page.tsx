import { redirect } from 'next/navigation';

export default function AliasCleanupRedirectPage() {
  redirect('/enricher?tab=merchant');
}
