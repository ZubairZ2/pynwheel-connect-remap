'use client';

import Link from 'next/link';

import { Icon } from '~/core/components/atoms/connect/Icon';
import { DemoMark } from '~/core/components/atoms/DemoMark';
import { CloseIcon, PlusIcon } from '~/core/components/atoms/Icons';
import { MultiFilter } from '~/core/components/molecules/MultiFilter';
import { SearchField } from '~/core/components/molecules/SearchField';
import type { LaunchPriority } from '~/core/models/data/connect/launchBoard.data';
import { useLaunchBoard, type LaunchBoardController } from '~/core/hooks/connect/useLaunchBoard';
import {
  ACTION_KINDS,
  PRIORITY_LABEL,
  PRIORITY_OPTIONS,
  type LaunchCardView
} from '~/core/utils/generator/connect/launchBoard.generator';
import { LB_ACTION_STYLE, LB_PRODUCT_STYLE } from '~/data/mock/launchBoard.mock';

/**
 * The Launch Board (Back Office design, Oct 13, 2026): every property launch on
 * a seven-stage board, with filters, a list view and a drawer per launch.
 * Demo data throughout (see launchBoard.mock.ts); every interaction is local.
 */
export const LaunchBoardScreen = () => {
  const board = useLaunchBoard();
  const { stats, summary, view, drawer } = board;

  return (
    <div className="bo-lb">
      <div className="bo-lb__header">
        <div className="bo-lb__heading">
          <h2 className="bo-lb__title">
            Launch Board
            <DemoMark />
          </h2>
          <p className="bo-lb__sub">Every property launch from the order to the orientation · as of Oct 17, 2026</p>
        </div>
        <div className="bo-lb__stats">
          {stats.map((stat) => (
            <div key={stat.id} className="bo-lb__stat">
              <span className="bo-lb__statvalue" style={{ color: stat.color }}>
                {stat.value}
                <DemoMark />
              </span>
              <span className="bo-lb__statlabel">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      <FilterBar board={board} />

      <p className="bo-lb__summary">{summary}</p>

      {view === 'board' ? <Board board={board} /> : <ListView board={board} />}

      {drawer && <Drawer board={board} />}
    </div>
  );
};

const FilterBar = ({ board }: { board: LaunchBoardController }) => {
  const { filters, actions, orgOptions, productOptions, team, stats, view, filtered } = board;
  const overdue = stats.find((stat) => stat.id === 'overdue')?.value ?? 0;

  return (
    <div className="bo-lb__filters">
      <SearchField className="bo-lb__search" value={filters.query} onChange={actions.setQuery} ariaLabel="Search launches" placeholder="Search launches…" />
      <MultiFilter label="Company" allLabel="All Companies" options={orgOptions} selected={filters.orgs} onToggle={actions.toggleOrg} onClear={actions.clearOrgs} />
      <div className="bo-lb__chips" role="group" aria-label="Products">
        {productOptions.map((product) => {
          const on = filters.products.includes(product.id);
          return (
            <button
              key={product.id}
              type="button"
              aria-pressed={on}
              className={`bo-lb__chip${on ? ' bo-lb__chip--on' : ''}`}
              onClick={() => actions.toggleProductFilter(product.id)}
            >
              <span className="bo-lb__chipdot" style={{ background: product.color }} aria-hidden="true" />
              {product.label}
            </button>
          );
        })}
      </div>
      <select
        className="bo-field bo-lb__priority"
        aria-label="Priority"
        value={filters.priority}
        onChange={(event) => actions.setPriorityFilter(event.target.value as typeof filters.priority)}
      >
        {PRIORITY_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        aria-pressed={filters.overdueOnly}
        className={`bo-lb__overdue${filters.overdueOnly ? ' bo-lb__overdue--on' : ''}`}
        onClick={actions.toggleOverdue}
      >
        Overdue · {overdue}
      </button>
      <div className="bo-lb__people" role="group" aria-label="Assignee">
        {team.map((member) => {
          const on = filters.people.includes(member.id);
          return (
            <button
              key={member.id}
              type="button"
              aria-pressed={on}
              title={member.name}
              aria-label={member.name}
              className={`bo-lb__person${on ? ' bo-lb__person--on' : ''}`}
              style={{ background: member.color }}
              onClick={() => actions.togglePerson(member.id)}
            >
              {member.name
                .split(' ')
                .slice(0, 2)
                .map((part) => part[0])
                .join('')}
            </button>
          );
        })}
      </div>
      {filtered && (
        <button type="button" className="bo-lb__clear" onClick={actions.clearFilters}>
          Clear filters
        </button>
      )}
      <span className="bo-toolbar__spacer" />
      <div className="bo-switcher" role="group" aria-label="View">
        {(['board', 'list'] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={view === option}
            className={`bo-switcher__option${view === option ? ' bo-switcher__option--on' : ''}`}
            onClick={() => actions.setView(option)}
          >
            {option === 'board' ? 'Board' : 'List'}
          </button>
        ))}
      </div>
    </div>
  );
};

const Board = ({ board }: { board: LaunchBoardController }) => {
  const { columns, actions, overStage, dragId, drawer } = board;
  return (
    <div className="bo-lb__board" data-testid="launch-board">
      {columns.map((column) => (
        <section
          key={column.stage.key}
          className={`bo-lb__column${overStage === column.stage.key ? ' bo-lb__column--over' : ''}`}
          aria-label={column.stage.label}
          onDragOver={actions.onDragOver(column.stage.key)}
          onDragLeave={actions.onDragLeave(column.stage.key)}
          onDrop={actions.onDrop(column.stage.key)}
        >
          <header className="bo-lb__colhead">
            <span className="bo-lb__colnum" aria-hidden="true">
              {column.stage.num}
            </span>
            <span className="bo-lb__colname">{column.stage.short}</span>
            <span className="bo-lb__colcount">{column.count}</span>
            {column.overdue > 0 && <span className="bo-lb__collate">{column.overdue} late</span>}
          </header>
          <p className="bo-lb__coldesc">
            {column.stage.desc} · Target {column.stage.slaDays}d
          </p>
          <div className="bo-lb__cards">
            {column.cards.map((card) => (
              <Card key={card.id} card={card} open={drawer?.card.id === card.id} dragging={dragId === card.id} board={board} />
            ))}
            {column.cards.length === 0 && <div className="bo-lb__drop">Drop a card here</div>}
          </div>
        </section>
      ))}
    </div>
  );
};

const Card = ({ card, open, dragging, board }: { card: LaunchCardView; open: boolean; dragging: boolean; board: LaunchBoardController }) => {
  const { actions } = board;
  return (
    <article
      className={`bo-lb__card${open ? ' bo-lb__card--open' : ''}${card.overdue ? ' bo-lb__card--late' : ''}${dragging ? ' bo-lb__card--dragging' : ''}`}
      draggable
      tabIndex={0}
      role="button"
      aria-label={`${card.name} · ${card.stageLabel}`}
      onDragStart={actions.onDragStart(card.id)}
      onDragEnd={actions.onDragEnd}
      onClick={() => actions.open(card.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          actions.open(card.id);
        }
      }}
    >
      <div className="bo-lb__cardtop">
        <span className="bo-lb__org">{card.org}</span>
        <PriorityIcon priority={card.priority} />
      </div>
      <div className="bo-lb__cardname">
        {card.name}
        <DemoMark />
      </div>
      <div className="bo-lb__cardmeta">{card.meta}</div>
      <div className="bo-lb__products">
        {card.products.map((product) => (
          <span key={product.key} className="bo-lb__product" style={{ color: product.color, background: product.bg }}>
            {product.label}
          </span>
        ))}
        {card.products.length === 0 && <span className="bo-lb__noproduct">No product picked</span>}
      </div>
      {card.action && (
        <div className="bo-lb__action" style={{ color: card.action.color, background: card.action.bg }} title={card.action.title}>
          <Icon name={card.action.icon} style={{ transform: 'scale(0.75)' }} />
          {card.action.label}
        </div>
      )}
      <div className="bo-lb__checks">
        <span className="bo-lb__checktrack" aria-hidden="true">
          <span className="bo-lb__checkbar" style={{ width: `${card.checks.pct}%` }} />
        </span>
        <span className="bo-lb__checktext">
          {card.checks.done}/{card.checks.total}
        </span>
      </div>
      <div className="bo-lb__cardfoot">
        <span className="bo-lb__due" style={{ color: card.due.color }}>
          <Icon name="calendar" style={{ transform: 'scale(0.7)' }} />
          {card.due.label}
        </span>
        <span className="bo-lb__age">{card.age}</span>
        <Avatar initials={card.assigneeInitials} color={card.assignee?.color ?? '#B4BAC6'} title={card.assignee?.name ?? 'Unassigned'} size={24} />
      </div>
    </article>
  );
};

const ListView = ({ board }: { board: LaunchBoardController }) => {
  const { rows, actions, stages, team, drawer } = board;
  return (
    <div className="bo-lb__list" role="table" aria-label="Launches">
      <div className="bo-lb__listhead" role="row">
        {['Property', 'Stage', 'Checklist', 'Priority', 'Due', 'Assignee', 'Products'].map((column) => (
          <span key={column} role="columnheader">
            {column}
          </span>
        ))}
      </div>
      {rows.map((row) => (
        <div key={row.id} role="row" className={`bo-lb__listrow${drawer?.card.id === row.id ? ' bo-lb__listrow--open' : ''}`}>
          <button type="button" role="cell" className="bo-lb__listname" onClick={() => actions.open(row.id)}>
            <span className="bo-lb__cardname">
              {row.name}
              <DemoMark />
            </span>
            <span className="bo-lb__cardmeta">
              {row.org} · {row.meta}
            </span>
          </button>
          <span role="cell">
            <select className="bo-field bo-lb__listselect" aria-label={`Stage of ${row.name}`} value={row.stage} onChange={(event) => actions.moveCard(row.id, event.target.value as typeof row.stage)}>
              {stages.map((stage) => (
                <option key={stage.key} value={stage.key}>
                  {stage.num}. {stage.label}
                </option>
              ))}
            </select>
          </span>
          <span role="cell" className="bo-lb__checks">
            <span className="bo-lb__checktrack" aria-hidden="true">
              <span className="bo-lb__checkbar" style={{ width: `${row.checks.pct}%` }} />
            </span>
            <span className="bo-lb__checktext">
              {row.checks.done}/{row.checks.total}
            </span>
          </span>
          <span role="cell" className="bo-lb__listpriority">
            <PriorityIcon priority={row.priority} />
            {PRIORITY_LABEL[row.priority]}
          </span>
          <span role="cell" className="bo-lb__due" style={{ color: row.due.color }}>
            {row.due.label}
          </span>
          <span role="cell" className="bo-lb__listassignee">
            <Avatar initials={row.assigneeInitials} color={row.assignee?.color ?? '#B4BAC6'} title={row.assignee?.name ?? 'Unassigned'} size={24} />
            <select
              className="bo-field bo-lb__listselect"
              aria-label={`Assignee of ${row.name}`}
              value={row.assignee?.id ?? ''}
              onChange={(event) => {
                actions.open(row.id);
                actions.setAssignee(event.target.value);
              }}
            >
              <option value="">Unassigned</option>
              {team.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </span>
          <span role="cell" className="bo-lb__products">
            {row.products.map((product) => (
              <span key={product.key} className="bo-lb__product" style={{ color: product.color, background: product.bg }}>
                {product.label}
              </span>
            ))}
          </span>
        </div>
      ))}
      {rows.length === 0 && <div className="bo-lb__empty">No launches match these filters.</div>}
    </div>
  );
};

const Drawer = ({ board }: { board: LaunchBoardController }) => {
  const { drawer, actions, stages, team, handoff } = board;
  if (!drawer) return null;
  const { card, view, stage, checks, nextStage, owner, ownerWhy, late, lateLabel, action, history } = drawer;

  return (
    <aside className="bo-lb__drawer" role="dialog" aria-label={`${card.name} launch`} data-testid="launch-drawer">
      <header className="bo-lb__drawerhead">
        <div className="bo-lb__drawerwho">
          <span className="bo-lb__org">{card.org}</span>
          <h3 className="bo-lb__drawertitle">
            {card.name}
            <DemoMark />
          </h3>
          <span className="bo-lb__cardmeta">{view.meta}</span>
        </div>
        {view.href && (
          <Link href={view.href} className="bo-linkbutton bo-linkbutton--small">
            Open property
          </Link>
        )}
        <button type="button" className="bo-modal__close" aria-label="Close" onClick={actions.close}>
          <CloseIcon />
        </button>
      </header>

      <div className="bo-lb__drawerbody">
        <section className="bo-lb__block">
          <h4 className="bo-lb__blocktitle">Stage</h4>
          <div className="bo-lb__stagegrid" role="group" aria-label="Stage">
            {stages.map((option) => (
              <button
                key={option.key}
                type="button"
                aria-pressed={option.key === card.stage}
                className={`bo-lb__stagebtn${option.key === card.stage ? ' bo-lb__stagebtn--on' : ''}`}
                onClick={() => actions.moveCard(card.id, option.key)}
              >
                <span className="bo-lb__stagenum">{option.num}</span>
                <span className="bo-lb__stagelabel">{option.short}</span>
              </button>
            ))}
          </div>
          <p className="bo-lb__stagedesc">
            {stage.label} · {stage.desc}
          </p>
          {late && lateLabel && <div className="bo-offnote">{lateLabel}</div>}
        </section>

        <section className="bo-lb__block">
          <h4 className="bo-lb__blocktitle">Checklist</h4>
          <ul className="bo-lb__checklist">
            {checks.map((check) => (
              <li key={check.index}>
                <label className={`bo-lb__check${check.done ? ' bo-lb__check--done' : ''}`}>
                  <input type="checkbox" checked={check.done} onChange={() => actions.toggleCheck(check.index)} />
                  <span>{check.label}</span>
                </label>
              </li>
            ))}
          </ul>
          {nextStage ? (
            <button type="button" className="bo-primarybutton" onClick={actions.advance}>
              Move to {nextStage.label} →
            </button>
          ) : (
            <p className="bo-lb__done">Last stage · the launch is complete when the checklist is.</p>
          )}
        </section>

        <section className="bo-lb__block bo-lb__owner">
          <Avatar initials={owner ? owner.name.split(' ').map((part) => part[0]).slice(0, 2).join('') : '?'} color={owner?.color ?? '#B4BAC6'} title={owner?.name ?? ''} size={30} />
          <div>
            <div className="bo-lb__ownername">
              Stage owner · {owner?.name ?? 'Unassigned'}
              <span className="bo-lb__auto">auto</span>
            </div>
            <div className="bo-lb__ownerwhy">{ownerWhy}</div>
          </div>
        </section>

        <section className="bo-lb__block">
          <h4 className="bo-lb__blocktitle">Hand off for action</h4>
          {action ? (
            <div className="bo-lb__actioncard" style={{ borderColor: action.style.color }}>
              <div className="bo-lb__actionhead">
                <span className="bo-lb__action" style={{ color: action.style.color, background: action.style.bg }}>
                  <Icon name={action.style.icon} style={{ transform: 'scale(0.75)' }} />
                  {action.style.label}
                </span>
                <span className="bo-lb__cardmeta">
                  {action.assigneeName} · opened {action.opened}
                </span>
              </div>
              <div className="bo-lb__actiontitle">{action.title}</div>
              {action.note && <div className="bo-lb__actionnote">{action.note}</div>}
              <button type="button" className="bo-linkbutton bo-linkbutton--small" onClick={actions.resolveAction}>
                Mark resolved
              </button>
            </div>
          ) : handoff ? (
            <div className="bo-lb__handoff">
              <label className="bo-form__field">
                <span className="bo-form__label">Type</span>
                <select className="bo-field bo-form__input" value={handoff.kind} onChange={(event) => actions.patchHandoff({ kind: event.target.value as typeof handoff.kind })}>
                  {ACTION_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {LB_ACTION_STYLE[kind].label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="bo-form__field">
                <span className="bo-form__label">Assign to</span>
                <select className="bo-field bo-form__input" value={handoff.assignee} onChange={(event) => actions.patchHandoff({ assignee: event.target.value })}>
                  {team.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="bo-form__field">
                <span className="bo-form__label">Title</span>
                <input className="bo-field bo-form__input" value={handoff.title} placeholder="What needs doing" onChange={(event) => actions.patchHandoff({ title: event.target.value })} />
              </label>
              <label className="bo-form__field">
                <span className="bo-form__label">Note</span>
                <textarea className="bo-field bo-form__textarea" value={handoff.note} onChange={(event) => actions.patchHandoff({ note: event.target.value })} />
              </label>
              <div className="bo-lb__handoffbtns">
                <button type="button" className="bo-linkbutton bo-linkbutton--quiet" onClick={actions.cancelHandoff}>
                  Cancel
                </button>
                <button type="button" className="bo-primarybutton" disabled={!handoff.title.trim()} onClick={actions.submitHandoff}>
                  Assign
                </button>
              </div>
            </div>
          ) : (
            <div className="bo-lb__handoffbtns bo-lb__handoffbtns--start">
              {ACTION_KINDS.map((kind) => (
                <button key={kind} type="button" className="bo-lb__handoffbtn" style={{ color: LB_ACTION_STYLE[kind].color, borderColor: LB_ACTION_STYLE[kind].color }} onClick={() => actions.openHandoff(kind)}>
                  <PlusIcon />
                  {LB_ACTION_STYLE[kind].label}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="bo-lb__block bo-lb__fields">
          <label className="bo-form__field">
            <span className="bo-form__label">Assigned to</span>
            <select className="bo-field bo-form__input" value={card.assignee ?? ''} onChange={(event) => actions.setAssignee(event.target.value)}>
              <option value="">Unassigned</option>
              {team.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
          <label className="bo-form__field">
            <span className="bo-form__label">Priority</span>
            <select className="bo-field bo-form__input" value={card.priority} onChange={(event) => actions.setPriority(event.target.value as LaunchPriority)}>
              {(['high', 'normal', 'low'] as LaunchPriority[]).map((priority) => (
                <option key={priority} value={priority}>
                  {PRIORITY_LABEL[priority]}
                </option>
              ))}
            </select>
          </label>
          <label className="bo-form__field">
            <span className="bo-form__label">Due date</span>
            <input type="date" className="bo-field bo-form__input" value={card.due} onChange={(event) => actions.setDue(event.target.value)} />
          </label>
        </section>

        <section className="bo-lb__block">
          <h4 className="bo-lb__blocktitle">Products ordered</h4>
          <div className="bo-lb__producttoggles">
            {(Object.keys(LB_PRODUCT_STYLE) as (keyof typeof LB_PRODUCT_STYLE)[]).map((key) => {
              const on = card.products.includes(key);
              const style = LB_PRODUCT_STYLE[key];
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={on}
                  className={`bo-lb__producttoggle${on ? ' bo-lb__producttoggle--on' : ''}`}
                  style={on ? { color: style.color, background: style.bg, borderColor: style.color } : undefined}
                  onClick={() => actions.toggleProduct(key)}
                >
                  {on ? '✓' : '+'} {style.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="bo-lb__block">
          <h4 className="bo-lb__blocktitle">Notes</h4>
          <textarea className="bo-field bo-form__textarea" value={card.notes} placeholder="Anything the next owner should know" onChange={(event) => actions.setNotes(event.target.value)} />
        </section>

        <section className="bo-lb__block">
          <h4 className="bo-lb__blocktitle">History</h4>
          <ul className="bo-lb__history">
            {history.map((entry, index) => (
              <li key={`${entry.when}-${index}`} className="bo-lb__historyrow">
                <Avatar initials={entry.whoInitials} color={entry.who?.color ?? '#B4BAC6'} title={entry.who?.name ?? ''} size={24} />
                <span className="bo-lb__historytext">
                  <b>{entry.who?.name ?? 'Someone'}</b> {entry.text}
                </span>
                <span className="bo-lb__historywhen">{entry.when}</span>
              </li>
            ))}
            {history.length === 0 && <li className="bo-lb__cardmeta">Nothing yet.</li>}
          </ul>
        </section>

        <p className="bo-lb__note">Demo board: moves, ticks, hand-offs and notes stay on this page and are not saved.</p>
      </div>
    </aside>
  );
};

const PriorityIcon = ({ priority }: { priority: LaunchPriority }) => {
  const color = priority === 'high' ? '#C62534' : priority === 'low' ? 'var(--bo-subtle)' : 'var(--bo-muted)';
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-label={`${PRIORITY_LABEL[priority]} priority`} role="img">
      {priority === 'high' && (
        <>
          <line x1="12" y1="19" x2="12" y2="5" />
          <polyline points="5 12 12 5 19 12" />
        </>
      )}
      {priority === 'normal' && <line x1="5" y1="12" x2="19" y2="12" />}
      {priority === 'low' && (
        <>
          <line x1="12" y1="5" x2="12" y2="19" />
          <polyline points="19 12 12 19 5 12" />
        </>
      )}
    </svg>
  );
};

const Avatar = ({ initials, color, title, size }: { initials: string; color: string; title: string; size: number }) => (
  <span
    className="bo-lb__avatar"
    title={title}
    aria-label={title || undefined}
    style={{ width: size, height: size, background: color, fontSize: Math.round(size * 0.4) }}
  >
    {initials}
  </span>
);
