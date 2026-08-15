"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { createTeamAction } from "@/app/actions/teams";
import { initialActionState } from "@/types/app";

export function CreateTeamForm() {
  const [state, action] = useActionState(createTeamAction, initialActionState);
  const [deliveryLocal, setDeliveryLocal] = useState("");
  const parsedDelivery = deliveryLocal ? new Date(deliveryLocal) : null;
  const deliveryIso =
    parsedDelivery && !Number.isNaN(parsedDelivery.getTime())
      ? parsedDelivery.toISOString()
      : "";

  return (
    <form className="team-create-card" action={action}>
      <div className="team-form-section-heading">
        <span>Informações principais</span>
        <p>Os campos marcados são necessários para criar a equipe.</p>
      </div>

      <label className="dialog-field">
        <span>Nome da equipe *</span>
        <input
          name="name"
          placeholder="Digite o nome da equipe"
          minLength={2}
          maxLength={100}
          required
        />
      </label>

      <div className="team-form-grid">
        <label className="dialog-field">
          <span>Matéria *</span>
          <input
            name="subject"
            placeholder="Informe a matéria"
            minLength={2}
            maxLength={100}
            required
          />
        </label>

        <label className="dialog-field">
          <span>Professor ou professora</span>
          <input
            name="teacher_name"
            placeholder="Informe o nome"
            maxLength={100}
          />
        </label>
      </div>

      <label className="dialog-field">
        <span>Tema do trabalho</span>
        <input
          name="topic"
          placeholder="Descreva o tema em uma frase"
          maxLength={160}
        />
      </label>

      <label className="dialog-field">
        <span>Data e horário de entrega *</span>
        <input
          type="datetime-local"
          value={deliveryLocal}
          onChange={(event) => setDeliveryLocal(event.target.value)}
          required
        />
        <input type="hidden" name="delivery_at" value={deliveryIso} />
        <small>O horário será salvo usando o fuso deste dispositivo.</small>
      </label>

      <label className="dialog-field">
        <span>Descrição e objetivo</span>
        <textarea
          name="description"
          placeholder="Explique o que a equipe precisa entregar"
          maxLength={2000}
          rows={5}
        />
      </label>

      <label className="team-photo-field">
        <span>Foto da equipe</span>
        <input
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
        />
        <small>JPG, PNG ou WebP com até 5 MB.</small>
      </label>

      {state.status === "error" ? (
        <p className="form-action-message is-error" role="alert">
          {state.message}
        </p>
      ) : null}

      <div className="team-form-actions">
        <Link className="dashboard-secondary-button" href="/">
          Cancelar
        </Link>
        <CreateButton />
      </div>
    </form>
  );
}

function CreateButton() {
  const { pending } = useFormStatus();

  return (
    <button className="dashboard-primary-button" type="submit" disabled={pending}>
      {pending ? "Criando equipe..." : "Criar equipe"}
    </button>
  );
}
