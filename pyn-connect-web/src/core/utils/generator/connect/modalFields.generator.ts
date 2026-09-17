import { STARTER_THEMES } from '~/data/mock/branding.mock';
import { FEE_UNITS } from '~/data/mock/fees.mock';
import { AMENITY_CATEGORIES, PMS_PROVIDERS } from '~/data/mock/core.mock';
import { DAYS, SLOT_TIMES } from '~/data/mock/scheduling.mock';
import { curInv, curProp, levels } from '~/core/store/demo/demo.selectors';
import type { DemoState, FormState } from '~/core/store/demo/demo.state';

/* The three field shapes `FormDialog` knows how to render. */

export interface TextField {
  isText: true;
  isSelect: false;
  isChecks: false;
  key: string;
  label: string;
  value: string;
  placeholder: string;
  note: string;
}

export interface SelectField {
  isText: false;
  isSelect: true;
  isChecks: false;
  key: string;
  label: string;
  value: string;
  options: string[];
  note: string;
}

export interface ChecksField {
  isText: false;
  isSelect: false;
  isChecks: true;
  key: string;
  label: string;
  note: string;
  boxes: Array<{ id: string; label: string; on: boolean; border: string; bg: string; color: string }>;
}

export type ModalField = TextField | SelectField | ChecksField;

const MODAL_NAMES: Record<string, string> = {
  org: 'Company',
  prop: 'Property',
  user: 'Invite User',
  stop: 'Tour Stop',
  page: 'Page',
  tile: 'Homepage Tile',
  link: 'Brochure Link Button',
  fee: 'Fee Bucket',
  bcc: 'BCC Recipient',
  rates: 'Billing Rate Card',
  region: 'Region',
  group: 'Portfolio Group',
  booking: 'Tour Booking',
  floorplate: 'Floorplate',
  elevator: 'Elevator Bank',
  floorplan: 'Floorplan',
  unit: 'Unit',
  amenity: 'Amenity'
};

export const generateModalTitle = (state: DemoState): string => {
  if (state.modal === 'orgPms') return `Connect ${(state.form.pmsProvider as string) || 'PMS Provider'}`;
  const name = MODAL_NAMES[state.modal ?? ''];
  if (!name) return '';
  if (state.modal === 'user') return name;
  if (state.modal === 'rates') return `Edit ${name}`;
  return `${state.editingId ? 'Edit ' : 'Add '}${name}`;
};

export const generateModalSaveLabel = (state: DemoState): string => {
  if (state.modal === 'orgPms') return 'Save Credentials';
  if (state.modal === 'stop' && !state.editingId) return 'Add Stop';
  if (state.editingId) return 'Save Changes';
  if (state.modal === 'user') return 'Send Invite';
  if (state.modal === 'booking') return 'Create Booking';
  return 'Create';
};

const text = (form: FormState, key: string, label: string, placeholder = '', note = ''): TextField => ({
  isText: true,
  isSelect: false,
  isChecks: false,
  key,
  label,
  value: (form[key] as string) ?? '',
  placeholder,
  note
});

const select = (
  form: FormState,
  key: string,
  label: string,
  options: string[],
  note = ''
): SelectField => ({
  isText: false,
  isSelect: true,
  isChecks: false,
  key,
  label,
  value: (form[key] as string) ?? options[0],
  options,
  note
});

const checks = (
  form: FormState,
  key: string,
  label: string,
  options: Array<{ id: string; label: string }>,
  note = ''
): ChecksField => ({
  isText: false,
  isSelect: false,
  isChecks: true,
  key,
  label,
  note,
  boxes: options.map((option) => {
    const on = ((form[key] as string[] | undefined) ?? []).indexOf(option.id) >= 0;
    return {
      id: option.id,
      label: option.label,
      on,
      border: on ? 'var(--bo-accent)' : 'var(--bo-line)',
      bg: on ? 'var(--bo-accent-soft)' : '#fff',
      color: on ? 'var(--bo-accent)' : 'var(--bo-muted)'
    };
  })
});

