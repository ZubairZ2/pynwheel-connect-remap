import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import type { LockAccountDetails, LockProvider } from '~/core/models/data/tourModules.data';
import { t } from '../inventory/inventoryText';

/**
 * The provider account forms of the Locks tab: the real fields of each
 * legacy account tab (dwelos/_locks.html.haml and its vendor partials),
 * drawn from the account the CMS answered, validated the way
 * Locks::Accounts validates them, and turned into the write's payload. Pure.
 */
const A = CORE_STRINGS.tourModules.locks.account;

export type AccountFieldKind = 'text' | 'password' | 'number' | 'select' | 'radio' | 'check';

export interface AccountFieldOption {
  value: string;
  label: string;
}

export interface AccountField {
  key: string;
  label: string;
  kind: AccountFieldKind;
  required: boolean;
  placeholder?: string;
  hint?: string;
  options?: AccountFieldOption[];
  min?: number;
  max?: number;
  /** A secret the CMS already stores: blank keeps it. */
  stored?: boolean;
}

export interface AccountSection {
  key: string;
  title?: string;
  note?: string;
  fields: AccountField[];
}

export interface AccountForm {
  vendor: string;
  title: string;
  intro: string;
  sections: AccountSection[];
  /** A code-grant mode: where the authorization stands and what the legacy page does. */
  authorization: { authorized: boolean; label: string; note: string; authorizeUrl: string | null; removable: boolean } | null;
}

export type AccountDraft = Record<string, string>;

export const IGLOO_VERSIONS = ['v1', 'igloohome', 'iglooworks'] as const;

const detailString = (details: LockAccountDetails | null, key: string): string => {
  const value = details?.[key];
  return value == null ? '' : String(value);
};

const detailBool = (details: LockAccountDetails | null, key: string): boolean => details?.[key] === true;

const cardFormats = (provider: LockProvider): string[] => {
  const list = provider.options?.cardFormats;
  return Array.isArray(list) ? (list as string[]) : [];
};

const range = (provider: LockProvider, key: 'facilityRange' | 'badgeRange', fallback: [number, number]): [number, number] => {
  const list = provider.options?.[key];
  return Array.isArray(list) && list.length === 2 ? [Number(list[0]), Number(list[1])] : fallback;
};

/** The draft the form starts from: what the CMS stores, secrets left blank. */
export const accountDraftOf = (provider: LockProvider): AccountDraft => {
  const d = provider.details;
  switch (provider.vendor) {
    case 'Zerv':
      return { username: detailString(d, 'username'), password: '', facility_id: detailString(d, 'facilityId'), badge_id: detailString(d, 'badgeId'), card_format: detailString(d, 'cardFormat') };
    case 'Dwelo':
      return { api_url: detailString(d, 'apiUrl'), default_community_id: detailString(d, 'defaultCommunityId'), client_id: detailString(d, 'clientId'), client_secret: '' };
    case 'EdgeState':
      return { client_id: detailString(d, 'clientId'), client_secret: '' };
    case 'Latch':
      return { latch_property_name: detailString(d, 'latchPropertyName') };
    case 'Igloohome':
      return {
        version: detailString(d, 'version') || provider.mode || 'v1',
        auth_mode: detailString(d, 'authMode') || 'client_credentials',
        home_name: detailString(d, 'homeName'),
        client_id: detailString(d, 'clientId'),
        client_secret: '',
        iglooworks_department_id: detailString(d, 'iglooworksDepartmentId'),
        iglooworks_api_key: '',
        clear_developer_client: ''
      };
    default:
      return {};
  }
};

