'use client';

import { useMemo } from 'react';

import type { Property } from '~/core/models/data/property.data';
import {
  generateInventoryCards,
  generateInventoryHref,
  generateLifecycle,
  generateManageLinks,
  generateProductCards,
  generateProfileEditURL,
  generateProfileGroups,
  generatePropertyHeader
} from '~/core/utils/generator/propertyDetail.generator';

export const usePropertyDetail = (property: Property) =>
  useMemo(
    () => ({
      header: generatePropertyHeader(property),
      manageLinks: generateManageLinks(property),
      lifecycle: generateLifecycle(property),
      profileGroups: generateProfileGroups(property),
      profileEditURL: generateProfileEditURL(property),
      productCards: generateProductCards(property),
      inventoryCards: generateInventoryCards(property),
      inventoryHref: generateInventoryHref(property)
    }),
    [property]
  );
