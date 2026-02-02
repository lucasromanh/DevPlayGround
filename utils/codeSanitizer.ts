export const sanitizeCode = (code: string): string => {
    if (!code) return '';

    let clean = code;

    // 1. Decodificar entidades HTML primero para que los tags sean reales
    const entities: Record<string, string> = {
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&amp;': '&',
        '&nbsp;': ' '
    };

    Object.keys(entities).forEach(entity => {
        clean = clean.split(entity).join(entities[entity]);
    });

    // 2. Eliminar tags HTML completos (como <span>...</span>)
    clean = clean.replace(/<[^>]+>/g, '');

    // 3. Eliminar fragmentos literales que el resaltador pudo haber inyectado accidentalmente
    const fragmentsToRemove = [
        /text-[a-z0-9-]+/g,
        /font-bold/g,
        /font-mono/g,
        /class="[^"]*"/g,
        /class='[^']*'/g,
        /style="[^"]*"/g,
        /style='[^']*'/g,
        /<span>/g,
        /<\/span>/g,
        /[a-z-]+="[^"]*">/g, // Atributos huerfanos como class="foo">
        /">/g,
        /'>/g
    ];

    fragmentsToRemove.forEach(re => {
        clean = clean.replace(re, '');
    });

    return clean;
};
