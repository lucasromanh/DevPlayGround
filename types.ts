
export type AppTab = 'frontend' | 'backend' | 'database';

export type FrameworkType = 'Vanilla JS' | 'React v18.2' | 'Vue.js 3.x';

export interface CodeFiles {
  [key: string]: string;
}

export type Runtime = 'Node.js' | 'Python' | 'Java' | 'C' | 'C++';

export interface BackendRoute {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  handler: string;
}

export interface DbColumn {
  name: string;
  type: string;
  isPrimary?: boolean;
  isForeignKey?: boolean;
  references?: { table: string, column: string };
  notNull?: boolean;
  unique?: boolean;
  autoIncrement?: boolean;
}

export interface DbTable {
  id: string;
  name: string;
  columns: DbColumn[];
  rows: any[];
  position?: { x: number, y: number };
}

export interface EnvVariables {
  CONNECT_BACKEND: boolean;
  CONNECT_DATABASE: boolean;
  API_KEY: string;
  DATABASE_URL: string;
  BACKEND_URL: string;
  CORS_ORIGIN: string;
}

export interface ProjectState {
  id: string;
  name: string;
  envVariables: EnvVariables;
  frontend: {
    framework: FrameworkType;
    files: CodeFiles;
    activeFile: string;
  };
  backend: {
    runtime: Runtime;
    files: CodeFiles;
    activeFile: string;
    endpoints: BackendRoute[];
  };
  database: {
    tables: DbTable[];
  };
}

export interface DeployedProject {
  id: string;
  name: string;
  timestamp: number;
  state: ProjectState;
}

export interface ApiResponse {
  status: number;
  time: number;
  data: any;
  headers: Record<string, string>;
}
