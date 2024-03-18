import type { ActionFunctionArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useActionData, useNavigation } from '@remix-run/react';

import { Button } from '~/components/buttons';
import { Card } from '~/components/containers';
import { Form, Input } from '~/components/forms';
import { H1 } from '~/components/headings';
import { InlineError } from '~/components/texts';
import { createUserSession, loginUser } from '~/modules/session/session.server';

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const { email, password } = Object.fromEntries(formData);

  if (!email || !password) {
    return json({
      error: 'Please fill out all fields.',
    });
  }

  if (typeof email !== 'string' || typeof password !== 'string') {
    throw new Error('Invalid form data.');
  }

  try {
    const user = await loginUser({ email, password });
    return redirect('/dashboard', {
      headers: await createUserSession(user),
    });
  } catch (error: any) {
    return json({
      error: error?.message ?? 'Something went wrong.',
    });
  }
}

export default function Component() {
  const navigation = useNavigation();
  const isSubmitting = navigation.state !== 'idle' && navigation.formAction === '/login';

  const actionData = useActionData<typeof action>();

  return (
    <Card>
      <Form method="POST" action="/login">
        <H1>Sign Up</H1>
        <Input label="Email:" name="email" required />
        <Input label="Password:" name="password" type="password" required />
        <Button disabled={isSubmitting} type="submit" isPrimary>
          {isSubmitting ? 'Logging you up...' : 'Log in!'}
        </Button>
        {actionData?.error && <InlineError aria-live="assertive">{actionData.error}</InlineError>}
      </Form>
    </Card>
  );
}
