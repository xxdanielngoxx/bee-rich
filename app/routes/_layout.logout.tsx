import { type ActionFunctionArgs, redirect } from '@remix-run/node';

import { logout } from '~/modules/session/session.server';

export async function action({ request }: ActionFunctionArgs) {
  return logout(request);
}

export async function loader() {
  return redirect('/login');
}
