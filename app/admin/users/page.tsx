import { asc } from "drizzle-orm";
import { getDb } from "../../../db";
import { users } from "../../../db/schema";
import { requireAdminUser } from "../../../lib/session-auth";
import UsersAdmin from "./users-admin";

export default async function AdminUsersPage() {
  const sessionUser = await requireAdminUser("/admin/users");
  const list = await getDb()
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt })
    .from(users)
    .orderBy(asc(users.name));

  return <UsersAdmin sessionUser={sessionUser} initialUsers={list} />;
}