/** The form for a provider under the current draft (the Igloo version and auth mode change the sections). */
export const generateAccountForm = (provider: LockProvider, draft: AccountDraft): AccountForm => {
  const d = provider.details;
  const base = { vendor: provider.vendor, title: t(provider.details ? A.editTitle : A.connectTitle, { provider: provider.label }), authorization: null as AccountForm['authorization'] };
  switch (provider.vendor) {
    case 'Zerv': {
      const [fMin, fMax] = range(provider, 'facilityRange', [0, 255]);
      const [bMin, bMax] = range(provider, 'badgeRange', [0, 65535]);
      return {
        ...base,
        intro: i18n.t(A.zerv.intro),
        sections: [
          {
            key: 'login',
            fields: [
              { key: 'username', label: i18n.t(A.zerv.username), kind: 'text', required: true, placeholder: i18n.t(A.zerv.usernamePh) },
              { key: 'password', label: i18n.t(A.zerv.password), kind: 'password', required: !detailBool(d, 'passwordPresent'), stored: detailBool(d, 'passwordPresent'), placeholder: detailBool(d, 'passwordPresent') ? i18n.t(A.storedSecret) : i18n.t(A.zerv.passwordPh) }
            ]
          },
          {
            key: 'reader',
            title: i18n.t(A.zerv.readerTitle),
            fields: [
              { key: 'facility_id', label: i18n.t(A.zerv.facility), kind: 'number', required: false, min: fMin, max: fMax, hint: t(A.rangeHint, { min: fMin, max: fMax }) },
              { key: 'badge_id', label: i18n.t(A.zerv.badge), kind: 'number', required: false, min: bMin, max: bMax, hint: t(A.rangeHint, { min: bMin, max: bMax }) },
              { key: 'card_format', label: i18n.t(A.zerv.cardFormat), kind: 'select', required: false, options: [{ value: '', label: i18n.t(A.zerv.chooseCard) }, ...cardFormats(provider).map((value) => ({ value, label: value }))] }
            ]
          }
        ]
      };
    }
    case 'Dwelo':
      return {
        ...base,
        intro: i18n.t(A.dwelo.intro),
        sections: [
          {
            key: 'account',
            fields: [
              { key: 'api_url', label: i18n.t(A.dwelo.apiUrl), kind: 'text', required: false, placeholder: 'https://api.dwelo.com', hint: i18n.t(A.dwelo.apiUrlHint) },
              { key: 'default_community_id', label: i18n.t(A.dwelo.community), kind: 'text', required: true, placeholder: i18n.t(A.dwelo.communityPh) },
              { key: 'client_id', label: i18n.t(A.clientId), kind: 'text', required: true },
              { key: 'client_secret', label: i18n.t(A.clientSecret), kind: 'password', required: !detailBool(d, 'clientSecretPresent'), stored: detailBool(d, 'clientSecretPresent'), placeholder: detailBool(d, 'clientSecretPresent') ? i18n.t(A.storedSecret) : undefined }
            ]
          }
        ]
      };
    case 'EdgeState': {
      const authorized = detailBool(d, 'authorized');
      return {
        ...base,
        intro: i18n.t(A.edge.intro),
        sections: [
          {
            key: 'credentials',
            title: i18n.t(A.edge.credentialsTitle),
            note: authorized ? i18n.t(A.edge.replacesGrant) : undefined,
            fields: [
              { key: 'client_id', label: i18n.t(A.clientId), kind: 'text', required: true },
              { key: 'client_secret', label: i18n.t(A.clientSecret), kind: 'password', required: !detailBool(d, 'clientSecretPresent'), stored: detailBool(d, 'clientSecretPresent'), placeholder: detailBool(d, 'clientSecretPresent') ? i18n.t(A.storedSecret) : undefined }
            ]
          }
        ],
        authorization: {
          authorized,
          label: i18n.t(authorized ? (detailBool(d, 'authorizedWithPynwheel') ? A.edge.grantPynwheel : A.edge.grantConnect) : A.edge.grantNone),
          note: i18n.t(A.edge.grantNote),
          authorizeUrl: null,
          removable: authorized
        }
      };
    }
    case 'Latch':
      return {
        ...base,
        intro: i18n.t(A.latch.intro),
        sections: [
          {
            key: 'building',
            fields: [{ key: 'latch_property_name', label: i18n.t(A.latch.building), kind: 'text', required: true, placeholder: i18n.t(A.latch.buildingPh), hint: i18n.t(A.latch.buildingHint) }]
          }
        ]
      };
    case 'Igloohome': {
      const version = draft.version || 'v1';
      const versions = (Array.isArray(provider.options?.versions) ? (provider.options!.versions as string[]) : [...IGLOO_VERSIONS]).map((value) => ({ value, label: i18n.t(A.igloo.versions[value as keyof typeof A.igloo.versions] ?? A.igloo.versions.v1) }));
      const sections: AccountSection[] = [
        {
          key: 'version',
          note: i18n.t(A.igloo.oneVersion),
          fields: [{ key: 'version', label: i18n.t(A.igloo.version), kind: 'select', required: true, options: versions }]
        }
      ];
      let authorization: AccountForm['authorization'] = null;
      if (version === 'igloohome') {
        const codeGrant = draft.auth_mode === 'code_grant';
        const authorized = detailBool(d, 'authorized');
        sections.push({
          key: 'api',
          title: i18n.t(A.igloo.apiTitle),
          fields: [
            { key: 'home_name', label: i18n.t(A.igloo.homeName), kind: 'text', required: true, placeholder: i18n.t(A.igloo.homeNamePh), hint: i18n.t(A.igloo.homeNameHint) },
            {
              key: 'auth_mode',
              label: i18n.t(A.igloo.authMode),
              kind: 'radio',
              required: true,
              options: [
                { value: 'client_credentials', label: i18n.t(A.igloo.clientCredentials) },
                { value: 'code_grant', label: i18n.t(A.igloo.codeGrant) }
              ]
            },
            ...(codeGrant
              ? []
              : [
                  { key: 'client_id', label: i18n.t(A.clientId), kind: 'text' as const, required: true },
                  { key: 'client_secret', label: i18n.t(A.clientSecret), kind: 'password' as const, required: !detailBool(d, 'clientSecretPresent'), stored: detailBool(d, 'clientSecretPresent'), placeholder: detailBool(d, 'clientSecretPresent') ? i18n.t(A.storedSecret) : undefined }
                ])
          ]
        });
        if (codeGrant) {
          authorization = {
            authorized,
            label: i18n.t(authorized ? A.igloo.grantOk : A.igloo.grantNone),
            note: i18n.t(A.igloo.grantNote),
            authorizeUrl: detailString(d, 'authorizeUrl') || null,
            removable: detailBool(d, 'refreshTokenPresent')
          };
        }
      } else if (version === 'iglooworks') {
        sections.push({
          key: 'iglooworks',
          title: i18n.t(A.igloo.iglooworksTitle),
          fields: [
            { key: 'iglooworks_api_key', label: i18n.t(A.igloo.apiKey), kind: 'password', required: !detailBool(d, 'iglooworksApiKeyPresent'), stored: detailBool(d, 'iglooworksApiKeyPresent'), placeholder: detailBool(d, 'iglooworksApiKeyPresent') ? i18n.t(A.storedSecret) : undefined },
            { key: 'iglooworks_department_id', label: i18n.t(A.igloo.department), kind: 'text', required: true }
          ]
        });
      } else {
        sections.push({ key: 'v1', note: i18n.t(A.igloo.v1Note), fields: [] });
        const stored = detailBool(d, 'clientSecretPresent');
        const clearing = draft.clear_developer_client === 'true';
        sections.push({
          key: 'developer',
          title: i18n.t(A.igloo.devTitle),
          note: i18n.t(A.igloo.devNote),
          fields: clearing
            ? [{ key: 'clear_developer_client', label: i18n.t(A.igloo.devClear), kind: 'check', required: false }]
            : [
                { key: 'client_id', label: i18n.t(A.clientId), kind: 'text', required: false },
                { key: 'client_secret', label: i18n.t(A.clientSecret), kind: 'password', required: false, stored, placeholder: stored ? i18n.t(A.storedSecret) : undefined },
                ...(stored || detailString(d, 'clientId') ? [{ key: 'clear_developer_client', label: i18n.t(A.igloo.devClear), kind: 'check' as const, required: false }] : [])
              ]
        });
      }
      return { ...base, intro: i18n.t(A.igloo.intro), sections, authorization };
    }
    default:
      return { ...base, intro: '', sections: [] };
  }
};

