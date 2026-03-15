import React, { useState, useEffect } from 'react';
import { profileApi } from '../lib/api';

// Avatar color options
// Core brand color
const BRAND_TEAL = '#1cbbbf';


// Avatar color options
const AVATAR_COLORS = [
  '#0EA5E9', // Sky blue
  '#F43F5E', // Rose
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Violet
  '#64748B'  // Slate
];

const calculateAge = (dob) => {
  if (!dob) return '';
  const diffMs = Date.now() - new Date(dob).getTime();
  const ageDt = new Date(diffMs); 
  return Math.abs(ageDt.getUTCFullYear() - 1970);
};

const FamilyProfileSelector = ({ onSelectProfile, user }) => {
  const STORAGE_KEY = `medisync_profiles_${user?.id || 'default'}`;
  
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProfileId, setEditProfileId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    gender: '',
    relation: 'Self',
    color: AVATAR_COLORS[0]
  });

  useEffect(() => {
    const fetchProfiles = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const response = await profileApi.getProfiles(user.id);
        const dbProfiles = response.data;
        
        if (dbProfiles && dbProfiles.length > 0) {
          setProfiles(dbProfiles);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(dbProfiles));
        } else {
          // Check localStorage for migration
          const storedProfiles = localStorage.getItem(STORAGE_KEY);
          if (storedProfiles) {
            const parsed = JSON.parse(storedProfiles);
            // Push local profiles to backend
            for (const p of parsed) {
              await profileApi.syncProfile({ 
                userId: user.id, 
                name: p.name, 
                relation: p.relation, 
                dob: p.dob, 
                gender: p.gender,
                color: p.color 
              });
            }
            const refreshed = await profileApi.getProfiles(user.id);
            setProfiles(refreshed.data);
          } else {
            // Default "Self" profile
            const initialData = {
              userId: user.id,
              name: user.name || 'Primary User',
              relation: 'Self',
              gender: '',
              color: AVATAR_COLORS[0],
              dob: ''
            };
            const res = await profileApi.syncProfile(initialData);
            setProfiles([{ ...res.data.profile, needsSetup: true }]);
          }
        }
      } catch (error) {
        console.error("MediSync: Failed to fetch profiles:", error);
        // Fallback to localStorage if offline
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) setProfiles(JSON.parse(stored));
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [user, STORAGE_KEY]);

  const handleProfileClick = (profile) => {
    if (profile.needsSetup || !profile.dob) {
      alert("Please complete your profile details first.");
      openModal(profile);
      return;
    }

    console.log("MediSync DEBUG: Profile selected:", profile);
    localStorage.setItem('activeProfile', JSON.stringify(profile));
    if (onSelectProfile) {
      onSelectProfile(profile);
    } else {
      console.log('Selected Profile:', profile);
      alert(`Proceeding as ${profile.name}`);
    }
  };

  const openModal = (profile = null) => {
    if (profile) {
      setEditProfileId(profile.id);
      setFormData({
        name: profile.name,
        dob: profile.dob || '',
        gender: profile.gender || '',
        relation: profile.relation,
        color: profile.color
      });
    } else {
      setEditProfileId(null);
      setFormData({
        name: '',
        dob: '',
        gender: '',
        relation: 'Spouse',
        color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    if (editProfileId && profiles.find(p => p.id === editProfileId)?.needsSetup) {
      alert("Please save your details to continue.");
      return;
    }
    setShowModal(false);
    setEditProfileId(null);
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.dob || !formData.gender) {
      alert('Please fill out all fields including Gender.');
      return;
    }

    try {
      setLoading(true);
      const res = await profileApi.syncProfile({
        userId: user.id,
        ...formData
      });
      
      const updatedProfile = res.data.profile;
      
      let updatedProfiles;
      if (editProfileId) {
        updatedProfiles = profiles.map(p => p.id === editProfileId ? updatedProfile : p);
      } else {
        updatedProfiles = [...profiles, updatedProfile];
      }

      setProfiles(updatedProfiles);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProfiles));
      setShowModal(false);
      setEditProfileId(null);
    } catch (err) {
      console.error("MediSync: Save profile error:", err);
      alert("Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // --- Inline Styles --- //
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, system-ui, sans-serif',
      position: 'relative',
      overflow: 'hidden',
      padding: '2rem'
    },
    watermark: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      fontSize: '40vw',
      color: 'rgba(28, 187, 191, 0.05)', // Very subtle medical cross color
      pointerEvents: 'none',
      zIndex: 0,
      userSelect: 'none'
    },
    content: {
      position: 'relative',
      zIndex: 1,
      width: '100%',
      maxWidth: '1000px',
      animation: 'fadeIn 0.8s ease-out forwards'
    },
    title: {
      textAlign: 'center',
      fontSize: '2.5rem',
      fontWeight: '800',
      color: '#0f172a',
      marginBottom: '3rem',
      letterSpacing: '-0.025em'
    },
    grid: {
      display: 'grid',
      gap: '2rem',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      justifyContent: 'center',
      alignItems: 'start'
    },
    card: {
      backgroundColor: '#ffffff',
      borderRadius: '24px',
      padding: '2rem 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      cursor: 'pointer',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.02)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      border: '1px solid #f1f5f9',
      position: 'relative'
    },
    avatar: (color) => ({
      width: '100px',
      height: '100px',
      borderRadius: '50%',
      backgroundColor: color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ffffff',
      fontSize: '2.5rem',
      fontWeight: 'bold',
      marginBottom: '1.25rem',
      boxShadow: `0 8px 16px -4px ${color}40`,
      transition: 'transform 0.3s ease'
    }),
    profileName: {
      fontSize: '1.125rem',
      fontWeight: '700',
      color: '#1e293b',
      marginBottom: '0.5rem',
      textAlign: 'center',
      width: '100%',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },
    tagDetails: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontSize: '0.875rem'
    },
    relationBadge: () => ({
      backgroundColor: `${BRAND_TEAL}15`,
      color: BRAND_TEAL,
      padding: '0.25rem 0.75rem',
      borderRadius: '9999px',
      fontWeight: '700',
      fontSize: '0.75rem',
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    }),
    ageText: {
      color: '#64748b',
      fontWeight: '500'
    },
    editButton: {
      position: 'absolute',
      top: '1rem',
      right: '1rem',
      background: 'rgba(241, 245, 249, 0.8)',
      border: 'none',
      borderRadius: '50%',
      width: '32px',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      color: '#64748b',
      opacity: 0, // Hidden until hover via CSS
      transition: 'opacity 0.2s',
      zIndex: 2
    },
    addCard: {
      border: '2px dashed #cbd5e1',
      backgroundColor: 'transparent',
      boxShadow: 'none',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      minHeight: '220px',
      padding: '2rem 1.5rem',
      borderRadius: '24px',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    addIcon: {
      width: '80px',
      height: '80px',
      borderRadius: '50%',
      border: '2px dashed #94a3b8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '2rem',
      color: '#94a3b8',
      marginBottom: '1rem'
    },
    addText: {
      color: '#64748b',
      fontWeight: '600',
      fontSize: '1rem'
    },
    maxLimitMsg: {
      textAlign: 'center',
      color: '#94a3b8',
      fontWeight: '500',
      gridColumn: '1 / -1',
      marginTop: '2rem'
    },
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: '1rem',
      animation: 'fadeIn 0.2s ease-out'
    },
    modalContent: {
      backgroundColor: '#ffffff',
      borderRadius: '24px',
      padding: '2rem',
      width: '100%',
      maxWidth: '480px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    },
    formGroup: {
      marginBottom: '1.5rem'
    },
    label: {
      display: 'block',
      fontSize: '0.875rem',
      fontWeight: '600',
      color: '#334155',
      marginBottom: '0.5rem'
    },
    input: {
      width: '100%',
      padding: '0.75rem 1rem',
      borderRadius: '12px',
      border: '1px solid #cbd5e1',
      backgroundColor: '#ffffff',
      colorScheme: 'light',
      fontSize: '1rem',
      color: '#0f172a',
      outline: 'none',
      transition: 'border-color 0.2s',
      boxSizing: 'border-box'
    },
    colorGrid: {
      display: 'flex',
      gap: '1rem',
      flexWrap: 'wrap'
    },
    colorOption: (color, isSelected) => ({
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      backgroundColor: color,
      cursor: 'pointer',
      border: isSelected ? '3px solid #0f172a' : '3px solid transparent',
      boxShadow: isSelected ? `0 0 0 2px #ffffff inset` : 'none',
      transition: 'transform 0.2s',
      transform: isSelected ? 'scale(1.1)' : 'scale(1)'
    }),
    buttonGroup: {
      display: 'flex',
      gap: '1rem',
      marginTop: '2.5rem'
    },
    btnCancel: {
      flex: 1,
      padding: '0.875rem',
      borderRadius: '12px',
      border: '1px solid #cbd5e1',
      backgroundColor: '#ffffff',
      color: '#475569',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    btnSave: {
      flex: 1,
      padding: '0.875rem',
      borderRadius: '12px',
      border: 'none',
      backgroundColor: BRAND_TEAL,
      color: '#ffffff',
      fontWeight: '700',
      cursor: 'pointer',
      boxShadow: `0 4px 6px -1px ${BRAND_TEAL}40`,
      transition: 'all 0.2s'
    },
    skeletonAvatar: {
      width: '100px',
      height: '100px',
      borderRadius: '50%',
      backgroundColor: '#e2e8f0',
      marginBottom: '1.25rem',
      animation: 'pulse 1.5s infinite ease-in-out'
    },
    skeletonText: {
      height: '24px',
      width: '60%',
      backgroundColor: '#e2e8f0',
      borderRadius: '12px',
      marginBottom: '0.75rem',
      animation: 'pulse 1.5s infinite ease-in-out'
    },
    skeletonSubText: {
      height: '16px',
      width: '40%',
      backgroundColor: '#e2e8f0',
      borderRadius: '8px',
      animation: 'pulse 1.5s infinite ease-in-out'
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulse {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }
        .profile-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        .profile-card:hover .edit-btn {
          opacity: 1;
        }
        .add-card:hover {
          border-color: #1cbbbf;
          background-color: rgba(28, 187, 191, 0.02);
        }
        .add-card:hover .add-icon {
          border-color: #1cbbbf;
          color: #1cbbbf;
          background-color: rgba(28, 187, 191, 0.1);
        }
        .input-field {
          background-color: #ffffff !important;
          color: #0f172a !important;
          color-scheme: light !important;
        }
        .input-field::placeholder {
          color: #94a3b8 !important;
        }
        .input-field:focus {
          border-color: #1cbbbf !important;
          box-shadow: 0 0 0 3px rgba(28, 187, 191, 0.2) !important;
        }
        /* Mobile grid adjustments */
        @media (max-width: 640px) {
          .profile-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 1rem !important;
          }
        }
        /* Tablet grid adjustments */
        @media (min-width: 641px) and (max-width: 1024px) {
          .profile-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
        /* Desktop grid adjustments */
        @media (min-width: 1025px) {
          .profile-grid {
            grid-template-columns: repeat(4, 1fr) !important;
          }
        }
      `}</style>

      <div style={styles.container}>
        {/* Subtle Watermark Component */}
        <div style={styles.watermark}>
          ✚
        </div>

        <div style={styles.content}>
          <h1 style={styles.title}>Who's getting care today?</h1>

          <div style={styles.grid} className="profile-grid">
            {loading ? (
              // Loading Skeletons
              Array(4).fill(0).map((_, i) => (
                <div key={i} style={{...styles.card, pointerEvents: 'none'}}>
                  <div style={styles.skeletonAvatar}></div>
                  <div style={styles.skeletonText}></div>
                  <div style={styles.skeletonSubText}></div>
                </div>
              ))
            ) : (
              <>
                {profiles.map(profile => (
                  <div 
                    key={profile.id} 
                    style={styles.card} 
                    className="profile-card"
                    onClick={(e) => {
                      if (!e.target.closest('button')) {
                        handleProfileClick(profile);
                      }
                    }}
                  >
                    {/* Only allow editing if it's not the primary Self profile, or if you want to allow changing name on Self */}
                    <button 
                      style={styles.editButton} 
                      className="edit-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        openModal(profile);
                      }}
                      title="Edit Profile"
                    >
                      ✎
                    </button>
                    
                    <div style={styles.avatar(profile.color)}>
                      {profile.name.charAt(0).toUpperCase()}
                    </div>
                    
                    <h3 style={styles.profileName}>{profile.name}</h3>
                    
                    <div style={styles.tagDetails}>
                      <span style={styles.relationBadge(profile.relation)}>
                        {profile.relation}
                      </span>
                      <span style={styles.ageText}>
                        {calculateAge(profile.dob)} yrs
                      </span>
                    </div>
                  </div>
                ))}
                
                {/* Add Member Card */}
                {profiles.length < 6 && (
                  <div 
                    style={styles.addCard} 
                    className="add-card"
                    onClick={() => openModal()}
                  >
                    <div style={styles.addIcon} className="add-icon">
                      +
                    </div>
                    <span style={styles.addText}>Add Member</span>
                  </div>
                )}
                
                {profiles.length >= 6 && (
                  <div style={styles.maxLimitMsg}>
                    Maximum limit of 6 profiles reached.
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div style={styles.modalOverlay} onClick={closeModal}>
            <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', marginBottom: '1.5rem' }}>
                {editProfileId ? 'Edit Profile' : 'Add New Member'}
              </h2>
              
              <form onSubmit={saveProfile}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Full Name</label>
                  <input 
                    type="text" 
                    placeholder="E.g. Jane Doe"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    style={styles.input}
                    className="input-field"
                    required
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Date of Birth</label>
                  <input 
                    type="date"
                    value={formData.dob}
                    onChange={e => setFormData({...formData, dob: e.target.value})}
                    min="1900-01-01"
                    max={new Date().toISOString().split("T")[0]}
                    style={styles.input}
                    className="input-field"
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Gender</label>
                  <select
                    value={formData.gender}
                    onChange={e => setFormData({...formData, gender: e.target.value})}
                    style={styles.input}
                    className="input-field"
                    required
                  >
                    <option value="" disabled>Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Relationship to Primary Acc.</label>
                  <input 
                    type="text"
                    placeholder="E.g. Spouse, Friend, Self"
                    value={formData.relation}
                    onChange={e => setFormData({...formData, relation: e.target.value})}
                    style={styles.input}
                    className="input-field"
                    required
                    disabled={editProfileId && profiles.find(p => p.id === editProfileId)?.relation === 'Self'}
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Profile Color</label>
                  <div style={styles.colorGrid}>
                    {AVATAR_COLORS.map(color => (
                      <div 
                        key={color}
                        style={styles.colorOption(color, formData.color === color)}
                        onClick={() => setFormData({...formData, color})}
                      />
                    ))}
                  </div>
                </div>
                
                <div style={styles.buttonGroup}>
                  <button type="button" onClick={closeModal} style={styles.btnCancel}>
                    Cancel
                  </button>
                  <button type="submit" style={styles.btnSave}>
                    {editProfileId ? 'Save Changes' : 'Add Member'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default FamilyProfileSelector;
