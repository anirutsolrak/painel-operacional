import React from 'react';
import { motion } from 'framer-motion';

function Header({ displayMode, onToggleMode, onLogout, user, showUpload, onToggleUpload }) {
    const displayName = user?.user_metadata?.name || user?.email || '';

    return (
        <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            data-name="header"
            className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0">
                    <div data-name="header-title" className="flex items-center">
                        <motion.i
                            initial={{ rotate: -180, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            transition={{ duration: 0.5 }}
                            className="fas fa-chart-line text-blue-600 text-2xl mr-3"
                        />
                        <h1 className="text-xl font-semibold text-slate-900">Painel de Análise Call Center</h1>
                    </div>
                    <div data-name="header-actions" className="flex items-center space-x-2 sm:space-x-3">
                        <span className="text-sm text-slate-600 hidden sm:inline-block">
                            Olá, {displayName}
                        </span>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={true}
                            title="Funcionalidade de exportação pendente"
                        >
                             <i className="fas fa-download"></i>
                            <span className="hidden sm:inline">Exportar</span>
                        </motion.button>

                        <motion.button
                           whileHover={{ scale: 1.05 }}
                           whileTap={{ scale: 0.95 }}
                           onClick={onToggleUpload}
                           className={`px-3 py-1.5 ${showUpload ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-green-600 text-white hover:bg-green-700'} rounded-md transition-colors text-sm font-medium flex items-center gap-2`}
                           title={showUpload ? 'Fechar upload' : 'Upload de dados'}
                        >
                           <i className={`fas ${showUpload ? 'fa-times' : 'fa-upload'}`}></i>
                           <span className="hidden sm:inline">{showUpload ? 'Fechar' : 'Upload'}</span>
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onToggleMode}
                            className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 transition-colors text-sm font-medium flex items-center gap-2"
                        >
                            <i className={`fas ${displayMode === 'navigation' ? 'fa-tv' : 'fa-mouse-pointer'}`}></i>
                            <span className="hidden sm:inline">{displayMode === 'navigation' ? "Modo Exibição" : "Modo Navegação"}</span>
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onLogout}
                            className="px-3 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm font-medium flex items-center gap-2"
                        >
                            <i className="fas fa-sign-out-alt"></i>
                            <span className="hidden sm:inline">Sair</span>
                        </motion.button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export default Header;