import type { Expense, Invoice } from '@prisma/client';
import type { LoaderFunctionArgs, SerializeFrom } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Link as RemixLink, Outlet, useLoaderData, useLocation, useRouteError } from '@remix-run/react';
import React from 'react';

import { Button } from '~/components/buttons';
import { Container } from '~/components/containers';
import { Form } from '~/components/forms';
import { H1 } from '~/components/headings';
import { NavLink } from '~/components/links';
import { db } from '~/modules/db.server';
import { requireUserId } from '~/modules/session/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);

  const firstExpenseQuery = db.expense.findFirst({
    orderBy: {
      createdAt: 'desc',
    },
    where: { userId },
  });

  const firstInvoiceQuery = db.invoice.findFirst({
    orderBy: {
      createdAt: 'desc',
    },
    where: { userId },
  });

  const [firstExpense, firstInvoice] = await Promise.all([firstExpenseQuery, firstInvoiceQuery]);

  return json({ firstExpense, firstInvoice });
}

export default function Component() {
  const { firstExpense, firstInvoice } = useLoaderData<typeof loader>();
  return (
    <Layout firstExpense={firstExpense} firstInvoice={firstInvoice}>
      <Outlet />
    </Layout>
  );
}

type LayoutProps = {
  readonly children: React.ReactNode;
  firstExpense?: SerializeFrom<Expense> | null;
  firstInvoice?: SerializeFrom<Invoice> | null;
};

function Layout({ children, firstExpense, firstInvoice }: Readonly<LayoutProps>) {
  const location = useLocation();

  return (
    <>
      <header>
        <Container className="p-4 mb-10">
          <nav>
            <ul
              className="w-full flex flex-row gap-5 font-bold
        text-lg lg:text-2xl"
            >
              <li>
                <RemixLink to="/">BeeRich</RemixLink>
              </li>
              <li className="ml-auto">
                <Form method="POST" action="/logout">
                  <Button type="submit">Log out</Button>
                </Form>
              </li>
            </ul>
            <ul className="mt-10 w-full flex flex-row gap-5">
              <li className="ml-auto">
                <NavLink
                  to={firstInvoice ? `/dashboard/income/${firstInvoice.id}` : '/dashboard/income'}
                  styleAsActive={location.pathname.startsWith('/dashboard/income')}
                >
                  Income
                </NavLink>
              </li>
              <li className="mr-auto">
                <NavLink
                  to={firstExpense ? `/dashboard/expenses/${firstExpense.id}` : '/dashboard/expenses'}
                  styleAsActive={location.pathname.startsWith('/dashboard/expenses')}
                >
                  Expenses
                </NavLink>
              </li>
            </ul>
          </nav>
        </Container>
      </header>
      <main
        className="p-4 w-full flex justify-center items-
        center"
      >
        {children}
      </main>
    </>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const errorMessage = error instanceof Error && error.message;

  return (
    <Layout>
      <Container className="p-5 lg:p-20 flex flex-col gap-5">
        <H1>Unexpected Error</H1>
        <p>We are very sorry. An unexpected error occurred. Please try again or contact us if the problem persists.</p>
        {errorMessage && (
          <div className="border-4 border-red-500 p-10">
            <p>Error message: {error.message}</p>
          </div>
        )}
      </Container>
    </Layout>
  );
}
