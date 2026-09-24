'use client';

import { useMemo } from 'react';

import { generateAuditLog } from '~/core/utils/generator/connect/audit.generator';

export const useAuditScreen = () => {
  const auditLog = useMemo(() => generateAuditLog(), []);
  return { auditLog };
};
