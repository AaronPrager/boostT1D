'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface UserProfile {
  id: string;
  name: string;
  dateOfBirth?: string;
  diagnosisAge?: number;
  favoriteActivities?: string;
  about?: string;
  photo?: string;
  address?: {
    country?: string;
    state?: string;
    city?: string;
  };
  // Contact info - only populated for approved connections
  email?: string;
  phone?: string;
}

interface MatchResult {
  user: UserProfile;
  score: number;
  reasons: string[];
  connectionStatus?: {
    type: 'sent' | 'received';
    status: 'pending' | 'approved' | 'rejected';
    id: string;
  } | null;
}

interface ConnectionRequestData {
  targetUserId: string;
  message?: string;
}

export default function BuddiesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connectingTo, setConnectingTo] = useState<string | null>(null);
  const [connectionMessage, setConnectionMessage] = useState('');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const calculateAge = (dateOfBirth: string): number | null => {
    if (!dateOfBirth) return null;
    const birth = new Date(dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1;
    }
    return age;
  };

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    loadMatches();
  }, [session, status, router]);

  const loadMatches = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/buddies');
      
      if (!response.ok) {
        if (response.status === 503) {
          throw new Error('Buddy matching feature is temporarily unavailable');
        }
        throw new Error('Failed to load buddy matches');
      }
      
      const data = await response.json();
      setMatches(data.matches || []);
    } catch (error) {
      console.error('Error loading matches:', error);
      setError(error instanceof Error ? error.message : 'Failed to load buddy matches');
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectRequest = async (user: UserProfile, match: MatchResult) => {
    // If this is a received request, show approval options
    if (match.connectionStatus?.type === 'received' && match.connectionStatus.status === 'pending') {
      setSelectedUser(user);
      setShowResponseModal(true);
    } else {
      // Otherwise, show message modal for new connection
      setSelectedUser(user);
      setShowMessageModal(true);
    }
  };

  const sendConnectionRequest = async () => {
    if (!selectedUser) return;

    try {
      setConnectingTo(selectedUser.id);
      
      const response = await fetch('/api/buddies/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: selectedUser.id,
          message: connectionMessage
        })
      });

      if (!response.ok) {
        if (response.status === 503) {
          throw new Error('Buddy connection feature is temporarily unavailable');
        }
        throw new Error('Failed to send connection request');
      }

      // Reload matches to get updated connection status
      await loadMatches();

      setShowMessageModal(false);
      setConnectionMessage('');
      setSelectedUser(null);
    } catch (error) {
      console.error('Error sending connection request:', error);
      setError(error instanceof Error ? error.message : 'Failed to send connection request');
    } finally {
      setConnectingTo(null);
    }
  };

  const respondToConnectionRequest = async (status: 'approved' | 'rejected') => {
    if (!selectedUser) return;

    try {
      setConnectingTo(selectedUser.id);
      
      // Find the connection ID for this user
      const match = matches.find(m => m.user.id === selectedUser.id);
      if (!match?.connectionStatus?.id) {
        throw new Error('Connection ID not found');
      }

      const response = await fetch('/api/buddies/connect', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId: match.connectionStatus.id,
          status
        })
      });

      if (!response.ok) {
        throw new Error('Failed to respond to connection request');
      }

      // If approved, reload matches to get contact information
      if (status === 'approved') {
        await loadMatches();
      } else {
        // Update the UI to reflect the response
        setMatches(prev => prev.map(match => 
          match.user.id === selectedUser.id 
            ? {
                ...match,
                connectionStatus: {
                  type: 'received' as const,
                  status: status,
                  id: match.connectionStatus?.id || 'unknown'
                }
              }
            : match
        ));
      }

      setShowResponseModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error responding to connection request:', error);
      setError(error instanceof Error ? error.message : 'Failed to respond to connection request');
    } finally {
      setConnectingTo(null);
    }
  };

  const getConnectionButtonText = (connectionStatus: MatchResult['connectionStatus']) => {
    if (!connectionStatus) return 'Connect';
    
    switch (connectionStatus.status) {
      case 'pending':
        return connectionStatus.type === 'sent' ? 'Request Sent' : 'Respond';
      case 'approved':
        return 'Connected';
      case 'rejected':
        return connectionStatus.type === 'sent' ? 'Request Declined' : 'Request Rejected';
      default:
        return 'Connect';
    }
  };

  const getConnectionButtonStyle = (connectionStatus: MatchResult['connectionStatus']) => {
    if (!connectionStatus) {
      return 'bg-indigo-600 hover:bg-indigo-700 text-white';
    }
    
    switch (connectionStatus.status) {
      case 'pending':
        return connectionStatus.type === 'sent' 
          ? 'bg-gray-400 text-white cursor-not-allowed'
          : 'bg-blue-600 hover:bg-blue-700 text-white';
      case 'approved':
        return 'bg-green-500 text-white cursor-not-allowed';
      case 'rejected':
        return 'bg-gray-400 text-white cursor-not-allowed';
      default:
        return 'bg-indigo-600 hover:bg-indigo-700 text-white';
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Your T1D Buddy</h1>
          <p className="text-lg text-gray-600">
            Connect with others who share similar experiences, interests, and diabetes journey.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Matches */}
        {matches.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No matches found</h3>
            <p className="text-gray-600 mb-4">
              Complete your personal profile with interests and details to find better matches.
            </p>
            <button
              onClick={() => router.push('/personal-profile')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Update Profile
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.map((match) => (
              <div key={match.user.id} className="bg-white shadow rounded-lg overflow-hidden">
                {/* Profile Header */}
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="flex-shrink-0">
                      {match.user.photo ? (
                        <img
                          src={match.user.photo}
                          alt={match.user.name}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                          <span className="text-xl font-medium text-gray-500">
                            {match.user.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">{match.user.name}</h3>
                      <div className="flex items-center text-sm text-gray-600">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          match.score >= 80 ? 'bg-green-100 text-green-800' :
                          match.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {match.score}% match
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* User Details */}
                  <div className="space-y-2 mb-4">
                    {match.user.diagnosisAge && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Diagnosed at:</span> {match.user.diagnosisAge} years old
                      </p>
                    )}
                    {match.user.address?.country && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Location:</span> {match.user.address.state ? `${match.user.address.state}, ` : ''}{match.user.address.country}
                      </p>
                    )}
                    {match.user.favoriteActivities && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Interests:</span> {match.user.favoriteActivities}
                      </p>
                    )}
                  </div>

                  {/* Contact Information - Only shown for approved connections */}
                  {match.connectionStatus?.status === 'approved' && (match.user.email || match.user.phone) && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                      <div className="flex items-center mb-2">
                        <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h4 className="text-sm font-medium text-green-800">Connected - Contact Information</h4>
                      </div>
                      <div className="space-y-1">
                        {match.user.email && (
                          <div className="flex items-center text-sm text-green-700">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <a href={`mailto:${match.user.email}`} className="hover:underline">
                              {match.user.email}
                            </a>
                          </div>
                        )}
                        {match.user.phone && (
                          <div className="flex items-center text-sm text-green-700">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <a href={`tel:${match.user.phone}`} className="hover:underline">
                              {match.user.phone}
                            </a>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-green-600 mt-2">
                        You can now connect outside the app! 🎉
                      </p>
                    </div>
                  )}

                  {/* About */}
                  {match.user.about && (
                    <p className="text-sm text-gray-700 mb-4 line-clamp-3">
                      {match.user.about}
                    </p>
                  )}

                  {/* Match Reasons */}
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-500 mb-2">Why you match:</p>
                    <ul className="space-y-1">
                      {match.reasons.slice(0, 3).map((reason, index) => (
                        <li key={index} className="text-xs text-gray-600 flex items-center">
                          <svg className="w-3 h-3 text-green-500 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Connect Button */}
                  <button
                    onClick={() => handleConnectRequest(match.user, match)}
                    disabled={connectingTo === match.user.id || (match.connectionStatus?.status === 'pending' && match.connectionStatus.type === 'sent') || match.connectionStatus?.status === 'approved' || match.connectionStatus?.status === 'rejected'}
                    className={`w-full px-4 py-2 rounded-md text-sm font-medium transition-colors ${getConnectionButtonStyle(match.connectionStatus)}`}
                  >
                    {connectingTo === match.user.id ? (
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Connecting...
                      </div>
                    ) : (
                      getConnectionButtonText(match.connectionStatus)
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Connection Message Modal */}
        {showMessageModal && selectedUser && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Connect with {selectedUser.name}
                </h3>
                <div className="mb-4">
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Optional message:
                  </label>
                  <textarea
                    id="message"
                    rows={3}
                    value={connectionMessage}
                    onChange={(e) => setConnectionMessage(e.target.value)}
                    placeholder="Hi! I'd love to connect and share experiences..."
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowMessageModal(false);
                      setConnectionMessage('');
                      setSelectedUser(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendConnectionRequest}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
                  >
                    Send Request
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Response Modal */}
        {showResponseModal && selectedUser && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Respond to Connection Request
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  {selectedUser.name} would like to connect with you. How would you like to respond?
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowResponseModal(false);
                      setSelectedUser(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => respondToConnectionRequest('rejected')}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => respondToConnectionRequest('approved')}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
                  >
                    Approve
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 