const isInteger = (value: string): boolean => /^\d+$/.test(value);

/** Field problems, keyed by field, as Locks::Accounts would refuse them. */
export const accountProblems = (form: AccountForm, draft: AccountDraft): Record<string, string> => {
  const problems: Record<string, string> = {};
  for (const section of form.sections) {
    for (const field of section.fields) {
      const value = (draft[field.key] ?? '').trim();
      if (field.required && !value && !(field.kind === 'password' && field.stored)) {
        problems[field.key] = t(A.required, { field: field.label });
        continue;
      }
      if (field.kind === 'number' && value && (!isInteger(value) || (field.min != null && Number(value) < field.min) || (field.max != null && Number(value) > field.max))) {
        problems[field.key] = t(A.range, { field: field.label, min: field.min ?? 0, max: field.max ?? 0 });
      }
      if (field.kind === 'select' && field.options && value && !field.options.some((option) => option.value === value)) {
        problems[field.key] = t(A.inclusion, { field: field.label });
      }
      if (field.key === 'api_url' && value && !/^https?:\/\/[^\s/]+(\/[^\s]*)?$/.test(value)) {
        problems[field.key] = i18n.t(A.dwelo.apiUrlInvalid);
      }
    }
    if (section.key === 'developer' && draft.clear_developer_client !== 'true') {
      const secretField = section.fields.find((f) => f.key === 'client_secret');
      const id = (draft.client_id ?? '').trim();
      const secret = (draft.client_secret ?? '').trim() || (secretField?.stored ? 'stored' : '');
      if (id && !secret) problems.client_secret = i18n.t(A.igloo.bothOrNeither);
      if (!id && secret && !secretField?.stored) problems.client_id = i18n.t(A.igloo.bothOrNeither);
    }
  }
  return problems;
};

/** The `fields` of the account write: the form's fields only, blank secrets left out. */
export const accountPayload = (form: AccountForm, draft: AccountDraft): Record<string, string> => {
  const fields: Record<string, string> = {};
  for (const section of form.sections) {
    for (const field of section.fields) {
      const value = (draft[field.key] ?? '').trim();
      if (field.kind === 'password' && !value) continue;
      if (field.kind === 'check' && value !== 'true') continue;
      fields[field.key] = value;
    }
  }
  return fields;
};

