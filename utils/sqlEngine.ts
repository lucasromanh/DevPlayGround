
import { DbTable, DbColumn } from '../types';

export interface SQLResult {
    success: boolean;
    data?: any[];
    message: string;
    error?: string;
    affectedRows?: number;
    statement?: string; // Para saber qué comando produjo el resultado
}

/**
 * Motor SQL simulado mejorado para el Playground.
 * Soporta multi-statements, INSERT múltiple, UPDATE, DELETE, y DDL básico.
 */
export class SQLEngine {
    private tables: DbTable[];

    constructor(tables: DbTable[]) {
        this.tables = JSON.parse(JSON.stringify(tables)); // Copia profunda para no mutar el estado original directamente
    }

    execute(sql: string): { results: SQLResult[], updatedTables: DbTable[] } {
        // 1. Limpiar comentarios
        const cleanSql = sql.split('\n')
            .map(line => line.split('--')[0])
            .join(' ')
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .trim();

        if (!cleanSql) {
            return {
                results: [{ success: false, message: 'Consulta vacía', error: 'No hay comandos SQL válidos' }],
                updatedTables: this.tables
            };
        }

        // 2. Dividir en sentencias (asumiendo que ; no está dentro de strings - simplificación educativa)
        const statements = cleanSql.split(';').map(s => s.trim()).filter(s => s.length > 0);
        const results: SQLResult[] = [];

        for (const statement of statements) {
            try {
                const firstWord = statement.split(/\s+/)[0].toUpperCase();
                let res: { result: SQLResult, updatedTables: DbTable[] };

                switch (firstWord) {
                    case 'SELECT':
                        res = { result: this.handleSelect(statement), updatedTables: this.tables };
                        break;
                    case 'INSERT':
                        res = this.handleInsert(statement);
                        break;
                    case 'UPDATE':
                        res = this.handleUpdate(statement);
                        break;
                    case 'DELETE':
                        res = this.handleDelete(statement);
                        break;
                    case 'ALTER':
                        res = this.handleAlter(statement);
                        break;
                    case 'DROP':
                        res = this.handleDrop(statement);
                        break;
                    case 'CREATE':
                        // Opcional, pero para mantener coherencia si el usuario lo intenta
                        res = this.handleCreate(statement);
                        break;
                    default:
                        throw new Error(`Comando '${firstWord}' no soportado todavía.`);
                }

                res.result.statement = statement;
                results.push(res.result);
                this.tables = res.updatedTables; // Actualizar contexto para la siguiente sentencia
            } catch (e: any) {
                results.push({
                    success: false,
                    message: "Error en ejecución",
                    error: e.message,
                    statement: statement
                });
            }
        }

        return { results, updatedTables: this.tables };
    }

    private handleSelect(query: string): SQLResult {
        // SELECT cols FROM table WHERE cond ORDER BY col ASC/DESC
        const match = query.match(/SELECT\s+(.+)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(\w+)(?:\s+(ASC|DESC))?)?$/i);
        if (!match) throw new Error("Sintaxis SELECT inválida.");

        const [, colsStr, tableName, whereClause, orderByCol, orderDir] = match;
        const table = this.findTable(tableName);
        let rows = [...table.rows];

        // Filtrar
        if (whereClause) {
            rows = rows.filter(row => this.rowMatches(row, whereClause));
        }

        // Ordenar
        if (orderByCol) {
            const dir = (orderDir || 'ASC').toUpperCase();
            rows.sort((a, b) => {
                const valA = a[orderByCol.toLowerCase()];
                const valB = b[orderByCol.toLowerCase()];
                if (valA < valB) return dir === 'ASC' ? -1 : 1;
                if (valA > valB) return dir === 'ASC' ? 1 : -1;
                return 0;
            });
        }

        // Proyectar columnas
        if (colsStr.trim() !== '*') {
            const selectedCols = colsStr.split(',').map(c => c.trim().toLowerCase());
            rows = rows.map(row => {
                const projected: any = {};
                selectedCols.forEach(c => projected[c] = row[c]);
                return projected;
            });
        }

