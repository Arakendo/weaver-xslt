import type { ErrorFrame } from '../errors/index.js';
import type {
  TransformTraceOptions,
  XmlTraceEvent,
  XmlTracePause,
  XmlTraceTemplateInfo,
} from '../processor/types.js';
import { recordTraceSummary } from './traceSummary.js';

const recordedTracePauses = new WeakMap<TransformTraceOptions, XmlTracePause>();

export function isTraceEnabled(trace: TransformTraceOptions | undefined): boolean {
  return (
    trace !== undefined &&
    (trace.onEvent !== undefined ||
      trace.onPause !== undefined ||
      (trace.breakpoints !== undefined && trace.breakpoints.length > 0))
  );
}

export function emitTraceEvent(
  trace: TransformTraceOptions | undefined,
  event: XmlTraceEvent,
): void {
  trace?.onEvent?.(event);
  recordTraceSummary(trace, event);

  if (
    trace === undefined ||
    !isTraceEnabled(trace) ||
    trace.breakpoints === undefined ||
    trace.breakpoints.length === 0
  ) {
    return;
  }

  const activeTrace = trace;
  const activeBreakpoints = activeTrace.breakpoints!;

  if (recordedTracePauses.has(activeTrace)) {
    return;
  }

  const matched = activeBreakpoints.some(
    (breakpoint) =>
      breakpoint.on.includes(event.kind) &&
      breakpoint.node.documentUri === event.node.documentUri &&
      breakpoint.node.kind === event.node.kind &&
      breakpoint.node.path === event.node.path,
  );
  if (!matched) {
    return;
  }

  const pause = createTracePause(event);
  recordedTracePauses.set(activeTrace, pause);
  activeTrace.onPause?.(pause);
}

export function getRecordedTracePause(
  trace: TransformTraceOptions | undefined,
): XmlTracePause | undefined {
  return trace === undefined ? undefined : recordedTracePauses.get(trace);
}

export function resetRecordedTracePause(trace: TransformTraceOptions | undefined): void {
  if (trace !== undefined) {
    recordedTracePauses.delete(trace);
  }
}

function createTracePause(event: XmlTraceEvent): XmlTracePause {
  const frames: ErrorFrame[] = [];

  if (event.instruction !== undefined) {
    frames.push({
      kind: 'instruction',
      label: event.instruction.kind,
      ...(event.instruction.location === undefined ? {} : { location: event.instruction.location }),
    });
  }

  if (event.template !== undefined) {
    frames.push(createTemplateFrame(event.template));
  }

  return {
    event,
    frames,
  };
}

function createTemplateFrame(template: XmlTraceTemplateInfo): ErrorFrame {
  if (template.match !== undefined) {
    return {
      kind: 'template',
      label: `match="${template.match}"`,
      ...(template.location === undefined ? {} : { location: template.location }),
    };
  }

  if (template.name !== undefined) {
    return {
      kind: 'template',
      label: `name="${template.name}"`,
      ...(template.location === undefined ? {} : { location: template.location }),
    };
  }

  return {
    kind: 'template',
    label: '<anonymous>',
    ...(template.location === undefined ? {} : { location: template.location }),
  };
}
