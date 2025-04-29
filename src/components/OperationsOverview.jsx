import React, { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import dataUtils from '../utils/dataUtils';

const TrendIndicator = ({ trend, lowerIsBetter = false }) => {
     if (!trend || (trend.value === null || trend.value === undefined)) return null;

     const getTrendClass = (direction, isLowerBetter) => {
        if (direction === 'up') return isLowerBetter ? 'text-red-600 bg-red-100' : 'text-green-600 bg-green-100';
        if (direction === 'down') return isLowerBetter ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
        return 'text-slate-600 bg-slate-100';
     };

     const getTrendIcon = (direction) => {
        if (direction === 'up') return 'fa-arrow-up';
        if (direction === 'down') return 'fa-arrow-down';
        return 'fa-minus';
     };

     return (
       <motion.div
         initial={{ scale: 0.8, opacity: 0 }}
         animate={{ scale: 1, opacity: 1 }}
         transition={{ duration: 0.3, delay: 0.5 }}
         className={`trend-indicator mt-2 text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${getTrendClass(
           trend.direction,
           lowerIsBetter
         )}`}
       >
         <i className={`fas ${getTrendIcon(trend.direction)} w-3 h-3`}></i>
         <span>{trend.value === null || trend.value === undefined ? '-' : (trend.value === '∞' || trend.value === '-∞' ? trend.value : `${trend.value}%`)}</span>
       </motion.div>
     );
};


function OperationsOverview({ currentMetrics, previousMetrics }) {
    console.log("[OperationsOverview] Rendering with currentMetrics:", currentMetrics, "previousMetrics:", previousMetrics);

   // Remove local calculation for productivity, use tempoPerdidoSegundos directly
   // const currentProdutividade =
   //  currentMetrics?.totalLigações > 0
   //    ? (currentMetrics?.ligaçõesAtendidasCount || 0) / currentMetrics.totalLigações
   //    : 0;
   // const previousProdutividade =
   //   previousMetrics?.totalLigações > 0
   //     ? (previousMetrics?.ligaçõesAtendidasCount || 0) / previousMetrics.totalLigações
   //     : 0;


  const successTrend = dataUtils.calculateTrend(
    currentMetrics?.taxaSucesso,
    previousMetrics?.taxaSucesso
  );
  const otherTabTrend = dataUtils.calculateTrend(
    currentMetrics?.taxaNaoEfetivo,
    previousMetrics?.taxaNaoEfetivo
  );

  // Calculate trend for tempoPerdidoSegundos (lower is better)
  const tempoPerdidoTrend = dataUtils.calculateTrend(
      currentMetrics?.tempoPerdidoSegundos,
      previousMetrics?.tempoPerdidoSegundos
    );


  const timeTrend = dataUtils.calculateTrend(
      currentMetrics?.tma,
      previousMetrics?.tma
    );


  const formatValue = useCallback((value, formatter) => {
      if (value === undefined || value === null) return '0'; // Handle null/undefined explicitly
      // If value is numeric 0 and formatter is percentage, return 0.0%
      if (value === 0 && formatter === dataUtils.formatPercentage) return '0.0%';
      // If value is numeric 0 and formatter is duration, return 00:00
      if (value === 0 && formatter === dataUtils.formatDuration) return '00:00';

      return formatter && typeof formatter === 'function' ? formatter(value) : value.toLocaleString('pt-BR');
  }, []);


  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      data-name="operations-overview"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8"
    >
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="bg-white rounded-lg shadow-md border border-slate-200 p-4 transition-all duration-300 hover:shadow-lg"
      >
        <div className="text-sm text-slate-500 mb-1">
          Taxa de Sucesso (Tab.)
        </div>
        <div className="text-2xl font-bold text-blue-600">
          {formatValue(currentMetrics?.taxaSucesso, dataUtils.formatPercentage)}
        </div>
        <div className="text-xs text-slate-400 mt-1">
          ({formatValue(currentMetrics?.sucessoTabulacoesCount)}{' '}
          casos)
        </div>
        <TrendIndicator trend={successTrend} lowerIsBetter={false} />
      </motion.div>

      <motion.div
        whileHover={{ scale: 1.02 }}
        className="bg-white rounded-lg shadow-md border border-slate-200 p-4 transition-all duration-300 hover:shadow-lg"
      >
        <div className="text-sm text-slate-500 mb-1">Não Efetivo (Tab.)</div>
        <div className="text-2xl font-bold text-blue-600">
           {formatValue(currentMetrics?.taxaNaoEfetivo, dataUtils.formatPercentage)}
        </div>
        {/* Trend for Não Efetivo should be lower is better */}
        <TrendIndicator trend={otherTabTrend} lowerIsBetter={true} />
      </motion.div>

      {/* Card for Tempo Perdido */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="bg-white rounded-lg shadow-md border border-slate-200 p-4 transition-all duration-300 hover:shadow-lg"
      >
        <div className="text-sm text-slate-500 mb-1">
          Tempo Perdido (Não Efetivas)
        </div>
        <div className="text-2xl font-bold text-blue-600">
           {formatValue(currentMetrics?.tempoPerdidoSegundos, dataUtils.formatDuration)}
        </div>
        <div className="text-xs text-slate-400 mt-1">
           ({formatValue(currentMetrics?.ligaçõesFalhaCount)}{' '}
           casos)
        </div>
         {/* Trend for Tempo Perdido should be lower is better */}
        <TrendIndicator trend={tempoPerdidoTrend} lowerIsBetter={true} />
      </motion.div>


      <motion.div
        whileHover={{ scale: 1.02 }}
        className="bg-white rounded-lg shadow-md border border-slate-200 p-4 transition-all duration-300 hover:shadow-lg"
      >
        <div className="text-sm text-slate-500 mb-1">Tempo Médio Atend.</div>
        <div className="text-2xl font-bold text-blue-600">
          {formatValue(currentMetrics?.tma, dataUtils.formatDuration)}
        </div>
        <TrendIndicator trend={timeTrend} lowerIsBetter={true} />
      </motion.div>
    </motion.div>
  );
}

export default OperationsOverview;