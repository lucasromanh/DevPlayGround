import { BackendRoute, DbTable, EnvVariables } from '../types';
import { sanitizeCode } from './codeSanitizer';

export interface ExecutionContext {
    req: {
        method: string;
        path: string;
        body?: any;
        params?: Record<string, string>;
        query?: Record<string, string>;
    };
    res: {
        status: (code: number) => ExecutionContext['res'];
        json: (data: any) => { status: number; data: any };
        send: (data: any) => { status: number; data: any };
    };
    db: DatabaseAPI;
}

export interface DatabaseAPI {
    table: (name: string) => TableAPI;
    query: (sql: string) => any[];
}

export interface TableAPI {
    find: (filter?: any) => any[];
    findOne: (filter: any) => any | null;
    insert: (data: any) => any;
    update: (filter: any, data: any) => number;
    delete: (filter: any) => number;
    count: () => number;
}

/**
 * Motor de ejecución de backend que ejecuta código real
 */
export class BackendEngine {
    private tables: Map<string, DbTable>;
    private env: EnvVariables;
    private statusCode: number = 200;

    constructor(tables: DbTable[], env: EnvVariables) {
        this.tables = new Map(tables.map(t => [t.name, t]));
        this.env = env;
    }

    /**
     * Ejecuta una ruta de backend con el código real
     */
    async executeRoute(
        route: BackendRoute,
        requestBody?: any,
        params?: Record<string, string>,
        onLog?: (log: { type: 'raw' | 'info' | 'success' | 'error' | 'input'; msg: any }) => void,
        onInputRequest?: (prompt: string) => Promise<string>
    ): Promise<{ status: number; data: any; time: number; headers: Record<string, string> }> {
        const start = performance.now();
        this.statusCode = 200;

        try {
            // Crear el contexto de ejecución
            const context = this.createContext(route.method, route.path, requestBody, params);

            // Sanitizar el código fuente para asegurar texto plano puro
            const cleanHandler = sanitizeCode(route.handler);
            let result: any;

            if (cleanHandler.includes('function') || cleanHandler.includes('=>')) {
                // Node.js / JavaScript
                result = await this.executeNodeJS(cleanHandler, context);
                if (onLog && result?._debug_logs) {
                    result._debug_logs.forEach((msg: string) => onLog({ type: 'raw', msg }));
                }
            } else if (cleanHandler.includes('def ') || (cleanHandler.includes('import ') && !cleanHandler.includes('public class'))) {
                // Python
                result = await this.executePython(cleanHandler, context, onLog, onInputRequest);
            } else if (cleanHandler.includes('public class') || cleanHandler.includes('System.out.print')) {
                // Java
                result = await this.executeJava(cleanHandler, context, onLog);
            } else if (cleanHandler.includes('#include <stdio.h>') || cleanHandler.includes('printf(')) {
                // C
                result = await this.executeC(cleanHandler, context, onLog);
            } else if (cleanHandler.includes('#include <iostream>') || cleanHandler.includes('std::cout')) {
                // C++
                result = await this.executeCPP(cleanHandler, context, onLog);
            } else {
                // Fallback: intentar como JavaScript
                result = await this.executeNodeJS(cleanHandler, context);
            }

            const time = Math.round(performance.now() - start);

            return {
                status: result?.status || this.statusCode,
                data: result?.data || result,
                time,
                headers: {
                    'Content-Type': 'application/json',
                    'Server': 'LucasPlayground/2.0',
                    'Access-Control-Allow-Origin': this.env.CORS_ORIGIN,
                    'X-Powered-By': 'DevPlayground'
                }
            };
        } catch (error: any) {
            const time = Math.round(performance.now() - start);
            return {
                status: 500,
                data: {
                    error: 'Internal Server Error',
                    message: error.message,
                    stack: error.stack?.split('\n').slice(0, 3)
                },
                time,
                headers: {
                    'Content-Type': 'application/json',
                    'Server': 'LucasPlayground/2.0'
                }
            };
        }
    }


