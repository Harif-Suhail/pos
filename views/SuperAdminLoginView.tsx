import React, { useState } from 'react';
import { useAppContext } from '../hooks/useAppContext';

export default function SuperAdminLoginView() {
    const { loginSuperAdmin } = useAppContext();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!username.trim() || !password.trim()) {
            setError('Username and password are required');
            return;
        }

        setIsLoading(true);
        try {
            await loginSuperAdmin(username, password);
        } catch (err: any) {
            setError(err.message || 'Invalid credentials');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--background-primary)] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo/Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-500/20 rounded-full mb-4">
                        <span className="text-4xl">⚡</span>
                    </div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
                        Super Admin Portal
                    </h1>
                    <p className="text-[var(--text-secondary)]">
                        System Administration Access
                    </p>
                </div>

                {/* Login Card */}
                <div className="bg-[var(--background-secondary)] border border-[var(--border-primary)] rounded-lg shadow-xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Username Input */}
                        <div>
                            <label 
                                htmlFor="username" 
                                className="block text-sm font-medium text-[var(--text-primary)] mb-2"
                            >
                                Username
                            </label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="Enter your username"
                                disabled={isLoading}
                                autoComplete="username"
                                autoFocus
                            />
                        </div>

                        {/* Password Input */}
                        <div>
                            <label 
                                htmlFor="password" 
                                className="block text-sm font-medium text-[var(--text-primary)] mb-2"
                            >
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="Enter your password"
                                disabled={isLoading}
                                autoComplete="current-password"
                            />
                        </div>

                        {/* Login Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Authenticating...' : 'Sign In'}
                        </button>

                        {/* Security Notice */}
                        <div className="pt-4 border-t border-[var(--border-primary)]">
                            <p className="text-xs text-[var(--text-secondary)] text-center">
                                🔒 This is a secure system administration area.<br />
                                All access attempts are logged.
                            </p>
                        </div>

                        {/* Back to Restaurant Login */}
                        <div className="text-center">
                            <a 
                                href="/" 
                                className="text-sm text-[var(--accent-primary)] hover:underline"
                            >
                                ← Back to Restaurant Login
                            </a>
                        </div>
                    </form>
                </div>

                {/* Demo Credentials (remove in production) */}
                <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-xs text-yellow-400 text-center font-medium mb-2">
                        📝 Demo Credentials
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] text-center">
                        Username: <span className="font-mono text-[var(--text-primary)]">admin</span><br />
                        Password: <span className="font-mono text-[var(--text-primary)]">admin123</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
