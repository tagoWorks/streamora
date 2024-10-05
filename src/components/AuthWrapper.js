'use client'
import { useEffect } from 'react';
import { getAuth, getRedirectResult } from "firebase/auth";
import { useRouter } from 'next/navigation';
import { AuthProvider } from './AuthProvider';

export default function AuthWrapper({ children }) {
  const router = useRouter();

  useEffect(() => {
    const auth = getAuth();
    getRedirectResult(auth).then((result) => {
      if (result) {
        // User signed in successfully
        router.push('/');
      }
    }).catch((error) => {
      // Handle errors here
      console.error("Error after Google Sign-In redirect:", error);
    });
  }, [router]);

  return <AuthProvider>{children}</AuthProvider>;
}