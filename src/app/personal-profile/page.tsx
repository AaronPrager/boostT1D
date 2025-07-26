'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Edit2, Save, X, Mail, Lock, Eye, EyeOff } from 'lucide-react';
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
  dateOfBirth?: string;
  diagnosisAge?: number;
  favoriteActivities?: string;
  country?: string;
  state?: string;
  phone?: string;
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

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
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
    if (!profileData.dateOfBirth) {
      errors.dateOfBirth = 'Date of birth is required.';
    }
    if (!profileData.country) {
      errors.country = 'Country is required.';
    }
    if (profileData.country === 'US' && !profileData.state) {
      errors.state = 'State is required for US.';
    }
    return errors;
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
      } else {
        alert('Failed to save profile');
      }
    } catch (error) {
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingProfile(profile);
    setIsEditing(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded shadow">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Personal Profile</h1>
            {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
              <Edit2 className="h-4 w-4 mr-2" /> Edit
              </button>
            ) : (
              <div className="flex space-x-2">
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save'}
                </button>
              <button onClick={handleCancel} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                <X className="h-4 w-4 mr-2" /> Cancel
                </button>
              </div>
            )}
          </div>
        <form className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name *</label>
            {isEditing ? (
              <input type="text" value={editingProfile.name || ''} onChange={e => setEditingProfile({ ...editingProfile, name: e.target.value })} className="w-full px-3 py-2 border rounded" required />
            ) : (
              <p>{profile.name}</p>
            )}
            {validationErrors.name && <p className="text-red-600 text-sm">{validationErrors.name}</p>}
          </div>
          {/* Email */}
              <div>
            <label className="block text-sm font-medium text-gray-700">Email *</label>
                {isEditing ? (
              <input type="email" value={editingProfile.email || ''} onChange={e => setEditingProfile({ ...editingProfile, email: e.target.value })} className="w-full px-3 py-2 border rounded" required />
            ) : (
              <p>{profile.email}</p>
            )}
            {validationErrors.email && <p className="text-red-600 text-sm">{validationErrors.email}</p>}
              </div>
          {/* Password (change logic as needed) */}
          {/* You can add a password change section here if needed */}
          {/* Date of Birth */}
              <div>
            <label className="block text-sm font-medium text-gray-700">Date of Birth *</label>
                {isEditing ? (
              <input type="date" value={editingProfile.dateOfBirth || ''} onChange={e => setEditingProfile({ ...editingProfile, dateOfBirth: e.target.value })} className="w-full px-3 py-2 border rounded" required />
            ) : (
              <p>{profile.dateOfBirth}</p>
            )}
            {validationErrors.dateOfBirth && <p className="text-red-600 text-sm">{validationErrors.dateOfBirth}</p>}
          </div>
          {/* Country */}
              <div>
            <label className="block text-sm font-medium text-gray-700">Country *</label>
                {isEditing ? (
              <select value={editingProfile.country || ''} onChange={e => setEditingProfile({ ...editingProfile, country: e.target.value, state: '' })} className="w-full px-3 py-2 border rounded" required>
                <option value="">Select your country</option>
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>{country.name}</option>
                ))}
              </select>
            ) : (
              <p>{profile.country}</p>
            )}
            {validationErrors.country && <p className="text-red-600 text-sm">{validationErrors.country}</p>}
          </div>
          {/* State (if US) */}
          {((isEditing && editingProfile.country === 'US') || (!isEditing && profile.country === 'US')) && (
            <div>
              <label className="block text-sm font-medium text-gray-700">State *</label>
              {isEditing ? (
                <select value={editingProfile.state || ''} onChange={e => setEditingProfile({ ...editingProfile, state: e.target.value })} className="w-full px-3 py-2 border rounded" required>
                  <option value="">Select your state</option>
                  {US_STATES.map((state) => (
                    <option key={state.code} value={state.code}>{state.name}</option>
                  ))}
                </select>
              ) : (
                <p>{profile.state}</p>
              )}
              {validationErrors.state && <p className="text-red-600 text-sm">{validationErrors.state}</p>}
            </div>
          )}
          {/* Phone (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            {isEditing ? (
              <input type="tel" value={editingProfile.phone || ''} onChange={e => setEditingProfile({ ...editingProfile, phone: e.target.value })} className="w-full px-3 py-2 border rounded" />
            ) : (
              <p>{profile.phone}</p>
            )}
          </div>
          {/* Activities and Interests (optional) */}
              <div>
            <label className="block text-sm font-medium text-gray-700">Activities & Interests</label>
                {isEditing ? (
              <textarea value={editingProfile.favoriteActivities || ''} onChange={e => setEditingProfile({ ...editingProfile, favoriteActivities: e.target.value })} className="w-full px-3 py-2 border rounded" rows={2} />
            ) : (
              <p>{profile.favoriteActivities}</p>
                )}
              </div>
          {/* About (optional) */}
              <div>
            <label className="block text-sm font-medium text-gray-700">About</label>
                {isEditing ? (
              <textarea value={editingProfile.about || ''} onChange={e => setEditingProfile({ ...editingProfile, about: e.target.value })} className="w-full px-3 py-2 border rounded" rows={2} />
            ) : (
              <p>{profile.about}</p>
                )}
              </div>
          {/* Diagnosis Age (optional) */}
              <div>
            <label className="block text-sm font-medium text-gray-700">Diagnosis Age</label>
                {isEditing ? (
              <input type="number" value={editingProfile.diagnosisAge || ''} onChange={e => setEditingProfile({ ...editingProfile, diagnosisAge: parseInt(e.target.value) || undefined })} className="w-full px-3 py-2 border rounded" />
            ) : (
              <p>{profile.diagnosisAge}</p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
} 