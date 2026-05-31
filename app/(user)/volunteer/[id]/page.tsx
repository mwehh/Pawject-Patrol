'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, LogIn, X, Facebook, Instagram, Twitter, Mail, Calendar, MapPin, Users, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { joinVolunteerCall, leaveVolunteerCall, getUserResponseStatus, getVolunteerSignupCount } from '@/actions/volunteer/user';
import { syncVolunteerCallStatus } from '@/actions/volunteer/admin';
import Sidebar from '@/components/Sidebar';
import UserNotificationsBell from '@/components/UserNotificationsBell';

// Volunteer Call type definition
interface VolunteerCall {
  call_id: string;
  call_title: string | null;
  call_details: string | null;
  call_status: string | null;
  call_starttime: string | null;
  call_endtime: string | null;
  call_location: string | null;
  capacity: number | null;
  created_at: string | null;
}

// Helper function to format date and time
function formatDateTime(value?: string | null) {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return value;
  }
}

// Helper function for status badge colors
// Returns Tailwind class string for status badge
function statusBadgeClassName(status?: string | null) {
  const s = (status || '').toLowerCase();
  if (s === 'active') return 'bg-blue-100 text-blue-800 border-blue-200';
  if (s === 'filled') return 'bg-green-100 text-green-800 border-green-200';
  if (s === 'ongoing') return 'bg-purple-100 text-purple-800 border-purple-200';
  if (s === 'cancelled') return 'bg-red-100 text-red-800 border-red-200';
  if (s === 'completed') return 'bg-gray-100 text-gray-800 border-gray-200';
  return 'bg-amber-100 text-amber-800 border-amber-200';
}

// Returns inline style object for status badge (for border color)
function statusBadgeStyle(status?: string | null) {
  const s = (status || '').toLowerCase();
  if (s === 'active') return { borderColor: '#3B82F6' };
  if (s === 'filled') return { borderColor: '#22C55E' };
  if (s === 'ongoing') return { borderColor: '#8B5CF6' };
  if (s === 'cancelled') return { borderColor: '#EF4444' };
  if (s === 'completed') return { borderColor: '#6B7280' };
  return { borderColor: '#F59E42' };
}

