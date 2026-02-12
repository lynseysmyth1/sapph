import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import './Onboarding.css';

// Steps from docs/ONBOARDING_PAGES_READOUT.md — types: intro, completion, text, textarea, radio, checkbox, photos, group
const ONBOARDING_STEPS = [
  { type: 'intro', id: 'intro_details', body: "Let's get started with some details about you" },
  { type: 'text', id: 'name_dob', label: "What's your name?", sublabel: "And date of birth", alsoCollectDob: true, required: true },
  { type: 'checkbox', id: 'pronouns', label: "What are your pronouns?", required: true, options: ['She', 'Her', 'They', 'Them', 'He', 'Him', 'Prefer not to say', 'Other'] },
  { type: 'radio', id: 'gender_identity', label: 'How do you identify?', required: true, options: ['Agender', 'Androgynous', 'Bigender', 'Gender fluid', 'Gender non conforming', 'Gender queer', 'Intersex', 'Non binary', 'Pangender', 'Trans person', 'Trans woman', 'Transfeminine', 'Transmasculine', 'Trans non-binary', 'Woman'] },
  { type: 'radio', id: 'gender_expression', label: "What's your gender expression?", required: true, options: ['Androgynous / Andro', 'Butch', 'Chapstick', 'Femme', 'Futch', 'Gender non conforming', 'High femme', 'Masc', 'Masc-of-centre', 'Queer femme', 'Queer masc', 'Sapphic', 'Soft butch', 'Soft Masc', 'Stem', 'Tomboy'] },
  { type: 'radio', id: 'sexual_identity', label: 'How do you identify sexually?', required: true, options: ['Asexual', 'Bisexual', 'Demisexual', 'Gay', 'Lesbian', 'Pansexual', 'Queer', 'Questioning', 'Other'] },
  { type: 'text', id: 'height', label: "What's your height?", placeholder: "e.g. 5'6\"", required: true },
  { type: 'text', id: 'location', label: 'Where do you live?', placeholder: 'City and area', required: true },
  { type: 'text', id: 'hometown', label: "Where's your home town?", placeholder: 'City, Country', required: true },
  { type: 'radio', id: 'children', label: 'Do you have children?', required: true, options: ['Childfree, not having children', 'Child free, dating people with children', 'Have children', "Have children, don't want more", 'Have children, open to more', 'Want children', 'Prefer not to say'] },
  { type: 'text', id: 'job_title', label: "What's your job title?", placeholder: 'What do you do?', required: true },
  { type: 'radio', id: 'political_alignment', label: 'What is your political alignment?', required: true, options: ['Progressive', 'Liberal', 'Center left', 'Centrist', 'Center right', 'Conservative', 'Not political'] },
  { type: 'intro', id: 'intro_profile', body: "Now let's build out your profile details" },
  { type: 'photos', id: 'photos', label: "Add up to 6 photos — optional (headshot first recommended)", hint: 'Minimum 4 pictures required', min: 4, max: 6, required: true },
  { type: 'textarea', id: 'bio', label: "Next we'd love you to tell people a little bit more about yourself with a short bio.", hint: 'Let people know a little about you, what you love in life and how you spend your time.', placeholder: 'Write your bio...', maxLength: 500, required: true },
  { type: 'textarea', id: 'conversation_starter', label: 'Now we have our conversation starter', hint: "Sometimes it's hard to know how to kick start the first chat — this gives the other person some hints.", placeholder: 'e.g. Ask me about my favourite hike...', maxLength: 200, required: false },
  { type: 'checkbox', id: 'connection_goals', label: 'What are your connection goals?', required: true, options: ['Friends', 'Hookup', 'Life partner', 'Long term', 'Long term, open to short', 'Relationship', 'Short term', 'Short term, open to serious'] },
  { type: 'checkbox', id: 'relationship_style', label: 'What style of relationship are you looking for?', required: true, options: ['ENM', 'Exploring', 'Figuring it out', 'Monogamy', 'Non monogamous', 'Poly', 'Prefer not to say'] },
  { type: 'group', id: 'vices', fields: [
    { type: 'heading', label: 'Tell us a little about any vices' },
    { id: 'smoking', label: 'Smoking', type: 'radio', required: true, options: ['No', 'Sometimes', 'Vape', 'Yes'] },
    { id: 'drinking', label: 'Drinking', type: 'radio', required: true, options: ['No', 'Sometimes', 'Yes'] },
    { id: 'marijuana', label: 'Weed', type: 'radio', required: true, options: ['No', 'Sometimes', 'Yes'] },
    { id: 'drugs', label: 'Other drugs', type: 'radio', required: true, options: ['No', 'Sometimes', 'Yes'] },
  ]},
  { type: 'checkbox', id: 'pets', label: "Pets are an important part of our lives — we'd love to know if you have any", required: true, options: ['Birds', 'Cat', 'Dog', 'Fish', 'No pets', 'Reptile', 'Small animal'] },
  { type: 'radio', id: 'zodiac_sign', label: "Finally we'd love to know what zodiac sign you are", hint: "We all know this is key in any queer relationship ✨", required: true, options: ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'] },
  { type: 'intro', id: 'intro_intimate', body: "To finish, a couple of more intimate questions", note: "(remember you can always hide these answers on your profile or skip them)" },
  { type: 'checkbox', id: 'sex_preferences', label: 'What is your sexual preference?', required: false, options: ['Bottom', 'Pillow princess', 'Power bottom', 'Power top', 'Service top', 'Stone top', 'Switch', 'Top', 'Prefer not to share'] },
  { type: 'checkbox', id: 'kinks', label: 'Do you have any kink preferences?', required: false, options: ['BDSM', 'Being dominant', 'Being watched', 'Being submissive', 'Bondage', 'Group dynamics', 'Role play', 'Toys', 'Watching', 'Prefer not to share'] },
  { type: 'completion', id: 'done', body: "You're all set, happy matching!", note: null },
];

const UPLOAD_TIMEOUT_MS = 60000;   // 60s for photo uploads
const PROFILE_FIELDS = [
  'full_name', 'dob', 'height', 'location', 'hometown', 'ethnicity', 'job_title', 'political_alignment', 'children',
  'zodiac_sign', 'politics', 'drinking', 'smoking', 'marijuana', 'drugs', 'gender_identity',
  'gender_expression', 'sexual_identity', 'bio', 'conversation_starter', 'onboarding_completed',
  'photos', 'pronouns', 'connection_goals', 'relationship_style', 'sex_preferences', 'kinks',
  'visibility_settings', 'pets'
];

export default function Onboarding() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState({});
  const [photoFiles, setPhotoFiles] = useState([]);
  const [visibilityData, setVisibilityData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);

  const currentStep = ONBOARDING_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === ONBOARDING_STEPS.length - 1;

  useEffect(() => {
    if (profile) {
      const { id, onboarding_completed, updated_at, ...rest } = profile;
      if (rest.photos) rest.photos = rest.photos.filter(url => url.startsWith('http'));
      setFormData(prev => ({ ...rest, ...prev }));
      if (profile.visibility_settings) setVisibilityData(profile.visibility_settings);
    }
  }, [profile]);

  useEffect(() => {
    if (!user) navigate('/signin');
  }, [user, navigate]);

  function getStepLabel() {
    if (currentStepIndex === 0 || currentStepIndex === 11 || currentStepIndex === 20) return null;
    if (currentStepIndex <= 10) return { title: 'About you', step: `Step ${currentStepIndex} of 10` };
    if (currentStepIndex >= 12 && currentStepIndex <= 19) return { title: 'Your profile', step: `Step ${currentStepIndex - 11} of 8` };
    if (currentStepIndex >= 21 && currentStepIndex <= 22) return { title: 'Final details', step: `Step ${currentStepIndex - 20} of 2` };
    return null;
  }
  const stepInfo = getStepLabel();

  const handleInputChange = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));
  const handleVisibilityChange = (key, checked) => setVisibilityData(prev => ({ ...prev, [key]: checked }));
  const handleCheckboxChange = (key, option, checked) => {
    const arr = formData[key] || [];
    handleInputChange(key, checked ? [...arr, option] : arr.filter(x => x !== option));
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    const photos = formData.photos || [];
    const filesList = photoFiles || [];
    if (files.length + photos.length > 6) { setError('Maximum 6 photos allowed'); return; }
    const urls = files.map(f => URL.createObjectURL(f));
    handleInputChange('photos', [...photos, ...urls]);
    setPhotoFiles([...filesList, ...files]);
  };

  const removePhoto = (index) => {
    const photos = [...(formData.photos || [])];
    const files = [...(photoFiles || [])];
    if (photos[index]?.startsWith('blob:')) URL.revokeObjectURL(photos[index]);
    photos.splice(index, 1);
    files.splice(index, 1);
    handleInputChange('photos', photos);
    setPhotoFiles(files);
  };

  const getAgeFromDob = (dobStr) => {
    if (!dobStr || typeof dobStr !== 'string') return null;
    try {
      const birth = new Date(dobStr);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
      return isNaN(age) ? null : age;
    } catch (_) { return null; }
  };

  function isStepValid() {
    if (currentStep.type === 'intro' || currentStep.type === 'completion') return true;
    if (currentStep.type === 'text' && currentStep.alsoCollectDob) {
      const nameOk = (formData.full_name ?? '').trim() !== '';
      const age = getAgeFromDob(formData.dob);
      return nameOk && formData.dob && age !== null && age >= 18;
    }
    if (currentStep.type === 'group') {
      return currentStep.fields.filter(f => f.type !== 'heading').every(f => {
        const v = formData[f.id];
        if (f.type === 'radio') return v != null && String(v).trim() !== '';
        return v != null;
      });
    }
    if (currentStep.type === 'photos') return (formData.photos || []).length >= (currentStep.min ?? 0);
    if (currentStep.type === 'textarea' || currentStep.type === 'text') {
      const key = currentStep.alsoCollectDob ? 'full_name' : currentStep.id;
      const val = formData[key];
      return !currentStep.required || (val != null && String(val).trim() !== '');
    }
    if (currentStep.type === 'radio') return !currentStep.required || (formData[currentStep.id] != null && String(formData[currentStep.id]).trim() !== '');
    if (currentStep.type === 'checkbox') return !currentStep.required || (Array.isArray(formData[currentStep.id]) && formData[currentStep.id].length > 0);
    return true;
  }

  const handleNext = async () => {
    if (!isStepValid()) {
      if (currentStep.type === 'text' && currentStep.alsoCollectDob) {
        if (!(formData.full_name ?? '').trim()) setError('Please enter your name');
        else if (!formData.dob || getAgeFromDob(formData.dob) == null) setError('Please provide your date of birth');
        else if (getAgeFromDob(formData.dob) < 18) setError('Sorry, you need to be 18 or over to use Sapph');
        else setError('Please complete the fields above');
      } else if (currentStep.type === 'group') setError('Please answer all the questions on this page');
      else if (currentStep.type === 'photos') setError(`Please upload at least ${currentStep.min ?? 0} photos`);
      else setError('Please complete this before continuing');
      return;
    }
    setError(null);
    
    if (!isLastStep) {
      setCurrentStepIndex(i => i + 1);
      window.scrollTo(0, 0);
    } else {
      await handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(i => i - 1);
      setError(null);
      window.scrollTo(0, 0);
    }
  };

  function buildProfilePayload(finalPhotoUrls) {
    const data = {};
    PROFILE_FIELDS.forEach(f => { if (formData[f] !== undefined) data[f] = formData[f]; });
    if (data.dob != null && typeof data.dob === 'string') data.dob = data.dob.slice(0, 10);
    // Note: Don't include 'id' - Firestore uses the document ID (set in profileRef)
    return { ...data, photos: finalPhotoUrls, visibility_settings: visibilityData, onboarding_completed: true, updated_at: new Date().toISOString() };
  }

  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setSaveStatus(null);
    if (!user?.id) { 
      setLoading(false); 
      setError('Session expired. Please sign in again.'); 
      return; 
    }
    
    try {
      // Phase 1: Mark onboarding complete immediately
      setSaveStatus('Marking onboarding complete…');
      const profileRef = doc(db, 'profiles', user.id);
      await setDoc(profileRef, { 
        onboarding_completed: true, 
        updated_at: new Date().toISOString() 
      }, { merge: true });
      console.log('Phase 1: Onboarding marked complete');

      // Phase 2: Upload photos
      const photos = formData.photos || [];
      const hasNewPhotos = photos.some(url => url.startsWith('blob:'));
      if (hasNewPhotos) {
        setSaveStatus('Uploading photos…');
      }
      const finalPhotoUrls = [];
      let fileIdx = 0;
      
      for (const url of photos) {
        if (url.startsWith('http')) {
          // Already uploaded photo
          finalPhotoUrls.push(url);
        } else if (url.startsWith('blob:') && photoFiles[fileIdx]) {
          const file = photoFiles[fileIdx];
          const fileName = `${Date.now()}-${fileIdx}.${file.name.split('.').pop()}`;
          const storageRef = ref(storage, `profile-photos/${user.id}/${fileName}`);
          
          try {
            // Upload with timeout
            const uploadPromise = uploadBytes(storageRef, file);
            const timeoutPromise = new Promise((_, rej) => 
              setTimeout(() => rej(new Error('Photo upload timed out')), UPLOAD_TIMEOUT_MS)
            );
            
            await Promise.race([uploadPromise, timeoutPromise]);
            
            // Get download URL
            const downloadURL = await getDownloadURL(storageRef);
            finalPhotoUrls.push(downloadURL);
            fileIdx++;
          } catch (uploadErr) {
            if (uploadErr.message === 'Photo upload timed out') {
              console.warn('Photo upload timed out, continuing without this photo');
              break;
            }
            console.error('Photo upload error:', uploadErr);
            // Continue with other photos
            fileIdx++;
          }
        }
      }
      
      // Phase 3: Save full profile
      setSaveStatus('Saving your profile…');
      const payload = buildProfilePayload(finalPhotoUrls);
      await setDoc(profileRef, payload, { merge: true });
      
      setSaveStatus('Onboarding complete! Redirecting...');
      await refreshProfile();
      await new Promise(resolve => setTimeout(resolve, 100));
      navigate('/home');
    } catch (err) {
      console.error('Error saving profile:', err);
      const msg = err?.message ?? '';
      let displayMsg = msg || 'Failed to save profile. Try again.';
      
      if (err.code === 'permission-denied') {
        displayMsg = 'Permission denied. Please sign out and sign in again.';
      } else if (err.code === 'unavailable') {
        displayMsg = 'Firebase is temporarily unavailable. Please try again in a moment.';
      } else if (/Photo upload timed out/i.test(msg)) {
        displayMsg = 'Photo upload timed out. Your profile was saved but some photos may be missing.';
      }
      
      setError(displayMsg);
    } finally {
      setSaveStatus(null);
      setLoading(false);
    }
  };

  const showBackButton = currentStepIndex > 0 && currentStep.type !== 'completion';
  const isIntroDivider = currentStep.type === 'intro' || currentStep.type === 'completion';
  const isCompletionStep = currentStep.type === 'completion';
  const hideShowOnProfile = [12, 13, 14].includes(currentStepIndex);

  return (
    <div className={`onboarding ${isIntroDivider ? 'theme-divider' : ''}`}>
      <header className="onboarding-header">
        <div className="header-inner">
          {stepInfo && <h1 className="section-title">{stepInfo.title} <span className="section-progress">{stepInfo.step}</span></h1>}
        </div>
      </header>
      <div className="onboarding-container">
        <div className="onboarding-form">
          {currentStep.type === 'intro' && (
            <div className="step-intro-divider">
              <p className="step-intro-body">{currentStep.body}</p>
              {currentStep.note && <p className="step-intro-note">{currentStep.note}</p>}
            </div>
          )}

          {currentStep.type === 'completion' && (
            <div className="step-intro-divider step-completion-with-cta">
              <p className="step-intro-body">{currentStep.body}</p>
              {currentStep.note && <p className="step-intro-note">{currentStep.note}</p>}
              <button type="button" className="btn-next btn-finish completion-cta" onClick={handleNext} disabled={loading}>
                {loading ? 'Saving…' : 'Finish'}
              </button>
            </div>
          )}

          {currentStep.type === 'text' && currentStep.alsoCollectDob && (
            <div className="question-item">
              <h2 className="question-label">{currentStep.label}</h2>
              <input type="text" className="onboarding-input" placeholder="Your name" value={formData.full_name || ''} onChange={e => handleInputChange('full_name', e.target.value)} autoFocus />
              <h3 className="question-sublabel">{currentStep.sublabel}</h3>
              <input type="date" className="onboarding-input" value={formData.dob || ''} onChange={e => handleInputChange('dob', e.target.value)} />
              {formData.dob && getAgeFromDob(formData.dob) != null && <p className="dob-feedback">You're <strong>{getAgeFromDob(formData.dob)} years old</strong></p>}
              <p className="always-visible-note">Always visible on your profile</p>
            </div>
          )}

          {currentStep.type === 'text' && !currentStep.alsoCollectDob && (
            <div className="question-item">
              <h2 className="question-label">{currentStep.label}</h2>
              <input type="text" className="onboarding-input" placeholder={currentStep.placeholder} value={formData[currentStep.id] || ''} onChange={e => handleInputChange(currentStep.id, e.target.value)} autoFocus />
              <div className="visibility-toggle">
                <label className="show-on-profile-checkbox">
                  <input type="checkbox" checked={visibilityData[currentStep.id] !== false} onChange={e => handleVisibilityChange(currentStep.id, e.target.checked)} />
                  <span className="show-on-profile-checkmark"></span>
                  <span className="show-on-profile-label">Show on profile</span>
                </label>
              </div>
            </div>
          )}

          {currentStep.type === 'photos' && (
            <div className="question-item">
              <h2 className="question-label">{currentStep.label}</h2>
              {currentStep.hint && <p className="question-hint">{currentStep.hint}</p>}
              <div className="photos-upload-container">
                <div className="photos-grid">
                  {[...Array(6)].map((_, i) => {
                    const url = formData.photos?.[i];
                    return url ? (
                      <div key={i} className="photo-preview">
                        <img src={url} alt={`Upload ${i + 1}`} />
                        <button type="button" className="remove-photo" onClick={() => removePhoto(i)} aria-label="Remove">&times;</button>
                      </div>
                    ) : (
                      <label key={i} className="photo-add-btn">
                        <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} hidden />
                        <span>+</span>
                      </label>
                    );
                  })}
                </div>
                <p className="photo-hint">Add up to 6 photos — optional (headshot first recommended)</p>
              </div>
              {hideShowOnProfile ? <p className="always-visible-note">Always visible on your profile</p> : (
                <div className="visibility-toggle">
                  <label className="show-on-profile-checkbox">
                    <input type="checkbox" checked={visibilityData[currentStep.id] !== false} onChange={e => handleVisibilityChange(currentStep.id, e.target.checked)} />
                    <span className="show-on-profile-checkmark"></span>
                    <span className="show-on-profile-label">Show on profile</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {currentStep.type === 'textarea' && (
            <div className="question-item">
              <h2 className="question-label">{currentStep.label}</h2>
              {currentStep.hint && <p className="question-hint">{currentStep.hint}</p>}
              <textarea className="onboarding-textarea" placeholder={currentStep.placeholder} maxLength={currentStep.maxLength} value={formData[currentStep.id] || ''} onChange={e => handleInputChange(currentStep.id, e.target.value)} rows={4} />
              {currentStep.maxLength && <p className="char-count">{(formData[currentStep.id] || '').length} / {currentStep.maxLength}</p>}
              {hideShowOnProfile ? <p className="always-visible-note">Always visible on your profile</p> : (
                <div className="visibility-toggle">
                  <label className="show-on-profile-checkbox">
                    <input type="checkbox" checked={visibilityData[currentStep.id] !== false} onChange={e => handleVisibilityChange(currentStep.id, e.target.checked)} />
                    <span className="show-on-profile-checkmark"></span>
                    <span className="show-on-profile-label">Show on profile</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {currentStep.type === 'group' && (
            <div className="question-item question-group">
              {currentStep.fields.map((field, i) => (
                <div key={field.id || `h-${i}`} className="group-field">
                  <h3 className={field.type === 'heading' ? 'group-field-label group-field-heading' : 'group-field-label'}>{field.label}</h3>
                  {field.type === 'radio' && (
                    <div className="options-list">
                      {field.options.map(opt => (
                        <label key={opt} className="option-item radio">
                          <input type="radio" name={field.id} value={opt} checked={formData[field.id] === opt} onChange={e => handleInputChange(field.id, e.target.value)} />
                          <span className="option-label">{opt}</span>
                          <span className="checkmark"></span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {currentStep.id === 'vices' && (
                <div className="visibility-toggle">
                  <label className="show-on-profile-checkbox">
                    <input type="checkbox" checked={['smoking', 'drinking', 'marijuana', 'drugs'].every(id => visibilityData[id] !== false)} onChange={e => ['smoking', 'drinking', 'marijuana', 'drugs'].forEach(id => handleVisibilityChange(id, e.target.checked))} />
                    <span className="show-on-profile-checkmark"></span>
                    <span className="show-on-profile-label">Show on profile</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {currentStep.type === 'radio' && (
            <div className="question-item">
              <h2 className="question-label">{currentStep.label}</h2>
              {currentStep.hint && <p className="question-hint">{currentStep.hint}</p>}
              <div className="options-list">
                {currentStep.options.map(opt => (
                  <label key={opt} className="option-item radio">
                    <input type="radio" name={currentStep.id} value={opt} checked={formData[currentStep.id] === opt} onChange={e => handleInputChange(currentStep.id, e.target.value)} />
                    <span className="option-label">{opt}</span>
                    <span className="checkmark"></span>
                  </label>
                ))}
              </div>
              <div className="visibility-toggle">
                <label className="show-on-profile-checkbox">
                  <input type="checkbox" checked={visibilityData[currentStep.id] !== false} onChange={e => handleVisibilityChange(currentStep.id, e.target.checked)} />
                  <span className="show-on-profile-checkmark"></span>
                  <span className="show-on-profile-label">Show on profile</span>
                </label>
              </div>
            </div>
          )}

          {currentStep.type === 'checkbox' && (
            <div className="question-item">
              <h2 className="question-label">{currentStep.label}</h2>
              <div className="options-list">
                {(currentStep.options || []).map(opt => (
                  <label key={opt} className="option-item checkbox">
                    <input type="checkbox" checked={(formData[currentStep.id] || []).includes(opt)} onChange={e => handleCheckboxChange(currentStep.id, opt, e.target.checked)} />
                    <span className="option-label">{opt}</span>
                    <span className="checkmark"></span>
                  </label>
                ))}
              </div>
              <div className="visibility-toggle">
                <label className="show-on-profile-checkbox">
                  <input type="checkbox" checked={visibilityData[currentStep.id] !== false} onChange={e => handleVisibilityChange(currentStep.id, e.target.checked)} />
                  <span className="show-on-profile-checkmark"></span>
                  <span className="show-on-profile-label">Show on profile</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {saveStatus && <div className="onboarding-save-status">{saveStatus}</div>}
        {error && <div className="onboarding-error">{error}</div>}

        {!isCompletionStep && (
          <footer className="onboarding-footer">
            {showBackButton && <button type="button" className="btn-back" onClick={handleBack} disabled={loading}>Back</button>}
            <button type="button" className="btn-next" onClick={handleNext} disabled={loading}>Next</button>
          </footer>
        )}
      </div>
    </div>
  );
}
