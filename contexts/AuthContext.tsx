import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CACHED_USER_KEY = 'atlas_cached_uid';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // OPTIMISTIC INITIALIZATION:
  // Check local storage synchronously to see if we were logged in last time.
  // This prevents the "Loading..." screen from showing while Firebase initializes.
  const [user, setUser] = useState<User | null>(() => {
    const cachedUid = localStorage.getItem(CACHED_USER_KEY);
    if (cachedUid) {
        // Return a dummy user object to satisfy the type until Firebase hydrates the real one
        return { uid: cachedUid } as User; 
    }
    return null;
  });
  
  // If we have a cached user, we are not "loading" visually, even if Firebase is still connecting.
  const [loading, setLoading] = useState(() => {
      return !localStorage.getItem(CACHED_USER_KEY);
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      // Update cache based on real auth state
      if (currentUser) {
          localStorage.setItem(CACHED_USER_KEY, currentUser.uid);
      } else {
          localStorage.removeItem(CACHED_USER_KEY);
      }
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // Immediately cache on successful sign in
      if (result.user) {
          localStorage.setItem(CACHED_USER_KEY, result.user.uid);
      }
    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem(CACHED_USER_KEY);
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};