import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useActionData, useLoaderData, useNavigation } from '@remix-run/react';

import { Button } from '~/components/buttons';
import { Form, Input, Textarea } from '~/components/forms';
import { FloatingActionLink } from '~/components/links';
import { db } from '~/modules/db.server';

export async function loader({ params }: LoaderFunctionArgs) {
  const { id } = params;

  const expense = await db.expense.findUnique({
    where: { id },
  });

  if (!expense) throw new Response('Not found', { status: 404 });

  return json(expense);
}

export async function action({ params, request }: ActionFunctionArgs) {
  const { id } = params;
  if (!id) {
    throw Error('id route parameter must be defined');
  }

  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'update') {
    return updatExpense({ id, formData });
  }

  if (intent === 'delete') {
    return deleteExpense({ id, request });
  }

  throw new Response('Bad request', { status: 400 });
}

async function updatExpense({ id, formData }: { id: string; formData: FormData }): Promise<Response> {
  const title = formData.get('title');
  const description = formData.get('description');
  const amount = formData.get('amount');

  if (typeof title !== 'string' || typeof description !== 'string' || typeof amount !== 'string') {
    throw Error('something went wrong');
  }

  const amountNumber = Number.parseFloat(amount);
  if (Number.isNaN(amountNumber)) {
    throw Error('something went wrong');
  }

  await db.expense.update({
    where: { id },
    data: { title, amount: amountNumber, description },
  });

  return json({ success: true });
}

async function deleteExpense({ id, request }: { id: string; request: Request }): Promise<Response> {
  const referer = request.headers.get('referer');
  const redirectPath = referer || '/dashboard/expenses';

  try {
    await db.expense.delete({
      where: { id },
    });
  } catch (error) {
    throw new Response('Not found', { status: 404 });
  }

  if (redirectPath.includes(id)) {
    return redirect('/dashboard/expenses');
  }

  return redirect(redirectPath);
}

export default function Component() {
  const expense = useLoaderData<typeof loader>();

  const navigation = useNavigation();
  const isSubmitting = navigation.state !== 'idle' && navigation.formAction === `/dashboard/expenses/${expense.id}`;

  const actionData = useActionData<typeof action>();

  return (
    <>
      <Form method="POST" action={`/dashboard/expenses/${expense.id}`} key={expense.id}>
        <Input
          label="Title:"
          type="text"
          placeholder="Dinner for Two"
          name="title"
          defaultValue={expense.title}
          required
        />
        <Textarea label="Description:" name="description" defaultValue={expense.description ?? ''} />
        <Input label="Amount (in USD):" type="number" defaultValue={expense.amount} name="amount" required />
        <Button type="submit" name="intent" value="update" isPrimary disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
        <p aria-live="polite" className="text-green-600">
          {actionData?.success && 'Changes saved!'}
        </p>
      </Form>
      <FloatingActionLink to="/dashboard/expenses/">Add expense</FloatingActionLink>
    </>
  );
}
