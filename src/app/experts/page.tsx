import { redirect } from 'next/navigation';

/** Permanently redirect the old /experts route to /advisors */
export default function ExpertsRedirect() {
  redirect('/advisors');
}
