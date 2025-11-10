import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from './DataTable';
import type { FirestoreDocument } from '../services/firestore';

interface EvaluationData {
  id: string;
  case_type?: string;
  preceptee_user_name?: string;
  preceptor_name?: string;
  preceptor_comment?: string;
  focus_areas?: string;
  created_at?: Date | any;
  createdAt?: Date;
  [key: string]: any;
}

interface ScenarioData {
  id: string;
  case?: { name?: string; code?: string; description?: string };
  patient?: { name?: string; age?: number; categories?: string[] };
  scenario?: string;
  created_at?: Date | any;
  createdAt?: Date;
  [key: string]: any;
}

interface NotificationData {
  id: string;
  evaluation_doc_id?: string;
  preceptee_name?: string;
  preceptor_name?: string;
  case_type?: string;
  negative_fields?: string[];
  created_at?: Date | any;
  createdAt?: Date;
  [key: string]: any;
}

interface COAReportData {
  id: string;
  students_processed?: number;
  total_standards?: number;
  student_reports?: any[];
  created_at?: Date | any;
  createdAt?: Date;
  [key: string]: any;
}

const formatDate = (date?: Date | any) => {
  if (!date) return '—';
  try {
    if (date instanceof Date) return date.toLocaleString();
    if (date?.toDate) return date.toDate().toLocaleString();
    return new Date(date).toLocaleString();
  } catch {
    return '—';
  }
};

// Evaluation Table Columns
const evaluationColumns: ColumnDef<EvaluationData>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ getValue }) => (
      <span className="font-mono text-xs">{String(getValue()).substring(0, 8)}...</span>
    ),
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    cell: ({ row }) => formatDate(row.original.created_at || row.original.createdAt),
  },
  {
    accessorKey: 'case_type',
    header: 'Case Type',
  },
  {
    accessorKey: 'preceptee_user_name',
    header: 'Student',
  },
  {
    accessorKey: 'preceptor_name',
    header: 'Preceptor',
  },
  {
    accessorKey: 'preceptor_comment',
    header: 'Comment',
    cell: ({ getValue }) => {
      const comment = getValue() as string;
      return comment ? (
        <span className="max-w-xs truncate block" title={comment}>
          {comment.substring(0, 100)}...
        </span>
      ) : (
        '—'
      );
    },
  },
  {
    accessorKey: 'focus_areas',
    header: 'Focus Areas',
    cell: ({ getValue }) => {
      const areas = getValue() as string;
      return areas ? (
        <span className="max-w-xs truncate block" title={areas}>
          {areas.substring(0, 100)}...
        </span>
      ) : (
        '—'
      );
    },
  },
  {
    accessorKey: 'ratings_summary',
    header: 'Ratings',
    cell: ({ row }) => {
      const data = row.original;
      const acKeys = Object.keys(data).filter(k => k.startsWith('ac_'));
      const pcKeys = Object.keys(data).filter(k => k.startsWith('pc_'));
      const acCount = acKeys.length;
      const pcCount = pcKeys.length;
      return (
        <span className="text-xs text-gray-600">
          AC: {acCount}, PC: {pcCount}
        </span>
      );
    },
  },
];

// Scenario Table Columns
const scenarioColumns: ColumnDef<ScenarioData>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ getValue }) => (
      <span className="font-mono text-xs">{String(getValue()).substring(0, 8)}...</span>
    ),
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    cell: ({ row }) => formatDate(row.original.created_at || row.original.createdAt),
  },
  {
    accessorKey: 'case',
    header: 'Case',
    cell: ({ getValue }) => {
      const caseData = getValue() as { name?: string; code?: string; description?: string };
      if (!caseData) return '—';
      return caseData.name || caseData.code || '—';
    },
  },
  {
    accessorKey: 'patient',
    header: 'Patient',
    cell: ({ getValue }) => {
      const patient = getValue() as { name?: string; age?: number; categories?: string[] };
      if (!patient) return '—';
      return `${patient.name || 'N/A'}${patient.age ? `, ${patient.age}` : ''}`;
    },
  },
  {
    accessorKey: 'scenario',
    header: 'Scenario',
    cell: ({ getValue }) => {
      const scenario = getValue() as string;
      return scenario ? (
        <span className="max-w-md truncate block text-xs" title={scenario}>
          {scenario.substring(0, 150)}...
        </span>
      ) : (
        '—'
      );
    },
  },
  {
    accessorKey: 'learning_points',
    header: 'Learning Points',
    cell: ({ getValue }) => {
      const points = getValue() as string[];
      return points && Array.isArray(points) ? (
        <span className="text-xs">{points.length} points</span>
      ) : (
        '—'
      );
    },
  },
];

