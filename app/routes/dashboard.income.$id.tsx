import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useActionData, useLoaderData, useNavigation } from '@remix-run/react';

import { Button } from '~/components/buttons';
import { Form, Input, Textarea } from '~/components/forms';
import { FloatingActionLink } from '~/components/links';
import { db } from '~/modules/db.server';

export async function loader({ params }: LoaderFunctionArgs) {
  const { id } = params;

  const income = await db.invoice.findUnique({ where: { id } });

  if (!income) throw new Response('Not found', { status: 404 });

  return json(income);
}

export async function action({ params, request }: ActionFunctionArgs) {
  const { id } = params;
  if (!id) {
    throw Error('id route parameter must be defined');
  }

  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'update') {
    return updateIncome({ id, formData });
  }

  if (intent === 'delete') {
    return deleteIncome({ id, request });
  }

  throw new Response('Bad request', { status: 400 });
}

async function updateIncome({ id, formData }: { id: string; formData: FormData }): Promise<Response> {
  const title = formData.get('title');
  const description = formData.get('description');
  const amount = formData.get('amount');

  if (typeof title !== 'string' || typeof description !== 'string' || typeof amount !== 'string') {
    throw Error('something went wrong');
  }

  const amountNumber = Number.parseFloat(amount);
  if (Number.isNaN(amount)) {
    throw Error('something went wrong');
  }

  await db.invoice.update({
    where: { id },
    data: { title, description, amount: amountNumber },
  });

  return json({ success: true });
}

async function deleteIncome({ id, request }: { id: string; request: Request }): Promise<Response> {
  const referer = request.headers.get('referer');
  const redirectPath = referer ?? '/dashboard/income';

  try {
    await db.invoice.delete({
      where: { id },
    });
  } catch (error) {
    throw new Response('Not found', { status: 404 });
  }

  if (redirectPath.includes(id)) {
    return redirect('/dashboard/income');
  }

  return redirect(redirectPath);
}

export default function Component() {
  const income = useLoaderData<typeof loader>();

  const navigation = useNavigation();
  const isSubmitting = navigation.state !== 'idle' && navigation.formAction === `/dashboard/income/${income.id}`;

  const actionData = useActionData<typeof action>();

  return (
    <>
      <Form method="POST" action={`/dashboard/income/${income.id}`} key={income.id}>
        <Input
          label="Title:"
          type="text"
          placeholder="Salaray March"
          name="title"
          defaultValue={income.title}
          required
        />
        <Textarea label="Description:" name="description" defaultValue={income.description ?? ''} />
        <Input label="Amount (in USD):" type="number" defaultValue={income.amount} name="amount" required />
        <Button type="submit" name="intent" value="update" isPrimary disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
        <p aria-live="polite" className="text-green-600">
          {actionData?.success && 'Changes saved!'}
        </p>
      </Form>
      <FloatingActionLink to="/dashboard/income">Create Invoice</FloatingActionLink>
    </>
  );
}
