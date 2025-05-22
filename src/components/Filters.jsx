import React, { useState, useEffect, useMemo, useCallback } from 'react';

function Filters({
  filters,
  onFilterChange,
  operators,
  selectedOperatorId,
  onOperatorChange,
  states,
  regions,
  ufRegionsData,
  disabled,
  goalValue,
  onGoalInputChange,
}) {
  const [localFilters, setLocalFilters] = useState(filters);
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    setLocalFilters(filters);
    if (filters.dateRange === 'custom') {
        setCustomDateRange({
            start: filters.customStartDate || '',
            end: filters.customEndDate || ''
        });
    } else {
        setCustomDateRange({ start: '', end: '' });
    }
  }, [filters]);

  const handleDateRangeChange = useCallback((e) => {
    const newDateRange = e.target.value;
    const updatedFilters = { ...filters, dateRange: newDateRange };
    if (newDateRange !== 'custom') {
        delete updatedFilters.customStartDate;
        delete updatedFilters.customEndDate;
        onFilterChange(updatedFilters);
    }
    setLocalFilters(updatedFilters);

  }, [filters, onFilterChange]);


  const handleCustomDateInputChange = useCallback((type, value) => {
    setCustomDateRange(prev => ({ ...prev, [type]: value }));
  }, []);

  const handleConfirmCustomDate = useCallback(() => {
      if (localFilters.dateRange === 'custom' && customDateRange.start && customDateRange.end) {
           const isValidStartDate = /^\d{4}-\d{2}-\d{2}$/.test(customDateRange.start);
           const isValidEndDate = /^\d{4}-\d{2}-\d{2}$/.test(customDateRange.end);

           if (isValidStartDate && isValidEndDate) {
              const updatedFilters = {
                  ...filters,
                  dateRange: 'custom',
                  customStartDate: customDateRange.start,
                  customEndDate: customDateRange.end
              };
              onFilterChange(updatedFilters);
           } else {
               console.error("Datas personalizadas inválidas.");
           }
      }
  }, [filters, localFilters.dateRange, customDateRange, onFilterChange]);


  const handleStateChange = useCallback((e) => {
    const newState = e.target.value;
    const updatedFilters = { ...localFilters, state: newState, region: 'all' };
    setLocalFilters(updatedFilters);
    onFilterChange(updatedFilters);
  }, [localFilters, onFilterChange]);

  const handleRegionChange = useCallback((e) => {
    const newRegion = e.target.value;
    const updatedFilters = { ...localFilters, region: newRegion, state: 'all' };
    setLocalFilters(updatedFilters);
    onFilterChange(updatedFilters);
  }, [localFilters, onFilterChange]);

  const handleLocalOperatorChange = useCallback((e) => {
    const newOperatorId = e.target.value;
    onOperatorChange(newOperatorId);
  }, [onOperatorChange]);

  const operatorOptions = useMemo(() => {
    const options = operators ? operators.map(op => ({
      value: op.id.toString(),
      label: op.operator_name
    })) : [];
    if (!options.some(opt => opt.value === 'all')) {
      options.unshift({ value: 'all', label: 'Todos Operadores' });
    }
    return options;
  }, [operators]);

  const stateOptions = useMemo(() => {
    let filteredStates = states || [];
    if (localFilters.region && localFilters.region !== 'all' && ufRegionsData && ufRegionsData.length > 0) {
        const ufsInRegion = ufRegionsData
            .filter(item => item.region_name === localFilters.region)
            .map(item => item.uf);
        filteredStates = (states || []).filter(uf => ufsInRegion.includes(uf));
    }
    const options = filteredStates.map(state => ({ value: state, label: state }));
    options.unshift({ value: 'all', label: 'Todos Estados' });
    return options;
  }, [states, localFilters.region, ufRegionsData]);

  const regionOptions = useMemo(() => {
    const options = regions ? regions.map(region => ({ value: region, label: region })) : [];
    options.unshift({ value: 'all', label: 'Todas Regiões' });
    return options;
  }, [regions]);

  const showCustomDateInputs = localFilters.dateRange === 'custom';

  return (
    <div className="bg-white p-4 rounded-lg shadow-md border border-slate-200 mb-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-3">Filtros e Configurações</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
        <div className="space-y-2">
          <label htmlFor="dateRange" className="block text-sm font-medium text-slate-700">Período</label>
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
            <option value="custom">Período Personalizado</option>
          </select>
          {showCustomDateInputs && (
            <div className="space-y-2 mt-2">
              <input
                type="date"
                value={customDateRange.start}
                onChange={(e) => handleCustomDateInputChange('start', e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={disabled}
              />
              <input
                type="date"
                value={customDateRange.end}
                onChange={(e) => handleCustomDateInputChange('end', e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={disabled}
              />
              <button
                  onClick={handleConfirmCustomDate}
                  disabled={disabled || !customDateRange.start || !customDateRange.end}
                  className="w-full bg-blue-600 text-white py-1.5 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center text-xs"
              >
                  Confirmar Período
              </button>
            </div>
          )}
        </div>
        <div>
          <label htmlFor="state" className="block text-sm font-medium text-slate-700 mb-1">Estado (UF)</label>
          <select
            id="state"
            value={localFilters.state}
            onChange={handleStateChange}
            className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={disabled || states.length === 0 && localFilters.state !== 'all'}
          >
            {stateOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="region" className="block text-sm font-medium text-slate-700 mb-1">Região</label>
          <select
            id="region"
            value={localFilters.region || 'all'}
            onChange={handleRegionChange}
            className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={disabled || regions.length <= 1}
          >
            {regionOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
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