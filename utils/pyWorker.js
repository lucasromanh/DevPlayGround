importScripts("https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js");

let pyodide = null;
let pyGlobals = null;

async function initPyodide() {
    pyodide = await loadPyodide();
    await pyodide.loadPackage("micropip");
    pyGlobals = pyodide.globals.get("dict")();
    pyGlobals.set("__name__", "__main__");

    // Configurar stdout
    pyodide.setStdout({
        batched: (str) => {
            self.postMessage({ type: 'log', data: str });
        }
    });

    // Configurar stdin Sincrónico usando SharedArrayBuffer
    pyodide.setStdin({
        stdin: (context) => {
            self.postMessage({ type: 'stdin_request', prompt: '' });

            // Bloquear el worker hasta que recibamos los datos
            const buffer = self.sharedBuffer;
            const Int32Buffer = new Int32Array(buffer);

            // Atomics.wait espera a que index 0 cambie de 0 a algo más (1 = datos listos, 2 = cancelado)
            Atomics.wait(Int32Buffer, 0, 0);

            if (Int32Buffer[0] === 2) {
                Int32Buffer[0] = 0; // Reset
                return null;
            }

            // Leer el string del buffer (empezando en index 2 de Int32Array, o byte 8)
            const stringBuffer = new Uint8Array(buffer, 8);
            const length = Int32Buffer[1];
            const decoder = new TextDecoder();
            const result = decoder.decode(stringBuffer.slice(0, length));

            Int32Buffer[0] = 0; // Reset para la próxima
            return result.endsWith('\n') ? result : result + '\n';
        },
        error: false
    });
}

self.onmessage = async (e) => {
    const { type, code, buffer } = e.data;

    if (type === 'init') {
        self.sharedBuffer = buffer;
        await initPyodide();
        self.postMessage({ type: 'ready' });
    } else if (type === 'run') {
        try {
            const result = await pyodide.runPythonAsync(code, { globals: pyGlobals });
            const jsResult = result?.toJs ? result.toJs() : result;
            self.postMessage({ type: 'success', data: jsResult });
        } catch (err) {
            self.postMessage({ type: 'error', message: err.message });
        }
    }
};