    /**
     * Crea el contexto de ejecución con req, res, db
     */
    private createContext(
        method: string,
        path: string,
        body?: any,
        params?: Record<string, string>
    ): ExecutionContext {
        const self = this;

        const resObject: ExecutionContext['res'] = {
            status: (code: number) => {
                self.statusCode = code;
                return resObject;
            },
            json: (data: any) => {
                return { status: self.statusCode, data };
            },
            send: (data: any) => {
                return { status: self.statusCode, data };
            }
        };

        return {
            req: {
                method,
                path,
                body,
                params: params || {},
                query: {}
            },
            res: resObject,
            db: this.createDatabaseAPI()
        };
    }

    /**
     * Crea la API de base de datos
     */
    private createDatabaseAPI(): DatabaseAPI {
        const self = this;

        return {
            table: (name: string): TableAPI => {
                const table = self.tables.get(name);
                if (!table) {
                    throw new Error(`Table '${name}' not found`);
                }

                return {
                    find: (filter?: any) => {
                        if (!filter) return [...table.rows];
                        return table.rows.filter(row => {
                            return Object.entries(filter).every(([key, value]) => row[key] === value);
                        });
                    },
                    findOne: (filter: any) => {
                        const row = table.rows.find(row => {
                            return Object.entries(filter).every(([key, value]) => row[key] === value);
                        });
                        return row || null;
                    },
                    insert: (data: any) => {
                        const newRow = { ...data };
                        // Auto-increment ID si no existe
                        if (!newRow.id && table.columns.some(c => c.name === 'id')) {
                            const maxId = Math.max(0, ...table.rows.map(r => r.id || 0));
                            newRow.id = maxId + 1;
                        }
                        table.rows.push(newRow);
                        return newRow;
                    },
                    update: (filter: any, data: any) => {
                        let count = 0;
                        table.rows.forEach((row, index) => {
                            const matches = Object.entries(filter).every(([key, value]) => row[key] === value);
                            if (matches) {
                                table.rows[index] = { ...row, ...data };
                                count++;
                            }
                        });
                        return count;
                    },
                    delete: (filter: any) => {
                        const initialLength = table.rows.length;
                        const newRows = table.rows.filter(row => {
                            return !Object.entries(filter).every(([key, value]) => row[key] === value);
                        });
                        table.rows.length = 0;
                        table.rows.push(...newRows);
                        return initialLength - newRows.length;
                    },
                    count: () => table.rows.length
                };
            },
            query: (sql: string) => {
                // Simulación básica de SQL
                console.log('SQL Query:', sql);
                return [];
            }
        };
    }

