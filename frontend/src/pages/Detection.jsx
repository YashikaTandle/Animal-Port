import React, { useState, useEffect } from 'react';
import { Upload, Activity, CheckCircle, AlertTriangle, ChevronRight } from 'lucide-react';
import Button from '../components/Button';
import './Detection.css';

const Detection = () => {
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contact, setContact] = useState('');
  const [location, setLocation] = useState('');
  const [email, setEmail] = useState('');
  
  // Verification logics
  const isContactLengthValid = contact.length === 10;
  const isContactStartValid = !/^[1-6]/.test(contact);
  const isContactValid = contact && isContactLengthValid && isContactStartValid;

  // Regex to validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailRegex.test(email);

  // GPS Filter States
  const [filterType, setFilterType] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [resultReady, setResultReady] = useState(false);
  const [file, setFile] = useState(null);
  const [uploadedFilename, setUploadedFilename] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [forwarding, setForwarding] = useState(false);
  const [forwardSuccess, setForwardSuccess] = useState(false);
  const [userType, setUserType] = useState('guest');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('http://localhost:3000/api/me', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => { if (!data.error && data.user_type) setUserType(data.user_type); else setUserType('guest'); })
        .catch(err => { console.error(err); setUserType('guest'); });
    } else {
        setUserType('guest');
    }
  }, []);

  const handleFilterClick = async (type) => {
    // Toggle off if clicking the same filter
    if (filterType === type) {
      setFilterType(null);
      setSearchResults([]);
      return;
    }
    
    setFilterType(type);
    setSearchResults([]);
    
    if (!location.trim()) {
      alert("Please specify your current Location in the text box above before searching!");
      setFilterType(null);
      return;
    }

    setIsSearching(true);
    try {
      // 1. Fetch Local Partners
      const localRes = await fetch(`http://localhost:3000/api/providers?type=${type}&location=${encodeURIComponent(location)}`);
      const localData = await localRes.json();
      const mappedLocal = Array.isArray(localData) ? localData.map(user => ({
         name: user.username,
         display_name: `${user.location} (Local Partner)`,
         isLocal: true
      })) : [];

      // 2. Fetch OpenStreetMap
      const query = type === 'VET' ? `veterinary in ${location}` : `animal shelter in ${location}`;
      const osmRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=4`);
      const osmData = await osmRes.json();
      const mappedOsm = Array.isArray(osmData) ? osmData.map(item => ({
         name: item.name || item.display_name.split(',')[0],
         display_name: item.display_name,
         isLocal: false
      })) : [];

      setSearchResults([...mappedLocal, ...mappedOsm]);
    } catch (err) {
      console.error('Error fetching dynamic locations:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmitCase = async () => {
    if (!firstName || !lastName || !isContactValid || !isEmailValid || !location) {
        return; // Button is disabled anyway, but keeping a fallback return
    }
    const name = `${firstName.trim()} ${lastName.trim()}`.trim();
    setForwarding(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3000/api/submit-case', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({
          name, contact, location, email,
          image: uploadedFilename || (file ? file.name : ''),
          reportedToType: selectedProvider ? selectedProvider.type : 'NGO',
          reportedToName: selectedProvider ? selectedProvider.name : '',
          diagnosis: analysisResult?.patternMatched || 'Unknown',
          confidence: analysisResult?.confidence || 0
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForwardSuccess(true);
    } catch (err) {
      console.error(err);
      alert('Error submitting case: ' + err.message);
    } finally {
      setForwarding(false);
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    
    try {
      const formData = new FormData();
      if (file) {
        formData.append('image', file);
      }
      
      const res = await fetch('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to analyze');
      
      setUploadedFilename(data.filename);
      setAnalysisResult(data);
      setStep(3);
      setResultReady(true);
    } catch (err) {
      console.error(err);
      alert('Error analyzing image: ' + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="detection-container container animate-fade-in">
      <div className="page-header text-center">
        <div className="badge">Hybrid Detection Engine</div>
        <h1 className="section-title text-gradient">AI Disease Diagnosis</h1>
      </div>

      <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '1.2rem' }}>
        Steps to be followed:
      </div>
      <div className="stepper glass-panel flex-between">
        <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Upload Image</div>
        <ChevronRight className="step-arrow" />
        <div className={`step ${step >= 3 ? 'active' : ''}`}>
           2. AI Result
        </div>
      </div>

      <div className="detection-content">
        {step === 1 && (
          <div className="glass-card upload-section animate-slide-up">
            
            {/* Input fields at the top */}
            <div className="input-group" style={{display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap'}}>
              <input type="text" placeholder="User First Name" value={firstName} onChange={e => {
                  if (/^[a-zA-Z\s]*$/.test(e.target.value)) setFirstName(e.target.value);
              }} style={{flex: 1, minWidth: '150px', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', outline: 'none'}} />
              <input type="text" placeholder="User Last Name" value={lastName} onChange={e => {
                  if (/^[a-zA-Z\s]*$/.test(e.target.value)) setLastName(e.target.value);
              }} style={{flex: 1, minWidth: '150px', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', outline: 'none'}} />
              <div style={{ position: 'relative', flex: 1, minWidth: '150px' }}>
                <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} style={{width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: (email && !isEmailValid) ? '1px solid red' : '1px solid var(--surface-border)', outline: 'none', boxSizing: 'border-box'}} />
                {email && !isEmailValid && <span style={{ position: 'absolute', bottom: '-1.2rem', left: '0.2rem', color: 'red', fontSize: '0.8rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Warning: Email is not proper and verified!</span>}
              </div>
              <div style={{ position: 'relative', flex: 1, minWidth: '150px' }}>
                <input type="text" placeholder="Contact Number" value={contact} onChange={e => {
                    const val = e.target.value;
                    if (/^\d*$/.test(val) && val.length <= 10) setContact(val);
                }} style={{width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: (contact && !isContactValid) ? '1px solid red' : '1px solid var(--surface-border)', outline: 'none', boxSizing: 'border-box'}} />
                
                {contact && !isContactStartValid && <span style={{ position: 'absolute', bottom: '-1.2rem', left: '0.2rem', color: 'red', fontSize: '0.8rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Warning: Contact cannot start with 1-6!</span>}
                {contact && isContactStartValid && !isContactLengthValid && <span style={{ position: 'absolute', bottom: '-1.2rem', left: '0.2rem', color: 'red', fontSize: '0.8rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Warning: Exactly 10 digits required!</span>}
              </div>
              <input type="text" placeholder="Location (e.g. New York)" value={location} onChange={e => setLocation(e.target.value)} style={{flex: 1, minWidth: '150px', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', outline: 'none'}} />
            </div>

            {/* GPS Filter Section */}
            <div className="filter-section" style={{marginBottom: '2rem'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem'}}>
                <span style={{fontWeight: 'bold', minWidth: '50px'}}>Filter:</span>
                <Button 
                   variant={filterType === 'NGO' ? 'primary' : 'outline'} 
                   onClick={() => handleFilterClick('NGO')}
                   style={{borderRadius: '2rem', padding: '0.5rem 2rem', fontWeight: 'bold'}}
                >
                  NGO
                </Button>
                <Button 
                   variant={filterType === 'VET' ? 'primary' : 'outline'} 
                   onClick={() => handleFilterClick('VET')}
                   style={{borderRadius: '2rem', padding: '0.5rem 2rem', fontWeight: 'bold'}}
                >
                  VET
                </Button>
                
                {selectedProvider && (
                  <div className="badge bg-success" style={{marginLeft: 'auto', padding: '0.6rem 1rem', fontSize: '0.9rem'}}>
                    {selectedProvider.type}: <span style={{fontWeight: 'normal'}}>{selectedProvider.name}</span>
                  </div>
                )}
              </div>

              {/* Dynamic Results List */}
              {filterType && (
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1.5rem'}}>
                  {isSearching ? (
                    <div className="flex-center p-md"><Activity className="spin text-muted" /></div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((item, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => {
                           setSelectedProvider({
                             type: filterType === 'NGO' ? 'NGO' : 'Vet', 
                             name: item.name
                           });
                           setFilterType(null);
                           setSearchResults([]);
                        }}
                        style={{
                          padding: '1rem', 
                          background: 'rgba(255,255,255,0.8)', 
                          borderRadius: '1rem',
                          border: item.isLocal ? '2px solid var(--primary-color)' : '1px solid var(--surface-border)',
                          cursor: 'pointer',
                          boxShadow: 'inset 0 2px 4px rgba(255,255,255,1), 0 4px 12px rgba(0,0,0,0.05)',
                          transition: 'all 0.2s ease',
                          textAlign: 'center',
                          fontWeight: '500'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(255,255,255,1), 0 4px 12px rgba(0,0,0,0.05)'; }}
                      >
                        <div style={{fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.2rem', color: 'var(--text-main)'}}>
                          {item.name} {item.isLocal && <span className="badge" style={{background: 'var(--primary-color)', color: 'white', fontSize:'0.7rem', padding:'0.2rem 0.5rem', marginLeft:'0.5rem'}}>Verified Partner</span>}
                        </div>
                        <div style={{fontWeight: 'normal', color: 'var(--text-muted)', fontSize: '0.9rem'}}>Location: {item.display_name}</div>
                      </div>
                    ))
                  ) : (
                    <div style={{padding: '1rem', textAlign: 'center', color: 'var(--danger)', borderRadius: '1rem', background: 'rgba(255,0,0,0.05)'}}>
                      No {filterType} found in "{location}". Try a broader location.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="upload-box flex-center flex-column">
              <Upload size={48} className="text-secondary upload-icon" />
              <h3>Drag & Drop Animal Image</h3>
              <p>Supports JPEG, PNG</p>
              
              {(!firstName || !lastName || !isContactValid || !isEmailValid || !location) && (
                <div style={{ color: 'var(--warning)', margin: '1rem 0', fontWeight: 'bold', textAlign: 'center', background: 'rgba(255, 193, 7, 0.1)', padding: '0.5rem 1rem', borderRadius: '0.5rem' }}>
                  * Kindly fill the details above before uploading an image
                </div>
              )}

              <div className="flex-center gap-md mt-md" style={{ gap: '1rem', flexWrap: 'wrap' }}>
                <input 
                  type="file" 
                  id="animal-image-upload" 
                  style={{ display: 'none' }} 
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files[0])} 
                  disabled={!firstName || !lastName || !isContactValid || !isEmailValid || !location}
                />
                 <Button 
                   variant="outline" 
                   onClick={() => document.getElementById('animal-image-upload').click()}
                   disabled={!firstName || !lastName || !isContactValid || !isEmailValid || !location}
                 >
                  {file ? file.name.substring(0, 15) : 'Browse File'}
                </Button>
                
                 <Button 
                   onClick={handleAnalyze} 
                   disabled={!file || isAnalyzing || !firstName || !lastName || !isContactValid || !isEmailValid || !location}
                 >
                   {isAnalyzing ? 'Analyzing...' : 'Run AI Hybrid Analysis'}
                 </Button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && resultReady && (
          <div className="glass-card result-section animate-slide-up">
            <div className="result-header flex-center">
              <AlertTriangle size={32} className="text-warning" />
              <h2>Diagnosis: <span className="text-warning">Suspected {analysisResult?.patternMatched || 'Unknown'}</span></h2>
            </div>
            
            <div className="result-stats grid-cols-2 mt-md">
              <div className="stat-box">
                <span>Confidence Score</span>
                <h3>{analysisResult?.confidence ? (analysisResult.confidence * 100).toFixed(1) : '0'}%</h3>
                <div className="progress-bar"><div className="progress" style={{width: `${analysisResult?.confidence ? (analysisResult.confidence * 100) : 0}%`, background: 'var(--warning)'}}></div></div>
              </div>
              <div className="stat-box">
                <span>Severity Level</span>
                {(() => {
                  const d = analysisResult?.patternMatched?.toLowerCase() || '';
                  if (d === 'healthy') {
                    return <><h3 className="text-success">Low</h3><p>No isolation required. Animal is healthy.</p></>;
                  } else if (d === 'fungal_infections' || d === 'ringworm' || d === 'demodicosis') {
                    return <><h3 className="text-danger">High</h3><p>Highly contagious. Immediate isolation required.</p></>;
                  } else if (d === 'dermatitis' || d === 'hypersensitivity') {
                    return <><h3 className="text-warning">Moderate</h3><p>Treat locally and monitor condition closely.</p></>;
                  } else {
                    return <><h3 className="text-warning">Moderate</h3><p>Monitor condition closely.</p></>;
                  }
                })()}
              </div>
            </div>

            <div className="action-row flex-center mt-xl gap-md">
              <Button variant="outline" onClick={() => {
                  setStep(1);
                  setFile(null);
                  setUploadedFilename(null);
                  setAnalysisResult(null);
                  setForwardSuccess(false);
              }}>New Scan</Button>
              
              <Button 
                variant="primary"
                icon={<CheckCircle />} 
                onClick={handleSubmitCase}
                disabled={forwarding || forwardSuccess || !isContactValid || !isEmailValid || !firstName || !lastName || !location}
              >
                {forwardSuccess ? 'Submitted successfully!' : 
                  forwarding ? 'Submitting...' : 
                  `Submit Report to ${selectedProvider ? selectedProvider.name : 'Network'}`
                }
              </Button>
              
              {userType !== 'guest' && (
                  <Button 
                    variant="secondary"
                    onClick={() => window.location.href = '/dashboard'}
                  >
                    Forward to Dashboard
                  </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Detection;
