import { useState, useMemo } from 'react';

interface SkillMeta {
  slug: string;
  name: string;
  description: string;
  trustLevel: string;
  bins: string[];
  envRequired: string[];
  envOneOf: string[];
  egressDomains: string[];
  publisher: string;
}

interface Props {
  skills: SkillMeta[];
}

const trustBadge: Record<string, { label: string; color: string }> = {
  trusted: { label: 'Trusted', color: 'bg-green-900/50 text-green-400 border-green-700' },
  under_review: { label: 'Under Review', color: 'bg-yellow-900/50 text-yellow-400 border-yellow-700' },
  untrusted: { label: 'Untrusted', color: 'bg-red-900/50 text-red-400 border-red-700' },
  failed: { label: 'Failed', color: 'bg-red-900/50 text-red-400 border-red-700' },
};

type FilterValue = 'all' | 'trusted' | 'under_review';

export default function SkillBrowser(props: Props) {
  const skills = Array.isArray(props.skills) ? props.skills : [];
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterValue>('all');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return skills.filter((s) => {
      if (filter !== 'all' && s.trustLevel !== filter) return false;
      if (q && !s.name.toLowerCase().includes(q) && !s.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [skills, search, filter]);

  const filters: { value: FilterValue; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'trusted', label: 'Trusted' },
    { value: 'under_review', label: 'Under Review' },
  ];

  return (
    <div className="w-full">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#111827] border border-[#1F2937] rounded-[10px] text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#F97316] transition-colors text-sm"
          />
        </div>
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-[10px] text-sm font-medium transition-colors border ${
                filter === f.value
                  ? 'bg-[#F97316]/10 text-[#F97316] border-[#F97316]/30'
                  : 'bg-[#111827] text-gray-400 border-[#1F2937] hover:text-white hover:border-gray-500'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((skill) => {
            const badge = trustBadge[skill.trustLevel] || trustBadge.untrusted;
            return (
              <a
                key={skill.slug}
                href={`/hub/skills/${skill.slug}`}
                className="group block p-5 bg-[#111827] border border-[#1F2937] rounded-[16px] hover:border-gray-500 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="text-white font-bold text-lg group-hover:text-[#F97316] transition-colors">
                    {skill.name}
                  </h3>
                  <span
                    className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded-full border ${badge.color}`}
                  >
                    {badge.label}
                  </span>
                </div>
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                  {skill.description}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <code className="font-mono bg-[#0B0F1A] px-2 py-1 rounded">
                    forge skills add {skill.slug}
                  </code>
                  {skill.egressDomains.length > 0 && (
                    <span>{skill.egressDomains.length} egress domain{skill.egressDomains.length !== 1 ? 's' : ''}</span>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-[#111827] border border-[#1F2937] rounded-[16px]">
          <p className="text-gray-400 text-lg mb-2">No skills match your search</p>
          <p className="text-gray-500 text-sm">
            Try adjusting your search term or filter.
          </p>
        </div>
      )}
    </div>
  );
}
