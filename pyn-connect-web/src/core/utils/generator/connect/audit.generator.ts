export interface AuditEntry {
  actor: string;
  action: string;
  target: string;
  org: string;
  when: string;
  type: string;
  icon: string;
  iconBg: string;
  iconColor: string;
}

/** The platform audit trail shown on the Audit Log screen. */
export const generateAuditLog = (): AuditEntry[] => [
  { actor: 'Alex Morgan', action: 'triggered a build for', target: 'Luxe Mile High v5.2.0', org: 'Alliance Residential', when: '2h ago', type: 'Build', icon: 'builds', iconBg: '#E8F4FB', iconColor: '#0077AE' },
  { actor: 'System', action: 'flagged a transcript at', target: 'Cortland Sky', org: 'Cortland', when: '3h ago', type: 'AI', icon: 'shield', iconBg: '#FDEDEF', iconColor: '#C62534' },
  { actor: 'Alex Morgan', action: 'revoked Yardi credential for', target: 'Luxe Mile High', org: 'Alliance Residential', when: '5h ago', type: 'Integration', icon: 'integrations', iconBg: '#FDEDEF', iconColor: '#C62534' },
  { actor: 'Sam Ito', action: 'changed role to Property Manager for', target: 'Grace Lin', org: 'Mill Creek', when: '1d ago', type: 'Role', icon: 'users', iconBg: '#F2E9F4', iconColor: '#7B3A87' },
  { actor: 'Dana Reyes', action: 'published tour for', target: 'Alliance Uptown Residences', org: 'Alliance Residential', when: '1d ago', type: 'Publish', icon: 'upload', iconBg: '#EEF5E1', iconColor: '#4A7212' },
  { actor: 'System', action: 'marked invoice past due for', target: 'Cortland', org: 'Cortland', when: '2d ago', type: 'Billing', icon: 'billing', iconBg: '#FFF4D4', iconColor: '#8A6A00' },
  { actor: 'Sam Ito', action: 'connected Latch to', target: 'Cortland Sky', org: 'Cortland', when: '2d ago', type: 'Integration', icon: 'integrations', iconBg: '#EEF5E1', iconColor: '#4A7212' },
  { actor: 'Alex Morgan', action: 'created company', target: 'Willow Bridge', org: 'Willow Bridge', when: '3d ago', type: 'Org', icon: 'orgs', iconBg: '#EEF0F4', iconColor: '#4A5163' }
];
