import React, { useState, useEffect } from 'react';
import { Activity, MapPin, Search, Calendar, Video, FileText, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Profile from './Profile';
import './Dashboard.css';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [cases, setCases] = useState([]);
  const [personalCases, setPersonalCases] = useState([]);
  const [activeVetTab, setActiveVetTab] = useState('');
  const [selectedImageOverlay, setSelectedImageOverlay] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    Promise.all([
      fetch('http://localhost:3000/api/me', { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json()),
      fetch('http://localhost:3000/api/cases', { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json())
    ])
      .then(([userData, casesData]) => {
        if (userData.error) throw new Error(userData.error);
        setUser(userData);
        if (!casesData.error && Array.isArray(casesData)) {
          setCases(casesData);
        }
        if (userData && (userData.user_type === 'ngo' || userData.user_type === 'vet')) {
          fetch('http://localhost:3000/api/personal-cases', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(res => res.json())
            .then(pc => { if (Array.isArray(pc)) setPersonalCases(pc); })
            .catch(err => console.error(err));
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        localStorage.removeItem('token');
        navigate('/login');
      });
  }, [navigate]);

  const filteredCases = cases.filter(c =>
    c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDeleteCase = async (caseId, type) => {
    if (window.confirm(`Are you sure you want to permanently hide Case ${caseId} from your local dashboard?`)) {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:3000/api/cases/${caseId}?type=${type}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          if (type === 'personal') {
            setPersonalCases(prev => prev.filter(c => c.id !== caseId));
            if (user && user.user_type === 'normal') {
              setCases(prev => prev.filter(c => c.id !== caseId));
            }
          } else {
            setCases(prev => prev.filter(c => c.id !== caseId));
          }
        } else {
          alert("Delete failed.");
        }
      } catch (err) { console.error(err); }
    }
  };

  const handleStatusChange = async (caseId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/cases/${caseId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setCases(prev => prev.map(c => c.id === caseId ? { ...c, status: newStatus } : c));
      } else {
        alert('Failed to update status.');
      }
    } catch (err) { console.error(err); }
  };

  const renderSearchBar = () => (
    <div style={{ position: 'relative', minWidth: '300px' }}>
      <div className="search-bar flex-center" style={{
        background: 'white', borderRadius: '100px', border: '2px solid #2d2a3e',
        boxShadow: '4px 4px 0px #2d2a3e', width: '100%', height: '48px', padding: '0 1rem'
      }}>
        <Search size={20} className="text-muted" />
        <input
          type="text" placeholder="Search case ID or owner..." value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(e.target.value.length > 0); }}
          onFocus={(e) => { if (e.target.value.length > 0) setShowDropdown(true); }}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          style={{ background: 'transparent', border: 'none', width: '100%', padding: '0.5rem', outline: 'none', fontWeight: 'bold' }}
        />
      </div>
      {showDropdown && searchTerm && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '10px',
          background: 'white', borderRadius: '1rem', border: '2px solid #2d2a3e',
          boxShadow: '4px 4px 0px rgba(45,42,62,0.2)', zIndex: 100, overflow: 'hidden'
        }}>
          {filteredCases.length > 0 ? filteredCases.map((c, idx) => (
            <div key={idx} style={{
              padding: '1rem', borderBottom: idx !== filteredCases.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
              cursor: 'pointer', transition: 'background 0.2s ease', color: 'black', fontSize: '0.9rem', fontWeight: 'bold'
            }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              onMouseDown={(e) => { e.preventDefault(); setSearchTerm(''); setSelectedResult(c); setShowDropdown(false); }}>
              <Search size={14} style={{ marginRight: '8px', color: 'var(--text-muted)', display: 'inline-block' }} />
              {c.name} - Case {c.id}
            </div>
          )) : (<div style={{ padding: '1rem', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>No related titles found</div>)}
        </div>
      )}
    </div>
  );

  const renderStatusBadge = (status) => {
    const isRescued = status === 'Rescued' || status === 'Resolved' || status === 'Treated' || status === 'Adopted';
    const bgColor = isRescued ? 'bg-success' : 'bg-warning';
    const textColor = isRescued ? 'white' : 'black';
    return (
      <span className={`badge ${bgColor}`} style={{ color: textColor, padding: '0.2rem 0.5rem', display: 'inline-block', marginTop: '0.2rem' }}>
        {status}
      </span>
    );
  };

  const renderGPSTracker = () => (
    <div className="glass-card map-card" style={{ padding: '1.5rem', transition: 'all 0.3s ease' }}>
      <div className="flex-between mb-sm">
        <h3 style={{ fontSize: '1.2rem', color: 'black' }}>Active Local Connect</h3>
        <div className="badge pulse-badge" style={{ background: 'rgba(255,0,0,0.1)', color: 'red', border: '1px solid red' }}>Live</div>
      </div>
      <p className="text-muted text-sm mb-md">Interactive OpenStreetMap bounding distressed local animals.</p>
      <div className="flex-center flex-column" style={{ height: '350px', borderRadius: '1rem', background: '#e5e3df', position: 'relative', overflow: 'hidden', border: '2px solid rgba(0,0,0,0.1)' }}>
        <iframe width="100%" height="100%" frameBorder="0" scrolling="no" marginHeight="0" marginWidth="0" src="https://www.openstreetmap.org/export/embed.html?bbox=72.7%2C18.9%2C73.1%2C19.2&amp;layer=mapnik&amp;marker=19.076%2C72.877" style={{ border: 'none' }}></iframe>
      </div>
    </div>
  );

  const renderSelectedCaseNGO = () => selectedResult && (
    <div className="glass-card animate-fade-in mb-md" style={{ background: 'white', borderLeft: '6px solid var(--primary-color)', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
      <div className="flex-between mb-sm">
        <div>
          <h3 className="text-muted" style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.2rem' }}>Selected Case Profile</h3>
          <p style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'black' }}>{selectedResult.id}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setSelectedResult(null)}>Clear Result</Button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', color: 'black' }}>
        <div><strong className="text-muted">Name:</strong><br />{selectedResult.name}</div>
        <div><strong className="text-muted">Contact:</strong><br />{selectedResult.contact}</div>
        <div><strong className="text-muted">Location:</strong><br />{selectedResult.loc}</div>
        <div><strong className="text-muted">Diagnosis:</strong><br />{selectedResult.diagnosis || 'N/A'} ({(selectedResult.confidence * 100 || 0).toFixed(1)}%)</div>
        <div><strong className="text-muted">Date:</strong><br />{selectedResult.date}</div>
        <div><strong className="text-muted">Status:</strong><br />{renderStatusBadge(selectedResult.status)}</div>
      </div>
    </div>
  );

  const renderDataTableNGO = () => (
    <div className="glass-card cases-list" style={{ height: '100%', padding: '2.5rem', overflowX: 'auto' }}>
      <h3 className="mb-md" style={{ color: 'black', fontSize: '1.4rem' }}>Cases Reported</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '1rem', color: 'black', minWidth: '950px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.1)' }}>
            <th style={{ paddingBottom: '1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Case ID</th>
            <th style={{ paddingBottom: '1rem', color: 'var(--text-muted)' }}>Name</th>
            <th style={{ paddingBottom: '1rem', color: 'var(--text-muted)' }}>Contact No</th>
            <th style={{ paddingBottom: '1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Location</th>
            <th style={{ paddingBottom: '1rem', color: 'var(--text-muted)' }}>Diagnosis</th>
            <th style={{ paddingBottom: '1rem', color: 'var(--text-muted)' }}>Date - Time</th>
            <th style={{ paddingBottom: '1rem', color: 'var(--text-muted)' }}>Status</th>
            <th style={{ paddingBottom: '1rem', color: 'var(--text-muted)', textAlign: 'center' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {cases.length === 0 ? <tr><td colSpan="8" style={{ padding: '2rem', textAlign: 'center' }}>No cases reported yet.</td></tr> : cases.map((caseItem, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', transition: 'background 0.2s ease' }}>
              <td style={{ padding: '1.2rem 0', fontWeight: 'bold' }}>{caseItem.id}</td>
              <td style={{ padding: '1.2rem 0' }}>{caseItem.name}</td>
              <td style={{ padding: '1.2rem 0' }}>{caseItem.contact}</td>
              <td style={{ padding: '1.2rem 0' }}>{caseItem.loc}</td>
              <td style={{ padding: '1.2rem 0', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setSelectedImageOverlay(caseItem.imgUrl || caseItem.img)}>
                <span className="text-primary">{caseItem.diagnosis || 'Unknown'}</span> <br />
                <span className="text-muted" style={{ fontSize: '0.8rem' }}>{caseItem.confidence ? (caseItem.confidence * 100).toFixed(1) + '%' : ''}</span>
              </td>
              <td style={{ padding: '1.2rem 0', whiteSpace: 'nowrap' }}>{caseItem.date}</td>
              <td style={{ padding: '1.2rem 0' }}>
                <select
                  value={caseItem.status}
                  onChange={(e) => handleStatusChange(caseItem.id, e.target.value)}
                  style={{ padding: '0.4rem', borderRadius: '0.4rem', border: '1px solid #ccc', outline: 'none', background: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  <option value="Pending">Pending</option>
                  <option value="Rescued">Rescued</option>
                  <option value="Treated">Treated</option>
                  <option value="Adopted">Adopted</option>
                  <option value="In Rehab">In Rehab</option>
                </select>
              </td>
              <td style={{ padding: '1.2rem 0', textAlign: 'center' }}>
                <button onClick={() => handleDeleteCase(caseItem.id, 'assigned')} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} title="Delete Case">
                  <Trash2 size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderStatusBadgeRefined = (status) => {
    const isPending = status === 'Pending';
    const bgColor = isPending ? '#ffeaa7' : status === 'Rescued' ? '#55efc4' : '#dfe6e9';
    return (
      <span style={{
        background: bgColor, color: 'black', border: '2px solid #1E1B2E',
        borderRadius: '20px', padding: '4px 14px', fontWeight: 'bold',
        display: 'inline-block', fontSize: '0.9rem', boxShadow: '0 4px 15px rgba(255, 234, 167, 0.4)'
      }}>
        {status}
      </span>
    );
  };

  const renderDataTablePersonal = () => (
    <div className="animate-fade-in mt-xl" style={{ border: '3px solid #1E1B2E', borderRadius: '20px', padding: '2.5rem', background: 'white', overflowX: 'auto', marginBottom: '2rem' }}>
      <h3 className="mb-md" style={{ color: 'black', fontSize: '1.6rem', fontWeight: '900', letterSpacing: '-0.5px' }}>Personal Cases Reported</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '1.5rem', minWidth: '750px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.08)' }}>
            <th style={{ paddingBottom: '1rem', color: '#A09DB0', fontWeight: '700', fontSize: '1.05rem', whiteSpace: 'nowrap' }}>Case ID</th>
            <th style={{ paddingBottom: '1rem', color: '#A09DB0', fontWeight: '700', fontSize: '1.05rem' }}>Reported To</th>
            <th style={{ paddingBottom: '1rem', color: '#A09DB0', fontWeight: '700', fontSize: '1.05rem', whiteSpace: 'nowrap' }}>Date</th>
            <th style={{ paddingBottom: '1rem', color: '#A09DB0', fontWeight: '700', fontSize: '1.05rem' }}>Status</th>
            <th style={{ paddingBottom: '1rem', color: '#A09DB0', fontWeight: '700', fontSize: '1.05rem', textAlign: 'center' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {personalCases.length === 0 ? <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#A09DB0', fontWeight: 'bold' }}>No personal cases logged.</td></tr> : personalCases.map((caseItem, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', transition: 'background 0.2s ease' }}>
              <td style={{ padding: '1.5rem 0', fontWeight: 'bold', color: '#1E1B2E', fontSize: '1.1rem', cursor: 'pointer' }} onClick={() => setSelectedImageOverlay(caseItem.imgUrl || caseItem.img)}>{caseItem.id}</td>
              <td style={{ padding: '1.5rem 0', fontWeight: '600', color: '#1E1B2E', fontSize: '1.1rem' }}>{caseItem.reportedTo}</td>
              <td style={{ padding: '1.5rem 0', color: '#1E1B2E', fontSize: '1.1rem', whiteSpace: 'nowrap' }}>{caseItem.date.split(' ')[0]}</td>
              <td style={{ padding: '1.5rem 0' }}>{renderStatusBadgeRefined(caseItem.status)}</td>
              <td style={{ padding: '1.5rem 0', textAlign: 'center' }}>
                <button onClick={() => handleDeleteCase(caseItem.id, 'personal')} style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer' }} title="Delete Case">
                  <Trash2 size={20} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderImageModal = () => selectedImageOverlay && (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }} onClick={() => setSelectedImageOverlay(null)}>
      <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
        <button onClick={() => setSelectedImageOverlay(null)} style={{ position: 'absolute', top: '-15px', right: '-15px', background: 'white', color: 'black', border: 'none', borderRadius: '50%', width: '35px', height: '35px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>×</button>
        <img src={selectedImageOverlay?.startsWith('http') || selectedImageOverlay?.startsWith('data:') ? selectedImageOverlay : `http://localhost:3000/uploads/${selectedImageOverlay}`} alt="Case Evidence" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '1rem', objectFit: 'contain', border: '4px solid white' }} />
      </div>
    </div>
  );

  if (loading) return <div className="container flex-center" style={{ minHeight: '60vh' }}><h2 style={{ color: 'black' }}>Loading...</h2></div>;

  if (user.user_type === 'ngo') {
    return (
      <div className="dashboard-container container animate-fade-in" style={{ paddingTop: '6rem', maxWidth: '1400px' }}>
        {renderImageModal()}
        <div className="dashboard-header flex-between mb-lg">
          <div><h1 className="section-title">NGO Dashboard</h1><p>Manage your field rescues, coordinate volunteers, and track daily metrics.</p></div>
          {renderSearchBar()}
        </div>
        <div className="grid-cols-2 dashboard-grid" style={{ gridTemplateColumns: 'minmax(300px, 1fr) 2.5fr', gap: '2rem' }}>
          <div className="flex-column gap-lg">
            {renderGPSTracker()}
            <div className="glass-card chart-card" style={{ padding: '1.5rem' }}>
              <h3 className="mb-sm" style={{ fontSize: '1.2rem', color: 'black' }}>Weekly Rescues</h3>
              <p className="text-muted text-sm mb-md">Animals safely rescued over the last 7 days.</p>
              <div style={{ height: '220px', display: 'flex', alignItems: 'flex-end', gap: '8px', paddingBottom: '25px', position: 'relative', borderBottom: '2px solid rgba(0,0,0,0.05)' }}>
                {[{ day: 'Mon', count: 4, h: '33%' }, { day: 'Tue', count: 7, h: '58%' }, { day: 'Wed', count: 2, h: '16%' }, { day: 'Thu', count: 5, h: '41%' }, { day: 'Fri', count: 9, h: '75%' }, { day: 'Sat', count: 12, h: '100%' }, { day: 'Sun', count: 6, h: '50%' }].map((bar, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--primary-color)', marginBottom: '6px' }}>{bar.count}</span>
                    <div style={{ width: '75%', height: bar.h, background: 'linear-gradient(180deg, var(--primary-color) 0%, rgba(135,206,250,0.2) 100%)', borderRadius: '6px 6px 0 0', border: '1px solid rgba(0,0,0,0.05)', borderBottom: 'none' }}></div>
                    <span style={{ position: 'absolute', bottom: '-24px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '500' }}>{bar.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex-column gap-lg">
            {renderSelectedCaseNGO()}
            {renderDataTableNGO()}
            {renderDataTablePersonal()}
          </div>
        </div>
      </div>
    );
  }

  if (user.user_type === 'vet') {
    return (
      <div className="dashboard-container container animate-fade-in" style={{ paddingTop: '6rem', maxWidth: '1400px' }}>
        {renderImageModal()}
        <div className="dashboard-header flex-between mb-xl">
          <div><h1 className="section-title">Veterinary Dashboard</h1><p>Real-time case monitoring and medical history tracking.</p></div>
          {renderSearchBar()}
        </div>
        <div className="grid-cols-2 dashboard-grid" style={{ gridTemplateColumns: '2.5fr minmax(300px, 1fr)', gap: '2rem' }}>
          <div className="flex-column gap-lg">
            {renderSelectedCaseNGO()}
            {renderDataTableNGO()}
            {renderDataTablePersonal()}
          </div>
          <div className="flex-column gap-lg">
            <div className="glass-card action-card" style={{ padding: '1.5rem' }}>
              <h3>Workflow Hub</h3>
              <div className="action-grid mt-md mb-lg" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <button className="action-btn" onClick={() => setActiveVetTab(activeVetTab === 'records' ? '' : 'records')} style={{ background: activeVetTab === 'records' ? 'rgba(0,0,0,0.05)' : 'white' }}>
                  <FileText size={24} className="text-secondary mb-xs" /><span>Medical Records</span>
                </button>
                <button className="action-btn" onClick={() => setActiveVetTab(activeVetTab === 'appointments' ? '' : 'appointments')} style={{ background: activeVetTab === 'appointments' ? 'rgba(0,0,0,0.05)' : 'white' }}>
                  <Calendar size={24} className="text-success mb-xs" /><span>Appointments</span>
                </button>
              </div>
              <div className="dummy-data-box mt-md">
                {activeVetTab === 'records' && (<> <h4 className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Recent Medical Records</h4> <div className="animate-fade-in" style={{ background: 'rgba(0,0,0,0.02)', padding: '0.8rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.85rem', color: 'black' }}> <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}><span><strong>AP-0502-01</strong> - Rex</span><span className="text-success">Cleared</span></div> <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}><span><strong>AP-1102-4A</strong> - Bella</span><span className="text-warning">Pending Lab</span></div> <div style={{ display: 'flex', justifyContent: 'space-between' }}><span><strong>AP-0803-9B</strong> - Max</span><span className="text-danger">Surgery Prep</span></div> </div> </>)}
                {activeVetTab === 'appointments' && (<> <h4 className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Today's Appointments</h4> <div className="animate-fade-in" style={{ background: 'rgba(0,0,0,0.02)', padding: '0.8rem', borderRadius: '0.5rem', fontSize: '0.85rem', color: 'black' }}> <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}><span className="text-primary" style={{ fontWeight: 'bold' }}>10:00 AM</span><span>General Checkup</span></div> <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}><span className="text-primary" style={{ fontWeight: 'bold' }}>01:30 PM</span><span>ER Operation Room</span></div> <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="text-primary" style={{ fontWeight: 'bold' }}>03:45 PM</span><span>Vaccination</span></div> </div> </>)}
              </div>
            </div>
            {renderGPSTracker()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container container animate-fade-in" style={{ paddingTop: '6rem', maxWidth: '1400px' }}>
      {renderImageModal()}
      <div className="dashboard-header flex-between mb-lg">
        <div><h1 className="section-title">Dashboard</h1><p>Real-time case monitoring and status tracking.</p></div>
        {renderSearchBar()}
      </div>

      <div className="grid-cols-2 dashboard-grid" style={{ gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
        <div className="flex-column gap-lg">
          {selectedResult && (
            <div className="glass-card animate-fade-in mb-md" style={{ background: 'white', borderLeft: '6px solid var(--primary-color)', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <div className="flex-between mb-sm">
                <div>
                  <h3 className="text-muted" style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.2rem' }}>Selected Case Profile</h3>
                  <p style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'black' }}>{selectedResult.id}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedResult(null)}>Clear Result</Button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', color: 'black' }}>
                <div><strong className="text-muted">Name:</strong><br />{selectedResult.name}</div>
                <div><strong className="text-muted">Location:</strong><br />{selectedResult.loc}</div>
                <div><strong className="text-muted">Reported To:</strong><br />{selectedResult.reportedTo}</div>
                <div><strong className="text-muted">Date & Time:</strong><br />{selectedResult.date}</div>
                <div><strong className="text-muted">Status:</strong><br />{renderStatusBadge(selectedResult.status)}</div>
              </div>
            </div>
          )}
          <div className="glass-card cases-list" style={{ height: '100%', padding: '2.5rem', overflowX: 'auto' }}>
            <h3 className="mb-md" style={{ color: 'black', fontSize: '1.4rem' }}>Cases Reported</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '1rem', color: 'black', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.1)' }}>
                  <th style={{ paddingBottom: '1rem', color: 'var(--text-muted)' }}>Case ID</th>
                  <th style={{ paddingBottom: '1rem', color: 'var(--text-muted)' }}>Contact No</th>
                  <th style={{ paddingBottom: '1rem', color: 'var(--text-muted)' }}>Reported To</th>
                  <th style={{ paddingBottom: '1rem', color: 'var(--text-muted)' }}>Diagnosis</th>
                  <th style={{ paddingBottom: '1rem', color: 'var(--text-muted)' }}>Date</th>
                  <th style={{ paddingBottom: '1rem', color: 'var(--text-muted)' }}>Status</th>
                  <th style={{ paddingBottom: '1rem', color: 'var(--text-muted)', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {cases.length === 0 ? <tr><td colSpan="7" style={{ padding: '2rem', textAlign: 'center' }}>No cases submitted yet.</td></tr> : cases.map((caseItem, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <td style={{ padding: '1.2rem 0', fontWeight: '500' }}>{caseItem.id}</td>
                    <td style={{ padding: '1.2rem 0' }}>{caseItem.contact || 'N/A'}</td>
                    <td style={{ padding: '1.2rem 0' }}>{caseItem.reportedTo}</td>
                    <td style={{ padding: '1.2rem 0' }} onClick={() => setSelectedImageOverlay(caseItem.imgUrl || caseItem.img)} style={{ cursor: 'pointer' }}>
                      <span className="text-primary">{caseItem.diagnosis || 'Unknown'}</span>
                    </td>
                    <td style={{ padding: '1.2rem 0' }}>{caseItem.date?.split(' ')[0]}</td>
                    <td style={{ padding: '1.2rem 0' }}>{renderStatusBadge(caseItem.status === 'Pending Rescue' ? 'Pending' : caseItem.status)}</td>
                    <td style={{ padding: '1.2rem 0', textAlign: 'center' }}>
                      <button onClick={() => handleDeleteCase(caseItem.id, 'personal')} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} title="Delete Case">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex-column gap-lg">
          <Profile embedded={true} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
