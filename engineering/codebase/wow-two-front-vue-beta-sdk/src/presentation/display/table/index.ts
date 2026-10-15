export { default as Table, type TableProps } from './Table.vue';
/* React attached these as `Table.Head` / `.Body` / … via `Object.assign`. An SFC's
   generated default export cannot carry statics cleanly, so they ship as siblings. */
export { default as TableHead, TableHeadVariant, type TableHeadProps } from './TableHead.vue';
export { default as TableBody } from './TableBody.vue';
export { default as TableFooter } from './TableFooter.vue';
export { default as TableRow } from './TableRow.vue';
export { default as TableHeaderCell, type TableHeaderCellProps } from './TableHeaderCell.vue';
export { default as TableCell, type TableCellProps } from './TableCell.vue';
export { default as TableCaption } from './TableCaption.vue';
export { TableDensity, TablePhoneLayout, TableRadius, useTableContext, type TableContextValue } from './TableContext';