/**
 * Field descriptors for the shared form dialog — the design's `modalFields`.
 * Everything module-specific lives here, not in the dialog component.
 */
export const generateModalFields = (
  state: DemoState,
  stopPool: string[]
): ModalField[] => {
  const form = state.form;
  const inv = curInv(state);
  const levelOptions = levels(state).map((l) => `${l.floor} · ${l.building}`);
  const buildingOptions = (curProp(state)?.buildings ?? [{ name: 'Main', units: 0 }]).map((b) => b.name);
  const myProps = state.props
    .filter((p) => p.orgId === state.orgId)
    .map((p) => ({ id: p.id, label: p.name }));

  switch (state.modal) {
    case 'org':
      return [
        text(form, 'name', 'Company name', 'e.g. Alliance Residential'),
        select(form, 'pmsProvider', 'PMS Provider', PMS_PROVIDERS),
        text(form, 'contact', 'Primary contact', 'Full name'),
        text(form, 'email', 'Contact email', 'name@company.com')
      ];

    case 'prop':
      return [
        text(form, 'name', 'Property name', 'e.g. Luxe Mile High'),
        text(form, 'city', 'City', 'City, State'),
        text(form, 'units', 'Units', '120'),
        select(form, 'orgName', 'Company', state.orgs.map((o) => o.name))
      ];

    case 'user':
      return [
        text(form, 'name', 'Full name', 'Full name'),
        text(form, 'email', 'Work email', 'name@company.com'),
        select(form, 'org', 'Company', ['— Pynwheel —', ...state.orgs.map((o) => o.name)]),
        select(form, 'role', 'Role', ['Platform Admin', 'Property Manager', 'Leasing-Concierge', 'Corporate Viewer'])
      ];

    case 'stop':
      if (state.editingId) {
        return [
          text(form, 'name', 'Stop name', 'e.g. Rooftop Pool'),
          text(form, 'floorLabel', 'Floor / detail', 'e.g. 1st Floor or 2 Bed · 2 Bath'),
          text(form, 'distance', 'Distance (ft)', '50'),
          text(form, 'duration', 'Duration (min)', '3'),
          text(form, 'talkingPoint', 'AI talking point', 'What the concierge should say')
        ];
      }
      return [
        select(
          form,
          'source',
          'Promote from inventory',
          stopPool.length ? stopPool : ['No inventory left'],
          'A tour stop is always a unit or an amenity. Plot it on Map & Plotting to fix its position.'
        ),
        text(form, 'duration', 'Minutes at stop', '3'),
        text(form, 'talkingPoint', 'AI talking point', 'What the concierge should say')
      ];

    case 'orgPms':
      return [
        select(form, 'pmsProvider', 'Provider', PMS_PROVIDERS),
        text(form, 'pmsUser', 'API user or account', 'integrations@company.com'),
        text(form, 'pmsKey', 'API key or secret', 'Paste the key issued by the provider')
      ];

    case 'floorplan':
      return [
        text(form, 'name', 'Floorplan name', 'e.g. The Cedar'),
        text(form, 'beds', 'Bedrooms', '2'),
        text(form, 'baths', 'Bathrooms', '2'),
        text(form, 'sqft', 'Square feet', '1100'),
        text(form, 'rent', 'Market rent (USD)', '2400'),
        text(form, 'deposit', 'Deposit (USD)', '750'),
        select(form, 'fstatus', 'Availability', ['available', 'almost', 'sold'])
      ];

    case 'unit':
      return [
        text(form, 'name', 'Unit number', 'e.g. Unit 1204'),
        select(form, 'ufp', 'Floorplan', inv.floorplans.length ? inv.floorplans.map((f) => f.name) : ['—']),
        text(form, 'price', 'Price (USD)', '2400'),
        text(form, 'sqft', 'Square feet', '1100'),
        text(form, 'ufloor', 'PMS floor label', 'Floor 12'),
        select(form, 'ubuilding', 'Building', buildingOptions),
        select(form, 'uavail', 'Availability', ['available', 'almost', 'sold']),
        select(
          form,
          'ulevel',
          'Floorplate',
          levelOptions.length ? levelOptions : ['—'],
          'Fields entered here are marked Manual and are protected from the next PMS sync.'
        )
      ];

    case 'amenity':
      return [
        text(form, 'name', 'Amenity name', 'e.g. Rooftop Pool'),
        select(form, 'acat', 'Category', AMENITY_CATEGORIES),
        select(form, 'alevel', 'Floorplate', levelOptions.length ? levelOptions : ['—'])
      ];

    case 'elevator':
      return [
        text(form, 'ename', 'Bank name', 'e.g. Bank A'),
        select(form, 'ebuilding', 'Building', buildingOptions),
        text(form, 'efrom', 'Serves from', 'Lobby'),
        text(form, 'eto', 'Serves to', 'Floor 20'),
        select(form, 'egated', 'Smart-lock gated', ['Yes', 'No'])
      ];

    case 'page':
      return [
        text(form, 'title', 'Page title', 'e.g. Matterport Virtual Tour'),
        select(form, 'ptype', 'Page type', ['Embedded Page', 'External Link', 'Image Gallery', 'Slideshow']),
        text(form, 'detail', 'URL, embed code, or image count', 'my.matterport.com/show/?m=… or 12 photos'),
        select(form, 'onHome', 'Show on homepage', ['Yes', 'No'])
      ];

    case 'tile':
      return [
        text(form, 'label', 'Tile label', 'e.g. Floor Plans'),
        select(form, 'icon', 'Icon', ['grid', 'bed', 'star', 'map', 'compass', 'heart', 'calc', 'pages', 'image', 'wave', 'dumbbell'])
      ];

    case 'link':
      return [
        text(form, 'label', 'Button label', 'e.g. Apply Now'),
        text(form, 'url', 'Destination URL', 'property.com/apply')
      ];

    case 'fee':
      return [
        text(form, 'label', 'Fee label', 'e.g. Application Fee'),
        text(form, 'amount', 'Amount (USD)', '75'),
        select(form, 'funit', 'Multiplies by', Object.keys(FEE_UNITS))
      ];

    case 'bcc':
      return [text(form, 'email', 'BCC email address', 'leasing@property.com')];

    case 'rates':
      return [
        text(form, 'touch', 'Touch kiosk rate', '$249'),
        text(form, 'tour', 'Self-guided tour rate', '$149'),
        text(form, 'maps', 'Maps rate', '$99'),
        text(form, 'combined', 'Combined rate', '$429'),
        text(form, 'month', 'Billing month', 'February 2026')
      ];

    case 'region':
      return [
        text(form, 'name', 'Region name', 'e.g. Mountain West'),
        text(form, 'contact', 'Regional contact', 'Full name'),
        text(form, 'email', 'Contact email', 'name@company.com'),
        checks(form, 'propIds', 'Assigned properties', myProps, 'Regions group properties for reporting and CSV export')
      ];

    case 'group':
      return [
        text(form, 'name', 'Group name', 'e.g. Denver Collection'),
        select(form, 'master', 'Master property', state.props.filter((p) => p.orgId === state.orgId).map((p) => p.name)),
        checks(form, 'propIds', 'Member properties', myProps, 'These properties appear on the branded landing page'),
        select(form, 'video', 'Background loop video', ['Yes', 'No']),
        select(form, 'design', 'Landing page design', STARTER_THEMES.map((t) => t.name))
      ];

    case 'booking':
      return [
        text(form, 'visitor', 'Visitor name', 'Full name'),
        text(form, 'email', 'Email', 'name@email.com'),
        text(form, 'phone', 'Phone', '(303) 555-0100'),
        select(form, 'bprop', 'Property', state.props.map((p) => p.name)),
        select(form, 'bday', 'Day', DAYS),
        select(form, 'btime', 'Time', SLOT_TIMES),
        select(form, 'btype', 'Tour type', ['Self-Guided', 'Person-Guided', 'Virtual'])
      ];

    default:
      return [];
  }
};
