import type { StylesheetIR } from '../compile/ir.js';

export interface EmitStylesheetModuleOptions {
  readonly path?: string;
  readonly filePath?: string;
  readonly digest: string;
  readonly runtimeModuleSpecifier?: string;
}

export interface EmitPlan {
  readonly stylesheet: StylesheetIR;
  readonly moduleSpecifier: string;
  readonly sourcePath: string;
  readonly digest: string;
  readonly serializedIr: string;
}

export function createEmitPlan(ir: StylesheetIR, options: EmitStylesheetModuleOptions): EmitPlan {
  return {
    stylesheet: ir,
    moduleSpecifier: options.runtimeModuleSpecifier ?? '@arakendo/weaver-xslt/runtime',
    sourcePath: options.filePath ?? options.path ?? '<stylesheet>',
    digest: options.digest,
    serializedIr: JSON.stringify(ir),
  };
}
