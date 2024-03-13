import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';

import { H2 } from '~/components/headings';
import { FloatingActionLink } from '~/components/links';
import { db } from '~/modules/db.server';

export async function loader({ params }: LoaderFunctionArgs) {
  const { id } = params;

  const income = await db.invoice.findUnique({ where: { id } });

  if (!income) throw new Response('Not found', { status: 404 });

  return json(income);
}

export default function Component() {
  const income = useLoaderData<typeof loader>();

  return (
    <>
      <div className="w-full h-full p-8">
        <H2>{income.title}</H2>
        <p>${income.amount}</p>
      </div>
      <FloatingActionLink to="/dashboard/income">Create Invoice</FloatingActionLink>
    </>
  );
}
