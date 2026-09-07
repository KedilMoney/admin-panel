import type { CategoryReviewDiagnosis, CategoryReviewItem, WhyPanelView } from "./types";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function findStep(diagnosis: CategoryReviewDiagnosis | null | undefined, step: string) {
  return diagnosis?.ladderInputs?.find((row) => row.step === step && row.matched) ?? null;
}

function shopNameOf(
  item: Pick<CategoryReviewItem, "descriptor">,
  diagnosis: CategoryReviewDiagnosis | null | undefined
): string | null {
  const stored = diagnosis?.storedDecision?.autoEnrichment?.shop_name;
  return (
    asString(stored) ??
    asString(diagnosis?.extractedMerchant?.shop_name) ??
    null
  );
}

export function formatWhyPanel(
  item: Pick<CategoryReviewItem, "decidedBy" | "confidence" | "descriptor" | "merchantKey">,
  diagnosis: CategoryReviewDiagnosis | null | undefined
): WhyPanelView {
  const rung = item.decidedBy ?? diagnosis?.storedDecision?.source ?? "Unknown";
  const confidence = item.confidence ?? diagnosis?.storedDecision?.confidence ?? null;
  const shopName = shopNameOf(item, diagnosis);
  const descriptor = item.descriptor || diagnosis?.rawDescriptor || "";
  const phaseA = findStep(diagnosis, "merchant_master_phase_a");
  const mappingStep = findStep(diagnosis, "user_merchant_mapping");
  const crowdStep = findStep(diagnosis, "merchant_profile_crowd");

  let headline = `${rung} decided this category`;
  if (rung === "LLM") {
    headline = "No reasoning was stored. The LLM rung does not persist a rationale.";
  } else if (rung === "Regex") {
    const matched = shopName ?? asString(diagnosis?.extractedMerchant?.remarks) ?? "pattern";
    headline = `Regex matched "${matched}"${confidence != null ? ` at ${confidence}` : ""}.`;
  } else if (rung === "Cache") {
    headline = "Cache hit a stored user merchant mapping.";
  } else if (rung === "Crowd") {
    headline = "Crowd category votes on the merchant profile decided this row.";
  }

  return {
    rung,
    headline,
    descriptor,
    shopName,
    confidence,
    patternCategory: asString(phaseA?.detail?.systemCategoryName),
    mapping: mappingStep
      ? {
          categoryId: asString(mappingStep.detail?.categoryId),
          confirmed: asBoolean(mappingStep.detail?.confirmed),
          userCorrected: asBoolean(mappingStep.detail?.userCorrected),
        }
      : null,
    crowd: crowdStep
      ? {
          canonicalName: asString(crowdStep.detail?.canonicalName),
          crowdPoints: asNumber(crowdStep.detail?.crowdPoints),
        }
      : null,
  };
}
