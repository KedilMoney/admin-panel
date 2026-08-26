import type { Expert, ExpertFormData } from "@/types";
import { emptyCredential, parseAdvisorCredentials, validCredentials } from "./credentials";
import { feesFromExpert, feesToPayload } from "./fees";
import { splitList } from "./specialties";

export const EMPTY_FORM: ExpertFormData = {
  name: "",
  photo: "",
  headline: "",
  specialisation: [],
  cities: "",
  bio: "",
  email: "",
  experience: "",
  languages: "",
  phone: "",
  whatsapp: "",
  website: "",
  enquiryFormUrl: "",
  linkedin: "",
  instagram: "",
  facebook: "",
  youtube: "",
  fixedFee: "",
  auaPercent: "",
  consultationFee: "",
  freeSession: "Yes",
  credentials: [emptyCredential("cred-1")],
};

export function expertToForm(expert: Expert): ExpertFormData {
  const fees = feesFromExpert(expert);
  const credentials = parseAdvisorCredentials(
    expert.credentials?.length ? expert.credentials : expert.certification?.map((name) => ({ name, meta: name })),
    expert.registrations
  );
  return {
    name: expert.name,
    photo: expert.photo || "",
    headline: expert.headline || "",
    specialisation: expert.specialisation || [],
    cities: (expert.cities || []).join(", ") || expert.city || "",
    bio: expert.bio || "",
    email: expert.email || "",
    experience: String(expert.experience ?? ""),
    languages: (expert.languages || []).join(", "),
    phone: expert.phone || "",
    whatsapp: expert.whatsapp || "",
    website: expert.website || "",
    enquiryFormUrl: expert.enquiryFormUrl || "",
    linkedin: expert.linkedin || "",
    instagram: expert.instagram || "",
    facebook: expert.facebook || "",
    youtube: expert.youtube || "",
    ...fees,
    credentials,
  };
}

export function validateAdvisorForm(form: ExpertFormData): string {
  const cities = splitList(form.cities);
  const languages = splitList(form.languages);
  if (!form.name.trim() || !form.headline.trim() || !form.experience || cities.length === 0 || languages.length === 0) {
    return "Fill in the required fields in About you.";
  }
  if (form.specialisation.length === 0 || form.bio.trim().length < 10) {
    return "Add at least one specialty and a short description of your practice.";
  }
  if (!form.fixedFee.trim() && !form.auaPercent.trim() && !form.consultationFee.trim()) {
    return "Fill in the ways you actually charge — at least one.";
  }
  if (form.credentials.some((row) => row.issuer === "Other")) {
    return "Replace Others with a listed issuer on each credential.";
  }
  if (validCredentials(form.credentials).length === 0) {
    return "Add at least one credential with an issuer and role.";
  }
  if (!form.email.trim()) {
    return "Email is required.";
  }
  return "";
}

export function buildPayload(form: ExpertFormData) {
  const cities = splitList(form.cities);
  const languages = splitList(form.languages);
  const credentials = validCredentials(form.credentials);
  const fees = feesToPayload(form);
  const bio = form.bio.trim();
  return {
    name: form.name.trim(),
    photo: form.photo || null,
    headline: form.headline.trim(),
    pitch: bio.slice(0, 180),
    specialisation: form.specialisation.map((s) => s.trim()).filter(Boolean),
    city: cities[0] || "",
    cities,
    bio,
    email: form.email.trim() || null,
    enquiryFormUrl: form.enquiryFormUrl.trim() || null,
    experience: Number(form.experience) || 0,
    languages,
    phone: form.phone.trim() || null,
    whatsapp: form.whatsapp.trim() || null,
    website: form.website.trim() || null,
    linkedin: form.linkedin.trim() || null,
    instagram: form.instagram.trim() || null,
    facebook: form.facebook.trim() || null,
    youtube: form.youtube.trim() || null,
    ...fees,
    credentials: credentials.map(({ issuer, role, number, id }) => ({
      id,
      issuer,
      role,
      ...(number ? { number } : {}),
    })),
    certification: credentials.map((c) => c.issuer),
    registrationNo: credentials.map((c) => c.number).filter((n): n is string => Boolean(n)),
  };
}
