
import { DbTable, DbColumn } from '../types';

/**
 * Genera una representación de texto tipo DBML a partir del estado de las tablas
 */
export const generateDBML = (tables: DbTable[]): string => {
    return tables.map(table => {
        let dbml = `Table ${table.name} {\n`;
        table.columns.forEach(col => {
            const props: string[] = [];
            if (col.isPrimary) props.push('pk');
            if (col.autoIncrement) props.push('increment');
            if (col.notNull) props.push('not null');
            if (col.unique) props.push('unique');
            if (col.isForeignKey && col.references) {
                props.push(`ref: > ${col.references.table}.${col.references.column}`);
            }

            const propsStr = props.length > 0 ? ` [${props.join(', ')}]` : '';
            dbml += `  ${col.name} ${col.type}${propsStr}\n`;
        });
        dbml += `}\n`;
        return dbml;
    }).join('\n');
};

/**
 * Parsea un string tipo DBML y lo convierte en un array de DbTable
 * Mantiene los datos (rows) de las tablas existentes si el nombre coincide.
 */
export const parseDBML = (dbml: string, existingTables: DbTable[]): DbTable[] => {
    const tables: DbTable[] = [];
    const lines = dbml.split('\n');
    let currentTable: DbTable | null = null;

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//')) return;

        // Inicio de tabla: Table name {
        const tableMatch = trimmed.match(/^Table\s+(\w+)\s*\{/i);
        if (tableMatch) {
            const tableName = tableMatch[1].toLowerCase();
            const existing = existingTables.find(t => t.name === tableName);
            currentTable = {
                id: existing?.id || `t-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                name: tableName,
                columns: [],
                rows: existing?.rows || [],
                position: existing?.position
            };
            return;
        }

        // Fin de tabla: }
        if (trimmed === '}' && currentTable) {
            tables.push(currentTable);
            currentTable = null;
            return;
        }

        // Columnas: name type [props]
        if (currentTable) {
            // regex: name type [props]
            const colMatch = trimmed.match(/^(\w+)\s+([\w()]+)(?:\s+\[(.*)\])?/);
            if (colMatch) {
                const [, colName, colType, propsStr] = colMatch;
                const column: DbColumn = {
                    name: colName.toLowerCase(),
                    type: colType.toUpperCase()
                };

                if (propsStr) {
                    if (propsStr.includes('pk')) column.isPrimary = true;
                    if (propsStr.includes('increment')) column.autoIncrement = true;
                    if (propsStr.includes('not null')) column.notNull = true;
                    if (propsStr.includes('unique')) column.unique = true;

                    const refMatch = propsStr.match(/ref:\s*>\s*(\w+)\.(\w+)/);
                    if (refMatch) {
                        column.isForeignKey = true;
                        column.references = {
                            table: refMatch[1].toLowerCase(),
                            column: refMatch[2].toLowerCase()
                        };
                    }
                }
                currentTable.columns.push(column);
            }
        }
    });

    return tables;
};
