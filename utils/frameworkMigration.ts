import { CodeFiles, FrameworkType } from '../types';

/**
 * Migra código de Vanilla JS a React
 */
export function migrateVanillaToReact(files: CodeFiles): CodeFiles {
    const html = files['index.html'] || '';
    const css = files['styles.css'] || '';
    const js = files['script.js'] || '';

    // Detectar IDs de elementos que se están usando en el JS
    const elementIds = new Set<string>();
    const idMatches = js.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g);
    for (const match of idMatches) {
        elementIds.add(match[1]);
    }

    // Extraer el contenido del body del HTML
    let bodyContent = html;
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (bodyMatch) {
        bodyContent = bodyMatch[1].trim();
        // Remover script tags del body
        bodyContent = bodyContent.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    }

    // Convertir atributos HTML a JSX y agregar refs
    bodyContent = bodyContent
        .replace(/class=/g, 'className=')
        .replace(/for=/g, 'htmlFor=')
        .replace(/ref=["'][^"']*["']/g, '') // Eliminar posibles refs de string anteriores
        .replace(/<!--[\s\S]*?-->/g, ''); // Remover comentarios HTML

    // Agregar refs a los elementos que tienen ID y son usados en JS
    elementIds.forEach(id => {
        const safeId = id.replace(/[^a-zA-Z0-9]/g, '_');
        bodyContent = bodyContent.replace(
            new RegExp(`(<[^>]+id=["']${id}["'][^>]*)(>)`, 'i'),
            `$1 ref={${safeId}Ref}$2`
        );
    });

    bodyContent = bodyContent.trim();

    // Intentar convertir el JavaScript a React
    const hooks = convertVanillaJSToReactHooks(js, elementIds);

    let reactCode = `import React, { useState, useEffect, useRef } from 'react';

export default function App() {
  // Estado inicial
  const [message, setMessage] = useState('${extractInitialMessage(html, js)}');
  
  // Efectos y handlers migrados desde Vanilla JS
  ${hooks}

  return (
    <div>
      ${bodyContent}
    </div>
  );
}`;

    return {
        'index.html': '<div id="root"></div>',
        'styles.css': css,
        'App.js': reactCode
    };
}

/**
 * Migra código de React a Vanilla JS
 */
export function migrateReactToVanilla(files: CodeFiles): CodeFiles {
    const appJs = files['App.js'] || '';
    const css = files['styles.css'] || '';

    // Extraer el JSX del return
    let htmlContent = extractJSXFromReact(appJs);

    // Convertir JSX a HTML
    htmlContent = htmlContent
        .replace(/className=/g, 'class=')
        .replace(/htmlFor=/g, 'for=')
        .replace(/ref=\{[^}]+\}/g, '') // Eliminar refs de React
        .replace(/onClick=\{[^}]+\}/g, 'onclick="handleClick()"') // Simplificación de eventos
        .replace(/\{\s*[^}]+\s*\}/g, '') // Eliminar cualquier otra expresión entre llaves
        .trim();

    // Crear HTML completo
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Playground de Lucas Roman</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  ${htmlContent}
  
  <script src="script.js"></script>
