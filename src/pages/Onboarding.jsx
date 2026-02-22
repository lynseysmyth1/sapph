import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Capacitor } from '@capacitor/core';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import './Onboarding.css';

// Full onboarding steps – types: intro, completion, text, textarea, radio, checkbox, photos, group
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
  { type: 'checkbox', id: 'relationship_style', label: 'What style of relationship are you looking for?', required: true, options: ['Exploring', 'Figuring it out', 'Monogamy', 'Non monogamous', 'Poly', 'Prefer not to say'] },
  { type: 'group', id: 'vices', fields: [
    { type: 'heading', label: 'Tell us a little about any vices' },
    { id: 'smoking', label: 'Smoking', type: 'radio', required: true, options: ['No', 'Sometimes', 'Vape', 'Yes'] },
    { id: 'drinking', label: 'Drinking', type: 'radio', required: true, options: ['No', 'Sometimes', 'Yes'] },
    { id: 'marijuana', label: 'Weed', type: 'radio', required: true, options: ['No', 'Sometimes', 'Yes'] },
    { id: 'drugs', label: 'Other drugs', type: 'radio', required: true, options: ['No', 'Sometimes', 'Yes'] },
  ]},
  { type: 'checkbox', id: 'pets', label: "Pets are an important part of our lives — we'd love to know if you have any", required: true, options: ['Birds', 'Cat', 'Dog', 'Fish', 'Reptile', 'Small animal', 'No pets'] },
  { type: 'radio', id: 'zodiac_sign', label: "Finally we'd love to know what zodiac sign you are", hint: "We all know this is key in any queer relationship ✨", required: true, options: ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'] },
  { type: 'intro', id: 'intro_intimate', body: "To finish, a couple of more intimate questions", note: "(remember you can always hide these answers on your profile or skip them)" },
  { type: 'checkbox', id: 'sex_preferences', label: 'What is your sexual preference?', required: false, options: ['Bottom', 'Pillow princess', 'Power bottom', 'Power top', 'Service top', 'Stone top', 'Switch', 'Top', 'Prefer not to share'] },
  { type: 'checkbox', id: 'kinks', label: 'Do you have any kink preferences?', required: false, options: ['BDSM', 'Being dominant', 'Being watched', 'Being submissive', 'Bondage', 'Group dynamics', 'Role play', 'Toys', 'Watching', 'Prefer not to share'] },
  { type: 'completion', id: 'done', body: "You're all set, happy matching!", note: null },
];

const UPLOAD_TIMEOUT_MS = 60000;   // 60s for photo uploads

