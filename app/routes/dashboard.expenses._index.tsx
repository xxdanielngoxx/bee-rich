import { type ActionFunctionArgs, redirect } from '@remix-run/node';

import { db } from '~/modules/db.server';

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
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

  const expense = await db.expense.create({
    data: {
      title,
      description,
      amount: amountNumber,
      currencyCode: 'USD',
    },
  });

  return redirect(`/dashboard/expenses/${expense.id}`);
}

export default function Component() {
  return (
    <form method="POST" action="/dashboard/expenses/?index">
      <label className="w-full lg:max-w-md">
        Title: <input type="text" name="title" placeholder="Dinner for Two" required />
      </label>
      <label className="w-full lg:max-w-md">
        Description: <textarea name="description" />
      </label>
      <label className="w-full lg:max-w-md">
        Amount (in USD): <input type="number" defaultValue={0} name="amount" required />
      </label>
      <button type="submit">Create</button>
    </form>
  );
}
