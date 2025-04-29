import React, { useState, useEffect } from 'react';
import getSupabaseClient from './utils/supabaseClient';
import LoginForm from './auth/LoginForm';
import Dashboard from './Dashboard';

function App() {
    const [session, setSession] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const supabase = getSupabaseClient();

    useEffect(() => {
        setLoadingAuth(true);
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoadingAuth(false);
        }).catch(error => {
            console.error("[Auth Effect] Error getting initial session:", error);
            setLoadingAuth(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (_event === 'SIGNED_OUT') {
                 setSession(null);
            }
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error("Error logging out:", error);
        } else {
             setSession(null);
        }
    };

    if (loadingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <div className="flex flex-col items-center gap-3">
                    <i className="fas fa-spinner fa-spin text-blue-600 text-3xl"></i>
                    <span className="text-slate-600">Carregando...</span>
                </div>
            </div>
        );
    }

    if (session) {
        return <Dashboard onLogout={handleLogout} user={session.user} />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                 <LoginForm />
            </div>
        </div>
    );
}

export default App;