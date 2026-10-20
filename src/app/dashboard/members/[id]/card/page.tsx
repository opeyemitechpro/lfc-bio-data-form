import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MemberCardPrint } from "@/components/members/member-card-print";
import { requireAdmin } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getMemberById } from "@/lib/members/queries";
import { getCustomFields } from "@/lib/members/custom-fields";


export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Member card",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MemberCardPage({ params }: PageProps) {
  const { id } = await params;
  const context = await requireAdmin();

  const canPrint =
    context.isSuperadmin || context.permissions.has(PERMISSIONS.PRINT_CARD);
  const canViewPhotos =
    context.isSuperadmin || context.permissions.has(PERMISSIONS.MEMBERS_VIEW_PHOTO);

  if (!canPrint) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-2xl font-bold">Permission required</h1>
        <p className="mt-2 text-muted-foreground">
          You do not have permission to print member cards.
        </p>
      </div>
    );
  }

  const member = await getMemberById(context, id);
  if (!member) notFound();

  const customFields = (await getCustomFields({ activeOnly: false })).filter(
    (field) => field.show_on_card && field.is_active
  );

  return (
    <MemberCardPrint
      members={[member]}
      customFields={customFields}
      canViewPhotos={canViewPhotos}
    />
  );
}
