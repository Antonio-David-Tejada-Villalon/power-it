import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { getSessionUser } from "@/lib/auth/session";
import { toClientUser } from "@/lib/serializers";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  await connectDB();
  const dbUser = await User.findById(session.sub).lean();
  if (!dbUser || dbUser.status !== "active" || dbUser.role === "cliente") redirect("/login");

  return <DashboardShell user={toClientUser(dbUser)}>{children}</DashboardShell>;
}
