import type { FirestoreDocument } from '../services/firestore';
import { DocumentTable } from './DocumentTable';
import { useState } from 'react';
import { exportCOAReportsToExcel } from '../utils/exportExcel';

interface DocumentViewerProps {
  documents: FirestoreDocument[];
  title: string;
  isLoading?: boolean;
  error?: string | null;
  collectionName?: string;
}

export function DocumentViewer({ documents, title, isLoading, error, collectionName }: DocumentViewerProps) {
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table');

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-hard-5">
        <h3 className="text-lg font-semibold text-precepgo-card-title mb-4">{title}</h3>
        <div className="flex justify-center py-8">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-4 border-precepgo-orange/30 border-t-precepgo-orange rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-hard-5">
        <h3 className="text-lg font-semibold text-precepgo-card-title mb-4">{title}</h3>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800 font-semibold mb-2">⚠️ Error Loading Documents</p>
          <p className="text-xs text-red-700">{error}</p>
          {error.includes('Permission denied') && (
            <p className="text-xs text-red-600 mt-2">
              See <code className="bg-red-100 px-1 rounded">FIRESTORE_RULES_FIX.md</code> for help configuring Firestore security rules.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-hard-5">
        <h3 className="text-lg font-semibold text-precepgo-card-title mb-4">{title}</h3>
        <p className="text-precepgo-card-text text-sm text-center py-4">
          No documents found. Generate some documents using the agents above.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-hard-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-precepgo-card-title">
          {title} ({documents.length})
        </h3>
        <div className="flex gap-2">
          {collectionName === 'agent_coa_reports' && (
            <button
              onClick={async () => {
                try {
                  await exportCOAReportsToExcel(documents);
                } catch (error) {
                  console.error('Export failed:', error);
                  alert('Failed to export file. Please try again.');
                }
              }}
              className="px-3 py-1 rounded-lg text-sm font-semibold transition-colors bg-green-500 hover:bg-green-600 text-white flex items-center gap-2"
              title="Export to Excel (Google Sheets compatible)"
            >
              <span>📊</span>
              <span>Export Excel</span>
            </button>
          )}
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
              viewMode === 'table'
                ? 'bg-precepgo-orange text-white'
                : 'bg-gray-100 text-precepgo-card-text hover:bg-gray-200'
            }`}
          >
            Table
          </button>
          <button
            onClick={() => setViewMode('json')}
            className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
              viewMode === 'json'
                ? 'bg-precepgo-orange text-white'
                : 'bg-gray-100 text-precepgo-card-text hover:bg-gray-200'
            }`}
          >
            JSON
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        {viewMode === 'table' ? (
          <DocumentTable documents={documents} collectionName={collectionName || ''} />
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {documents.map((doc) => (
              <DocumentCard key={doc.id} document={doc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface DocumentCardProps {
  document: FirestoreDocument;
}

function DocumentCard({ document }: DocumentCardProps) {
  const formatDate = (date?: Date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  };

  return (
    <div className="bg-precepgo-card-bg rounded-lg p-4 border border-gray-200 hover:border-precepgo-orange transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-precepgo-card-text bg-gray-100 px-2 py-1 rounded">
              {document.id.substring(0, 8)}...
            </span>
            {document.createdAt && (
              <span className="text-xs text-precepgo-card-text">
                {formatDate(document.createdAt)}
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-2">
        <pre className="text-xs text-precepgo-card-text bg-white p-3 rounded overflow-x-auto max-h-48 overflow-y-auto">
          {JSON.stringify(document.data, null, 2)}
        </pre>
      </div>
    </div>
  );
}