// Volunteer Detail Page Component
export default function VolunteerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [volunteer, setVolunteer] = useState<VolunteerCall | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [signupCount, setSignupCount] = useState(0);
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  // Modal state
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  // Handle user logout and redirect to login page
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      if (user) {
        setUserEmail(user.email || '');
        const nameFromMeta = user.user_metadata?.full_name || user.user_metadata?.name || '';
        setUserName(nameFromMeta || user.email?.split('@')[0] || '');
      } else {
        setUserName('');
        setUserEmail('');
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
      if (session?.user) {
        setUserEmail(session.user.email || '');
        const nameFromMeta = session.user.user_metadata?.full_name || session.user.user_metadata?.name || '';
        setUserName(nameFromMeta || session.user.email?.split('@')[0] || '');
      } else {
        setUserName('');
        setUserEmail('');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch volunteer opportunity details
  useEffect(() => {
    const fetchVolunteer = async () => {
      setLoading(true);
      setError(null);

      // Sync status first
      await syncVolunteerCallStatus(unwrappedParams.id);

      const { data, error } = await supabase
        .from('volunteer_call')
        .select('*')
        .eq('call_id', unwrappedParams.id)
        .single();

      if (error) {
        setError(error.message);
        setVolunteer(null);
      } else {
        let volunteerData = data as VolunteerCall;
        
        // Sync status on the client side based on time
        const now = new Date();
        const startTime = volunteerData.call_starttime ? new Date(volunteerData.call_starttime) : null;
        const endTime = volunteerData.call_endtime ? new Date(volunteerData.call_endtime) : null;
        const currentStatus = (volunteerData.call_status || '').toLowerCase();
        
        // Status priority: Cancelled > Completed > Ongoing (time-based) > others
        if (currentStatus === 'cancelled') {
          // Keep cancelled status
        } else if (currentStatus === 'completed') {
          // Keep completed status (overrides all except cancelled)
        } else if (startTime && endTime && now >= startTime && now <= endTime) {
          // Check if ongoing (between start and end time) - overrides active/filled
          volunteerData = { ...volunteerData, call_status: 'Ongoing' };
        } else if (endTime && now > endTime && currentStatus !== 'completed') {
          // If past end time and not already marked completed, mark as completed
          volunteerData = { ...volunteerData, call_status: 'Completed' };
        }
        
        setVolunteer(volunteerData);
        
        // Fetch signup count and user status
        const count = await getVolunteerSignupCount(unwrappedParams.id);
        setSignupCount(count);
        
        const status = await getUserResponseStatus(unwrappedParams.id);
        setUserStatus(status);

      }

      setLoading(false);
    };

    if (unwrappedParams.id) {
      fetchVolunteer();
    }
  }, [unwrappedParams.id]);

  // Handle join button click (show modal)
  const handleJoinClick = () => {
    if (!isAuthenticated) {
      setModalError('Please log in to join this opportunity');
      setShowJoinModal(true);
      return;
    }
    setModalError(null);
    setShowJoinModal(true);
  };

  // Confirm join action
  const handleJoinConfirm = async () => {
    setJoining(true);
    setModalError(null);
    const result = await joinVolunteerCall(unwrappedParams.id);
    setJoining(false);

    if (result.success) {
      // Refetch volunteer data to get updated status
      const { data: updatedCall } = await supabase
        .from('volunteer_call')
        .select('*')
        .eq('call_id', unwrappedParams.id)
        .single();
      if (updatedCall) {
        setVolunteer(updatedCall as VolunteerCall);
      }
      // Refresh counts and status
      const count = await getVolunteerSignupCount(unwrappedParams.id);
      setSignupCount(count);
      const status = await getUserResponseStatus(unwrappedParams.id);
      setUserStatus(status);
      setShowJoinModal(false);
      setModalMessage('Successfully joined this opportunity!');
      setTimeout(() => setModalMessage(''), 2000);
    } else {
      setModalError(result.error || 'Failed to join opportunity');
    }
  };

  // Handle leave button click (show modal)
  const handleLeaveClick = () => {
    setModalError(null);
    setShowLeaveModal(true);
  };

  // Confirm leave action
  const handleLeaveConfirm = async () => {
    setJoining(true);
    setModalError(null);
    const result = await leaveVolunteerCall(unwrappedParams.id);
    setJoining(false);

    if (result.success) {
      // Refetch volunteer data to get updated status
      const { data: updatedCall } = await supabase
        .from('volunteer_call')
        .select('*')
        .eq('call_id', unwrappedParams.id)
        .single();
      if (updatedCall) {
        setVolunteer(updatedCall as VolunteerCall);
      }
      // Refresh counts and status
      const count = await getVolunteerSignupCount(unwrappedParams.id);
      setSignupCount(count);
      const status = await getUserResponseStatus(unwrappedParams.id);
      setUserStatus(status);
      setShowLeaveModal(false);
      setModalMessage('You have left this opportunity.');
      setTimeout(() => setModalMessage(''), 2000);
    } else {
      setModalError(result.error || 'Failed to leave opportunity');
    }
  };

  return (
    <>
      {sidebarOpen && (
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          userName={userName}
          userEmail={userEmail ?? undefined}
          router={router}
          variant="user"
        />
      )}
      <div className="min-h-screen bg-[#E6E6E6] w-full flex flex-col overflow-x-hidden">
        {/* Header with menu, logo, and login button */}
        <header className="flex items-center justify-between px-2 sm:px-4 w-full h-[52px] bg-[#E6E6E6] mx-auto sticky top-0 z-20">
          <div className="w-full max-w-[1400px] mx-auto flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <Menu className="w-6 h-6 text-gray-800" />
            </button>

            <div className="flex-1 flex justify-center items-center h-full min-w-0">
              <Image
                src="/Moodboard2.png"
                alt="Pawject Patrol Logo"
                width={77}
                height={36}
                className="flex-shrink-0"
              />
            </div>

            <div className="flex items-center gap-2">
              <UserNotificationsBell />
              <button
                onClick={handleLogout}
                className="hidden md:flex items-center gap-2 bg-[#8D52A7] hover:bg-[#7B4692] text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
                style={{ fontFamily: '"Genty Sans", sans-serif' }}
              >
                <span>Logout</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>

              <button
                onClick={handleLogout}
                className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition"
                aria-label="Sign out"
              >
                <LogIn className="w-6 h-6 text-gray-800" />
              </button>
            </div>
          </div>
        </header>
        {/* Main Content */}
        <main className="flex-1 w-full flex flex-col">
          {loading ? (
            <div className="py-24 text-center" style={{ color: '#3C3333', fontFamily: 'Genty Sans, sans-serif' }}>Loading...</div>
          ) : !volunteer ? (
            <div className="py-24 text-center" style={{ color: '#3C3333', fontFamily: 'Genty Sans, sans-serif' }}>Volunteer opportunity not found.</div>
          ) : (
            <>
              <div className="py-4 sm:py-6 md:py-8" style={{ backgroundColor: '#E6E6E6' }}>
                <div className="max-w-2xl md:max-w-3xl lg:max-w-5xl mx-auto px-2 sm:px-4 md:px-6 w-full">
                  <h2 
                    className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-1"
                    style={{
                      color: '#C2C876',
                      WebkitTextStrokeWidth: '.5px',
                      WebkitTextStrokeColor: '#3C3333',
                      fontFamily: '"Kawaii RT", sans-serif',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: 'normal',
                      outlineColor: '#3C3333',
                    }}
                  >
                    Volunteer Opportunity Details
                  </h2>
                  <p className="text-xs sm:text-sm md:text-md" style={{ color: '#3C3333', fontFamily: '"Genty Sans", sans-serif' }}>
                    View and join volunteer opportunities
                  </p>
                </div>
              </div>
              <div className="max-w-2xl md:max-w-3xl lg:max-w-5xl mx-auto px-2 sm:px-4 md:px-6 pb-8 w-full">
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden w-full" style={{ border: '3px solid #8D52A7', borderRadius: '1rem' }}>
                  <div className="relative min-h-[112px] flex flex-col sm:flex-row items-center justify-center px-2 sm:px-6 gap-4"
                    style={{
                      backgroundColor: 'transparent',
                      borderBottom: '3px solid #8D52A7',
                      borderTop: 'none',
                      borderLeft: 'none',
                      borderRight: 'none',
                      borderRadius: '1rem 1rem 0 0'
                    }}>
                    <div className="flex flex-row items-center gap-4 justify-start w-full h-full" style={{alignItems: 'center'}}>
                      <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full flex items-center justify-center text-base sm:text-xl" style={{ backgroundColor: '#8D52A7', color: 'white', fontFamily: 'Genty Sans, sans-serif' }}>
                        {(volunteer.call_title && volunteer.call_title[0]) ? volunteer.call_title[0].toUpperCase() : 'V'}
                      </div>
                      <div className="flex flex-col items-start justify-center">
                        <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold break-words leading-tight" style={{ color: '#3C3333', fontFamily: 'Genty Sans, sans-serif' }}>
                          {volunteer.call_title || "Untitled"}
                        </h2>
                        <div
                          className={`mt-1 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${statusBadgeClassName(volunteer.call_status)}`}
                          style={{
                            ...statusBadgeStyle(volunteer.call_status),
                            fontFamily: 'Genty Sans, sans-serif',
                            borderWidth: '1.5px',
                            borderStyle: 'solid',
                          }}
                        >
                          {volunteer.call_status?.toLowerCase() === 'ongoing'
                            ? 'Ongoing'
                            : (userStatus ? 'Joined' : (volunteer.call_status || 'Unknown'))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-2 sm:p-4 md:p-6">
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{ color: '#3C3333', fontSize: '18px', fontWeight: 500, fontFamily: 'Genty Sans, sans-serif', marginBottom: '0.6rem' }}>
                        Description
                      </div>
                      {volunteer.call_details && (
                        <div style={{ color: '#364153', fontSize: '16px', fontWeight: 400, fontFamily: 'Arial, sans-serif', marginBottom: '1rem', marginTop: 0 }}>
                          {volunteer.call_details}
                        </div>
                      )}
                    </div>
                    {/* Responsive Info Rows */}
                    <div className="flex flex-col gap-4 md:gap-6 mb-2">
                      {/* Row 1: Start Time & Location */}
                      <div className="flex flex-col sm:flex-row gap-4 md:gap-10">
                        {/* Start Time */}
                        <div className="flex items-start gap-2 flex-1">
                          <span className="mt-[2px] text-gray-400">
                            <Calendar className="w-5 h-5" style={{ color: '#6B7280' }} />
                          </span>
                          <div className="flex flex-col">
                            <span className="text-[14px] font-bold text-[#4A5565] mb-0.5" style={{ fontFamily: 'Arial, sans-serif' }}>Start Time</span>
                            <span className="text-[16px] text-[#3C3333]" style={{ fontFamily: 'Arial, sans-serif' }}>{formatDateTime(volunteer.call_starttime)}</span>
                          </div>
                        </div>
                        {/* Location */}
                        <div className="flex items-start gap-2 flex-1 mt-4 sm:mt-0">
                          <span className="mt-[2px] text-gray-400">
                            <MapPin className="w-5 h-5" style={{ color: '#6B7280' }} />
                          </span>
                          <div className="flex flex-col">
                            <span className="text-[14px] font-bold text-[#4A5565] mb-0.5" style={{ fontFamily: 'Arial, sans-serif' }}>Location</span>
                            <span className="text-[16px] text-[#3C3333]" style={{ fontFamily: 'Arial, sans-serif' }}>{volunteer.call_location || 'Unknown'}</span>
                          </div>
                        </div>
                      </div>
                      {/* Row 2: End Time */}
                      <div className="flex flex-col sm:flex-row gap-4 md:gap-10">
                        {/* End Time */}
                        <div className="flex items-start gap-2 flex-1">
                          <span className="mt-[2px] text-gray-400">
                            <Calendar className="w-5 h-5" style={{ color: '#6B7280' }} />
                          </span>
                          <div className="flex flex-col">
                            <span className="text-[14px] font-bold text-[#4A5565] mb-0.5" style={{ fontFamily: 'Arial, sans-serif' }}>End Time</span>
                            <span className="text-[16px] text-[#3C3333]" style={{ fontFamily: 'Arial, sans-serif' }}>{formatDateTime(volunteer.call_endtime)}</span>
                          </div>
                        </div>
                      </div>
                      {/* Volunteer Capacity */}
                      <div className="flex flex-col sm:flex-row gap-4 md:gap-10 mt-2 mb-2">
                        <div className="flex items-start gap-2 flex-1">
                          <span className="mt-[2px] text-gray-400">
                            <Users className="w-5 h-5" style={{ color: '#6B7280' }} />
                          </span>
                          <div className="flex flex-col w-full">
                            <span className="text-[14px] font-bold text-[#4A5565] mb-0.5" style={{ fontFamily: 'Arial, sans-serif' }}>Volunteer Capacity</span>
                            <div className="flex flex-col gap-1">
                              <div className="w-full h-3 bg-gray-100 rounded-lg overflow-hidden">
                                <div style={{
                                  width: typeof volunteer?.capacity === 'number' && volunteer.capacity !== null
                                    ? `${Math.min(100, Math.round((signupCount / (volunteer.capacity || 1)) * 100))}%`
                                    : (signupCount === 0 ? '0%' : '100%'),
                                  height: '100%',
                                  background: '#689668',
                                  borderRadius: '6px',
                                  transition: 'width 0.3s'
                                }} />
                              </div>
                              <div className="text-[16px] text-[#101828]" style={{ fontFamily: 'Arial, sans-serif' }}>
                                {typeof volunteer?.capacity === 'number'
                                  ? `${signupCount}/${volunteer.capacity} ${signupCount === 1 ? 'volunteer' : 'volunteers'}`
                                  : `${signupCount} ${signupCount === 1 ? 'volunteer' : 'volunteers'}`}
                                {typeof volunteer?.capacity === 'number' && (
                                  <span style={{ color: (volunteer.capacity - signupCount) === 0 ? '#DC2626' : '#10B981', fontWeight: 500, marginLeft: '0.5rem' }}>
                                    ({Math.max(0, volunteer.capacity - signupCount)} {Math.max(0, volunteer.capacity - signupCount) === 1 ? 'spot' : 'spots'} remaining)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Action buttons */}
                    <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
                      <div className="flex flex-col sm:flex-row gap-3 w-full">
                        {userStatus ? (
                          <>
                            <button
                              disabled
                              className="flex-1 min-w-0 px-4 py-2 rounded-md text-sm font-medium border border-[#6B4A6B] bg-[#6B4A6B] text-white hover:opacity-90 transition-colors opacity-70 cursor-not-allowed"
                              style={{ fontFamily: 'Genty Sans, sans-serif', fontWeight: 500, boxSizing: 'border-box', textAlign: 'center' }}
                            >
                              Already Joined
                            </button>
                            {volunteer?.call_status?.toLowerCase() === 'ongoing' ? (
                              <button
                                disabled
                                className="flex-1 min-w-0 px-4 py-2 rounded-md text-sm font-medium border border-[#6B4A6B] bg-[#9CA3AF] text-white opacity-50 cursor-not-allowed"
                                style={{ fontFamily: 'Genty Sans, sans-serif', fontWeight: 500, boxSizing: 'border-box', textAlign: 'center' }}
                              >
                                This Opportunity is Ongoing
                              </button>
                            ) : (
                              <button
                                onClick={handleLeaveClick}
                                disabled={joining}
                                className="flex-1 min-w-0 px-4 py-2 rounded-md text-sm font-medium border border-[#6B4A6B] bg-transparent text-[#6B4A6B] hover:bg-[#F3F4F6] transition-colors disabled:opacity-50"
                                style={{ fontFamily: 'Genty Sans, sans-serif', fontWeight: 500, boxSizing: 'border-box', textAlign: 'center' }}
                              >
                                {joining ? 'Leaving...' : 'Leave Opportunity'}
                              </button>
                            )}
                          </>
                        ) : volunteer?.call_status?.toLowerCase() === 'active' && (volunteer?.capacity ?? 0) && signupCount >= (volunteer?.capacity ?? 0) ? (
                          <button
                            disabled
                            className="flex-1 min-w-0 px-4 py-2 rounded-md text-sm font-medium border border-[#6B4A6B] bg-[#9CA3AF] text-white opacity-50 cursor-not-allowed"
                            style={{ fontFamily: 'Genty Sans, sans-serif', fontWeight: 500, boxSizing: 'border-box', textAlign: 'center' }}
                          >
                            Capacity Full
                          </button>
                        ) : volunteer?.call_status?.toLowerCase() === 'active' ? (
                          <button
                            onClick={handleJoinClick}
                            disabled={joining}
                            className="flex-1 min-w-0 px-4 py-2 rounded-md text-sm font-medium border border-[#6B4A6B] bg-[#6B4A6B] text-white hover:opacity-90 transition-colors disabled:opacity-70"
                            style={{ fontFamily: 'Genty Sans, sans-serif', fontWeight: 500, boxSizing: 'border-box', textAlign: 'center' }}
                          >
                            {joining ? 'Joining...' : 'Join This Opportunity'}
                          </button>
                        ) : volunteer?.call_status?.toLowerCase() === 'ongoing' ? (
                          <button
                            disabled
                            className="flex-1 min-w-0 px-4 py-2 rounded-md text-sm font-medium border border-[#6B4A6B] bg-[#9CA3AF] text-white opacity-50 cursor-not-allowed"
                            style={{ fontFamily: 'Genty Sans, sans-serif', fontWeight: 500, boxSizing: 'border-box', textAlign: 'center' }}
                          >
                            This Opportunity is Ongoing
                          </button>
                        ) : volunteer?.call_status?.toLowerCase() === 'filled' ? (
                          <button
                            disabled
                            className="flex-1 min-w-0 px-4 py-2 rounded-md text-sm font-medium border border-[#6B4A6B] bg-[#9CA3AF] text-white opacity-50 cursor-not-allowed"
                            style={{ fontFamily: 'Genty Sans, sans-serif', fontWeight: 500, boxSizing: 'border-box', textAlign: 'center' }}
                          >
                            This Opportunity is Filled
                          </button>
                        ) : volunteer?.call_status?.toLowerCase() === 'cancelled' ? (
                          <button
                            disabled
                            className="flex-1 min-w-0 px-4 py-2 rounded-md text-sm font-medium border border-[#6B4A6B] bg-[#9CA3AF] text-white opacity-50 cursor-not-allowed"
                            style={{ fontFamily: 'Genty Sans, sans-serif', fontWeight: 500, boxSizing: 'border-box', textAlign: 'center' }}
                          >
                            This Opportunity was Cancelled
                          </button>
                        ) : (
                          <button
                            onClick={handleJoinClick}
                            disabled={joining}
                            className="flex-1 min-w-0 px-4 py-2 rounded-md text-sm font-medium border border-[#6B4A6B] bg-transparent text-[#6B4A6B] hover:bg-[#F3F4F6] transition-colors disabled:opacity-50"
                            style={{ fontFamily: 'Genty Sans, sans-serif', fontWeight: 500, boxSizing: 'border-box', textAlign: 'center' }}
                          >
                            {joining ? 'Joining...' : 'Express Interest'}
                          </button>
                        )}
                              {/* Join Confirmation Modal */}
                              {showJoinModal && (
                                <div className="fixed inset-0 bg-opacity-30 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
                                  <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 transition-transform duration-300 ease-out transform animate-slide-down" style={{ fontFamily: 'Genty Sans, sans-serif' }}>
                                    <h3 className="text-lg mb-2" style={{ color: '#3C3333' }}>
                                      {modalError ? 'Unable to Join' : 'Join Opportunity'}
                                    </h3>
                                    <p className="text-sm mb-6" style={{ color: '#3C3333' }}>
                                      {modalError ? modalError : 'Are you sure you want to join this opportunity?'}
                                    </p>
                                    <div className="flex gap-3 justify-end">
                                      <button
                                        onClick={() => { setShowJoinModal(false); setModalError(null); }}
                                        disabled={joining}
                                        className="px-6 py-2 rounded-lg text-sm transition-all disabled:opacity-50"
                                        style={{ backgroundColor: '#E6E6E6', color: '#3C3333' }}
                                      >
                                        Cancel
                                      </button>
                                      {!modalError && (
                                        <button
                                          onClick={handleJoinConfirm}
                                          disabled={joining}
                                          className="px-6 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50"
                                          style={{ backgroundColor: '#6B4A6B' }}
                                        >
                                          {joining ? 'Joining...' : 'Join'}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Leave Confirmation Modal */}
                              {showLeaveModal && (
                                <div className="fixed inset-0 bg-opacity-30 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
                                  <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 transition-transform duration-300 ease-out transform animate-slide-down" style={{ fontFamily: 'Genty Sans, sans-serif' }}>
                                    <h3 className="text-lg mb-2" style={{ color: '#3C3333' }}>
                                      Leave Opportunity
                                    </h3>
                                    <p className="text-sm mb-6" style={{ color: '#3C3333' }}>
                                      Are you sure you want to leave this opportunity?
                                    </p>
                                    {modalError && <p className="text-sm mb-2 text-red-600">{modalError}</p>}
                                    <div className="flex gap-3 justify-end">
                                      <button
                                        onClick={() => { setShowLeaveModal(false); setModalError(null); }}
                                        disabled={joining}
                                        className="px-6 py-2 rounded-lg text-sm transition-all disabled:opacity-50"
                                        style={{ backgroundColor: '#E6E6E6', color: '#3C3333' }}
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={handleLeaveConfirm}
                                        disabled={joining}
                                        className="px-6 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50"
                                        style={{ backgroundColor: '#DC2626' }}
                                      >
                                        {joining ? 'Leaving...' : 'Leave'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Success/Info Modal */}
                              {modalMessage && (
                                <div className="fixed inset-0 bg-opacity-30 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
                                  <div className="bg-white rounded-2xl shadow-xl max-w-xs w-full p-4 text-center transition-transform duration-300 ease-out transform animate-slide-down" style={{ fontFamily: 'Genty Sans, sans-serif' }}>
                                    <p className="text-base" style={{ color: '#3C3333' }}>{modalMessage}</p>
                                  </div>
                                </div>
                              )}
                        <button
                          onClick={() => router.push('/volunteer')}
                          className="flex-1 min-w-0 px-4 py-2 rounded-md text-sm font-medium border border-[#6B4A6B] bg-transparent text-[#6B4A6B] hover:bg-[#F3F4F6] transition-colors"
                          style={{ fontFamily: 'Genty Sans, sans-serif', fontWeight: 500, boxSizing: 'border-box', textAlign: 'center' }}
                        >
                          Back to List
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}