import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";

export default async function DashboardRootPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  redirect(`/dashboard/${session.role}`);
}