    /**
     * Ejecuta código Node.js/JavaScript
     */
    private async executeNodeJS(code: string, context: ExecutionContext): Promise<any> {
        // Interceptar console.log para mostrarlo en el playground
        const originalLog = console.log;
        let logs: any[] = [];
        const customContext = {
            ...context,
            console: {
                log: (...args: any[]) => {
                    logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
                    originalLog(...args);
                }
            }
        };

        const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;

        try {
            let cleanCode = code.trim();

            // Si el código NO tiene return, intentamos envolverlo o ejecutarlo directamente
            if (!cleanCode.includes('return') && !cleanCode.includes('res.json')) {
                cleanCode = `const result = (async () => { ${cleanCode} })(); return result;`;
            }

            // Soporte para funciones completas o solo el cuerpo
            if (cleanCode.includes('=>')) {
                const match = cleanCode.match(/\((.*?)\)\s*=>\s*{?([\s\S]*)}?/);
                if (match) cleanCode = match[2].replace(/^\{/, '').replace(/\}$/, '');
            } else if (cleanCode.startsWith('function')) {
                const match = cleanCode.match(/function[^{]*{([\s\S]*)}/);
                if (match) cleanCode = match[1];
            }

            const fn = new AsyncFunction('req', 'res', 'db', 'console', cleanCode);
            const result = await fn(customContext.req, customContext.res, customContext.db, customContext.console);

            // Si hay logs, los incluimos en la respuesta simulada para el tester
            if (logs.length > 0 && result && typeof result === 'object') {
                result.data = result.data || {};
                result.data._debug_logs = logs;
            }

            return result;
        } catch (error: any) {
            throw new Error(`JS Error: ${error.message}`);
        }
    }

    /**
     * Ejecuta código Python (Simulación Avanzada)
     */
    private pyodide: any = null;
    private pyodideLoading: Promise<void> | null = null;

    /**
     * Carga Pyodide dinámicamente si es necesario
     */
    private async ensurePyodide(): Promise<any> {
        if (this.pyodide) return this.pyodide;
        if (this.pyodideLoading) return this.pyodideLoading;

        this.pyodideLoading = new Promise(async (resolve, reject) => {
            try {
                if (!(window as any).loadPyodide) {
                    const script = document.createElement('script');
                    script.src = "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js";
                    script.async = true;
                    document.head.appendChild(script);
                    await new Promise(res => script.onload = res);
                }

                this.pyodide = await (window as any).loadPyodide({
                    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/"
                });

                // Cargar micropip para instalar librerías
                await this.pyodide.loadPackage("micropip");
                resolve(this.pyodide);
            } catch (e) {
                reject(e);
            }
        });

        return this.pyodideLoading;
    }

    /**
     * Motor de ejecución de Python en Worker
     */
    private pyWorker: Worker | null = null;
    private pyWorkerReady: boolean = false;
    private sharedBuffer: SharedArrayBuffer | null = null;
    private pendingInputResolver: ((val: string) => void) | null = null;

    /**
     * Inicializa el worker de Python
     */
    private async initPyWorker(): Promise<void> {
        if (this.pyWorker) return;

        const hasSAB = typeof SharedArrayBuffer !== 'undefined';

        if (hasSAB) {
            // Crear el buffer compartido (64KB para comunicación)
            this.sharedBuffer = new SharedArrayBuffer(65536);
        }

        // Cargar el worker
        this.pyWorker = new Worker(new URL('./pyWorker.js', import.meta.url));

        return new Promise((resolve, reject) => {
            if (!this.pyWorker) return reject(new Error("No se pudo crear el Worker"));

            this.pyWorker.onmessage = (e) => {
                const { type, prompt } = e.data;

                if (type === 'ready') {
                    this.pyWorkerReady = true;
                    resolve();
                } else if (type === 'stdin_request') {
                    if (this.onInputRequestCallback) {
                        this.onInputRequestCallback(prompt || '').then(val => {
                            this.sendInputToWorker(val);
                        });
                    }
                }
            };

            this.pyWorker.onerror = (err) => {
                console.error("Worker error:", err);
                reject(err);
            };

            this.pyWorker.postMessage({
                type: 'init',
                buffer: this.sharedBuffer
            });
        });
    }

    private onInputRequestCallback: ((prompt: string) => Promise<string>) | null = null;

    private sendInputToWorker(val: string | null) {
        if (!this.sharedBuffer) return;

        const Int32Buffer = new Int32Array(this.sharedBuffer);
        const stringBuffer = new Uint8Array(this.sharedBuffer, 8); // Offset 8: Status(0-3), Length(4-7)

        if (val === null) {
            Int32Buffer[0] = 2; // Estado Cancelado
        } else {
            const encoder = new TextEncoder();
            const encoded = encoder.encode(val);
            stringBuffer.set(encoded);
            Int32Buffer[1] = encoded.length; // Longitud del string en bytes 4-7
            Int32Buffer[0] = 1; // Estado Listo en bytes 0-3
        }

        // Notificar al worker que los datos están listos
        Atomics.notify(Int32Buffer, 0);
    }

    /**
     * Ejecuta código Python (Real con Worker y Sync Bridge)
     */
    private async executePython(
        code: string,
        context: ExecutionContext,
        onLog?: (log: { type: 'raw' | 'info' | 'success' | 'error' | 'input'; msg: any }) => void,
        onInputRequest?: (prompt: string) => Promise<string>
    ): Promise<any> {
        try {
            await this.initPyWorker();
            this.onInputRequestCallback = onInputRequest || null;

            return new Promise((resolve) => {
                if (!this.pyWorker) return;

                const messageHandler = (e: MessageEvent) => {
                    const { type, data, message } = e.data;

                    if (type === 'log') {
                        if (onLog) onLog({ type: 'raw', msg: data });
                    } else if (type === 'success') {
                        this.pyWorker?.removeEventListener('message', messageHandler);
                        resolve({
                            status: 200,
                            data: {
                                success: true,
                                result: data,
                                _runtime: "Python 3.11 (Worker Thread)"
                            }
                        });
                    } else if (type === 'error') {
                        this.pyWorker?.removeEventListener('message', messageHandler);
                        if (onLog) onLog({ type: 'error', msg: message });
                        resolve({
                            status: 500,
                            data: { success: false, error: message }
                        });
                    }
                };

                this.pyWorker.addEventListener('message', messageHandler);
                this.pyWorker.postMessage({ type: 'run', code });
            });

        } catch (error: any) {
            if (onLog) onLog({ type: 'error', msg: `Worker Error: ${error.message}` });
            return { status: 500, data: { error: error.message } };
        }
    }


    /**
     * Ejecuta código Java (Simulación avanzada con logs de compilación)
     */
    private async executeJava(code: string, context: ExecutionContext, onLog?: any): Promise<any> {
        if (onLog) {
            onLog({ type: 'info', msg: "Compilando con javac 17.0.2..." });
            await new Promise(r => setTimeout(r, 600));
            onLog({ type: 'success', msg: "Compilación exitosa. Generando Main.class" });
            onLog({ type: 'info', msg: "Ejecutando JVM..." });
            await new Promise(r => setTimeout(r, 400));
        }

        return {
            status: 200,
            data: {
                stdout: "Hello from Java Runtime!\nExecution complete.",
                stderr: "",
                exitCode: 0,
                timeMs: 100,
                _runtime: "OpenJDK 17 (Simulated Environment)"
            }
        };
    }

    /**
     * Ejecuta código C (Simulación)
     */
    private async executeC(code: string, context: ExecutionContext, onLog?: any): Promise<any> {
        if (onLog) {
            onLog({ type: 'info', msg: "Compilando con gcc 11.4.0..." });
            await new Promise(r => setTimeout(r, 500));
            onLog({ type: 'success', msg: "Enlace finalizado. Objeto generado: a.out" });
            onLog({ type: 'info', msg: "Ejecutando binario..." });
            await new Promise(r => setTimeout(r, 300));
        }

        return {
            status: 200,
            data: {
                stdout: "Standard Output: C Program executed successfully.\n[Process finished with exit code 0]",
                stderr: "",
                exitCode: 0,
                timeMs: 45,
                _runtime: "GCC 11.4 (Simulated Environment)"
            }
        };
    }

    /**
     * Ejecuta código C++ (Simulación)
     */
    private async executeCPP(code: string, context: ExecutionContext, onLog?: any): Promise<any> {
        if (onLog) {
            onLog({ type: 'info', msg: "Compilando con g++ 11.4.0 (Std c++17)..." });
            await new Promise(r => setTimeout(r, 800));
            onLog({ type: 'success', msg: "Compilación y enlace OK." });
            onLog({ type: 'info', msg: "Ejecutando ./main..." });
            await new Promise(r => setTimeout(r, 200));
        }

        return {
            status: 200,
            data: {
                stdout: "C++ Runtime Output:\nHello World!\n------------------\nResources used: 1.2MB RAM",
                stderr: "",
                exitCode: 0,
                timeMs: 120,
                _runtime: "G++ 11.4 (Simulated Environment)"
            }
        };
    }

    /**
     * Resetea el motor y termina workers
     */
    public reset() {
        if (this.pyWorker) {
            this.pyWorker.terminate();
            this.pyWorker = null;
        }
        this.pyWorkerReady = false;
        this.sharedBuffer = null;
        this.onInputRequestCallback = null;
    }
}
