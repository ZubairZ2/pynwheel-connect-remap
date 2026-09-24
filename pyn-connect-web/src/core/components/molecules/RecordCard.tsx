import type { ReactNode } from 'react';

interface Props {
  /** The card's image column. */
  thumb?: ReactNode;
  /** The record's name: text, or a button when the name opens it. */
  title: ReactNode;
  /** Pills after the title. */
  pills?: ReactNode;
  /** The buttons at the card's end. */
  actions?: ReactNode;
  children?: ReactNode;
}

/**
 * One record on an inventory tab, as the design lays out floorplates, floor
 * plans, units and amenities: image, then name and details, then actions.
 */
export const RecordCard = ({ thumb, title, pills, actions, children }: Props) => (
  <article className="bo-record">
    {thumb}
    <div className="bo-record__body">
      <div className="bo-record__titlerow">
        {title}
        {pills}
      </div>
      {children}
    </div>
    {actions && <div className="bo-record__actions">{actions}</div>}
  </article>
);
