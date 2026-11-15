import React, { useState } from 'react';
import { CalendarCheck, Syringe, Phone, CheckSquare, Square } from 'lucide-react';

export function FollowUpQueue({ record, dangerFlags = [] }) {
  const [completed, setCompleted] = useState({});

  if (!record?.beneficiary_id) {
    return (
      <div className="w-full bg-white rounded-3xl border border-ink-faint/40 shadow-card p-6 text-center my-3">
        <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-2.5 border border-teal-100">
          <CheckSquare className="icon-scalable text-teal-600" style={{ width: '1.5em', height: '1.5em' }} strokeWidth={1.8} />
        </div>
        <div className="text-ink-DEFAULT font-bold text-fluid-body">Follow-Up Action Queue</div>
        <p className="text-ink-muted text-fluid-sm mt-1 max-w-xs mx-auto leading-relaxed">
          Actions and referrals automatically populate here upon voice visit registration.
        </p>
      </div>
    );
  }

  const actions = [];

  if (dangerFlags.length > 0) {
    actions.push({
      id: 'danger',
      icon: Phone,
      label: 'Call PHC Medical Officer — Urgent Danger Sign Referral',
      urgent: true,
    });
  }

  if (record.next_visit_date) {
    actions.push({
      id: 'visit',
      icon: CalendarCheck,
      label: `Schedule next home visit by ${record.next_visit_date}`,
      urgent: false,
    });
  }

  const vaccs = Array.isArray(record.vaccinations_due)
    ? record.vaccinations_due
    : record.vaccinations_due ? [record.vaccinations_due] : [];

  vaccs.forEach((v, i) => {
    actions.push({
      id: `vacc-${i}`,
      icon: Syringe,
      label: `Administer vaccination: ${v}`,
      urgent: false,
    });
  });

  if (actions.length === 0) return null;

  const toggleAction = (id) => {
    setCompleted(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const pendingCount = actions.filter(a => !completed[a.id]).length;

  return (
    <div className="w-full bg-white rounded-3xl border border-ink-faint/40 shadow-card overflow-hidden my-3 animate-slide-up">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-ink-faint/30 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2">
          <CheckSquare className="icon-scalable text-teal-700" style={{ width: '1.25em', height: '1.25em' }} strokeWidth={2.2} />
          <span className="font-bold text-ink-DEFAULT text-fluid-body">Action Checklist</span>
        </div>
        <span className="bg-teal-100 text-teal-800 text-xs font-bold px-2.5 py-1 rounded-full tabular">
          {pendingCount} Pending
        </span>
      </div>

      {/* List */}
      <ul className="p-3.5 sm:p-4 space-y-2.5">
        {actions.map(({ id, icon: Icon, label, urgent }) => {
          const isDone = !!completed[id];
          return (
            <li
              key={id}
              onClick={() => toggleAction(id)}
              style={{ touchAction: 'manipulation' }}
              className={`
                touch-target w-full flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer select-none
                transition-all duration-200 ease-spring
                ${isDone
                  ? 'bg-slate-100/80 border-slate-200 text-slate-400 opacity-70'
                  : urgent
                    ? 'bg-crimson-50 border-crimson-200 text-crimson-900 hover:bg-crimson-100/70 shadow-xs'
                    : 'bg-slate-50/80 border-ink-faint/40 text-ink-DEFAULT hover:bg-white shadow-xs'
                }
              `}
            >
              <div className="flex-shrink-0">
                {isDone ? (
                  <CheckSquare className="icon-scalable text-emerald-600" style={{ width: '1.25em', height: '1.25em' }} strokeWidth={2.5} />
                ) : (
                  <Square className={`icon-scalable ${urgent ? 'text-crimson-600' : 'text-slate-400'}`} style={{ width: '1.25em', height: '1.25em' }} strokeWidth={2} />
                )}
              </div>

              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <Icon
                  className={`icon-scalable flex-shrink-0 ${isDone ? 'text-slate-400' : urgent ? 'text-crimson-600' : 'text-teal-600'}`}
                  style={{ width: '1.25em', height: '1.25em' }}
                  strokeWidth={2}
                />
                <span className={`text-fluid-sm font-semibold leading-snug break-words ${isDone ? 'line-through text-slate-400' : ''}`}>
                  {label}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
