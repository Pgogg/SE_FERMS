// components/ui/Table/Table.jsx — Light table inside a Card; responsive stacked cards on mobile; Skeleton loading
import React from 'react';
import Card from '../Card/Card';
import Skeleton from '../Skeleton/Skeleton';
import EmptyState from '../EmptyState/EmptyState';
import styles from './Table.module.css';

export default function Table({
  columns = [],
  rows = [],
  rowKey,
  onRowClick,
  empty,
  loading = false,
}) {
  if (loading) {
    return (
      <Card variant="light" className={styles.wrapper}>
        <div className={styles.tableWrap}>
          <table className={styles.table} aria-busy="true">
            <thead className={styles.thead}>
              <tr>
                {columns.map((col) => (
                  <th key={col.key} scope="col" className={styles.th}>{col.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className={styles.tr}>
                  {columns.map((col) => (
                    <td key={col.key} className={styles.td}>
                      <Skeleton lines={1} height={16} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile skeleton */}
        <div className={styles.cardList} aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={styles.cardRow}>
              <Skeleton lines={3} />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!rows.length) {
    return (
      <Card variant="light" className={styles.wrapper}>
        <EmptyState
          title={typeof empty === 'string' ? empty : 'No data'}
          description="Nothing to show here yet."
        />
      </Card>
    );
  }

  return (
    <Card variant="light" className={styles.wrapper}>
      {/* Desktop / tablet: actual table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              {columns.map((col) => (
                <th key={col.key} scope="col" className={styles.th}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const key = rowKey ? row[rowKey] ?? rowKey(row) : JSON.stringify(row);
              return (
                <tr
                  key={key}
                  className={`${styles.tr} ${onRowClick ? styles.clickable : ''}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? 'button' : undefined}
                  onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(row); } } : undefined}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={styles.td} data-label={col.header}>
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked card list */}
      <div className={styles.cardList}>
        {rows.map((row) => {
          const key = rowKey ? row[rowKey] ?? rowKey(row) : JSON.stringify(row);
          return (
            <div
              key={key}
              className={`${styles.cardRow} ${onRowClick ? styles.clickable : ''}`}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              role={onRowClick ? 'button' : undefined}
              onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(row); } } : undefined}
            >
              {columns.map((col) => (
                <div key={col.key} className={styles.cardField}>
                  <span className={styles.cardLabel}>{col.header}</span>
                  <span className={styles.cardValue}>
                    {col.render ? col.render(row) : row[col.key]}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
