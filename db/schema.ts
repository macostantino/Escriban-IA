import {sqliteTable,text,index} from 'drizzle-orm/sqlite-core';
export const supplies=sqliteTable('supplies',{id:text('id').primaryKey(),owner:text('owner').notNull(),data:text('data').notNull()});
export const dossiers=sqliteTable('dossiers',{id:text('id').primaryKey(),owner:text('owner').notNull(),name:text('name').notNull()},t=>[index('dossiers_owner').on(t.owner)]);
export const reports=sqliteTable('reports',{id:text('id').primaryKey(),owner:text('owner').notNull(),groupId:text('group_id').notNull(),created:text('created').notNull(),data:text('data').notNull(),pdfKey:text('pdf_key').notNull()},t=>[index('reports_owner_group').on(t.owner,t.groupId)]);

export const credentials=sqliteTable('credentials',{owner:text('owner').primaryKey(),encrypted:text('encrypted').notNull(),updated:text('updated').notNull()});
