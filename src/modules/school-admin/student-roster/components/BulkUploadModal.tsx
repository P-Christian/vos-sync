'use client';

import React, { useState } from 'react';
import { CreateStudentInput, createStudentSchema } from '../types/student-roster.schema';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: CreateStudentInput[]) => Promise<void>;
}

interface ParsedRow {
  rowNumber: number;
  data: CreateStudentInput;
  isValid: boolean;
  error?: string;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!isOpen) return null;

  const parseCSVContent = (text: string) => {
    const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      setUploadError('File appears to be empty or missing headers.');
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
    
    // Header index mapping
    const firstNameIdx = headers.findIndex((h) => h.includes('first') || h === 'fname');
    const middleNameIdx = headers.findIndex((h) => h.includes('middle') || h === 'mname');
    const lastNameIdx = headers.findIndex((h) => h.includes('last') || h === 'lname');
    const emailIdx = headers.findIndex((h) => h.includes('email'));
    const studentNumIdx = headers.findIndex((h) => h.includes('number') || h.includes('student_id') || h.includes('student_no'));
    const schoolYearIdx = headers.findIndex((h) => h.includes('year') || h === 'sy');
    const gpaIdx = headers.findIndex((h) => h.includes('gpa'));

    if (emailIdx === -1 || firstNameIdx === -1 || lastNameIdx === -1) {
      setUploadError('CSV must include "first_name", "last_name", and "email" columns.');
      return;
    }

    const rows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const col = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      if (col.length === 0 || (col.length === 1 && !col[0])) continue;

      const rawRow: CreateStudentInput = {
        first_name: col[firstNameIdx] || '',
        middle_name: middleNameIdx !== -1 ? col[middleNameIdx] || null : null,
        last_name: col[lastNameIdx] || '',
        email: col[emailIdx] || '',
        student_number: studentNumIdx !== -1 ? col[studentNumIdx] || null : null,
        school_year: schoolYearIdx !== -1 && col[schoolYearIdx] ? col[schoolYearIdx] : '2025-2026',
        gpa: gpaIdx !== -1 && col[gpaIdx] ? parseFloat(col[gpaIdx]) || null : null,
        school_course_id: null,
      };

      const val = createStudentSchema.safeParse(rawRow);
      if (val.success) {
        rows.push({ rowNumber: i, data: val.data, isValid: true });
      } else {
        const firstErr = val.error.issues[0]?.message || 'Invalid row data';
        rows.push({ rowNumber: i, data: rawRow, isValid: false, error: firstErr });
      }
    }

    setParsedRows(rows);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setUploadError(null);
    setIsParsing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        parseCSVContent(text);
      } catch (err) {
        setUploadError('Failed to read file. Please ensure it is a valid CSV format.');
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleUploadSubmit = async () => {
    const validRows = parsedRows.filter((r) => r.isValid).map((r) => r.data);
    if (validRows.length === 0) {
      setUploadError('No valid rows available to import.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSuccess(validRows);
      onClose();
    } catch (err: any) {
      setUploadError(err.message || 'Import failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800">Bulk Upload Roster (CSV)</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {uploadError && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {uploadError}
            </div>
          )}

          {/* File Picker */}
          <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl p-6 text-center transition-colors">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload-input"
            />
            <label htmlFor="csv-upload-input" className="cursor-pointer space-y-2 block">
              <div className="text-blue-600 font-semibold text-sm">
                {file ? file.name : 'Click to select CSV file'}
              </div>
              <p className="text-xs text-slate-500">
                CSV header format: first_name, middle_name, last_name, email, student_number, school_year, gpa
              </p>
            </label>
          </div>

          {/* Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Import Preview ({parsedRows.length} total rows)</span>
                <span className="text-emerald-600 font-semibold">{validCount} valid rows ready</span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="p-2">Row</th>
                      <th className="p-2">Name</th>
                      <th className="p-2">Email</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((r) => (
                      <tr key={r.rowNumber} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-2 font-mono text-slate-400">#{r.rowNumber}</td>
                        <td className="p-2 font-medium text-slate-800">
                          {r.data.first_name} {r.data.last_name}
                        </td>
                        <td className="p-2 text-slate-600">{r.data.email}</td>
                        <td className="p-2">
                          {r.isValid ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                              Valid
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium" title={r.error}>
                              Error: {r.error}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={validCount === 0 || isSubmitting || isParsing}
            onClick={handleUploadSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
          >
            {isSubmitting ? 'Importing...' : `Import ${validCount} Students`}
          </button>
        </div>
      </div>
    </div>
  );
};
