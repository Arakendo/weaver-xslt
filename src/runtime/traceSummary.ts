import type {
  TransformTraceOptions,
  XmlTraceEvent,
  XmlTraceSummary,
  XmlTraceSummaryEntry,
} from '../processor/types.js';

type TraceSummaryCounts = Record<XmlTraceEvent['kind'], number>;

interface MutableTraceSummary {
  totalEvents: number;
  eventCounts: TraceSummaryCounts;
  templateCounts: Map<string, number>;
  instructionCounts: Map<string, number>;
  lastEvent?: XmlTraceEvent;
}

const recordedTraceSummaries = new WeakMap<TransformTraceOptions, MutableTraceSummary>();

export function recordTraceSummary(
  trace: TransformTraceOptions | undefined,
  event: XmlTraceEvent,
): void {
  if (trace === undefined) {
    return;
  }

  const summary = recordedTraceSummaries.get(trace) ?? createTraceSummary();
  summary.totalEvents += 1;
  summary.eventCounts[event.kind] += 1;
  summary.lastEvent = event;

  if (event.template !== undefined) {
    summary.templateCounts.set(
      templateSummaryKey(event),
      (summary.templateCounts.get(templateSummaryKey(event)) ?? 0) + 1,
    );
  }

  if (event.instruction !== undefined) {
    summary.instructionCounts.set(
      event.instruction.kind,
      (summary.instructionCounts.get(event.instruction.kind) ?? 0) + 1,
    );
  }

  recordedTraceSummaries.set(trace, summary);
}

export function getRecordedTraceSummary(
  trace: TransformTraceOptions | undefined,
): XmlTraceSummary | undefined {
  if (trace === undefined) {
    return undefined;
  }

  const summary = recordedTraceSummaries.get(trace);
  return summary === undefined ? undefined : freezeTraceSummary(summary);
}

export function resetRecordedTraceSummary(trace: TransformTraceOptions | undefined): void {
  if (trace !== undefined) {
    recordedTraceSummaries.delete(trace);
  }
}

function createTraceSummary(): MutableTraceSummary {
  return {
    totalEvents: 0,
    eventCounts: {
      'focus-enter': 0,
      'template-enter': 0,
      'instruction-select': 0,
      'value-read': 0,
    },
    templateCounts: new Map(),
    instructionCounts: new Map(),
  };
}

function freezeTraceSummary(summary: MutableTraceSummary): XmlTraceSummary {
  return {
    totalEvents: summary.totalEvents,
    eventCounts: summary.eventCounts,
    topTemplates: topEntries(summary.templateCounts),
    topInstructions: topEntries(summary.instructionCounts),
    ...(summary.lastEvent === undefined ? {} : { lastEvent: summary.lastEvent }),
  };
}

function topEntries(counts: Map<string, number>): readonly XmlTraceSummaryEntry[] {
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => {
      if (left.count !== right.count) {
        return right.count - left.count;
      }

      return left.key.localeCompare(right.key);
    });
}

function templateSummaryKey(event: XmlTraceEvent): string {
  if (event.template?.match !== undefined) {
    return `match=${JSON.stringify(event.template.match)}`;
  }

  if (event.template?.name !== undefined) {
    return `name=${JSON.stringify(event.template.name)}`;
  }

  return '<anonymous>';
}