</body>
</html>`;

    // Intentar convertir hooks de React a Vanilla JS
    const vanillaJS = convertReactToVanillaJS(appJs);

    return {
        'index.html': html,
        'styles.css': css,
        'script.js': vanillaJS
    };
}

/**
 * Extrae el mensaje inicial del HTML o JS
 */
function extractInitialMessage(html: string, js: string): string {
    // Buscar en el HTML
    const pMatch = html.match(/<p[^>]*id=["']mensaje["'][^>]*>([^<]+)<\/p>/i);
    if (pMatch) return pMatch[1];

    // Buscar en el JS
    const textMatch = js.match(/textContent\s*=\s*['"]([^'"]+)['"]/);
    if (textMatch) return textMatch[1];

    return 'Bienvenido';
}

/**
 * Convierte event listeners y DOM manipulation a React hooks
 */
function convertVanillaJSToReactHooks(js: string, elementIds: Set<string>): string {
    let hooks = '';

    // Crear refs para cada elemento
    if (elementIds.size > 0) {
        hooks += '\n  // Referencias a elementos DOM\n';
        elementIds.forEach(id => {
            const safeId = id.replace(/[^a-zA-Z0-9]/g, '_');
            hooks += `  const ${safeId}Ref = useRef(null);\n`;
        });
    }

    // Detectar event listeners y convertirlos a handlers
    const clickMatch = js.match(/addEventListener\(['"]click['"],\s*\([^)]*\)\s*=>\s*\{([\s\S]*?)\}\);?/);
    if (clickMatch) {
        let handlerBody = clickMatch[1];

        // Reemplazar document.getElementById con refs
        elementIds.forEach(id => {
            const safeId = id.replace(/[^a-zA-Z0-9]/g, '_');
            handlerBody = handlerBody.replace(
                new RegExp(`(const|let|var)\\s+${id}\\s*=\\s*document\\.getElementById\\([^)]+\\);?`, 'g'),
                ''
            );
            handlerBody = handlerBody.replace(
                new RegExp(`\\b${id}\\b`, 'g'),
                `${safeId}Ref.current`
            );
        });

        hooks += `\n  const handleClick = () => {\n`;
        hooks += `    // Migrado desde Vanilla JS\n`;
        hooks += handlerBody.split('\n').map(line => '    ' + line.trim()).filter(l => l.trim()).join('\n');
        hooks += '\n  };\n';
    }

    // Si no se detectó nada, agregar el código original como comentario
    if (!hooks) {
        hooks = `
  // TODO: Migrar lógica de JavaScript manualmente
  // El código original requiere adaptación manual:
  /*
${js.split('\n').map(line => '  ' + line).join('\n')}
  */
  
  const handleClick = () => {
    console.log('TODO: Implementar lógica migrada');
  };`;
    }

    return hooks;
}

/**
 * Extrae el JSX del componente React
 */
function extractJSXFromReact(appJs: string): string {
    const returnMatch = appJs.match(/return\s*\(([\s\S]*?)\);?\s*\}/);
    if (returnMatch) {
        return returnMatch[1].trim();
    }

    // Fallback: buscar JSX directo
    const jsxMatch = appJs.match(/<div[^>]*>([\s\S]*)<\/div>/);
    if (jsxMatch) {
        return jsxMatch[0];
    }

    return '<div><h1>Contenido migrado</h1></div>';
}

/**
 * Convierte hooks de React a Vanilla JS
 */
function convertReactToVanillaJS(appJs: string): string {
    let vanillaCode = `// Código migrado desde React
// NOTA: Puede requerir ajustes manuales

`;

    // Detectar useState
    const stateMatches = appJs.matchAll(/const\s+\[(\w+),\s*set\w+\]\s*=\s*useState\(([^)]+)\)/g);
    for (const match of stateMatches) {
        const varName = match[1];
        const initialValue = match[2];
        vanillaCode += `let ${varName} = ${initialValue};\n`;
    }

    // Detectar handlers
    const handlerMatches = appJs.matchAll(/const\s+(\w+)\s*=\s*\([^)]*\)\s*=>\s*\{([^}]+)\}/g);
    for (const match of handlerMatches) {
        const handlerName = match[1];
        const handlerBody = match[2];
        vanillaCode += `
function ${handlerName}() {
  ${handlerBody.replace(/set\w+\(/g, '/* actualizar estado: */')}
}
`;
    }

    if (vanillaCode.trim() === '// Código migrado desde React\n// NOTA: Puede requerir ajustes manuales') {
        vanillaCode += `
// TODO: Implementar lógica manualmente
console.log('Aplicación iniciada');
`;
    }

    return vanillaCode;
}
