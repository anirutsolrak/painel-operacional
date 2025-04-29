import React, { useState, useEffect, useMemo, useCallback } from 'react';

// AJUSTE ESTE CAMINHO DE IMPORTAÇÃO conforme a localização REAL do arquivo dataUtils.js
import dataUtils from '../utils/dataUtils'; // Ex: Se Filters está em src/components/, e utils está em src/utils/


function Filters({
  filters,
  onFilterChange,
  operators,
  selectedOperatorId,
  onOperatorChange,
  states, // Full list of all states (UFs)
  regions, // Full list of all region names
  disabled,
  goalValue,
  onGoalInputChange,
}) {
  const [localFilters, setLocalFilters] = useState(filters);

  // Update local filters when parent filters change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleDateRangeChange = useCallback((e) => {
    const newDateRange = e.target.value;
    const updatedFilters = { ...localFilters, dateRange: newDateRange };
    setLocalFilters(updatedFilters);
    onFilterChange(updatedFilters);
  }, [localFilters, onFilterChange]);

  const handleStateChange = useCallback((e) => {
    const newState = e.target.value;
    // When a state is selected, clear the region filter
    const updatedFilters = { ...localFilters, state: newState, region: 'all' };
    setLocalFilters(updatedFilters);
    onFilterChange(updatedFilters);
  }, [localFilters, onFilterChange]);

   const handleRegionChange = useCallback((e) => {
       const newRegion = e.target.value;
       // When a region is selected, clear the state filter
       const updatedFilters = { ...localFilters, region: newRegion, state: 'all' };
       setLocalFilters(updatedFilters);
       onFilterChange(updatedFilters);
   }, [localFilters, onFilterChange]);


  const handleLocalOperatorChange = useCallback((e) => {
    const newOperatorId = e.target.value;
    onOperatorChange(newOperatorId); // Call parent handler
  }, [onOperatorChange]);


   // Include 'all' option for Operators list
   const operatorOptions = useMemo(() => {
       const options = operators ? operators.map(op => ({ value: op.id.toString(), label: op.operator_name })) : [];
       if (!options.some(opt => opt.value === 'all')) {
           options.unshift({ value: 'all', label: 'Todos Operadores' });
       }
       return options;
   }, [operators]);


  // Dynamically filter State options based on selected Region
  const stateOptions = useMemo(() => {
    let filteredStates = states || []; // Start with all states if states prop is available

    // Check if dataUtils and stateRegions mapping exist
    if (dataUtils && dataUtils.stateRegions && localFilters.region && localFilters.region !== 'all') {
      // Filter states whose region matches the selected region
      filteredStates = (states || []).filter(uf => dataUtils.stateRegions[uf] === localFilters.region);
    }

    const options = filteredStates.map(state => ({ value: state, label: state }));

    // Always include the 'Todos Estados' option
    options.unshift({ value: 'all', label: 'Todos Estados' });

    return options;
  }, [states, localFilters.region]); // Depend on the full states list and the local region filter


   // Include 'all' option and region names from the 'regions' prop
   const regionOptions = useMemo(() => {
       const options = regions ? regions.map(region => ({ value: region, label: region })) : [];
       options.unshift({ value: 'all', label: 'Todas Regiões' });
       return options;
   }, [regions]); // Depend on the regions prop


  return (
    <div className="bg-white p-4 rounded-lg shadow-md border border-slate-200 mb-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-3">Filtros e Configurações</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-center">
        {/* Período */}
        <div>
          <label htmlFor="dateRange" className="block text-sm font-medium text-slate-700 mb-1">Período</label>
          <select
            id="dateRange"
            value={localFilters.dateRange}
            onChange={handleDateRangeChange}
            className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={disabled}
          >
            <option value="today">Hoje</option>
            <option value="yesterday">Ontem</option>
            <option value="week">Últimos 7 Dias</option>
            <option value="month">Últimos 30 Dias</option>
            {/* Adicione outras opções se necessário */}
          </select>
        </div>

        {/* Estado */}
        <div>
          <label htmlFor="state" className="block text-sm font-medium text-slate-700 mb-1">Estado (UF)</label>
          <select
            id="state"
            value={localFilters.state}
            onChange={handleStateChange}
            className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={disabled} // State filter is always enabled, its options change
          >
            {stateOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

         {/* Região */}
        <div>
          <label htmlFor="region" className="block text-sm font-medium text-slate-700 mb-1">Região</label>
          <select
            id="region"
            value={localFilters.region || 'all'}
            onChange={handleRegionChange}
            className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={disabled} // Region filter is always enabled
          >
            {regionOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>


        {/* Operador */}
        <div>
          <label htmlFor="operator" className="block text-sm font-medium text-slate-700 mb-1">Operador</label>
          <select
            id="operator"
            value={selectedOperatorId}
            onChange={handleLocalOperatorChange}
            className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={disabled || operatorOptions.length <= 1}
          >
            {operatorOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

         {/* Input de Meta */}
        <div>
           <label htmlFor="goalValue" className="block text-sm font-medium text-slate-700 mb-1">Meta (Chamadas Sucesso)</label>
           <input
               id="goalValue"
               type="text"
               value={goalValue}
               onChange={onGoalInputChange}
               placeholder="Ex: 100 ou 50.5"
               className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
               disabled={disabled}
           />
        </div>


      </div>
    </div>
  );
}

export default React.memo(Filters);