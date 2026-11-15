import React from 'react';
import { User, Scale, Syringe, CalendarCheck, Stethoscope, CheckCircle2, ClipboardList } from 'lucide-react';

const FIELD_DEFS = [
  { key: 'beneficiary_id', Icon: User,         label: 'Beneficiary ID',  span: false },
  { key: 'visit_type',     Icon: Stethoscope,  label: 'Visit Type',      span: false },
  { key: 'weight_kg',      Icon: Scale,        label: 'Weight',          span: false, unit: 'kg' },
  { key: 'vaccinations_due', Icon: Syringe,    label: 'Vaccinations Due', span: true  },
  { key: 'next_visit_date',  Icon: CalendarCheck, label: 'Next Visit Date', span: true  },
];

function FieldCell({ Icon, label, value, updated }) {
  return (
    <div
      className={`
        field-cell flex flex-col justify-between gap-2 p-3.5 rounded-2xl border
        transition-all duration-500 ease-spring min-w-0
        ${updated
          ? 'animate-field-updated ring-2 ring-amber-400/80 border-amber-300 bg-amber-50/60'
          : 'border-ink-faint/30 bg-slate-50/80 hover:bg-white'
        }
      `}
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <Icon
            className={`icon-scalable ${updated ? 'text-amber-600' : 'text-teal-600'}`}
            style={{ width: '1.25em', height: '1.25em' }}
            strokeWidth={2}
          />
          <span className="text-fluid-xs font-semibold text-ink-muted truncate">{label}</span>
        </div>
        {updated && (
          <span className="text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full animate-check-pop whitespace-nowrap flex-shrink-0">
            ✓ Updated
          </span>
        )}
      </div>

      <div className={`font-bold tabular leading-snug text-fluid-value break-words min-w-0 ${
        value
          ? (updated ? 'text-teal-800' : 'text-ink-DEFAULT')
          : 'text-ink-faint italic font-normal text-fluid-sm'
      }`}>
        {value || 'Not recorded'}
      </div>
    </div>
  );
}

export function RecordCard({ record, correctedFields = [], beneficiaries = [] }) {
  if (!record?.beneficiary_id) {
    return (
      <div className="record-container @container w-full my-3">
        <div className="bg-white rounded-3xl shadow-card border border-ink-faint/40 p-6 sm:p-8 text-center animate-slide-up">
          <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-3.5 border border-teal-100">
            <ClipboardList className="text-teal-600" style={{ width: '1.75em', height: '1.75em' }} strokeWidth={1.8} />
          </div>
          <div className="text-ink-DEFAULT font-bold text-fluid-body">No Visit Record Yet</div>
          <p className="text-ink-muted text-fluid-sm mt-1.5 leading-relaxed max-w-sm mx-auto">
            Speak the beneficiary name, visit type, weight in kilos, vaccinations due, and next visit date.
          </p>
        </div>
      </div>
    );
  }

  const isUpdated   = field => correctedFields.includes(field);
  const beneficiary = beneficiaries.find(b => b.id === record.beneficiary_id);

  const getValue = def => {
    const v = record[def.key];
    if (!v || (Array.isArray(v) && v.length === 0)) return null;
    if (Array.isArray(v)) return v.join(', ');
    if (def.unit) return `${v} ${def.unit}`;
    return String(v);
  };

  return (
    <div className="record-container @container w-full my-3">
      <div className="bg-white rounded-3xl shadow-card border border-ink-faint/40 overflow-hidden animate-slide-up">

        {/* Header banner */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-faint/30 bg-teal-700">
          <div className="min-w-0 pr-2">
            <div className="text-white font-bold text-fluid-body flex items-center gap-2">
              <span>📋</span>
              <span className="truncate">Visit Record</span>
            </div>
            {beneficiary && (
              <div className="text-teal-100 text-fluid-xs font-medium mt-0.5 truncate">
                {beneficiary.name} · {beneficiary.village}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 bg-teal-800/80 px-2.5 py-1 rounded-full border border-teal-600/50">
            <CheckCircle2 className="text-emerald-300" style={{ width: '1.25em', height: '1.25em' }} strokeWidth={2.2} />
            <span className="text-white text-xs font-mono font-bold tabular">{record.beneficiary_id}</span>
          </div>
        </div>

        {/* Fields Grid — reflows from 1-column to 2-column grid when container slot is ≥420px */}
        <div className="p-3.5 sm:p-4">
          <div className="fields-grid grid grid-cols-1 gap-2.5">
            {FIELD_DEFS.map(def => (
              <div key={def.key} className={def.span ? 'field-span' : ''}>
                <FieldCell
                  Icon={def.Icon}
                  label={def.label}
                  value={getValue(def)}
                  updated={isUpdated(def.key)}
                />
              </div>
            ))}

            {/* Reported Symptoms if present */}
            {record.reported_symptoms?.length > 0 && (
              <div className="field-span bg-orange-50/90 rounded-2xl p-3.5 border border-orange-200">
                <div className="text-fluid-xs font-bold text-orange-700 mb-1 flex items-center gap-1.5">
                  <span className="text-orange-600 font-bold">⚕</span>
                  <span>Reported Symptoms</span>
                </div>
                <div className="text-fluid-sm font-semibold text-orange-900 leading-relaxed">
                  {Array.isArray(record.reported_symptoms)
                    ? record.reported_symptoms.join(', ')
                    : record.reported_symptoms}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Follow-up banner footer */}
        {record.next_visit_date && (
          <div className="flex items-center gap-2.5 px-5 py-3 bg-emerald-50 border-t border-emerald-100">
            <CheckCircle2 className="text-emerald-600 flex-shrink-0" style={{ width: '1.25em', height: '1.25em' }} strokeWidth={2} />
            <span className="text-fluid-xs font-bold text-emerald-800 truncate">
              Follow-Up: Next visit scheduled by <span className="tabular underline">{record.next_visit_date}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
