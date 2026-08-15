"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { ActionState } from "@/types/app";

const allowedPhotoTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function textField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function createTeamAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();
  const userId = authData?.claims.sub;

  if (authError || !userId) {
    return {
      status: "error",
      message: "Sua sessão expirou. Entre novamente para criar a equipe.",
    };
  }

  const name = textField(formData, "name");
  const subject = textField(formData, "subject");
  const topic = textField(formData, "topic");
  const teacherName = textField(formData, "teacher_name");
  const description = textField(formData, "description");
  const deliveryAtValue = textField(formData, "delivery_at");
  const photo = formData.get("photo");

  if (name.length < 2 || name.length > 100) {
    return {
      status: "error",
      message: "O nome da equipe deve ter entre 2 e 100 caracteres.",
    };
  }

  if (subject.length < 2 || subject.length > 100) {
    return {
      status: "error",
      message: "A matéria deve ter entre 2 e 100 caracteres.",
    };
  }

  if (!deliveryAtValue || Number.isNaN(Date.parse(deliveryAtValue))) {
    return {
      status: "error",
      message: "Informe uma data e um horário de entrega válidos.",
    };
  }

  const deliveryAt = new Date(deliveryAtValue);
  if (deliveryAt.getTime() <= Date.now()) {
    return {
      status: "error",
      message: "A data de entrega precisa estar no futuro.",
    };
  }

  if (topic.length > 160 || teacherName.length > 100 || description.length > 2000) {
    return {
      status: "error",
      message: "Um dos campos ultrapassou o limite permitido.",
    };
  }

  if (photo instanceof File && photo.size > 0) {
    if (!allowedPhotoTypes.has(photo.type)) {
      return {
        status: "error",
        message: "A foto precisa estar em JPG, PNG ou WebP.",
      };
    }

    if (photo.size > 5 * 1024 * 1024) {
      return {
        status: "error",
        message: "A foto pode ter no máximo 5 MB.",
      };
    }
  }

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({
      name,
      subject,
      topic: topic || null,
      teacher_name: teacherName || null,
      description: description || null,
      delivery_at: deliveryAt.toISOString(),
      created_by: userId,
    })
    .select("id")
    .single();

  if (teamError || !team) {
    return {
      status: "error",
      message: "Não foi possível criar a equipe. Tente novamente.",
    };
  }

  if (photo instanceof File && photo.size > 0) {
    const extension = allowedPhotoTypes.get(photo.type);
    const photoPath = `${team.id}/${crypto.randomUUID()}.${extension}`;
    const photoBytes = new Uint8Array(await photo.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from("team-photos")
      .upload(photoPath, photoBytes, {
        cacheControl: "3600",
        contentType: photo.type,
        upsert: false,
      });

    if (uploadError) {
      await supabase.from("teams").delete().eq("id", team.id);
      return {
        status: "error",
        message: "A foto não pôde ser enviada. A equipe não foi criada.",
      };
    }

    const { error: photoUpdateError } = await supabase
      .from("teams")
      .update({ photo_path: photoPath })
      .eq("id", team.id);

    if (photoUpdateError) {
      await supabase.storage.from("team-photos").remove([photoPath]);
      await supabase.from("teams").delete().eq("id", team.id);
      return {
        status: "error",
        message: "A foto não pôde ser vinculada. A equipe não foi criada.",
      };
    }
  }

  revalidatePath("/");
  redirect(`/equipes/${team.id}?created=1`);
}
