'use client'

import { useState, useEffect } from 'react';
import { doSignInWithEmailAndPassword, doSignInWithGoogle } from '@/firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/firebase';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        window.location.href = '/';
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Please fill in all fields');
    } else {
      try {
        await doSignInWithEmailAndPassword(email, password);
        // Redirect will be handled by the useEffect hook
      } catch (error) {
        setError(error.message);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await doSignInWithGoogle();
      // Redirect will be handled by the useEffect hook
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md p-6 sm:p-8 space-y-6 sm:space-y-8 bg-gray-800 rounded-xl shadow-2xl">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Welcome back</h1>
          <p className="mt-2 text-sm sm:text-base text-gray-400">Sign into Streamora to access your playlists, liked tracks, and more.</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4 sm:space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email</label>
            <input
              type="email"
              id="email"
              className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">Password</label>
            <input
              type="password"
              id="password"
              className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm sm:text-base font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500">
              Sign In
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
        {error && <p className="mt-2 text-xs sm:text-sm text-red-500 text-center">{error}</p>}
        <p className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-gray-400">
          Don't have an account?{' '}
          <Link href="/signup" className="font-medium text-purple-500 hover:text-purple-400">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}