import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  label?: string;
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAYS_OF_WEEK = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];

export default function CustomDatePicker({ value, onChange, label }: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Parse incoming value or use today
  const initialDate = value ? new Date(`${value}T12:00:00`) : new Date();
  
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleSelectDate = (day: number) => {
    const formattedMonth = String(currentMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    onChange(`${currentYear}-${formattedMonth}-${formattedDay}`);
    setIsOpen(false);
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const formatDisplayDate = (val: string) => {
    if (!val) return 'Seleccionar fecha';
    const [y, m, d] = val.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2">
          {label}
        </label>
      )}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium flex items-center justify-between hover:bg-white hover:border-indigo-300 hover:shadow-sm"
      >
        <span className={value ? 'text-slate-700' : 'text-slate-400'}>
          {formatDisplayDate(value)}
        </span>
        <CalendarIcon className="w-5 h-5 text-indigo-500" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute z-50 top-full mt-2 w-72 bg-white/90 backdrop-blur-2xl border border-white/40 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] rounded-3xl p-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 hover:bg-indigo-50 text-indigo-500 rounded-full transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="font-bold text-slate-800 tracking-tight text-[15px]">
                {MONTHS[currentMonth]} {currentYear}
              </div>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 hover:bg-indigo-50 text-indigo-500 rounded-full transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Days of week */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day} className="text-center text-[10px] font-extrabold uppercase tracking-widest text-slate-400 py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {blanks.map((b) => (
                <div key={`blank-${b}`} className="w-8 h-8" />
              ))}
              {days.map((day) => {
                const isSelected = value && 
                                   Number(value.split('-')[2]) === day &&
                                   Number(value.split('-')[1]) === currentMonth + 1 &&
                                   Number(value.split('-')[0]) === currentYear;
                
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleSelectDate(day)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                      isSelected 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105'
                        : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:scale-110'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            
            {/* Quick Actions */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between">
              <button 
                type="button"
                onClick={() => onChange("")} 
                className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
              >
                Limpiar
              </button>
              <button 
                type="button"
                onClick={() => {
                  const today = new Date();
                  setCurrentMonth(today.getMonth());
                  setCurrentYear(today.getFullYear());
                  handleSelectDate(today.getDate());
                }} 
                className="text-xs font-bold text-indigo-500 hover:text-indigo-700 transition-colors"
              >
                Hoy
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
