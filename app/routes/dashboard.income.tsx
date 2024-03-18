import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Outlet, useLoaderData, useNavigation, useParams, useSearchParams } from '@remix-run/react';
import clsx from 'clsx';

import { Form, Input } from '~/components/forms';
import { H1 } from '~/components/headings';
import { ListLinkItem } from '~/components/links';
import { db } from '~/modules/db.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const queryString = url.searchParams.get('q');

  const invoices = await db.invoice.findMany({
    where: {
      title: {
        contains: queryString ?? '',
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return json(invoices);
}

export default function Component() {
  const navigation = useNavigation();
  const invoices = useLoaderData<typeof loader>();
  const { id } = useParams();

  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') ?? '';

  return (
    <div className="w-full">
      <H1>Your income</H1>
      <div className="mt-10 w-full flex flex-col-reverse lg:flex-row">
        <section className="lg:p-8 w-full lg:max-w-2xl">
          <h2 className="sr-only">All your income</h2>
          <Form method="GET">
            <Input name="q" type="search" label="Search by title" defaultValue={searchQuery} />
          </Form>
          <ul className="flex flex-col">
            {invoices.map((invoice) => {
              return (
                <ListLinkItem
                  key={invoice.id}
                  to={`/dashboard/income/${invoice.id}`}
                  isActive={invoice.id === id}
                  deleteProps={{
                    action: `/dashboard/income/${invoice.id}`,
                    ariaLabel: `Delete invoice ${invoice.title}`,
                  }}
                >
                  <p>
                    <i>{new Date(invoice.createdAt).toLocaleDateString('en-US')}</i>
                  </p>
                  <p className="text-xl font-semibold">{invoice.title}</p>
                  <p>
                    <b>
                      {Intl.NumberFormat('en-US', { style: 'currency', currency: invoice.currencyCode }).format(
                        invoice.amount,
                      )}
                    </b>
                  </p>
                </ListLinkItem>
              );
            })}
          </ul>
        </section>
        <section className={clsx('lg:p-8 w-full', navigation.state === 'loading' && 'motion-safe:animate-pulse')}>
          <Outlet />
        </section>
      </div>
    </div>
  );
}
