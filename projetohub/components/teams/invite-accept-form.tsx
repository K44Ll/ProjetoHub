"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { acceptInviteAction } from "@/app/actions/team";
import { initialActionState } from "@/types/app";

export function InviteAcceptForm({ token }: { token: string }) {
  const [state, action] = useActionState(acceptInviteAction, initialActionState);
  return (
    <form action={action} className="invite-accept-form">
      <input type="hidden" name="token" value={token} />
      <AcceptButton />
      {state.status === "error" ? <p role="alert">{state.message}</p> : null}
    </form>
  );
}

function AcceptButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? "Entrando…" : "Entrar na equipe"}</button>;
}
