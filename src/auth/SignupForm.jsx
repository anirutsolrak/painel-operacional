import React, { useState } from 'react';
import { motion } from 'framer-motion';
import getSupabaseClient from '../utils/supabaseClient';

export default function SignupForm() { // onSwitchToLogin prop removed
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const supabase = getSupabaseClient();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: 'As senhas não coincidem.' });
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setMessage({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres.' });
            setLoading(false);
            return;
        }

        try {
            const { data, error: signupError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: window.location.origin
                }
            });

            if (signupError) throw signupError;

            if (data?.user && data.session === null) {
                setMessage({ type: 'success', text: 'Cadastro realizado! Verifique seu email para confirmar a conta.' });
            } else if (data?.user && data.session) {
                setMessage({ type: 'success', text: 'Cadastro e login realizados com sucesso!' });
            } else {
                setMessage({ type: 'error', text: 'Este email pode já estar registrado.' });
            }
        } catch (err) {
            console.error("[Signup] Failed:", err);
            setMessage({
                type: 'error',
                text: err?.message?.includes("already registered")
                    ? 'Este email já está cadastrado.'
                    : 'Falha no cadastro. Tente novamente.'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-xl shadow-xl border border-slate-200 p-8"
        >
            <div className="text-center mb-8">
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="inline-block text-blue-600 text-4xl mb-4"
                >
                    <i className="fas fa-user-plus"></i>
                </motion.div>
                <h2 className="text-2xl font-bold text-slate-800">Criar conta</h2>
                <p className="text-slate-600 mt-2">Preencha os dados para se cadastrar</p>
            </div>

            {message && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${
                        message.type === 'success'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-700'
                    } p-3 rounded-lg mb-6 text-sm flex items-center`}
                >
                    <i className={`fas fa-${message.type === 'success' ? 'check-circle' : 'exclamation-circle'} mr-2`}></i>
                    {message.text}
                </motion.div>
            )}

            {/* Renderiza o formulário apenas se não houver uma mensagem de sucesso */}
            {!(message?.type === 'success') && (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="email">
                            Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="password">
                            Senha
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            required
                            minLength={6}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="confirmPassword">
                            Confirmar Senha
                        </label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            required
                            minLength={6}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center"
                    >
                        {loading ? (
                            <>
                                <i className="fas fa-spinner fa-spin mr-2"></i>
                                Cadastrando...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-user-plus mr-2"></i>
                                Cadastrar
                            </>
                        )}
                    </button>
                </form>
            )}

            <div className="mt-6 text-center">
                <p className="text-slate-600">
                    {/* Link para login removido pois App.js só renderiza LoginForm agora */}
                </p>
            </div>
        </motion.div>
    );
}