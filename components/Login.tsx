
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';

interface LoginProps {
    onGuestLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onGuestLogin }) => {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestrictedEnv, setIsRestrictedEnv] = useState(false);

  useEffect(() => {
      // Check if we are running in a known restricted environment (like Google AI Studio preview)
      // where Firebase Auth domains might not be whitelisted.
      const hostname = window.location.hostname;
      if (hostname.includes('googleusercontent.com') || hostname.includes('-idx-') || hostname.includes('web.app')) {
          setIsRestrictedEnv(true);
      }
  }, []);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Login Error:", err);
      
      // Handle specific Firebase errors
      if (err.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        setError(`Domain not authorized: "${domain}".\n\nTo fix this: Go to Firebase Console -> Authentication -> Settings -> Authorized Domains, and add "${domain}" to the list.`);
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError("Sign-in cancelled by user.");
      } else if (err.code === 'auth/invalid-api-key') {
        setError("Firebase configuration is missing. Please edit src/firebase.ts with your project keys.");
      } else {
        setError(`Failed to sign in: ${err.message || 'Unknown error'}`);
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0b1e] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#16152c] p-8 rounded-3xl shadow-2xl border border-gray-700/50 flex flex-col items-center space-y-8 animate-fade-in-up">
            
            <div className="transform scale-125 my-4">
                <Logo layout="desktop" />
            </div>

            <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
                <p className="text-gray-400 text-sm">Sign in to sync your trading data across devices.</p>
            </div>

            {error && (
                <div className="w-full bg-red-900/30 border border-red-500/50 text-red-200 p-4 rounded-2xl text-center text-sm whitespace-pre-wrap">
                    {error}
                </div>
            )}

            {!isRestrictedEnv ? (
                <>
                    <button
                        onClick={handleLogin}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-white hover:bg-gray-100 text-gray-900 font-bold rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-wait"
                    >
                        {isLoading ? (
                            <svg className="animate-spin h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                        )}
                        <span>Sign in with Google</span>
                    </button>

                    <div className="flex items-center w-full">
                        <div className="flex-grow border-t border-gray-700"></div>
                        <span className="px-4 text-gray-500 text-sm">OR</span>
                        <div className="flex-grow border-t border-gray-700"></div>
                    </div>
                </>
            ) : (
                <div className="bg-yellow-900/20 border border-yellow-700/50 p-3 rounded-2xl w-full text-center">
                    <p className="text-yellow-200 text-xs">Google Sign-In is disabled in this preview environment.</p>
                </div>
            )}

            <button
                onClick={onGuestLogin}
                className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-[1.02]"
            >
                <span>Continue as Guest</span>
            </button>
            
            <p className="text-gray-500 text-xs text-center max-w-xs">
                Guest mode saves data locally on your device. Sign in later to sync your account settings.
            </p>
        </div>
    </div>
  );
};

export default Login;
