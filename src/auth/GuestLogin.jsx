import React, { useState } from 'react';

export default function GuestLogin({ onGuestLogin, onSwitchToLogin, onSwitchToSignup }) {

    const [loading, setLoading] = useState(false);

    const handleGuestLogin = async () => {
        setLoading(true);
        try {
            // Cria um objeto simulando a estrutura da sessão/usuário do Supabase
            const guestUserId = 'guest-user-' + Date.now(); // ID único para a "sessão" de convidado
            const guestUser = {
                id: guestUserId,
                aud: 'authenticated', // Simula role autenticada
                role: 'guest',       // Role específica para controle de acesso
                email: 'guest@local.app',
                app_metadata: { provider: 'guest', providers: ['guest'] },
                user_metadata: { name: 'Convidado' },
                created_at: new Date().toISOString(),
                // Adiciona a estrutura 'user' que o App.jsx pode esperar do objeto session
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
            console.log("[Guest Login] Simulating guest session:", guestUser);
            onGuestLogin(guestUser); // Chama o callback no App.jsx para definir o estado

        } catch (error) {
            console.error('[GuestLogin] Error simulating guest session:', error);
            // Opcional: Mostrar mensagem de erro na UI
            setLoading(false); // Permite tentar novamente se houver erro inesperado
        }
        // Não precisa de setLoading(false) em caso de sucesso, pois onGuestLogin deve
        // causar uma re-renderização pelo App.jsx que removerá este componente.
    };

    return (
        <div className="auth-card" data-name="guest-login">
            <h2 className="auth-title">Acesso como Convidado</h2>
            <p className="text-slate-600 mb-6 text-sm text-center">
                Você poderá visualizar os dados com funcionalidades limitadas (filtros desabilitados).
            </p>

            <button
                onClick={handleGuestLogin}
                className="btn btn-secondary w-full" // Botão com estilo secundário
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
                    {/* Botões para alternar para login ou cadastro */}
                    <button onClick={onSwitchToLogin} className="auth-link" data-name="login-link"> faça login </button>
                    {' '}ou{' '}
                    <button onClick={onSwitchToSignup} className="auth-link" data-name="signup-link"> cadastre-se </button>.
                </p>
            </div>
        </div>
    );
}