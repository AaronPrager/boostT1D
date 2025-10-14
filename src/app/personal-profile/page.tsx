'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Edit2, Save, X, Mail, Lock, Eye, EyeOff, Trash2 } from 'lucide-react';
import { signOut } from 'next-auth/react';

const countries = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'IE', name: 'Ireland' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'SG', name: 'Singapore' },
  { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'PE', name: 'Peru' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'EG', name: 'Egypt' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'KE', name: 'Kenya' },
  { code: 'MA', name: 'Morocco' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'IL', name: 'Israel' },
  { code: 'TR', name: 'Turkey' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'QA', name: 'Qatar' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'OM', name: 'Oman' },
  { code: 'JO', name: 'Jordan' },
  { code: 'LB', name: 'Lebanon' },
  { code: 'SY', name: 'Syria' },
  { code: 'IQ', name: 'Iraq' },
  { code: 'IR', name: 'Iran' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'NP', name: 'Nepal' },
  { code: 'BT', name: 'Bhutan' },
  { code: 'MV', name: 'Maldives' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'TH', name: 'Thailand' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'PH', name: 'Philippines' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'KH', name: 'Cambodia' },
  { code: 'LA', name: 'Laos' },
  { code: 'MN', name: 'Mongolia' },
  { code: 'KZ', name: 'Kazakhstan' },
  { code: 'UZ', name: 'Uzbekistan' },
  { code: 'KG', name: 'Kyrgyzstan' },
  { code: 'TJ', name: 'Tajikistan' },
  { code: 'TM', name: 'Turkmenistan' },
  { code: 'AF', name: 'Afghanistan' },
  { code: 'RU', name: 'Russia' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'BY', name: 'Belarus' },
  { code: 'MD', name: 'Moldova' },
  { code: 'RO', name: 'Romania' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'HR', name: 'Croatia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'PL', name: 'Poland' },
  { code: 'HU', name: 'Hungary' },
  { code: 'RS', name: 'Serbia' },
  { code: 'BA', name: 'Bosnia and Herzegovina' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MK', name: 'North Macedonia' },
  { code: 'AL', name: 'Albania' },
  { code: 'GR', name: 'Greece' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'MT', name: 'Malta' },
  { code: 'PT', name: 'Portugal' },
  { code: 'IS', name: 'Iceland' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'MC', name: 'Monaco' },
  { code: 'SM', name: 'San Marino' },
  { code: 'VA', name: 'Vatican City' },
  { code: 'AD', name: 'Andorra' },
  { code: 'FO', name: 'Faroe Islands' },
  { code: 'GL', name: 'Greenland' },
  { code: 'GI', name: 'Gibraltar' },
  { code: 'BM', name: 'Bermuda' },
  { code: 'TC', name: 'Turks and Caicos Islands' },
  { code: 'VG', name: 'British Virgin Islands' },
  { code: 'AI', name: 'Anguilla' },
  { code: 'MS', name: 'Montserrat' },
  { code: 'KY', name: 'Cayman Islands' },
  { code: 'FK', name: 'Falkland Islands' },
  { code: 'GS', name: 'South Georgia and the South Sandwich Islands' },
  { code: 'IO', name: 'British Indian Ocean Territory' },
  { code: 'PN', name: 'Pitcairn Islands' },
  { code: 'SH', name: 'Saint Helena' },
  { code: 'AC', name: 'Ascension Island' },
  { code: 'TA', name: 'Tristan da Cunha' },
  { code: 'AW', name: 'Aruba' },
  { code: 'CW', name: 'Curaçao' },
  { code: 'SX', name: 'Sint Maarten' },
  { code: 'BQ', name: 'Caribbean Netherlands' },
  { code: 'GF', name: 'French Guiana' },
  { code: 'PF', name: 'French Polynesia' },
  { code: 'NC', name: 'New Caledonia' },
  { code: 'WF', name: 'Wallis and Futuna' },
  { code: 'YT', name: 'Mayotte' },
  { code: 'RE', name: 'Réunion' },
  { code: 'BL', name: 'Saint Barthélemy' },
  { code: 'MF', name: 'Saint Martin' },
  { code: 'PM', name: 'Saint Pierre and Miquelon' },
  { code: 'TF', name: 'French Southern Territories' },
  { code: 'GP', name: 'Guadeloupe' },
  { code: 'MQ', name: 'Martinique' },
  { code: 'AS', name: 'American Samoa' },
  { code: 'GU', name: 'Guam' },
  { code: 'MP', name: 'Northern Mariana Islands' },
  { code: 'PR', name: 'Puerto Rico' },
  { code: 'VI', name: 'U.S. Virgin Islands' },
  { code: 'UM', name: 'United States Minor Outlying Islands' },
  { code: 'CK', name: 'Cook Islands' },
  { code: 'NU', name: 'Niue' },
  { code: 'TK', name: 'Tokelau' },
  { code: 'TV', name: 'Tuvalu' },
  { code: 'NR', name: 'Nauru' },
  { code: 'PW', name: 'Palau' },
  { code: 'MH', name: 'Marshall Islands' },
  { code: 'FM', name: 'Micronesia' },
  { code: 'KI', name: 'Kiribati' },
  { code: 'VU', name: 'Vanuatu' },
  { code: 'FJ', name: 'Fiji' },
  { code: 'TO', name: 'Tonga' },
  { code: 'WS', name: 'Samoa' },
  { code: 'SB', name: 'Solomon Islands' },
  { code: 'PG', name: 'Papua New Guinea' },
  { code: 'TL', name: 'Timor-Leste' },
  { code: 'BN', name: 'Brunei' },
  { code: 'MO', name: 'Macau' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'CN', name: 'China' },
  { code: 'KP', name: 'North Korea' },
  { code: 'AM', name: 'Armenia' },
  { code: 'AZ', name: 'Azerbaijan' },
  { code: 'GE', name: 'Georgia' },
  { code: 'EE', name: 'Estonia' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'Other', name: 'Other' }
];

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

interface PersonalProfileData {
  name?: string;
  email?: string;
  about?: string;
  photo?: string;
  age?: number;
  yearsSinceDiagnosis?: string;
  favoriteActivities?: string;
  country?: string;
  state?: string;
  phone?: string;
  occupation?: string;
}

export default function PersonalProfile() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<PersonalProfileData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProfile, setEditingProfile] = useState<PersonalProfileData>({});
  const [validationErrors, setValidationErrors] = useState<any>({});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
              router.push('/login');
      return;
    }
    if (status === 'authenticated') {
      fetchProfile();
    }
  }, [status, router]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/personal-profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setEditingProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateProfile = (profileData: PersonalProfileData) => {
    const errors: any = {};
    if (!profileData.name || profileData.name.trim().length < 2) {
      errors.name = 'Name is required and must be at least 2 characters.';
    }
    if (!profileData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      errors.email = 'Valid email is required.';
    }
    if (!profileData.age) {
      errors.age = 'Age is required.';
    } else if (profileData.age < 13 || profileData.age > 130) {
      errors.age = 'Please enter a valid age (13-130).';
    }
    if (!profileData.country) {
      errors.country = 'Country is required.';
    }
    if (profileData.country === 'US' && !profileData.state) {
      errors.state = 'State is required for US.';
    }
    
    // Validate years since diagnosis is not more than age
    if (profileData.age && profileData.yearsSinceDiagnosis) {
      const yearsSinceDiagnosisValue = getYearsSinceDiagnosisValue(profileData.yearsSinceDiagnosis);
      if (yearsSinceDiagnosisValue > profileData.age) {
        errors.yearsSinceDiagnosis = 'Years with diabetes cannot be more than your age. Please check your information.';
      }
    }
    
    return errors;
  };

  const getYearsSinceDiagnosisValue = (value: string): number => {
    switch (value) {
      case '<1': return 0;
      case '1-2': return 1;
      case '3-10': return 5;
      case '10+': return 10;
      default: return 0;
    }
  };

  const handleSave = async () => {
    const errors = validateProfile(editingProfile);
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    try {
      const res = await fetch('/api/personal-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProfile),
      });
      if (res.ok) {
        setProfile(editingProfile);
        setIsEditing(false);
        // Dispatch event to update navigation photo
        if (editingProfile.photo !== profile.photo) {
          window.dispatchEvent(new CustomEvent('profilePhotoUpdated'));
        }
      } else {
        const errorData = await res.json();
        console.error('Save profile error:', errorData);
        alert(`Failed to save profile: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Save profile exception:', error);
      alert(`Failed to save profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingProfile(profile);
    setIsEditing(false);
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      // Resize and compress image
      const img = document.createElement('img');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        // Calculate new dimensions (max 800x800)
        let width = img.width;
        let height = img.height;
        const maxSize = 800;

        if (width > height && width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        // Convert to base64 with compression (quality 0.8)
        const base64String = canvas.toDataURL('image/jpeg', 0.8);
        
        // Check if compressed size is reasonable (base64 < 1MB)
        if (base64String.length > 1.5 * 1024 * 1024) {
          alert('Compressed image is still too large. Please use a smaller image.');
          setUploadingPhoto(false);
          return;
        }

        setEditingProfile(prev => ({ ...prev, photo: base64String }));
        setProfile(prev => ({ ...prev, photo: base64String }));
        
        // Dispatch event to update navigation photo
        window.dispatchEvent(new CustomEvent('profilePhotoUpdated'));
        setUploadingPhoto(false);
      };

      img.onerror = () => {
        alert('Error loading image');
        setUploadingPhoto(false);
      };

      // Read file as data URL
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        alert('Error reading file');
        setUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo');
      setUploadingPhoto(false);
    }
  };

  const triggerPhotoUpload = () => {
    fileInputRef.current?.click();
  };

  const getCountryName = (countryCode: string) => {
    const country = countries.find(c => c.code === countryCode);
    return country ? country.name : countryCode;
  };

  const getStateName = (stateCode: string) => {
    const state = US_STATES.find(s => s.code === stateCode);
    return state ? state.name : stateCode;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not provided';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleDeleteProfile = async () => {
    setDeleting(true);
    try {
      const response = await fetch('/api/personal-profile', {
        method: 'DELETE',
      });

      if (response.ok) {
        // Account deleted successfully - redirect to home page
        // Sign out and redirect to home page
        await signOut({ callbackUrl: '/' });
      } else {
        alert('Failed to delete account');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-white">Personal Profile</h1>
                <p className="text-slate-300 mt-1">Manage your personal information and preferences</p>
              </div>
              {!isEditing ? (
                <button 
                  onClick={() => setIsEditing(true)} 
                  className="flex items-center px-6 py-3 bg-white text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium shadow-sm"
                >
                  <Edit2 className="h-4 w-4 mr-2" /> Edit Profile
                </button>
              ) : (
                <div className="flex space-x-3">
                  <button 
                    onClick={handleSave} 
                    disabled={saving} 
                    className="flex items-center px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors font-medium shadow-sm"
                  >
                    <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button 
                    onClick={handleCancel} 
                    className="flex items-center px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium shadow-sm"
                  >
                    <X className="h-4 w-4 mr-2" /> Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Photo Section */}
            <div className="mb-8 flex items-center space-x-6 p-6 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200">
              <div className="relative">
                {profile.photo ? (
                  <img
                    src={profile.photo}
                    alt="Profile"
                    className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center border-4 border-white shadow-lg">
                    <span className="text-4xl text-white">👤</span>
                  </div>
                )}
                {isEditing && (
                  <button
                    onClick={triggerPhotoUpload}
                    disabled={uploadingPhoto}
                    className="absolute -bottom-2 -right-2 bg-slate-700 text-white rounded-full p-3 hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-lg"
                    title="Change photo"
                  >
                    {uploadingPhoto ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Edit2 className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  {profile.name || 'Your Name'}
                </h2>
                <p className="text-slate-600 text-lg">
                  {profile.email || 'your.email@example.com'}
                </p>
                {isEditing && (
                  <p className="text-sm text-slate-500 mt-2">
                    Click the edit button to change your profile photo
                  </p>
                )}
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />

                        {/* Form Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Full Name *</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editingProfile.name || ''} 
                    onChange={e => setEditingProfile({ ...editingProfile, name: e.target.value })} 
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors" 
                    required 
                  />
                ) : (
                  <p className="px-4 py-3 bg-slate-50 rounded-lg text-slate-700">{profile.name || 'Not provided'}</p>
                )}
                {validationErrors.name && <p className="text-red-600 text-sm font-medium">{validationErrors.name}</p>}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Email *</label>
                {isEditing ? (
                  <input 
                    type="email" 
                    value={editingProfile.email || ''} 
                    onChange={e => setEditingProfile({ ...editingProfile, email: e.target.value })} 
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors" 
                    required 
                  />
                ) : (
                  <p className="px-4 py-3 bg-slate-50 rounded-lg text-slate-700">{profile.email || 'Not provided'}</p>
                )}
                {validationErrors.email && <p className="text-red-600 text-sm font-medium">{validationErrors.email}</p>}
              </div>

              {/* Age */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Age *</label>
                {isEditing ? (
                  <input 
                    type="number" 
                    min="13"
                    max="130"
                    value={editingProfile.age || ''} 
                    onChange={e => setEditingProfile({ ...editingProfile, age: parseInt(e.target.value) || undefined })} 
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors" 
                    required 
                  />
                ) : (
                  <p className="px-4 py-3 bg-slate-50 rounded-lg text-slate-700">{profile.age || 'Not provided'}</p>
                )}
                {validationErrors.age && <p className="text-red-600 text-sm font-medium">{validationErrors.age}</p>}
              </div>

              {/* Country */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Country *</label>
                {isEditing ? (
                  <select 
                    value={editingProfile.country || ''} 
                    onChange={e => setEditingProfile({ ...editingProfile, country: e.target.value, state: '' })} 
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors" 
                    required
                  >
                    <option value="">Select your country</option>
                    {countries.map((country) => (
                      <option key={country.code} value={country.code}>{country.name}</option>
                    ))}
                  </select>
                ) : (
                  <p className="px-4 py-3 bg-slate-50 rounded-lg text-slate-700">{profile.country ? getCountryName(profile.country) : 'Not provided'}</p>
                )}
                {validationErrors.country && <p className="text-red-600 text-sm font-medium">{validationErrors.country}</p>}
              </div>

              {/* State (if US) */}
              {((isEditing && editingProfile.country === 'US') || (!isEditing && profile.country === 'US')) && (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">State *</label>
                  {isEditing ? (
                    <select 
                      value={editingProfile.state || ''} 
                      onChange={e => setEditingProfile({ ...editingProfile, state: e.target.value })} 
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors" 
                      required
                    >
                      <option value="">Select your state</option>
                      {US_STATES.map((state) => (
                        <option key={state.code} value={state.code}>{state.name}</option>
                      ))}
                    </select>
                                      ) : (
                      <p className="px-4 py-3 bg-slate-50 rounded-lg text-slate-700">{profile.state ? getStateName(profile.state) : 'Not provided'}</p>
                    )}
                  {validationErrors.state && <p className="text-red-600 text-sm font-medium">{validationErrors.state}</p>}
                </div>
              )}

              {/* Phone (optional) */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Phone</label>
                {isEditing ? (
                  <input 
                    type="tel" 
                    value={editingProfile.phone || ''} 
                    onChange={e => setEditingProfile({ ...editingProfile, phone: e.target.value })} 
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors" 
                  />
                ) : (
                  <p className="px-4 py-3 bg-slate-50 rounded-lg text-slate-700">{profile.phone || 'Not provided'}</p>
                )}
              </div>

              {/* Years Since Diagnosis */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Years Since T1D Diagnosis</label>
                {isEditing ? (
                  <select
                    value={editingProfile.yearsSinceDiagnosis || ''} 
                    onChange={e => setEditingProfile({ ...editingProfile, yearsSinceDiagnosis: e.target.value })} 
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors" 
                  >
                    <option value="">Select years since diagnosis</option>
                    <option value="<1">&lt;1 year</option>
                    <option value="1-2">1-2 years</option>
                    <option value="3-10">3-10 years</option>
                    <option value="10+">10+ years</option>
                  </select>
                ) : (
                  <p className="px-4 py-3 bg-slate-50 rounded-lg text-slate-700">
                    {profile.yearsSinceDiagnosis ? 
                      (profile.yearsSinceDiagnosis === '<1' ? '<1 year' : 
                       profile.yearsSinceDiagnosis === '1-2' ? '1-2 years' :
                       profile.yearsSinceDiagnosis === '3-10' ? '3-10 years' :
                       profile.yearsSinceDiagnosis === '10+' ? '10+ years' : 'Not provided') 
                      : 'Not provided'}
                  </p>
                )}
                {validationErrors.yearsSinceDiagnosis && <p className="text-red-600 text-sm font-medium">{validationErrors.yearsSinceDiagnosis}</p>}
              </div>
            </div>

            {/* Full Width Fields */}
            <div className="mt-8 space-y-6">
              {/* Activities and Interests */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Activities & Interests</label>
                {isEditing ? (
                  <textarea 
                    value={editingProfile.favoriteActivities || ''} 
                    onChange={e => setEditingProfile({ ...editingProfile, favoriteActivities: e.target.value })} 
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors resize-none" 
                    rows={3}
                    placeholder="Tell us about your hobbies and interests..."
                  />
                ) : (
                  <p className="px-4 py-3 bg-slate-50 rounded-lg text-slate-700 min-h-[60px]">{profile.favoriteActivities || 'Not provided'}</p>
                )}
              </div>

              {/* About */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">About</label>
                {isEditing ? (
                  <textarea 
                    value={editingProfile.about || ''} 
                    onChange={e => setEditingProfile({ ...editingProfile, about: e.target.value })} 
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors resize-none" 
                    rows={4}
                    placeholder="Tell us a bit about yourself..."
                  />
                ) : (
                  <p className="px-4 py-3 bg-slate-50 rounded-lg text-slate-700 min-h-[80px]">{profile.about || 'Not provided'}</p>
                )}
              </div>
            </div>

            {/* Delete Profile Section - Only show when editing */}
            {isEditing && (
              <div className="mt-12 pt-8 border-t border-slate-200">
                <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-red-800 mb-2">Delete Account</h3>
                      <p className="text-red-700 text-sm mb-4">
                        Permanently delete your entire account and all associated data including profile information, 
                        diabetes readings, treatments, settings, and all other data. This action cannot be undone.
                      </p>
                      <button 
                        onClick={() => setShowDeleteConfirmation(true)} 
                        className="flex items-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm"
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-2xl">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Delete Account</h3>
                <p className="text-slate-600 text-sm">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-slate-700 mb-6">
              Are you sure you want to delete your entire account? This will permanently remove ALL your data including 
              profile information, diabetes readings, treatments, settings, and everything else. You will need to create 
              a new account to use the application again.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirmation(false)}
                className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProfile}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-medium"
              >
                {deleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 