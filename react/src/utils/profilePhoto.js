import { t } from "../i18n";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 2 * 1024 * 1024;

export async function uploadProfilePhoto(client, jugadorId, file) {
  if (!client) {
    return { ok: false, error: t("ranking.profile.photoErrors.uploadFailed") };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, error: t("ranking.profile.photoErrors.invalidType") };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: t("ranking.profile.photoErrors.tooLarge") };
  }

  const path = `${jugadorId}/avatar.jpg`;
  const contentType = file.type === "image/jpeg" ? "image/jpeg" : file.type;
  const { error: uploadError } = await client.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType, cacheControl: "3600" });

  if (uploadError) {
    console.warn("[uploadProfilePhoto]", uploadError.message);
    return { ok: false, error: t("ranking.profile.photoErrors.uploadFailed") };
  }

  const { data: urlData } = client.storage.from("avatars").getPublicUrl(path);
  const foto_url = `${urlData.publicUrl}?v=${Date.now()}`;

  const { error: dbError } = await client.from("jugadores").update({ foto_url }).eq("id", jugadorId);
  if (dbError) {
    console.warn("[uploadProfilePhoto] db", dbError.message);
    return { ok: false, error: t("ranking.profile.photoErrors.updateFailed") };
  }

  return { ok: true, foto_url };
}
