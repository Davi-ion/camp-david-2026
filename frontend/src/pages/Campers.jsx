import { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { usePermissions } from '../hooks/usePermissions';
import { GROUPS } from '../data/campers';
import TopBar from '../components/TopBar';
import EmptyState from '../components/EmptyState';

function getInitials(name) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function Campers() {
  const { state, dispatch } = useApp();
  const { canEdit } = usePermissions();
  const user = state.currentUser;

  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileRef = useRef();

  // Filter campers
  const filteredCampers = useMemo(() => {
    let list = state.campers;

    // Role filter
    if (user?.role !== 'admin') {
      list = list.filter((c) => c.group === user?.group);
    } else if (groupFilter !== 'all') {
      list = list.filter((c) => c.group === groupFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }

    return list;
  }, [state.campers, user, groupFilter, search]);

  // Group campers
  const groupedCampers = useMemo(() => {
    const groups = {};
    filteredCampers.forEach((c) => {
      if (!groups[c.group]) groups[c.group] = [];
      groups[c.group].push(c);
    });
    return groups;
  }, [filteredCampers]);

  // CSV Import
  const handleCSVImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        const lines = text.split('\n').filter((l) => l.trim());
        if (lines.length < 2) {
          setImportResult({ success: false, message: 'CSV file appears empty' });
          return;
        }

        // Skip header row
        const newCampers = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
          if (cols.length < 3) continue;

          const [name, group, age, medicalNotes = '', emergencyContact = ''] = cols;
          const groupId = group.toLowerCase();

          if (!GROUPS.find((g) => g.id === groupId)) continue;

          const contactParts = emergencyContact.split('/').map((p) => p.trim());
          newCampers.push({
            id: `c-imp-${Date.now()}-${i}`,
            name,
            group: groupId,
            age: parseInt(age) || 0,
            medicalNotes: medicalNotes || '',
            emergencyContact: {
              name: contactParts[0] || '',
              phone: contactParts[1] || '',
            },
          });
        }

        if (newCampers.length > 0) {
          dispatch({ type: 'ADD_CAMPERS', payload: newCampers });
          setImportResult({ success: true, message: `Successfully imported ${newCampers.length} campers` });
        } else {
          setImportResult({ success: false, message: 'No valid campers found in file' });
        }
      } catch (err) {
        setImportResult({ success: false, message: 'Error parsing CSV file' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="page page-with-topbar">
      <TopBar title="Campers" />
      <div className="container" style={{ paddingTop: 16 }}>
        {/* Search */}
        <div className="search-bar">
          <span className="search-bar-icon">🔍</span>
          <input
            type="text"
            placeholder="Search campers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Group Filter (Admin) */}
        {canEdit && (
          <div className="filter-tabs" style={{ marginTop: 12 }}>
            <button
              className={`filter-tab ${groupFilter === 'all' ? 'active' : ''}`}
              onClick={() => setGroupFilter('all')}
            >
              All ({state.campers.length})
            </button>
            {GROUPS.map((g) => {
              const count = state.campers.filter((c) => c.group === g.id).length;
              return (
                <button
                  key={g.id}
                  className={`filter-tab ${groupFilter === g.id ? 'active' : ''}`}
                  onClick={() => setGroupFilter(g.id)}
                >
                  {g.emoji} {g.name} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* CSV Import (Admin only) */}
        {canEdit && (
          <div style={{ marginTop: 14 }}>
            <button
              className="btn btn-sm btn-outline btn-full"
              onClick={() => setShowImport(!showImport)}
            >
              📥 Import Campers from CSV
            </button>

            {showImport && (
              <div className="card" style={{ marginTop: 10, animation: 'fadeInUp 0.3s ease' }}>
                <p className="text-sm text-muted" style={{ marginBottom: 10 }}>
                  CSV columns: Name, Group, Age, Medical Notes, Emergency Contact (Name / Phone)
                </p>
                <div
                  className="import-area"
                  onClick={() => fileRef.current?.click()}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>📄</div>
                  <p className="text-sm font-medium">Click to select CSV file</p>
                </div>
                <input
                  type="file"
                  accept=".csv"
                  ref={fileRef}
                  style={{ display: 'none' }}
                  onChange={handleCSVImport}
                />
                {importResult && (
                  <p style={{
                    marginTop: 10,
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    color: importResult.success ? 'var(--teal)' : 'var(--red)',
                  }}>
                    {importResult.message}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Camper count */}
        <p className="text-sm text-muted" style={{ marginTop: 16, marginBottom: 8 }}>
          {filteredCampers.length} camper{filteredCampers.length !== 1 ? 's' : ''}
        </p>

        {/* Camper List */}
        {filteredCampers.length === 0 ? (
          <EmptyState 
            icon="👥"
            title="No campers found"
            description="Try adjusting your search or filters."
          />
        ) : (
          Object.entries(groupedCampers).map(([groupId, camperList]) => {
            const group = GROUPS.find((g) => g.id === groupId);
            return (
              <div key={groupId}>
                <div className="group-header">
                  {group?.emoji} {group?.name || groupId}
                </div>
                {camperList.map((camper) => {
                  const isExpanded = expandedId === camper.id;
                  return (
                    <div key={camper.id}>
                      <div
                        className="camper-row"
                        onClick={() => setExpandedId(isExpanded ? null : camper.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="avatar avatar-sm">{getInitials(camper.name)}</div>
                        <div className="camper-info">
                          <div className="camper-name">
                            {camper.name}
                            {camper.medicalNotes && <span className="medical-flag">⚕</span>}
                          </div>
                          <div className="camper-meta">
                            Age {camper.age} · {group?.emoji} {group?.name}
                          </div>
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>
                          ▼
                        </span>
                      </div>

                      {/* Expanded Profile */}
                      <div className={`camper-profile-expand ${isExpanded ? 'open' : ''}`}>
                        <div style={{ paddingLeft: 44, paddingRight: 8 }}>
                          {camper.medicalNotes && (
                            <div className="medical-block" style={{ marginBottom: 10 }}>
                              <strong>⚕ Medical Notes:</strong> {camper.medicalNotes}
                            </div>
                          )}
                          <div className="profile-detail">
                            <span className="profile-label">Age</span>
                            <span>{camper.age} years old</span>
                          </div>
                          <div className="profile-detail">
                            <span className="profile-label">Group</span>
                            <span>{group?.emoji} {group?.name}</span>
                          </div>
                          <div className="profile-detail">
                            <span className="profile-label">Emergency</span>
                            <span>
                              {camper.emergencyContact.name}
                              <br />
                              <a href={`tel:${camper.emergencyContact.phone}`} style={{ color: 'var(--teal)', fontWeight: 500 }}>
                                {camper.emergencyContact.phone}
                              </a>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
