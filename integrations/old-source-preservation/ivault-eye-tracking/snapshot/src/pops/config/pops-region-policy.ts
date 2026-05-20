import type { PopsConfig, PopsRegion } from "./pops-config.types";

export interface PopsRegionPolicy {
  region: PopsRegion;
  config: Partial<PopsConfig>;
}

const REGION_POLICIES: Record<PopsRegion, PopsRegionPolicy> = {
  GLOBAL: {
    region: "GLOBAL",
    config: {}
  },
  US: {
    region: "US",
    config: {
      locationProofAllowed: true,
      rawStorageAllowed: false,
      privacyReceiptRequired: true
    }
  },
  EU: {
    region: "EU",
    config: {
      locationProofAllowed: false,
      rawStorageAllowed: false,
      privacyReceiptRequired: true,
      audioFeaturesAllowed: false
    }
  },
  LATAM: {
    region: "LATAM",
    config: {
      locationProofAllowed: true,
      rawStorageAllowed: false
    }
  },
  APAC: {
    region: "APAC",
    config: {
      locationProofAllowed: true,
      rawStorageAllowed: false
    }
  },
  MEA: {
    region: "MEA",
    config: {
      locationProofAllowed: true,
      rawStorageAllowed: false
    }
  }
};

export function getRegionPolicy(region: PopsRegion): PopsRegionPolicy {
  return REGION_POLICIES[region] ?? REGION_POLICIES.GLOBAL;
}
