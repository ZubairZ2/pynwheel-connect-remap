/**
 * Today in the CMS's time zone (`config.time_zone`, Eastern), as yyyy-mm-dd.
 * "Available now" is measured against it on the legacy units grid, so the
 * server passes it down and both renders compute availability the same way.
 */
export const cmsToday = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
