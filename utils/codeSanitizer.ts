export const sanitizeCode = (code: string): string => {
    if (!code) return '';

    let clean = code;

    // 0. PRE-TRATAMIENTO DE ETIQUETAS DE BLOQUE
    // Antes de borrar tags, convertimos los que implican salto de línea en \n
    clean = clean.replace(/<\/div>/gi, '\n');
    clean = clean.replace(/<\/p>/gi, '\n');
    clean = clean.replace(/<br\s*\/?>/gi, '\n');

    // 1. Eliminar CUALQUIER etiqueta HTML real
    clean = clean.replace(/<[^>]+>/g, '');

    // 2. Decodificar entidades HTML
    const entities: Record<string, string> = {
        '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&amp;': '&', '&nbsp;': ' '
    };
    Object.keys(entities).forEach(entity => {
        clean = clean.split(entity).join(entities[entity]);
    });

    // 3. Limpiar residuos de corrupción (REEMPLAZANDO POR ESPACIO para evitar pegotes)
    // Agregamos un espacio al reemplazar 'text-purple-400' para que "import" y "os" no queden "importos"
    const textResidues = [
        /text-[a-z0-9-]+/g,
        /font-(bold|mono|medium|black|normal)/g,
        /class=["'][^"']*["']/g,
        /style=["'][^"']*["']/g,
        /font-weight:[^;"]*/g,
        /color:[^;"]*/g
    ];

    textResidues.forEach(re => {
        clean = clean.replace(re, ' '); // Reemplazo por espacio
    });

    // Residuos de cierre/apertura que son solo puntuación, los borramos
    const punctResidues = [
        /["']?>/g, // El residuo más común ">
        /span>/g,
        /<span>/g,
        /<\/span>/g
    ];
    punctResidues.forEach(re => {
        clean = clean.replace(re, '');
    });

    // 4. ESTRATEGIA DE RESCATE PARA CÓDIGO PEGOTEADO (Python/General)
    // Si vemos ")def", ")class", "import" pegado, forzamos un salto de línea
    // Esto arregla el error "os.system(...) def ..."
    const unMashPatterns = [
        { re: /(\)|"|')(\s*)(def)\b/g, sub: '$1\n$3' },
        { re: /(\)|"|')(\s*)(class)\b/g, sub: '$1\n$3' },
        { re: /(\)|"|')(\s*)(import)\b/g, sub: '$1\n$3' },
        { re: /(\)|"|')(\s*)(from)\b/g, sub: '$1\n$3' },
        { re: /(;)(\s*)(def|class|import|from|int|void)\b/g, sub: '$1\n$3' } // C++/Java
    ];

    unMashPatterns.forEach(p => {
        clean = clean.replace(p.re, p.sub);
    });

    // 5. Limpieza final por líneas
    return clean.split('\n').map(line => {
        let l = line;
        // Limpieza de basura inicial
        l = l.replace(/^["'>]+/, '');
        l = l.replace(/^(\s+)["'>]+/, '$1');
        // Reducir múltiples espacios generados por limpieza a uno solo (opcional, pero estético)
        // Pero cuidado con strings. Mejor no tocar salvo trimming right.
        return l.trimEnd();
    }).join('\n');
};
