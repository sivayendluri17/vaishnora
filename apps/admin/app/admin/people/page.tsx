// Owner only: grant or remove admin access by email or phone, and see who
// has it. Vendors manage only their own products and never see customers;
// owners see everything.
import { requireOwner } from "@/lib/guard";
import { listStaff } from "@vaishnora/core/people";
import OpsShell, { OpsNotice } from "@/components/ops/OpsShell";
import PeopleManager from "./PeopleManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "People — Vaishnora Admin" };

export default async function PeoplePage() {
  const owner = await requireOwner("/admin/people");
  let staff: Awaited<ReturnType<typeof listStaff>> = [];
  let problem = "";
  try {
    staff = await listStaff();
  } catch (err) {
    problem = err instanceof Error ? err.message : "Couldn't load people.";
  }
  return (
    <OpsShell active="people" role="owner" title="People" subtitle="Who can work in the admin, and what they can see">
      {problem && <OpsNotice tone="error">{problem}</OpsNotice>}
      <PeopleManager initial={staff} selfId={owner.id} />
    </OpsShell>
  );
}
