import { BackendRoute } from '../types';

/**
 * Templates de código para diferentes lenguajes y operaciones CRUD
 */

export const NODE_JS_TEMPLATES = {
    GET_ALL: `// GET - Obtener todos los registros
const usuarios = db.table('usuarios').find();
return res.json({
  success: true,
  data: usuarios,
  count: usuarios.length
});`,

    GET_ONE: `// GET - Obtener un registro por ID
const id = parseInt(req.params.id);
const usuario = db.table('usuarios').findOne({ id });

if (!usuario) {
  return res.status(404).json({
    success: false,
    error: 'Usuario no encontrado'
  });
}

return res.json({
  success: true,
  data: usuario
});`,

    POST: `// POST - Crear nuevo registro
const { nombre, email } = req.body;

if (!nombre) {
  return res.status(400).json({
    success: false,
    error: 'El nombre es requerido'
  });
}

const nuevoUsuario = db.table('usuarios').insert({
  nombre,
  email: email || null,
  createdAt: new Date().toISOString()
});

return res.status(201).json({
  success: true,
  data: nuevoUsuario,
  message: 'Usuario creado exitosamente'
});`,

    PUT: `// PUT - Actualizar registro
const id = parseInt(req.params.id);
const { nombre, email } = req.body;

const updated = db.table('usuarios').update(
  { id },
  { nombre, email, updatedAt: new Date().toISOString() }
);

if (updated === 0) {
  return res.status(404).json({
    success: false,
    error: 'Usuario no encontrado'
  });
}

const usuario = db.table('usuarios').findOne({ id });

return res.json({
  success: true,
  data: usuario,
  message: 'Usuario actualizado exitosamente'
});`,

    DELETE: `// DELETE - Eliminar registro
const id = parseInt(req.params.id);

const deleted = db.table('usuarios').delete({ id });

if (deleted === 0) {
  return res.status(404).json({
    success: false,
    error: 'Usuario no encontrado'
  });
}

return res.json({
  success: true,
  message: 'Usuario eliminado exitosamente',
  deletedCount: deleted
});`
};

export const PYTHON_TEMPLATES = {
    GET_ALL: `# GET - Obtener todos los registros
def handler(req, res, db):
    # Convertimos a lista para serialización y uso de len()
    usuarios = list(db.table('usuarios').find())
    
    return res.json({
        'success': True,
        'data': usuarios,
        'count': len(usuarios)
    })`,

    GET_ONE: `# GET - Obtener un registro por ID
def handler(req, res, db):
    id = int(req.params.id)
    usuario = db.table('usuarios').findOne({ 'id': id })
    
    if not usuario:
        return res.status(404).json({
            'success': False,
            'error': 'Usuario no encontrado'
        })
        
    return res.json({
        'success': True,
        'data': usuario
    })`,

    POST: `# POST - Crear nuevo registro
def handler(req, res, db):
    body = req.body or {}
    nombre = body.get('nombre')
    email = body.get('email')
    
    if not nombre:
        return res.status(400).json({
            'success': False,
            'error': 'El nombre es requerido'
        })
    
    nuevo_usuario = db.table('usuarios').insert({
        'nombre': nombre,
        'email': email
    })
    
    return res.status(201).json({
        'success': True,
        'data': nuevo_usuario
    })`,

    PUT: `# PUT - Actualizar registro
def handler(req, res, db):
    id = int(req.params.id)
    body = req.body or {}
    
    updated = db.table('usuarios').update(
        { 'id': id },
        body
    )
    
    if updated == 0:
        return res.status(404).json({
            'success': False,
            'error': 'Usuario no encontrado'
        })
        
    usuario = db.table('usuarios').findOne({ 'id': id })
    return res.json({
        'success': True,
        'data': usuario
    })`,

    DELETE: `# DELETE - Eliminar registro
def handler(req, res, db):
    id = int(req.params.id)
    deleted = db.table('usuarios').delete({ 'id': id })
    
    if deleted == 0:
        return res.status(404).json({
            'success': False,
            'error': 'Usuario no encontrado'
        })
        
    return res.json({
        'success': True,
        'message': 'Usuario eliminado'
    })`
};

