"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { UploadCloud, FileText, Settings, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);

  // Settings state
  const [fechaElaboracion, setFechaElaboracion] = useState("");
  const [consecutivo, setConsecutivo] = useState<number>(1);
  const [sameConsecutivo, setSameConsecutivo] = useState(false);

  // Status state
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [errors, setErrors] = useState<any[]>([]);

  // Columns specification to match exact SIIGO template
  const SIIGO_COLUMNS = [
    "Tipo de comprobante", "Consecutivo comprobante", "Fecha de elaboraci\u00f3n ",
    "Sigla moneda", "Tasa de cambio", "C\u00f3digo cuenta contable",
    "Identificaci\u00f3n tercero", "Sucursal", "C\u00f3digo producto",
    "C\u00f3digo de bodega", "Acci\u00f3n", "Cantidad producto", "Prefijo",
    "Consecutivo", "No. cuota", "Fecha vencimiento", "C\u00f3digo impuesto",
    "C\u00f3digo grupo activo fijo", "C\u00f3digo activo fijo", "Descripci\u00f3n",
    "C\u00f3digo centro/subcentro de costos", "D\u00e9bito", "Cr\u00e9dito",
    "Observaciones", "Base gravable libro compras/ventas  ",
    "Base exenta libro compras/ventas", "Mes de cierre"
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type === "application/pdf");
      setFiles(prev => [...prev, ...droppedFiles]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files).filter(f => f.type === "application/pdf");
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setResults([]);
    setErrors([]);

    let formattedFecha = fechaElaboracion;
    if (fechaElaboracion) {
      // From YYYY-MM-DD to DD/MM/YYYY
      const [year, month, day] = fechaElaboracion.split("-");
      formattedFecha = `${day}/${month}/${year}`;
    }

    const formData = new FormData();
    files.forEach(file => {
      formData.append("files", file);
    });
    formData.append("fecha", formattedFecha);
    formData.append("consecutivo", consecutivo.toString());
    formData.append("sameConsecutivo", sameConsecutivo.toString());

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.records.length > 0) {
        setResults(data.records);
        generateExcel(data.records);
      }

      if (data.errors && data.errors.length > 0) {
        setErrors(data.errors);
      }

    } catch (err) {
      console.error(err);
      alert("Error processing files");
    } finally {
      setIsProcessing(false);
    }
  };

  const generateExcel = (records: any[]) => {
    // We must respect SIIGO columns
    const formattedData = records.map(record => {
      let row: any = {};
      SIIGO_COLUMNS.forEach(col => {
        row[col] = record[col] !== undefined ? record[col] : "";
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedData, { header: SIIGO_COLUMNS });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Comprobantes");

    // Save file
    XLSX.writeFile(workbook, `SIIGO_Importacion_${new Date().getTime()}.xlsx`);
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-slate-900 p-8 flex flex-col items-center selection:bg-indigo-100 relative overflow-hidden font-sans">

      {/* Ambient Background Blobs (Softened for light mode) */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-fuchsia-500/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="w-full max-w-5xl space-y-12 relative z-10 pt-4">

        {/* Header Section */}
        <header className="text-center space-y-6 pt-10 flex flex-col items-center">
          <motion.img
            src="/logo.png"
            alt="Nexus Logo"
            className="w-24 h-24 md:w-32 md:h-32 object-contain drop-shadow-[0_8px_30px_rgba(99,102,241,0.2)]"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            whileHover={{ scale: 1.05, rotate: 2 }}
          />
          <motion.h1
            initial={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
            className="text-5xl md:text-7xl font-black tracking-tighter pb-2 text-transparent bg-clip-text bg-gradient-to-br from-slate-900 via-indigo-900 to-indigo-600 drop-shadow-sm"
          >
            Nexus <span className="text-slate-300 font-light">|</span> Extract
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto font-medium tracking-wide"
          >
            Inteligencia Contable Automatizada para SIIGO.
          </motion.p>
        </header>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

          {/* Settings Section */}
          <section className="md:col-span-4 bg-white/70 border border-slate-200/60 rounded-[2rem] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.03)] backdrop-blur-xl space-y-6">
            <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-indigo-500" />
              Configuración
            </h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Fecha Elaboración</label>
                <input
                  type="date"
                  value={fechaElaboracion}
                  onChange={(e) => setFechaElaboracion(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Consecutivo Inicial</label>
                <input
                  type="number"
                  value={consecutivo}
                  onChange={(e) => setConsecutivo(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Modo de Exportación</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSameConsecutivo(true)}
                    className={`text-xs p-3 rounded-xl border transition-all font-bold ${sameConsecutivo ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                  >
                    Único
                  </button>
                  <button
                    onClick={() => setSameConsecutivo(false)}
                    className={`text-xs p-3 rounded-xl border transition-all font-bold ${!sameConsecutivo ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                  >
                    Incremental
                  </button>
                </div>
              </div>
            </div>
          </section>
          {/* Upload Zone & Action */}
          <section className="md:col-span-8 flex flex-col justify-between space-y-6">

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative overflow-hidden rounded-[2rem] transition-all duration-500 ease-out flex flex-col items-center justify-center p-12 text-center h-[320px] group cursor-pointer
                ${isDragActive
                  ? 'border-2 border-indigo-500 bg-indigo-50/50 scale-[1.02] shadow-[0_20px_60px_rgba(99,102,241,0.1)]'
                  : 'border border-slate-200/60 bg-white/60 hover:bg-white/80 hover:border-indigo-400/50 hover:shadow-[0_10px_30px_rgba(0,0,0,0.02)] backdrop-blur-xl'}
              `}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <input
                id="file-upload"
                type="file"
                multiple
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className={`p-5 rounded-full mb-6 transition-all duration-500 ${isDragActive ? 'bg-indigo-100' : 'bg-slate-50 group-hover:bg-indigo-50'}`}>
                <UploadCloud className={`w-10 h-10 transition-all duration-500 ${isDragActive ? 'text-indigo-600 scale-110' : 'text-slate-400 group-hover:text-indigo-600'}`} />
              </div>
              <p className="text-2xl font-bold tracking-tight text-slate-800 group-hover:text-indigo-900 transition-colors">
                {isDragActive ? "Suelta la magia aquí" : "Arrastra tus documentos PDF"}
              </p>
              <p className="text-sm font-medium text-slate-500 mt-3 group-hover:text-slate-600 transition-colors">
                Extraeremos Placas, Totales y Referencias al vuelo.
              </p>
            </div>

            {/* Progress and Table Section (If any) */}
            <AnimatePresence>
              {files.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="bg-white/70 border border-slate-200/60 rounded-[2rem] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.03)] backdrop-blur-xl"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 tracking-tight">Archivos Cargados</h3>
                      <p className="text-sm text-slate-500 font-medium">{files.length} documento(s) listos para análisis</p>
                    </div>
                    <div className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-xs font-black tracking-widest uppercase">
                      Batch Actual
                    </div>
                  </div>

                  <div className="space-y-3 custom-scrollbar max-h-[350px] overflow-y-auto pr-2">
                    {files.map((file, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50 hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                            <FileText className="w-5 h-5 text-indigo-600" />
                          </div>
                          <span className="font-semibold text-slate-700 group-hover:text-slate-900">{file.name}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-400">{(file.size / 1024).toFixed(0)} KB</span>
                        <button onClick={(e) => { e.stopPropagation(); removeFile(idx); }} className="ml-1 text-slate-400 hover:text-red-500">
                          &times;
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Generate Button */}
            <button
              onClick={processFiles}
              disabled={files.length === 0 || isProcessing}
              className={`w-full py-5 rounded-[1.5rem] font-bold text-lg tracking-wide transition-all duration-500 flex items-center justify-center gap-3 relative overflow-hidden group
                ${files.length === 0 || isProcessing
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none'
                  : 'bg-slate-900 text-white shadow-[0_20px_40px_rgba(15,23,42,0.2)] hover:shadow-[0_25px_50px_rgba(15,23,42,0.3)] hover:scale-[1.02] active:scale-[0.98]'
                }
              `}
              style={{ minHeight: '64px' }}
            >
              {isProcessing && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10 transition-all">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                </div>
              )}
              <span className={`flex items-center gap-3 transition-opacity ${isProcessing ? 'opacity-0' : 'opacity-100'}`}>
                🚀 Generar Importación SIIGO
              </span>
            </button>
          </section>

        </div>

        {/* Results / Feedback */}
        <AnimatePresence>
          {results.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 bg-zinc-900/50 border border-indigo-500/30 rounded-3xl p-8 shadow-2xl backdrop-blur-3xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
              <div className="flex items-center gap-4 mb-4">
                <CheckCircle2 className="text-indigo-400 w-8 h-8 drop-shadow-[0_0_10px_rgba(129,140,248,0.5)]" />
                <h3 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                  Extracción Premium Completada ({results.length} filas)
                </h3>
              </div>
              <p className="text-base font-medium text-zinc-300">
                La descarga segura del archivo Excel ha sido iniciada. Todos los cruces de cuentas e inteligencias de SIIGO fueron incorporados.
              </p>
            </motion.section>
          )}

          {errors.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 bg-red-900/10 border border-red-500/20 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="text-red-400 w-6 h-6" />
                <h3 className="text-xl font-semibold text-red-400">
                  Advertencias ({errors.length})
                </h3>
              </div>
              <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
                {errors.map((e, i) => (
                  <li key={i}>{e.error}</li>
                ))}
              </ul>
            </motion.section>
          )}
        </AnimatePresence>

      </div>
    </main>
  );
}
