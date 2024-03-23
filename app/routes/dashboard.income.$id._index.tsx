import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { json, redirect, unstable_parseMultipartFormData } from '@remix-run/node';
import {
  isRouteErrorResponse,
  useActionData,
  useLoaderData,
  useNavigation,
  useParams,
  useRouteError,
} from '@remix-run/react';

import { Button } from '~/components/buttons';
import { Attachment, Form, Input, Textarea } from '~/components/forms';
import { H2 } from '~/components/headings';
import { FloatingActionLink } from '~/components/links';
import { deleteAttachment, uploadHandler } from '~/modules/attachments.server';
import { db } from '~/modules/db.server';
import { requireUserId } from '~/modules/session/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const { id } = params;

  const income = await db.invoice.findUnique({ where: { id, userId } });

  if (!income) throw new Response('Not found', { status: 404 });

  return json(income);
}

export async function action({ params, request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const { id } = params;
  if (!id) {
    throw Error('id route parameter must be defined');
  }

  let formData: FormData;
  const contentType = request.headers.get('content-type');
  if (contentType?.toLowerCase().includes('multipart/form-data')) {
    formData = await unstable_parseMultipartFormData(request, uploadHandler);
  } else {
    formData = await request.formData();
  }

  const intent = formData.get('intent');

  if (intent === 'update') {
    return updateIncome({ id, userId, formData });
  }

  if (intent === 'delete') {
    return deleteIncome({ id, userId, request });
  }

  if (intent === 'remove-attachment') {
    return removeAttachment(formData, id, userId);
  }

  throw new Response('Bad request', { status: 400 });
}

async function updateIncome({
  id,
  userId,
  formData,
}: {
  id: string;
  userId: string;
  formData: FormData;
}): Promise<Response> {
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

  let attachment: FormDataEntryValue | null | undefined = formData.get('attachment');
  if (!attachment || typeof attachment !== 'string') {
    attachment = undefined;
  }

  await db.invoice.update({
    where: { id, userId },
    data: {
      title,
      description,
      amount: amountNumber,
      attachment,
    },
  });

  return json({ success: true });
}

async function deleteIncome({
  id,
  userId,
  request,
}: {
  id: string;
  userId: string;
  request: Request;
}): Promise<Response> {
  const referer = request.headers.get('referer');
  const redirectPath = referer ?? '/dashboard/income';

  try {
    const invoice = await db.invoice.delete({
      where: { id, userId },
    });

    if (invoice.attachment) {
      deleteAttachment(invoice.attachment);
    }
  } catch (error) {
    throw new Response('Not found', { status: 404 });
  }

  if (redirectPath.includes(id)) {
    return redirect('/dashboard/income');
  }

  return redirect(redirectPath);
}

async function removeAttachment(formData: FormData, id: string, userId: string): Promise<Response> {
  const attachmentUrl = formData.get('attachmentUrl');
  if (!attachmentUrl || typeof attachmentUrl !== 'string') {
    throw Error('something went wrong');
  }

  const fileName = attachmentUrl.split('/').pop();
  if (!fileName) throw Error('something went wrong');
  await db.invoice.update({
    where: { id_userId: { id, userId } },
    data: { attachment: null },
  });
  deleteAttachment(fileName);
  return json({ success: true });
}

export default function Component() {
  const income = useLoaderData<typeof loader>();

  const navigation = useNavigation();
  const isSubmitting = navigation.state !== 'idle' && navigation.formAction === `/dashboard/income/${income.id}`;

  const actionData = useActionData<typeof action>();

  return (
    <>
      <Form method="POST" action={`/dashboard/income/${income.id}?index`} key={income.id} encType="multipart/form-data">
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
        {income.attachment ? (
          <Attachment
            label="Current Attachment"
            attachmentUrl={`/dashboard/income/${income.id}/attachments/${income.attachment}`}
          />
        ) : (
          <Input label="New Attachment" type="file" name="attachment" />
        )}
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

export function ErrorBoundary() {
  const { id } = useParams();
  const error = useRouteError();

  let heading = `Invoice not found`;
  let message = `Apologies, something went wrong on our end, please try again.`;

  if (isRouteErrorResponse(error) && error.status === 404) {
    heading = 'Expense not found';
    message = `Apologies, the invoice with the id ${id} cannot be found`;
  }

  return (
    <>
      <div className="w-full m-auto lg-max-w-3xl flex flex-col items-center justify-center gap-5">
        <H2>{heading}</H2>
        <p>{message}</p>
      </div>
      <FloatingActionLink to="/dashboard/income/">Add invoice</FloatingActionLink>
    </>
  );
}
