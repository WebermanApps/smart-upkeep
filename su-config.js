/* Smart Upkeep — Supabase client config (publishable/anon key only; never service role). */
(function (w) {
  "use strict";
  w.SU_SUPABASE = {
    url: "https://waqzeqshgwgfihepxylr.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhcXplcXNoZ3dnZmloZXB4eWxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM4NjAzODYsImV4cCI6MjEwOTQzNjM4Nn0.yWhwzVMkELhnCzK-rCwmuW8AGb9q0s7MIrvqvY5XGo4",
    /* Roles in JWT app_metadata.role: member | tech | ops | admin. "operator" maps to ops. */
    roles: { member: "member", tech: "tech", operator: "ops", ops: "ops", admin: "admin" }
  };
})(window);
