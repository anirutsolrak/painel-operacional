import React, { useState } from 'react';
import { motion } from 'framer-motion';
import getSupabaseClient from '../utils/supabaseClient';

export default function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const supabase = getSupabaseClient();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (authError) throw authError;
            if (!data?.user) throw new Error("Autenticação bem-sucedida, mas sem dados do usuário.");
        } catch (err) {
            console.error("[Login] Failed:", err);
            setError(err?.message?.includes("Invalid login credentials")
                ? "Email ou senha inválidos."
                : "Falha no login. Tente novamente.");
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
                    <i className="fas fa-chart-line"></i>
                </motion.div>
                <h2 className="text-2xl font-bold text-slate-800">Bem-vindo de volta</h2>
                <p className="text-slate-600 mt-2">Acesse sua conta para continuar</p>
            </div>

            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 text-red-700 p-3 rounded-lg mb-6 text-sm flex items-center"
                >
                    <i className="fas fa-exclamation-circle mr-2"></i>
                    {error}
                </motion.div>
            )}

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
                            Entrando...
                        </>
                    ) : (
                        <>
                            <i className="fas fa-sign-in-alt mr-2"></i>
                            Entrar
                        </>
                    )}
                </button>
            </form>

            <div className="mt-6 text-center">
                <p className="text-slate-600">
                </p>
            </div>
        </motion.div>
    );
}