/** One line per account value the card shows (never a secret). */
export const accountSummary = (provider: LockProvider): { label: string; value: string }[] => {
  const d = provider.details;
  if (!d) return [];
  const rows: { label: string; value: string }[] = [];
  const push = (label: string, value: string | null | undefined) => {
    if (value) rows.push({ label, value });
  };
  switch (provider.vendor) {
    case 'Zerv':
      push(i18n.t(A.zerv.username), detailString(d, 'username'));
      push(i18n.t(A.zerv.facility), detailString(d, 'facilityId'));
      push(i18n.t(A.zerv.badge), detailString(d, 'badgeId'));
      push(i18n.t(A.zerv.cardFormat), detailString(d, 'cardFormat'));
      break;
    case 'Dwelo':
      push(i18n.t(A.dwelo.community), detailString(d, 'defaultCommunityId'));
      push(i18n.t(A.clientId), detailString(d, 'clientId'));
      push(i18n.t(A.dwelo.apiUrl), detailString(d, 'apiUrl'));
      break;
    case 'EdgeState':
      push(i18n.t(A.clientId), detailString(d, 'clientId'));
      push(i18n.t(A.edge.grant), detailBool(d, 'authorized') ? i18n.t(detailBool(d, 'authorizedWithPynwheel') ? A.edge.grantPynwheel : A.edge.grantConnect) : null);
      break;
    case 'Latch':
      push(i18n.t(A.latch.building), detailString(d, 'latchPropertyName'));
      break;
    case 'Igloohome': {
      const version = detailString(d, 'version') || provider.mode || 'v1';
      push(i18n.t(A.igloo.version), i18n.t(A.igloo.versions[version as keyof typeof A.igloo.versions] ?? A.igloo.versions.v1));
      if (version === 'igloohome') {
        push(i18n.t(A.igloo.homeName), detailString(d, 'homeName'));
        push(i18n.t(A.igloo.authMode), i18n.t(detailString(d, 'authMode') === 'code_grant' ? A.igloo.codeGrant : A.igloo.clientCredentials));
        if (detailString(d, 'authMode') !== 'code_grant') push(i18n.t(A.clientId), detailString(d, 'clientId'));
      }
      if (version === 'iglooworks') push(i18n.t(A.igloo.department), detailString(d, 'iglooworksDepartmentId'));
      if (version === 'v1' && detailBool(d, 'clientSecretPresent')) push(i18n.t(A.igloo.devClient), detailString(d, 'clientId'));
      break;
    }
    default:
      break;
  }
  return rows;
};

/** How a visitor opens this vendor's locks, from the CMS's access facts. */
export const accessLabel = (provider: LockProvider): string => {
  const method = provider.access?.method ?? '';
  const key = A.access[method as keyof typeof A.access] ?? A.access.unknown;
  const app = provider.access?.tourApp ? i18n.t(A.access.tourApp) : i18n.t(A.access.legacyOnly);
  const source = provider.access?.source === 'developer_client' ? i18n.t(A.igloo.sourceDeveloper) : provider.access?.source === 'partner_key' ? i18n.t(A.igloo.sourcePartner) : null;
  return source ? `${i18n.t(key)} · ${app} · ${source}` : `${i18n.t(key)} · ${app}`;
};

export const healthLabel = (provider: LockProvider): string => i18n.t(provider.healthSource === 'device_active' ? A.health.deviceActive : A.health.none);

/** The instruction images as the dialog shows them. */
export const instructionImages = (provider: LockProvider): { unit: { url: string | null; fileName: string } | null; amenity: { url: string | null; fileName: string } | null } => {
  const images = (provider.details?.images ?? null) as { unit?: { url: string | null; fileName: string } | null; amenity?: { url: string | null; fileName: string } | null } | null;
  return { unit: images?.unit ?? null, amenity: images?.amenity ?? null };
};

const decodeEntities = (value: string): string =>
  value.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");

export const stripHtml = (value: string): string => decodeEntities(value.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

/** The legacy rich-text instruction as plain text for the textarea: paragraphs and line breaks kept, tags and entities gone. */
export const instructionText = (value: string | null | undefined): string =>
  decodeEntities(
    (value ?? '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/** The legacy CSV layout: a header row, then device name and device ID. */
export const CSV_HINT_COLUMNS = ['Device Name', 'Device ID'] as const;

export const importSummary = (imported: { created: number; skippedExisting: number; skippedBlank: number; rows: number } | undefined): string =>
  imported ? t(A.devices.imported, { created: imported.created, existing: imported.skippedExisting, blank: imported.skippedBlank, rows: imported.rows }) : i18n.t(CORE_STRINGS.tourModules.common.saved);