        return {
            success: true,
            data: rows,
            message: `Registros encontrados: ${rows.length}`
        };
    }

    private handleInsert(query: string): { result: SQLResult, updatedTables: DbTable[] } {
        // INSERT INTO table (cols) VALUES (v1,v2), (v3,v4)...
        const match = query.match(/INSERT\s+INTO\s+(\w+)\s*\((.+?)\)\s+VALUES\s+(.+)$/i);
        if (!match) throw new Error("Sintaxis INSERT inválida.");

        const [, tableName, colsStr, valsBlock] = match;
        const table = this.findTable(tableName);
        const cols = colsStr.split(',').map(s => s.trim().toLowerCase());

        // Extraer tuplas (val1, val2), (val3, val4)
        const tuples = valsBlock.match(/\((.+?)\)/g);
        if (!tuples) throw new Error("No se encontraron valores para insertar.");

        let insertedCount = 0;
        tuples.forEach(tupleStr => {
            const valsStr = tupleStr.slice(1, -1);
            const vals = this.parseCSV(valsStr).map(v => this.castValue(v));

            if (cols.length !== vals.length) throw new Error("Número de columnas no coincide con número de valores en una tupla.");

            const newRow: any = {};
            // Valores por defecto
            table.columns.forEach(c => {
                if (c.autoIncrement && c.isPrimary) {
                    const maxId = table.rows.reduce((max, r) => Math.max(max, Number(r[c.name]) || 0), 0);
                    newRow[c.name] = maxId + 1;
                } else {
                    newRow[c.name] = null;
                }
            });

            cols.forEach((col, i) => {
                if (!table.columns.some(c => c.name === col)) throw new Error(`Columna '${col}' no existe en tabla '${tableName}'`);
                newRow[col] = vals[i];
            });

            table.rows.push(newRow);
            insertedCount++;
        });

        return {
            result: { success: true, message: `${insertedCount} registros insertados.`, affectedRows: insertedCount },
            updatedTables: this.tables
        };
    }

    private handleUpdate(query: string): { result: SQLResult, updatedTables: DbTable[] } {
        const match = query.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i);
        if (!match) throw new Error("Sintaxis UPDATE inválida.");

        const [, tableName, setClause, whereClause] = match;
        const table = this.findTable(tableName);

        const updates = setClause.split(',').map(s => {
            const parts = s.split('=');
            return { col: parts[0].trim().toLowerCase(), value: this.castValue(parts[1].trim()) };
        });

        let affectedCount = 0;
        table.rows = table.rows.map(row => {
            if (!whereClause || this.rowMatches(row, whereClause)) {
                affectedCount++;
                const newRow = { ...row };
                updates.forEach(u => newRow[u.col] = u.value);
                return newRow;
            }
            return row;
        });

        return {
            result: { success: true, message: `${affectedCount} filas actualizadas.`, affectedRows: affectedCount },
            updatedTables: this.tables
        };
    }

    private handleDelete(query: string): { result: SQLResult, updatedTables: DbTable[] } {
        const match = query.match(/DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?$/i);
        if (!match) throw new Error("Sintaxis DELETE inválida.");

        const [, tableName, whereClause] = match;
        const table = this.findTable(tableName);

        const initialCount = table.rows.length;
        table.rows = table.rows.filter(row => !whereClause || !this.rowMatches(row, whereClause));
        const affectedCount = initialCount - table.rows.length;

        return {
            result: { success: true, message: `${affectedCount} filas eliminadas.`, affectedRows: affectedCount },
            updatedTables: this.tables
        };
    }

    private handleAlter(query: string): { result: SQLResult, updatedTables: DbTable[] } {
        // ALTER TABLE table ADD COLUMN col type
        const addMatch = query.match(/ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(\w+)\s+([\w()]+)/i);
        if (addMatch) {
            const [, tableName, colName, colType] = addMatch;
            const table = this.findTable(tableName);

            if (table.columns.some(c => c.name === colName.toLowerCase())) throw new Error(`La columna '${colName}' ya existe.`);

            const newCol: DbColumn = { name: colName.toLowerCase(), type: colType.toUpperCase() };
            table.columns.push(newCol);

            // Inicializar datos existentes
            table.rows = table.rows.map(r => ({ ...r, [newCol.name]: null }));

            return {
                result: { success: true, message: `Columna '${colName}' añadida con éxito.` },
                updatedTables: this.tables
            };
        }

        // RENAME COLUMN
        const renameMatch = query.match(/ALTER\s+TABLE\s+(\w+)\s+RENAME\s+COLUMN\s+(\w+)\s+TO\s+(\w+)/i);
        if (renameMatch) {
            const [, tableName, oldName, newName] = renameMatch;
            const table = this.findTable(tableName);
            const col = table.columns.find(c => c.name === oldName.toLowerCase());
            if (!col) throw new Error(`Columna '${oldName}' no encontrada.`);

            col.name = newName.toLowerCase();
            table.rows = table.rows.map(row => {
                const newRow = { ...row, [newName.toLowerCase()]: row[oldName.toLowerCase()] };
                delete newRow[oldName.toLowerCase()];
                return newRow;
            });

            return {
                result: { success: true, message: `Columna renonbrada a '${newName}'.` },
                updatedTables: this.tables
            };
        }

        throw new Error("Sintaxis ALTER TABLE no soportada.");
    }

    private handleDrop(query: string): { result: SQLResult, updatedTables: DbTable[] } {
        const match = query.match(/DROP\s+TABLE\s+(\w+)/i);
        if (!match) throw new Error("Sintaxis DROP TABLE inválida.");

        const [, tableName] = match;
        const tableIndex = this.tables.findIndex(t => t.name.toLowerCase() === tableName.toLowerCase());
        if (tableIndex === -1) throw new Error(`Tabla '${tableName}' no encontrada.`);

        this.tables.splice(tableIndex, 1);

        return {
            result: { success: true, message: `Tabla '${tableName}' eliminada.` },
            updatedTables: this.tables
        };
    }

    private handleCreate(query: string): { result: SQLResult, updatedTables: DbTable[] } {
        const match = query.match(/CREATE\s+TABLE\s+(\w+)\s*\((.+)\)/i);
        if (!match) throw new Error("Sintaxis CREATE TABLE inválida.");

        const [, tableName, body] = match;
        if (this.tables.some(t => t.name.toLowerCase() === tableName.toLowerCase())) throw new Error(`La tabla '${tableName}' ya existe.`);

        const colDefs = body.split(',').map(s => s.trim());
        const columns: DbColumn[] = colDefs.map(def => {
            const parts = def.split(/\s+/);
            const name = parts[0].toLowerCase();
            const type = parts[1].toUpperCase();
            const isPK = def.toUpperCase().includes('PRIMARY KEY');
            const isAI = def.toUpperCase().includes('AUTOINCREMENT') || def.toUpperCase().includes('SERIAL');
            return { name, type, isPrimary: isPK, autoIncrement: isAI };
        });

        const newTable: DbTable = {
            id: `t-${Date.now()}`,
            name: tableName.toLowerCase(),
            columns,
            rows: [],
            position: { x: 100, y: 100 }
        };

        this.tables.push(newTable);
        return {
            result: { success: true, message: `Tabla '${tableName}' creada.` },
            updatedTables: this.tables
        };
    }

    // Helpers
    private findTable(name: string): DbTable {
        const table = this.tables.find(t => t.name.toLowerCase() === name.toLowerCase());
        if (!table) throw new Error(`Tabla '${name}' no encontrada.`);
        return table;
    }

    private rowMatches(row: any, whereClause: string): boolean {
        // Soporte básico: col = val, col > val, col < val, col >= val, col <= val, col <> val
        const match = whereClause.match(/(\w+)\s*(=|>|<|>=|<=|<>)\s*(.+)/);
        if (!match) return true;

        const [, col, op, val] = match;
        const colName = col.toLowerCase();
        const rawVal = val.trim();
        const filterVal = this.castValue(rawVal);
        const rowVal = row[colName];

        switch (op) {
            case '=': return rowVal == filterVal;
            case '>': return rowVal > filterVal;
            case '<': return rowVal < filterVal;
            case '>=': return rowVal >= filterVal;
            case '<=': return rowVal <= filterVal;
            case '<>': return rowVal != filterVal;
            default: return true;
        }
    }

    private castValue(val: string): any {
        if (val.startsWith("'") && val.endsWith("'")) return val.slice(1, -1);
        if (val.toLowerCase() === 'null') return null;
        if (val.toLowerCase() === 'true') return true;
        if (val.toLowerCase() === 'false') return false;
        if (!isNaN(Number(val))) return Number(val);
        return val;
    }

    private parseCSV(text: string): string[] {
        // Manejo básico de comas dentro de strings no implementado (simplificación)
        return text.split(',').map(s => s.trim());
    }
}
