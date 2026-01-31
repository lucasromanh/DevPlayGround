export const sanitizeCode = (code: string): string => {
    if (!code) return '';

    let clean = code;

    // 1. Eliminar específicamente los tags de span inyectados por nuestro resaltador
    // Buscamos <span class="text-..."> y </span>
    clean = clean.replace(/<span class="text-[^"]*">/g, '');
    clean = clean.replace(/<\/span>/g, '');

    // 2. Si por algún motivo quedaron clases como texto literal (error de regex anterior)
    clean = clean.replace(/text-[a-z0-9-]+/g, '');
    clean = clean.replace(/font-bold/g, '');
    clean = clean.replace(/font-mono/g, '');

    // 3. Decodificar entidades HTML básicas que el navegador/editor pudiera haber convertido
    const entities: Record<string, string> = {
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&amp;': '&'
    };

    Object.keys(entities).forEach(entity => {
        clean = clean.split(entity).join(entities[entity]);
    });

    return clean;
};
