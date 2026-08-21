import React, { useState } from 'react';
import { Key, Download, Printer, Search, FileText } from 'lucide-react';
import { QuestionBank } from '../types';
import { exportAllKunciJawabanExcel, exportAnswerKeysPDF } from '../utils/exportImport';

interface KumpulanJawabanViewProps {
  banks: QuestionBank[];
}

export const KumpulanJawabanView: React.FC<KumpulanJawabanViewProps> = ({ banks }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = banks.filter(
    (b) =>
      b.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.token.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto print:p-0 print:bg-white">
      {/* Action Header - Hidden on Print */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0f172a] p-4 rounded-xl border border-slate-800 shadow-sm print:hidden">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kunci jawaban berdasarkan mapel/token..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-400 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportAllKunciJawabanExcel(banks)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Excel</span>
          </button>

          <button
            onClick={() => exportAnswerKeysPDF(banks)}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak / Print</span>
          </button>
        </div>
      </div>

      {/* Printable Answer Keys Container */}
      <div className="space-y-6">
        {filtered.map((bank) => (
          <div key={bank.id} className="bg-[#0f172a] rounded-2xl border border-slate-800 shadow-sm p-6 space-y-4 print:border-none print:shadow-none print:p-0 print:bg-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  Token: {bank.token}
                </span>
                <h3 className="text-sm font-black text-slate-100 mt-1">{bank.title}</h3>
                <p className="text-xs text-slate-400">
                  Mata Pelajaran: <span className="font-semibold text-slate-200">{bank.subject}</span> | Guru:{' '}
                  <span className="font-semibold text-slate-200">{bank.teacher_name}</span>
                </p>
              </div>
              <div className="text-right text-xs text-slate-400">
                <span className="font-bold text-slate-200">{bank.total_questions} Soal</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {bank.questions.map((q) => {
                const correctOpt = q.options.find((o) => o.is_correct);
                return (
                  <div key={q.id} className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">Soal Nomor {q.question_number}</span>
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-black text-[11px]">
                        Kunci: {correctOpt ? `${correctOpt.option_letter}. ${correctOpt.option_text}` : '-'}
                      </span>
                    </div>
                    <p className="text-slate-300 line-clamp-2">{q.question_text}</p>
                    {q.explanation && (
                      <p className="text-[11px] text-amber-200 bg-amber-500/10 p-1.5 rounded border border-amber-500/20">
                        <strong className="font-bold text-amber-400">Pembahasan:</strong> {q.explanation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="bg-[#0f172a] rounded-2xl p-12 text-center text-slate-500 border border-slate-800">
            Tidak ada kunci jawaban untuk ditampilkan.
          </div>
        )}
      </div>
    </div>
  );
};
