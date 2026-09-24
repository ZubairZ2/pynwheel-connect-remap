'use client';

import { useMemo, useState } from 'react';

import type { PropertyDetail } from '~/core/models/data/property.data';
import {
  generateBilling,
  generateConfigCards,
  generateInventoryCards,
  generateInventoryHref,
  generateInventorySummary,
  generateLifecycle,
  generateManageLinks,
  generatePartners,
  generateProductCards,
  generateProfileDraft,
  generateProfileEditURL,
  generateProfileGroups,
  generatePropertyHeader,
  generateRatesDraft,
  type ProfileDraft,
  type RatesDraft
} from '~/core/utils/generator/propertyDetail.generator';

/**
 * Property Detail state. Connect is read-only: the Edit Details and Edit Rates
 * forms edit a local draft, and "Save" only closes the form and says that
 * nothing was saved. No request is ever sent.
 */
export const usePropertyDetail = (property: PropertyDetail) => {
  const view = useMemo(
    () => ({
      header: generatePropertyHeader(property),
      manageLinks: generateManageLinks(property),
      lifecycle: generateLifecycle(property),
      profileGroups: generateProfileGroups(property),
      profileEditURL: generateProfileEditURL(property),
      productCards: generateProductCards(property),
      inventoryCards: generateInventoryCards(property),
      inventoryHref: generateInventoryHref(property),
      inventorySummary: generateInventorySummary(property),
      partners: generatePartners(property),
      configCards: generateConfigCards(property),
      billing: generateBilling(property)
    }),
    [property]
  );

  const [profileDraft, setProfileDraft] = useState<ProfileDraft | null>(null);
  const [ratesDraft, setRatesDraft] = useState<RatesDraft | null>(null);
  const [notice, setNotice] = useState<'profile' | 'rates' | null>(null);

  return {
    ...view,
    profileDraft,
    editProfile: () => {
      setNotice(null);
      setProfileDraft(generateProfileDraft(property));
    },
    changeProfile: <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) =>
      setProfileDraft((draft) => (draft ? { ...draft, [key]: value } : draft)),
    cancelProfile: () => setProfileDraft(null),
    saveProfile: () => {
      setProfileDraft(null);
      setNotice('profile');
    },
    ratesDraft,
    editRates: () => {
      setNotice(null);
      setRatesDraft(generateRatesDraft(property));
    },
    changeRate: (key: keyof RatesDraft, value: string) =>
      setRatesDraft((draft) => (draft ? { ...draft, [key]: value } : draft)),
    cancelRates: () => setRatesDraft(null),
    saveRates: () => {
      setRatesDraft(null);
      setNotice('rates');
    },
    notice,
    dismissNotice: () => setNotice(null)
  };
};
