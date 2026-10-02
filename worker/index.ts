import handler from "vinext/server/app-router-entry";
import { runOutreachAutoAdvance } from "../lib/outreach-cron";

export default {
  ...handler,
  async scheduled() {
    await runOutreachAutoAdvance();
  }
};
