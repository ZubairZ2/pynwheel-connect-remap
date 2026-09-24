'use client';

import { FloorplanDialog } from '~/core/screens/connect/dialogs/floorplan.screen';
import { FloorplateDialog } from '~/core/screens/connect/dialogs/floorplate.screen';
import { FormDialog } from '~/core/screens/connect/dialogs/form.screen';
import { KickoffDialog } from '~/core/screens/connect/dialogs/kickoff.screen';
import { LockInstructionsDialog } from '~/core/screens/connect/dialogs/lockInstructions.screen';
import { LogoCropDialog } from '~/core/screens/connect/dialogs/logoCrop.screen';
import { MassOverrideDialog } from '~/core/screens/connect/dialogs/massOverride.screen';
import { PricingFeeDialog } from '~/core/screens/connect/dialogs/pricingFee.screen';
import { TranscriptDialog } from '~/core/screens/connect/dialogs/transcript.screen';

/**
 * Every dialog in the ported UI, mounted once in the shell.
 *
 * Each one is driven by `demo.modal` (or its own open flag), so screens only
 * ever dispatch "open this modal with this form" and never render a dialog
 * themselves — the design works the same way.
 */
export const ConnectDialogs = () => (
  <>
    <FormDialog />
    <FloorplateDialog />
    <FloorplanDialog />
    <PricingFeeDialog />
    <MassOverrideDialog />
    <KickoffDialog />
    <LogoCropDialog />
    <LockInstructionsDialog />
    <TranscriptDialog />
  </>
);