export const JAVA_TEMPLATES = {
    GET_ALL: `// GET - Obtener todos los registros
public Response handler(Request req, Response res, Database db) {
    List<Usuario> usuarios = db.table("usuarios").find();
    
    return res.json(new ApiResponse(
        true,
        usuarios,
        usuarios.size()
    ));
}`,

    POST: `// POST - Crear nuevo registro
public Response handler(Request req, Response res, Database db) {
    String nombre = req.body.get("nombre");
    String email = req.body.get("email");
    
    if (nombre == null || nombre.isEmpty()) {
        return res.status(400).json(new ApiResponse(
            false,
            "El nombre es requerido"
        ));
    }
    
    Usuario nuevoUsuario = db.table("usuarios").insert(
        new Usuario(nombre, email)
    );
    
    return res.status(201).json(new ApiResponse(
        true,
        nuevoUsuario,
        "Usuario creado exitosamente"
    ));
}`
};

/**
 * Genera un template de ruta según el lenguaje y método HTTP
 */
export function generateRouteTemplate(
    runtime: 'Node.js' | 'Python' | 'Java',
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string
): string {
    const hasParam = path.includes(':id');

    switch (runtime) {
        case 'Node.js':
            if (method === 'GET' && hasParam) return NODE_JS_TEMPLATES.GET_ONE;
            if (method === 'GET') return NODE_JS_TEMPLATES.GET_ALL;
            if (method === 'POST') return NODE_JS_TEMPLATES.POST;
            if (method === 'PUT') return NODE_JS_TEMPLATES.PUT;
            if (method === 'DELETE') return NODE_JS_TEMPLATES.DELETE;
            break;

        case 'Python':
            if (method === 'GET' && hasParam) return PYTHON_TEMPLATES.GET_ONE;
            if (method === 'GET') return PYTHON_TEMPLATES.GET_ALL;
            if (method === 'POST') return PYTHON_TEMPLATES.POST;
            if (method === 'PUT') return PYTHON_TEMPLATES.PUT;
            if (method === 'DELETE') return PYTHON_TEMPLATES.DELETE;
            break;

        case 'Java':
            if (method === 'GET') return JAVA_TEMPLATES.GET_ALL;
            if (method === 'POST') return JAVA_TEMPLATES.POST;
            break;
    }

    // Fallback
    return `// ${method} ${path}\nreturn res.json({ message: 'Endpoint funcionando' });`;
}

/**
 * Rutas de ejemplo para cada runtime
 */
export function getDefaultRoutes(runtime: 'Node.js' | 'Python' | 'Java'): BackendRoute[] {
    const baseRoutes: BackendRoute[] = [
        {
            id: '1',
            method: 'GET',
            path: '/api/usuarios',
            handler: generateRouteTemplate(runtime, 'GET', '/api/usuarios')
        },
        {
            id: '2',
            method: 'GET',
            path: '/api/usuarios/:id',
            handler: generateRouteTemplate(runtime, 'GET', '/api/usuarios/:id')
        },
        {
            id: '3',
            method: 'POST',
            path: '/api/usuarios',
            handler: generateRouteTemplate(runtime, 'POST', '/api/usuarios')
        },
        {
            id: '4',
            method: 'PUT',
            path: '/api/usuarios/:id',
            handler: generateRouteTemplate(runtime, 'PUT', '/api/usuarios/:id')
        },
        {
            id: '5',
            method: 'DELETE',
            path: '/api/usuarios/:id',
            handler: generateRouteTemplate(runtime, 'DELETE', '/api/usuarios/:id')
        }
    ];

    return baseRoutes;
}
