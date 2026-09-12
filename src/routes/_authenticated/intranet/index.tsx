import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/intranet/")({
  beforeLoad: () => {
    throw redirect({ to: "/intranet/profil" });
  },
});