// Height picker helpers — store/read as e.g. "5'6\""
function parseHeight(str) {
  if (!str) return { feet: '', inches: '0' };
  const m = str.match(/^(\d+)'(\d+)"?/);
  if (m) return { feet: m[1], inches: m[2] };
  return { feet: '', inches: '0' };
}
function formatHeight(feet, inches) {
  if (!feet) return '';
  return `${feet}'${inches}"`;
}
const PROFILE_FIELDS = [
  'full_name', 'dob', 'height', 'location', 'hometown', 'ethnicity', 'job_title', 'political_alignment', 'children',
  'zodiac_sign', 'politics', 'drinking', 'smoking', 'marijuana', 'drugs', 'gender_identity',
  'gender_expression', 'sexual_identity', 'bio', 'conversation_starter', 'onboarding_completed',
  'photos', 'pronouns', 'connection_goals', 'relationship_style', 'sex_preferences', 'kinks',
  'visibility_settings', 'pets'
];

export default function Onboarding() {
  const { user, profile, refreshProfile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState({});
  const [photoFiles, setPhotoFiles] = useState([]);
  const [visibilityData, setVisibilityData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [footerBottom, setFooterBottom] = useState(0);

  // Log steps for debugging
  console.log('[Onboarding] Total steps:', ONBOARDING_STEPS.length);
  console.log('[Onboarding] Steps:', ONBOARDING_STEPS.map(s => ({ type: s.type, id: s.id })));

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
    // Only redirect if user is explicitly null (not loading)
    if (user === null) {
      navigate('/signin', { replace: true });
    }
  }, [user, navigate]);

  // Keep the Back/Next footer floating above the software keyboard on iOS
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onViewportChange = () => {
      const keyboardHeight = window.innerHeight - vv.height;
      setFooterBottom(Math.max(0, keyboardHeight));
    };
    vv.addEventListener('resize', onViewportChange);
    vv.addEventListener('scroll', onViewportChange);
    return () => {
      vv.removeEventListener('resize', onViewportChange);
      vv.removeEventListener('scroll', onViewportChange);
    };
  }, []);

  function getStepLabel() {
    // Show progress across all non-intro / non-completion steps
    const contentSteps = ONBOARDING_STEPS.filter(
      (s) => s.type !== 'intro' && s.type !== 'completion'
    );
    const totalSteps = contentSteps.length;
    if (currentStep.type === 'intro' || currentStep.type === 'completion') return null;

    const idxInContent = contentSteps.findIndex((s) => s.id === currentStep.id);
    const stepNumber = idxInContent >= 0 ? idxInContent + 1 : currentStepIndex + 1;

    return {
      title: 'About you',
      step: `Step ${stepNumber} of ${totalSteps}`,
    };
  }
  const stepInfo = getStepLabel();

  const handleInputChange = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));
  const handleVisibilityChange = (key, checked) => setVisibilityData(prev => ({ ...prev, [key]: checked }));
  const handleCheckboxChange = (key, option, checked) => {
    const arr = formData[key] || [];
    handleInputChange(key, checked ? [...arr, option] : arr.filter(x => x !== option));
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    const photos = formData.photos || [];
    const filesList = photoFiles || [];
    if (files.length + photos.length > 6) { 
      setError('Maximum 6 photos allowed'); 
      return; 
    }
    
    // Show preview immediately with original files, compress in background
    const urls = files.map(f => URL.createObjectURL(f));
    handleInputChange('photos', [...photos, ...urls]);
    
    // Compress photos in background (non-blocking) - replaces files in photoFiles array
    Promise.all(files.map(file => compressImage(file)))
      .then(compressedFiles => {
        // Replace original files with compressed versions
        const newFilesList = [...filesList];
        files.forEach((_, idx) => {
          const insertIndex = filesList.length + idx;
          newFilesList[insertIndex] = compressedFiles[idx];
        });
        setPhotoFiles(newFilesList);
      })
      .catch(err => {
        console.error('[Onboarding] Photo compression error:', err);
        // Keep original files if compression fails
        setPhotoFiles([...filesList, ...files]);
      });
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

  // Compress/resize image before upload (reduces file size significantly)
  function compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.85) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Calculate new dimensions
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            resolve(blob || file); // Fallback to original if compression fails
          }, 'image/jpeg', quality);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // Background photo upload function (runs async after navigation)
  // Uploads photos in parallel for faster completion
  // Note: Photos are already compressed when selected
  async function uploadPhotosInBackground(profileRef, photosToUpload, photoFiles, userId) {
    const uploadPromises = [];
    let fileIdx = 0;
    
    for (const url of photosToUpload) {
      if (url.startsWith('blob:') && photoFiles[fileIdx]) {
        const file = photoFiles[fileIdx]; // Already compressed
        const idx = fileIdx; // Capture index for parallel uploads
        
        // Upload each photo in parallel
        // Note: Photos are already compressed when selected, so we upload directly
        const uploadPromise = (async () => {
          try {
            const fileName = `${Date.now()}-${idx}.jpg`;
            const storageRef = ref(storage, `profile-photos/${userId}/${fileName}`);
            
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            return { index: idx, url: downloadURL };
          } catch (uploadErr) {
            console.error('[Onboarding] Photo upload error:', uploadErr);
            return null;
          }
        })();
        
        uploadPromises.push(uploadPromise);
        fileIdx++;
      }
    }
    
    // Wait for all uploads to complete in parallel
    const results = await Promise.all(uploadPromises);
    // Sort by index to maintain order
    return results.filter(r => r !== null).sort((a, b) => a.index - b.index).map(r => r.url);
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
    
    // CRITICAL: Verify user.id matches Firebase Auth UID
    if (!user?.id) {
      setError('No user ID found. Please sign in again.');
      setLoading(false);
      return;
    }
    
    console.log('[Onboarding] Saving profile for user ID:', user.id);
    console.log('[Onboarding] User object:', { id: user.id, email: user.email });
    
    const profileRef = doc(db, 'profiles', user.id);
    const photos = formData.photos || [];
    const existingPhotoUrls = photos.filter(url => url.startsWith('http'));
    const photosToUpload = photos.filter(url => url.startsWith('blob:'));
    
    setSaveStatus('Saving your profile...');
    
    // TWO-PHASE SAVE: Critical field first (fast), then rest (background)
    // Phase 1: Save critical field only (onboarding_completed) - small, fast write
    try {
      const criticalPayload = { 
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      };
      
      console.log('[Onboarding] Attempting to save critical payload:', criticalPayload);
      console.log('[Onboarding] Profile document path: profiles/' + user.id);
      
      // Save critical field with 5-second timeout (should be fast)
      const criticalSavePromise = setDoc(profileRef, criticalPayload, { merge: true });
      const criticalTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('critical_timeout')), 5000)
      );
      
      try {
        await Promise.race([criticalSavePromise, criticalTimeout]);
        console.log('[Onboarding] ✅ Critical field saved successfully');
        
        // Verify the save worked by reading it back
        const verifySnap = await getDoc(profileRef);
        if (verifySnap.exists()) {
          const savedData = verifySnap.data();
          console.log('[Onboarding] ✅ Verification: Document exists');
          console.log('[Onboarding] ✅ Verification: onboarding_completed =', savedData.onboarding_completed);
          console.log('[Onboarding] ✅ Verification: Document ID =', verifySnap.id);
          
          if (savedData.onboarding_completed !== true) {
            console.error('[Onboarding] ❌ VERIFICATION FAILED: onboarding_completed is not true!', savedData);
            throw new Error('Save verification failed: onboarding_completed not set correctly');
          }
          
          if (verifySnap.id !== user.id) {
            console.error('[Onboarding] ❌ UID MISMATCH: Document ID (' + verifySnap.id + ') does not match user ID (' + user.id + ')');
            throw new Error('UID mismatch: Profile document ID does not match user ID');
          }
        } else {
          console.error('[Onboarding] ❌ VERIFICATION FAILED: Document does not exist after save!');
          throw new Error('Save verification failed: Document not found');
        }
      } catch (criticalErr) {
        if (criticalErr.message === 'critical_timeout') {
          console.warn('[Onboarding] ⚠️ Save timeout, waiting for completion...');
          // Wait for actual save to complete
          await criticalSavePromise;
          // Verify after waiting
          const verifySnap = await getDoc(profileRef);
          if (!verifySnap.exists() || verifySnap.data().onboarding_completed !== true) {
            throw new Error('Save failed: Document not saved correctly after timeout');
          }
          console.log('[Onboarding] ✅ Save completed after timeout');
        } else {
          throw criticalErr;
        }
      }
      
      // Critical save succeeded - update UI and navigate immediately
      setSaveStatus('Profile saved!');
      setLoading(false);
      setSaveStatus(null);
      
      // Update profile in memory immediately (ensures Home component sees the update)
      updateProfile({ onboarding_completed: true });
      
      // Navigate immediately (don't wait for full save)
      navigate('/home', { replace: true });
      
      // Phase 2: Save rest of profile in background (non-blocking)
      const fullPayload = buildProfilePayload(existingPhotoUrls);
      setDoc(profileRef, fullPayload, { merge: true })
        .then(() => {
          console.log('[Onboarding] Full profile saved successfully');
          // Refresh profile to get latest data
          refreshProfile().catch(() => {});
        })
        .catch((fullErr) => {
          console.error('[Onboarding] Background save failed:', fullErr.code, fullErr.message);
          // Retry once after 2 seconds
          setTimeout(() => {
            setDoc(profileRef, fullPayload, { merge: true })
              .catch(retryErr => {
                console.error('[Onboarding] Retry failed:', retryErr.code);
                // Don't show error to user - critical field is saved, rest can sync later
              });
          }, 2000);
        });
      
    } catch (err) {
      // Critical save failed - show error and don't navigate
      console.error('[Onboarding] ❌ Critical save failed:', err.code, err.message);
      console.error('[Onboarding] ❌ Full error:', err);
      console.error('[Onboarding] ❌ User ID:', user.id);
      console.error('[Onboarding] ❌ Profile ref path:', 'profiles/' + user.id);
      
      let errorMessage = `Failed to save profile: ${err.code || err.message}`;
      if (err.code === 'permission-denied') {
        errorMessage += '. Check Firestore security rules allow writes for authenticated users.';
      } else if (err.message?.includes('UID mismatch')) {
        errorMessage += '. Profile document ID does not match user ID.';
      }
      
      setError(errorMessage + ' Please check your connection and try again.');
      setLoading(false);
      setSaveStatus(null);
      return;
    }
    
    // Upload photos in background (don't await - let it run async)
    if (photosToUpload.length > 0 && photoFiles.length > 0) {
      uploadPhotosInBackground(profileRef, photosToUpload, photoFiles, user.id)
        .then((uploadedUrls) => {
          // Update profile with final photo URLs
          const finalUrls = [...existingPhotoUrls, ...uploadedUrls];
          setDoc(profileRef, { photos: finalUrls, updated_at: new Date().toISOString() }, { merge: true })
            .catch(err => console.error('[Onboarding] Failed to update profile with photos:', err));
        })
        .catch(err => console.error('[Onboarding] Background photo upload failed:', err));
    }
  };

  const showBackButton = currentStepIndex > 0 && currentStep.type !== 'completion';
  const isIntroDivider = currentStep.type === 'intro' || currentStep.type === 'completion';
  const isCompletionStep = currentStep.type === 'completion';
  // Some fields are always visible on profile; others can be toggled
  const hideShowOnProfile = ['photos', 'bio', 'conversation_starter'].includes(currentStep.id);

  // Show loading state while user/profile is loading
  if (!user) {
    return (
      <div className="onboarding">
        <div className="onboarding-loading">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

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

          {currentStep.type === 'text' && !currentStep.alsoCollectDob && currentStep.id === 'height' && (
            <div className="question-item">
              <h2 className="question-label">{currentStep.label}</h2>
              <div className="height-picker">
                <div className="height-picker-group">
                  <select
                    className="height-select"
                    value={parseHeight(formData.height).feet}
                    onChange={e => {
                      const { inches } = parseHeight(formData.height);
                      handleInputChange('height', formatHeight(e.target.value, inches || '0'));
                    }}
                  >
                    <option value="">ft</option>
                    {[4, 5, 6, 7].map(f => (
                      <option key={f} value={String(f)}>{f} ft</option>
                    ))}
                  </select>
                  <select
                    className="height-select"
                    value={parseHeight(formData.height).inches}
                    onChange={e => {
                      const { feet } = parseHeight(formData.height);
                      handleInputChange('height', formatHeight(feet || '5', e.target.value));
                    }}
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={String(i)}>{i} in</option>
                    ))}
                  </select>
                </div>
                {formData.height && (
                  <p className="height-preview">{formData.height}</p>
                )}
              </div>
              <div className="visibility-toggle">
                <label className="show-on-profile-checkbox">
                  <input type="checkbox" checked={visibilityData['height'] !== false} onChange={e => handleVisibilityChange('height', e.target.checked)} />
                  <span className="show-on-profile-checkmark"></span>
                  <span className="show-on-profile-label">Show on profile</span>
                </label>
              </div>
            </div>
          )}

          {currentStep.type === 'text' && !currentStep.alsoCollectDob && currentStep.id !== 'height' && (
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
          <footer
            className="onboarding-footer"
            style={footerBottom > 0 ? { bottom: footerBottom } : undefined}
          >
            {showBackButton && <button type="button" className="btn-back" onClick={handleBack} disabled={loading}>Back</button>}
            <button type="button" className="btn-next" onClick={handleNext} disabled={loading}>Next</button>
          </footer>
        )}
      </div>
    </div>
  );
}