// Notification Table Columns
const notificationColumns: ColumnDef<NotificationData>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ getValue }) => (
      <span className="font-mono text-xs">{String(getValue()).substring(0, 8)}...</span>
    ),
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    cell: ({ row }) => formatDate(row.original.created_at || row.original.createdAt),
  },
  {
    accessorKey: 'preceptee_name',
    header: 'Student',
  },
  {
    accessorKey: 'preceptor_name',
    header: 'Preceptor',
  },
  {
    accessorKey: 'case_type',
    header: 'Case Type',
  },
  {
    accessorKey: 'evaluation_doc_id',
    header: 'Evaluation ID',
    cell: ({ getValue }) => {
      const id = getValue() as string;
      return id ? (
        <span className="font-mono text-xs">{id.substring(0, 8)}...</span>
      ) : (
        '—'
      );
    },
  },
  {
    accessorKey: 'negative_fields',
    header: 'Negative Fields',
    cell: ({ getValue }) => {
      const fields = getValue() as string[];
      if (!fields || !Array.isArray(fields)) return '—';
      return (
        <div className="flex flex-wrap gap-1">
          {fields.map((field, idx) => (
            <span key={idx} className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">
              {field}
            </span>
          ))}
        </div>
      );
    },
  },
];

// COA Report Table Columns
const coaReportColumns: ColumnDef<COAReportData>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ getValue }) => (
      <span className="font-mono text-xs">{String(getValue()).substring(0, 8)}...</span>
    ),
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    cell: ({ row }) => formatDate(row.original.created_at || row.original.createdAt),
  },
  {
    accessorKey: 'students_processed',
    header: 'Students',
    cell: ({ getValue }) => {
      const count = getValue() as number;
      return count !== undefined ? (
        <span className="text-sm font-semibold">{count}</span>
      ) : (
        '—'
      );
    },
  },
  {
    accessorKey: 'total_standards',
    header: 'Standards',
    cell: ({ getValue }) => {
      const count = getValue() as number;
      return count !== undefined ? (
        <span className="text-sm">{count}</span>
      ) : (
        '—'
      );
    },
  },
  {
    accessorKey: 'student_reports',
    header: 'Student Reports',
    cell: ({ getValue }) => {
      const reports = getValue() as any[];
      if (!reports || !Array.isArray(reports)) return '—';
      return (
        <span className="text-xs text-gray-600">
          {reports.length} report{reports.length !== 1 ? 's' : ''}
        </span>
      );
    },
  },
  {
    accessorKey: 'standard_scores',
    header: 'Summary Scores',
    cell: ({ getValue }) => {
      const scores = getValue() as any[];
      if (!scores || !Array.isArray(scores)) return '—';
      const avgScore = scores.reduce((sum: number, s: any) => sum + (s.score || 0), 0) / scores.length;
      return (
        <span className="text-xs font-semibold">
          Avg: {Math.round(avgScore)}
        </span>
      );
    },
  },
];

// Map collection names to their column definitions
const collectionColumns: Record<string, ColumnDef<any>[]> = {
  agent_evaluations: evaluationColumns,
  agent_scenarios: scenarioColumns,
  agent_notifications: notificationColumns,
  agent_coa_reports: coaReportColumns,
};

interface DocumentTableProps {
  documents: FirestoreDocument[];
  collectionName: string;
}

export function DocumentTable({ documents, collectionName }: DocumentTableProps) {
  // Transform documents to include id and createdAt/created_at in the data object
  const tableData = documents.map((doc) => ({
    id: doc.id,
    createdAt: doc.createdAt,
    created_at: doc.data.created_at || doc.createdAt,
    ...doc.data,
  }));

  // Get columns for this collection, or create generic columns
  const columns = collectionColumns[collectionName] || [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs">{String(getValue()).substring(0, 8)}...</span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ getValue }) => {
        const date = getValue() as Date;
        return date ? new Date(date).toLocaleString() : '—';
      },
    },
    // Add other common fields
    ...Object.keys(tableData[0] || {})
      .filter((key) => key !== 'id' && key !== 'createdAt')
      .slice(0, 5) // Limit to first 5 fields
      .map((key) => ({
        accessorKey: key,
        header: key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        cell: ({ getValue }: any) => {
          const value = getValue();
          if (value === null || value === undefined) return <span className="text-gray-400">—</span>;
          if (typeof value === 'object') return <pre className="text-xs">{JSON.stringify(value, null, 2)}</pre>;
          return String(value);
        },
      })),
  ];

  return (
    <div className="overflow-x-auto">
      <DataTable data={tableData} columns={columns} />
    </div>
  );
}

