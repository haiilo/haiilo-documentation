'use client';

const catalystI18n = {
  'datepicker.year': 'Year',
  'datepicker.month': 'Month',
  'datepicker.hour': 'Hour',
  'datepicker.minute': 'Minute',
  'datepicker.scroll': 'Scroll to increment',
  'datepicker.toggle': 'Click to toggle',
  'datepicker.prevYear': 'Previous year',
  'datepicker.nextYear': 'Next year',
  'datepicker.prevMonth': 'Previous month',
  'datepicker.nextMonth': 'Next month',
  'datepicker.arrowKeys': 'Arrow keys to navigate',
  'datepicker.today': 'Today',
  'datepicker.change': 'Change date',
  'datepicker.choose': 'Choose date',
  'datepicker.clear': 'Clear date',
  'timepicker.change': 'Change time',
  'timepicker.choose': 'Choose time',
  'dialog.close': 'Close',
  'input.clear': 'Clear',
  'input.optional': 'Optional',
  'input.required': 'Required',
  'input.showPassword': 'Show password',
  'input.hidePassword': 'Hide password',
  'notification.dismiss': 'Dismiss',
  'pagination.ariaLabel': 'Pagination',
  'pagination.prev': 'Previous',
  'pagination.page': 'Go to page {{page}}',
  'pagination.next': 'Next',
  'select.close': 'Close',
  'select.deselect': 'Deselect',
  'select.empty': 'No items',
  'select.open': 'Open',
  'tabs.more': 'More',
} as const;

let initPromise: Promise<void> | null = null;

export function ensureCatalystLoaded(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = Promise.all([
    import('@haiilo/catalyst/loader'),
    import('@haiilo/catalyst'),
    import('@haiilo/catalyst-icons'),
  ]).then(function registerCatalyst([{ defineCustomElements }, { catI18nRegistry, catIconRegistry }, { ci }]): void {
    defineCustomElements();
    catIconRegistry.addIcons(ci);
    catI18nRegistry.set(catalystI18n);
  });

  return initPromise;
}
