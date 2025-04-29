import React, { useState } from 'react';

export default function GuestLogin({ onGuestLogin, onSwitchToLogin, onSwitchToSignup }) {

    const [loading, setLoading] = useState(false);

    const handleGuestLogin = async () => {
        setLoading(true);
        try {
            const guestUserId = 'guest-user-' + Date.now();
            const guestUser = {
                id: guestUserId,
                aud: 'authenticated',
                role: 'guest',
                email: 'guest@local.app',
                app_metadata: { provider: 'guest', providers: ['guest'] },
                user_metadata: { name: 'Convidado' },
                created_at: new Date().toISOString(),
                user: {
                     id: guestUserId,
                     aud: 'authenticated',
                     role: 'guest',
                     email: 'guest@local.app',
                     app_metadata: { provider: 'guest', providers: ['guest'] },
                     user_metadata: { name: 'Convidado' },
                     created_at: new Date().toISOString(),
                 }
            };
            onGuestLogin(guestUser);

        } catch (error) {
            console.error('[GuestLogin] Error simulating guest session:', error);
            setLoading(false);
        }
    };

    return (
        <div className="auth-card" data-name="guest-login">
            <h2 className="auth-title">Acesso como Convidado</h2>
            <p className="text-slate-600 mb-6 text-sm text-center">
                Você poderá visualizar os dados com funcionalidades limitadas (filtros desabilitados).
            </p>

            <button
                onClick={handleGuestLogin}
                className="btn btn-secondary w-full"
                disabled={loading}
                data-name="guest-login-button"
            >
                {loading ? (
                    <><i className="fas fa-spinner fa-spin mr-2"></i>Entrando...</>
                ) : (
                    <><i className="fas fa-user-secret mr-2"></i>Entrar como Convidado</>
                )}
            </button>

            <div className="auth-footer mt-6 text-sm">
                <p>
                    Para acesso completo,{' '}
                    <button onClick={onSwitchToLogin} className="auth-link" data-name="login-link"> faça login </button>
                    {' '}ou{' '}
                    <button onClick={onSwitchToSignup} className="auth-link" data-name="signup-link"> cadastre-se </button>.
                </p>
            </div>
        </div>
    );
}