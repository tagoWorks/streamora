'use client'
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { doCreateUserWithEmailAndPassword, doSignInWithGoogle, doSendEmailVerification } from '@/firebase/auth';
import { updateProfile } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/firebase/firebase';
import { doc, setDoc } from "firebase/firestore";

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const passwordRef = useRef(null);
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.emailVerified) {
        window.location.href = '/';
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    checkPasswordStrength(password);
  }, [password]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (passwordRef.current && !passwordRef.current.contains(event.target)) {
        setShowPasswordRequirements(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'F4') {
        setDebugMode(true);
        setVerificationSent(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  const checkPasswordStrength = (password) => {
    setPasswordStrength({
      length: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    });
  };

  const isPasswordStrong = Object.values(passwordStrength).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!isPasswordStrong) {
      setError("Please ensure your password meets all the requirements.");
      return;
    }
    try {
      const userCredential = await doCreateUserWithEmailAndPassword(email, password);
      await updateProfile(userCredential.user, { displayName: username });
      await doSendEmailVerification(userCredential.user);
      setVerificationSent(true);

      // Create initial user document in Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        recentlyPlayed: [],
        queue: [],
        likedVideos: [],
        playlists: [],
        currentPlayingState: null,
        createdAt: new Date()
      });

      window.location.href = '/';
    } catch (error) {
      setError(error.message);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await doSignInWithGoogle();
      // Redirect to home
      window.location.href = '/';
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md p-6 sm:p-8 space-y-6 sm:space-y-8 bg-gray-800 rounded-xl shadow-2xl">
        {(verificationSent || debugMode) ? (
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Verification Sent</h2>
            <p className="mt-2 text-sm sm:text-base text-gray-400">A verification email has been sent to your email address.</p>
            <p className="mt-2 text-sm sm:text-base text-gray-400">Please check your inbox and click the verification link to log in to your account.</p>
            {debugMode && (
              <p className="mt-4 text-xs sm:text-sm text-yellow-300">Debug Mode: This message is shown due to F4 key press.</p>
            )}
          </div>
        ) : (
          <>
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-white">Create your account</h2>
              <p className="mt-2 text-sm sm:text-base text-gray-400">Join Streamora today</p>
            </div>
            {error && <p className="text-xs sm:text-sm text-red-500 text-center">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-300">Username</label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div className="relative" ref={passwordRef}>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300">Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setShowPasswordRequirements(true)}
                  required
                  className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                {showPasswordRequirements && (
                  <div className="absolute z-10 mt-2 p-4 bg-gray-700 rounded-md shadow-lg">
                    <p className="text-sm font-medium text-gray-300 mb-2">Password must contain:</p>
                    <ul className="space-y-1">
                      {[
                        { condition: 'length', text: 'At least 8 characters' },
                        { condition: 'hasUpperCase', text: 'At least one uppercase letter' },
                        { condition: 'hasLowerCase', text: 'At least one lowercase letter' },
                        { condition: 'hasNumber', text: 'At least one number' },
                        { condition: 'hasSpecialChar', text: 'At least one special character' },
                      ].map(({ condition, text }) => (
                        <li key={condition} className="flex items-center text-sm">
                          {passwordStrength[condition] ? (
                            <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                          )}
                          <span className={passwordStrength[condition] ? 'text-green-500' : 'text-red-500'}>{text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div>
                <button 
                  type="submit" 
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm sm:text-base font-medium text-white ${
                    isPasswordStrong ? 'bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500' : 'bg-gray-500 cursor-not-allowed'
                  }`}
                  disabled={!isPasswordStrong}
                >
                  Sign Up
                </button>
              </div>
            </form>
            <div className="mt-4 sm:mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-xs sm:text-sm">
                  <span className="px-2 bg-gray-800 text-gray-400">Or you can</span>
                </div>
              </div>
              <div className="mt-4 sm:mt-6">
                <button
                  onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-600 rounded-md shadow-sm text-xs sm:text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    <path d="M1 1h22v22H1z" fill="none"/>
                  </svg>
                  Continue with Google
                </button>
              </div>
            </div>
          </>
        )}
        <p className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-purple-500 hover:text-purple-400">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}