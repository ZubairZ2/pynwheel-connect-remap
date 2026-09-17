interface Props {
  title: string;
  recordCount?: number;
}

export const Navbar = ({ title, recordCount }: Props) => (
  <header className="bo-topbar">
    <h1 className="bo-topbar__title">{title}</h1>
    {recordCount != null && (
      <>
        <span className="bo-topbar__divider" aria-hidden="true" />
        <span className="bo-topbar__count">{recordCount.toLocaleString()} records</span>
      </>
    )}
    <span style={{ flex: 1 }} />
    <span className="bo-env">
      <span className="bo-env__dot" aria-hidden="true" />
      {(process.env.NEXT_PUBLIC_ENV_LABEL ?? 'STAGING').toUpperCase()}
    </span>
  </header>
);
