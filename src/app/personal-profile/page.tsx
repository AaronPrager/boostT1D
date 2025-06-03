'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Camera, User, MapPin, Phone, Calendar, Heart, Users, Edit2, Save, X, Mail, Lock, Eye, EyeOff } from 'lucide-react';

interface PersonalProfileData {
  name?: string;
  email?: string;
  about?: string;
  photo?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  phone?: string;
  dateOfBirth?: string;
  diagnosisAge?: number;
  favoriteActivities?: string;
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
}

interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ValidationErrors {
  email?: string;
  dateOfBirth?: string;
  country?: string;
  passwordMismatch?: string;
  currentPassword?: string;
}

export default function PersonalProfile() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState<PersonalProfileData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProfile, setEditingProfile] = useState<PersonalProfileData>({});
  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [changingPassword, setChangingPassword] = useState(false);

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
        // Include email from session
        const profileWithEmail = {
          ...data,
          email: session?.user?.email || ''
        };
        setProfile(profileWithEmail);
        setEditingProfile(profileWithEmail);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateProfile = (profileData: PersonalProfileData): ValidationErrors => {
    const errors: ValidationErrors = {};
    
    // Email validation
    if (!profileData.email || !profileData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Date of birth validation
    if (!profileData.dateOfBirth || !profileData.dateOfBirth.trim()) {
      errors.dateOfBirth = 'Date of birth is required';
    }
    
    // Country validation
    if (!profileData.address?.country || !profileData.address.country.trim()) {
      errors.country = 'Country is required';
    }
    
    return errors;
  };

  const validatePassword = (passwordData: PasswordChangeData): ValidationErrors => {
    const errors: ValidationErrors = {};
    
    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.passwordMismatch = 'New passwords do not match';
    }
    
    if (passwordData.newPassword.length < 6) {
      errors.passwordMismatch = 'New password must be at least 6 characters long';
    }
    
    return errors;
  };

  const handleEmailChange = async (newEmail: string) => {
    try {
      const response = await fetch('/api/auth/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail }),
      });

      if (response.ok) {
        alert('Email updated successfully. Please sign in again with your new email.');
        // Force sign out and redirect to login
        window.location.href = '/auth/signin';
      } else {
        const error = await response.text();
        alert(`Failed to update email: ${error}`);
      }
    } catch (error) {
      console.error('Error updating email:', error);
      alert('Failed to update email');
    }
  };

  const handlePasswordChange = async () => {
    const passwordErrors = validatePassword(passwordData);
    setValidationErrors(passwordErrors);
    
    if (Object.keys(passwordErrors).length > 0) {
      return;
    }

    setChangingPassword(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (response.ok) {
        alert('Password updated successfully');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordForm(false);
        setValidationErrors({});
      } else {
        const error = await response.text();
        setValidationErrors({ currentPassword: error });
      }
    } catch (error) {
      console.error('Error updating password:', error);
      setValidationErrors({ currentPassword: 'Failed to update password' });
    } finally {
      setChangingPassword(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch('/api/personal-profile/photos', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const newPhoto = data.photoUrl;
        
        // Update the profile with new photo
        const updatedProfile = { ...profile, photo: newPhoto };
        setProfile(updatedProfile);
        setEditingProfile(updatedProfile);
        
        // Save to backend
        await fetch('/api/personal-profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedProfile),
        });

        // Dispatch event to update navigation avatar
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('profilePhotoUpdated'));
        }
      } else {
        const errorData = await response.text();
        alert(`Upload failed: ${errorData}`);
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    // Validate required fields
    const errors = validateProfile(editingProfile);
    setValidationErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      alert('Please fix the validation errors before saving.');
      return;
    }

    setSaving(true);
    try {
      // Check if email has changed
      const emailChanged = editingProfile.email !== profile.email;
      
      if (emailChanged) {
        // Handle email change separately
        await handleEmailChange(editingProfile.email!);
        return; // This will redirect to login
      }

      const response = await fetch('/api/personal-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProfile),
      });

      if (response.ok) {
        setProfile(editingProfile);
        setIsEditing(false);
        setValidationErrors({});
      } else {
        alert('Failed to save profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingProfile(profile);
    setIsEditing(false);
  };

  const formatAddress = (address?: PersonalProfileData['address']) => {
    if (!address) return '';
    const parts = [
      address.street,
      address.city,
      address.state,
      address.zipCode,
      address.country
    ].filter(Boolean);
    return parts.join(', ');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Personal Profile</h1>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                <Edit2 className="h-4 w-4" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Saving...' : 'Save'}</span>
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </button>
              </div>
            )}
          </div>

          {/* Profile Photo Section */}
          <div className="px-6 py-6">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 border-4 border-white shadow-lg">
                  {profile.photo ? (
                    <img
                      src={profile.photo}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
                      <User className="h-16 w-16 text-indigo-400" />
                    </div>
                  )}
                </div>
                
                {isEditing && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full shadow-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {uploadingPhoto ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </button>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>
              
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {profile.name || session?.user?.name || 'Your Name'}
                </h2>
                <p className="text-gray-600 mb-4">
                  {profile.about || 'Tell us about yourself...'}
                </p>
                {isEditing && (
                  <p className="text-sm text-gray-500">
                    Click the camera icon to upload a new profile photo
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2 text-indigo-600" />
              Basic Information
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editingProfile.name || ''}
                    onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-gray-900">{profile.name || 'Not provided'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                {isEditing ? (
                  <div>
                    <input
                      type="email"
                      value={editingProfile.email || ''}
                      onChange={(e) => setEditingProfile({ ...editingProfile, email: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        validationErrors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                    />
                    {validationErrors.email && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-900 flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-indigo-600" />
                    {profile.email || 'Not provided'}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">About</label>
                {isEditing ? (
                  <textarea
                    value={editingProfile.about || ''}
                    onChange={(e) => setEditingProfile({ ...editingProfile, about: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Tell us about yourself..."
                  />
                ) : (
                  <p className="text-gray-900">{profile.about || 'Not provided'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                {isEditing ? (
                  <div>
                    <input
                      type="date"
                      value={editingProfile.dateOfBirth || ''}
                      onChange={(e) => setEditingProfile({ ...editingProfile, dateOfBirth: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        validationErrors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                    />
                    {validationErrors.dateOfBirth && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.dateOfBirth}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-900 flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-indigo-600" />
                    {profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : 'Not provided'}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis Age</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={editingProfile.diagnosisAge || ''}
                    onChange={(e) => setEditingProfile({ ...editingProfile, diagnosisAge: parseInt(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Age when diagnosed with T1D"
                  />
                ) : (
                  <p className="text-gray-900">{profile.diagnosisAge ? `${profile.diagnosisAge} years old` : 'Not provided'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Phone className="h-5 w-5 mr-2 text-indigo-600" />
              Contact Information
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editingProfile.phone || ''}
                    onChange={(e) => setEditingProfile({ ...editingProfile, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-gray-900">{profile.phone || 'Not provided'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editingProfile.address?.street || ''}
                      onChange={(e) => setEditingProfile({
                        ...editingProfile,
                        address: { ...editingProfile.address, street: e.target.value }
                      })}
                      placeholder="Street"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={editingProfile.address?.city || ''}
                        onChange={(e) => setEditingProfile({
                          ...editingProfile,
                          address: { ...editingProfile.address, city: e.target.value }
                        })}
                        placeholder="City"
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <input
                        type="text"
                        value={editingProfile.address?.state || ''}
                        onChange={(e) => setEditingProfile({
                          ...editingProfile,
                          address: { ...editingProfile.address, state: e.target.value }
                        })}
                        placeholder="State"
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={editingProfile.address?.zipCode || ''}
                        onChange={(e) => setEditingProfile({
                          ...editingProfile,
                          address: { ...editingProfile.address, zipCode: e.target.value }
                        })}
                        placeholder="ZIP Code"
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <input
                        type="text"
                        value={editingProfile.address?.country || ''}
                        onChange={(e) => setEditingProfile({
                          ...editingProfile,
                          address: { ...editingProfile.address, country: e.target.value }
                        })}
                        placeholder="Country *"
                        className={`px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          validationErrors.country ? 'border-red-500' : 'border-gray-300'
                        }`}
                        required
                      />
                    </div>
                    {validationErrors.country && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.country}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-900 flex items-start">
                    <MapPin className="h-4 w-4 mr-2 text-indigo-600 mt-1 flex-shrink-0" />
                    {formatAddress(profile.address) || 'Not provided'}
                  </p>
                )}
              </div>

              {/* Password Change Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                {!showPasswordForm ? (
                  <button
                    onClick={() => setShowPasswordForm(true)}
                    className="flex items-center text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Change Password
                  </button>
                ) : (
                  <div className="space-y-3 p-4 bg-gray-50 rounded-md">
                    {/* Current Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.current ? 'text' : 'password'}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                          className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            validationErrors.currentPassword ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                          className="absolute inset-y-0 right-0 flex items-center pr-3"
                        >
                          {showPasswords.current ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                      {validationErrors.currentPassword && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.currentPassword}</p>
                      )}
                    </div>

                    {/* New Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.new ? 'text' : 'password'}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="At least 6 characters"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                          className="absolute inset-y-0 right-0 flex items-center pr-3"
                        >
                          {showPasswords.new ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.confirm ? 'text' : 'password'}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                          className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            validationErrors.passwordMismatch ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                          className="absolute inset-y-0 right-0 flex items-center pr-3"
                        >
                          {showPasswords.confirm ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                      {validationErrors.passwordMismatch && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.passwordMismatch}</p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2 pt-2">
                      <button
                        onClick={handlePasswordChange}
                        disabled={changingPassword}
                        className="flex items-center px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm"
                      >
                        {changingPassword ? 'Updating...' : 'Update Password'}
                      </button>
                      <button
                        onClick={() => {
                          setShowPasswordForm(false);
                          setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                          setValidationErrors({});
                        }}
                        className="px-3 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Activities & Interests */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Heart className="h-5 w-5 mr-2 text-indigo-600" />
              Activities & Interests
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Favorite Activities</label>
              {isEditing ? (
                <textarea
                  value={editingProfile.favoriteActivities || ''}
                  onChange={(e) => setEditingProfile({ ...editingProfile, favoriteActivities: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="What activities do you enjoy?"
                />
              ) : (
                <p className="text-gray-900">{profile.favoriteActivities || 'Not provided'}</p>
              )}
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2 text-indigo-600" />
              Emergency Contact
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editingProfile.emergencyContact?.name || ''}
                    onChange={(e) => setEditingProfile({
                      ...editingProfile,
                      emergencyContact: { ...editingProfile.emergencyContact, name: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-gray-900">{profile.emergencyContact?.name || 'Not provided'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editingProfile.emergencyContact?.phone || ''}
                    onChange={(e) => setEditingProfile({
                      ...editingProfile,
                      emergencyContact: { ...editingProfile.emergencyContact, phone: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-gray-900">{profile.emergencyContact?.phone || 'Not provided'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editingProfile.emergencyContact?.relationship || ''}
                    onChange={(e) => setEditingProfile({
                      ...editingProfile,
                      emergencyContact: { ...editingProfile.emergencyContact, relationship: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Spouse, Parent, Sibling"
                  />
                ) : (
                  <p className="text-gray-900">{profile.emergencyContact?.relationship || 'Not provided'}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 