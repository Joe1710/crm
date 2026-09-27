import { requireSessionUser } from "../lib/session-auth";
import CrmApp from "./crm-app";

export default async function Home() {
  const user = await requireSessionUser("/");
  return <CrmApp user={user} />;
}
