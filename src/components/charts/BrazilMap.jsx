import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import * as d3 from 'd3';
import dataUtils from '../../utils/dataUtils';

function BrazilMap({
  data,
  displayMode = 'navigation',
  selectedMetric = 'totalLigações',
  metricOptions,
  selectedMapRegion = 'all',
  ufRegionsData
}) {
  const mapRef = useRef(null);
  const tooltipRef = useRef(null);
  const legendRef = useRef(null);
  const [tooltip, setTooltip] = useState({
    show: false,
    content: '',
    x: 0,
    y: 0,
  });
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [loadingGeoJson, setLoadingGeoJson] = useState(true);
  const [errorGeoJson, setErrorGeoJson] = useState(null);

  const ufToRegionMap = useMemo(() => {
      if (!ufRegionsData || ufRegionsData.length === 0) return {};
      return ufRegionsData.reduce((acc, item) => {
          acc[item.uf] = item.region_name;
          return acc;
      }, {});
  }, [ufRegionsData]);


  useEffect(() => {
    const geoJsonUrl =
      'https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson';
    async function fetchGeoJson() {
      setLoadingGeoJson(true);
      setErrorGeoJson(null);
      setGeoJsonData(null);
      try {
        const response = await fetch(geoJsonUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const json = await response.json();
        if (!json || !json.features) {
          throw new Error("GeoJSON inválido ou não contém 'features'.");
        }
        json.features.forEach((feature) => {
          if (feature.properties && feature.properties.sigla) {
            feature.properties.centroid = d3.geoCentroid(feature);
          }
        });
        setGeoJsonData(json);
      } catch (error) {
        console.error(
          '📍🗺️ [BrazilMap Effect] Falha ao buscar ou processar GeoJSON:',
          error
        );
        setErrorGeoJson(
          error.message || 'Erro desconhecido ao buscar GeoJSON.'
        );
      } finally {
        setLoadingGeoJson(false);
      }
    }
    fetchGeoJson();
  }, []);


  useEffect(() => {
    const stateMetrics = data || {};
    const svg = d3.select(mapRef.current);
    const legendSvg = d3.select(legendRef.current);
    svg.selectAll('*').remove();
    legendSvg.selectAll('*').remove();

    if (loadingGeoJson || !geoJsonData || errorGeoJson || !ufToRegionMap) {
      return;
    }

    try {
      const metricAccessor = (d) => d?.[selectedMetric];
      const metricValues = Object.keys(stateMetrics)
        .map((stateKey) => metricAccessor(stateMetrics[stateKey]))
        .filter((value) => typeof value === 'number' && !isNaN(value));
      let minMetricValue =
        metricValues.length > 0 ? d3.min(metricValues) : 0;
      let maxMetricValue =
        metricValues.length > 0 ? d3.max(metricValues) : 1;
      if (minMetricValue === maxMetricValue) {
        if (maxMetricValue !== 0) {
          minMetricValue = maxMetricValue * 0.9;
          maxMetricValue = maxMetricValue * 1.1;
        } else {
           minMetricValue = 0;
           maxMetricValue = 1;
        }
      }
       if (minMetricValue === maxMetricValue) {
           maxMetricValue = minMetricValue + (minMetricValue === 0 ? 1 : Math.abs(minMetricValue) * 0.1);
       }
      const colorInterpolator = selectedMetric === 'taxaSucesso' ? d3.interpolateGreens :
                                selectedMetric === 'taxaAbandono' || selectedMetric === 'taxaNaoEfetivo' ? d3.interpolateReds :
                                d3.interpolateBlues;
      const higherIsBetter = selectedMetric === 'taxaSucesso' || selectedMetric === 'totalLigações';
      const colorScale = d3
        .scaleSequential(colorInterpolator)
        .domain(higherIsBetter ? [minMetricValue, maxMetricValue] : [maxMetricValue, minMetricValue]);
      const width = 960,
        height = 600;
      const projection = d3
        .geoMercator()
        .center([-52, -14])
        .scale(850)
        .translate([width / 2, height / 2]);
      const path = d3.geoPath().projection(projection);
      svg
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .style('max-height', displayMode === 'navigation' ? '500px' : 'auto');
      const mapGroup = svg.append('g');
      const textGroup = svg.append('g').attr('class', 'state-labels');
      geoJsonData.features.forEach((feature) => {
        const stateAbbr = feature.properties.sigla;
        const stateName = feature.properties.name;
        const centroid = feature.properties.centroid
          ? projection(feature.properties.centroid)
          : null;
        const featureRegion = ufToRegionMap[stateAbbr] || 'Desconhecida';

        if (!stateAbbr) {
            return;
        }
        const stateInfo = stateMetrics[stateAbbr];
        const metricValue = stateInfo ? metricAccessor(stateInfo) : undefined;
        const isHighlighted = selectedMapRegion === 'all' || (featureRegion && selectedMapRegion === featureRegion);
        let fillColor = '#E5E7EB';
        let strokeColor = '#FFFFFF';
        let strokeWidth = 0.5;
        let fillOpacity = 1;
        if (stateInfo && metricValue !== undefined && metricValue !== null && typeof metricValue === 'number' && !isNaN(metricValue)) {
            try {
                fillColor = colorScale(metricValue);
                if (!fillColor || String(fillColor).includes('NaN')) {
                  fillColor = '#E5E7EB';
                }
            } catch (scaleError) {
                console.warn(
                  `📍🗺️ [BrazilMap Effect] Color scale error for ${stateAbbr} (Metric "${selectedMetric}" Value: ${metricValue}):`,
                  scaleError
                );
                fillColor = '#E5E7EB';
            }
        } else {
            fillColor = '#CBD5E1';
        }
        if (isHighlighted && displayMode === 'navigation') {
           strokeColor = '#0f172a';
           strokeWidth = 1.5;
           fillOpacity = 1;
        } else if (selectedMapRegion !== 'all' && displayMode === 'navigation') {
           fillOpacity = 0.6;
           strokeColor = '#FFFFFF';
           strokeWidth = 0.5;
        }
        mapGroup
          .append('path')
          .datum(feature)
          .attr('d', path)
          .attr('fill', fillColor)
          .attr('stroke', strokeColor)
          .attr('stroke-width', strokeWidth)
          .attr('stroke-linejoin', 'round')
          .attr('fill-opacity', fillOpacity)
          .style(
            'pointer-events',
            (displayMode === 'navigation' && isHighlighted) ? 'all' : 'none'
          )
          .style('cursor', (displayMode === 'navigation' && isHighlighted) ? 'pointer' : 'default')
          .style(
            'transition',
            'fill 0.2s, stroke 0.2s, stroke-width 0.2s, fill-opacity 0.2s'
          )
           .order()
          .on(
            'mouseover',
            (displayMode === 'navigation' && isHighlighted)
              ? (event) => {
                     d3.select(event.currentTarget)
                       .attr('stroke-width', 2.5)
                       .attr('stroke', '#000');
                  let tooltipContent = stateInfo
                    ? `${stateName} (${stateAbbr})<br/>Total Ligações: ${stateInfo.totalLigações !== undefined && stateInfo.totalLigações !== null ? stateInfo.totalLigações.toLocaleString('pt-BR') : 'N/A'}<br/>Taxa Sucesso: ${stateInfo.taxaSucesso !== undefined && stateInfo.taxaSucesso !== null ? dataUtils.formatPercentage(stateInfo.taxaSucesso) : 'N/A'}`
                    : `${stateName} (${stateAbbr}): Sem dados`;
                  setTooltip({
                    show: true,
                    content: tooltipContent,
                    x: event.pageX,
                    y: event.pageY,
                  });
                }
              : null
          )
          .on(
            'mouseout',
            (displayMode === 'navigation' && isHighlighted)
              ? (event) => {
                  setTooltip({ show: false, content: '', x: 0, y: 0 });
                   const originalStrokeWidth = (selectedMapRegion !== 'all' && displayMode === 'navigation' && selectedMapRegion === featureRegion) ? 1.5 : 0.5;
                   const originalStrokeColor = (selectedMapRegion !== 'all' && displayMode === 'navigation' && selectedMapRegion === featureRegion) ? '#0f172a' : '#FFFFFF';
                   d3.select(event.currentTarget)
                     .attr('stroke-width', originalStrokeWidth)
                     .attr('stroke', originalStrokeColor);
                }
              : null
          );
        if (centroid) {
          textGroup
            .append('text')
            .attr('x', centroid[0])
            .attr('y', centroid[1])
            .text(stateAbbr)
            .attr('text-anchor', 'middle')
            .attr('alignment-baseline', 'middle')
            .attr('font-size', '8px')
            .attr('font-weight', '500')
            .attr('fill', '#1e293b')
            .style('pointer-events', 'none')
            .style('text-shadow', '0px 0px 2px rgba(255,255,255,0.7)')
            .raise();
        }
      });
      const legendHeight = 12;
      const legendWidth = 180;
      const legendGroup = legendSvg
        .append('g')
        .attr('transform', `translate(10, 8)`);
      const defs = legendSvg.append('defs');
      const safeMetricName = selectedMetric ? selectedMetric.replace(/[^a-zA-Z0-9]/g, '_') : 'metric';
      const linearGradientId = `map-gradient-${safeMetricName}-${Date.now()}`;
      const linearGradient = defs
        .append('linearGradient')
        .attr('id', linearGradientId)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '0%');
      const colorScaleForGradient = d3.scaleSequential(colorInterpolator)
          .domain(higherIsBetter ? [0, 1] : [1, 0]);
      const gradientStops = d3.range(0, 1.01, 0.05).map(t => ({
           offset: `${t * 100}%`,
           color: colorScaleForGradient(t)
      }));
      linearGradient
        .selectAll('stop')
        .data(gradientStops)
        .enter()
        .append('stop')
        .attr('offset', (d) => d.offset)
        .attr('stop-color', (d) => d.color);
      legendGroup
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .style('fill', `url(#${linearGradientId})`)
        .attr('rx', 2)
        .attr('ry', 2);
      const formatLegendValue = (value) => {
        if (typeof value !== 'number' || isNaN(value)) return '-';
        if (selectedMetric === 'taxaSucesso' || selectedMetric === 'taxaAbandono' || selectedMetric === 'taxaNaoEfetivo') {
             return dataUtils.formatPercentage(value);
        }
        if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
        if (value >= 1000) return (value / 1000).toFixed(0) + 'k';
        return Math.round(value).toLocaleString('pt-BR');
      };
      const legendMinLabel = formatLegendValue(minMetricValue);
      const legendMaxLabel = formatLegendValue(maxMetricValue);
      const valueLabelY = legendHeight + 10;
      legendGroup
        .append('text')
        .attr('x', 0)
        .attr('y', valueLabelY)
        .attr('font-size', '10px')
        .attr('fill', '#475569')
        .text(formatLegendValue(higherIsBetter ? minMetricValue : maxMetricValue));
      legendGroup
        .append('text')
        .attr('x', legendWidth)
        .attr('y', valueLabelY)
        .attr('font-size', '10px')
        .attr('fill', '#475569')
        .attr('text-anchor', 'end')
        .text(formatLegendValue(higherIsBetter ? maxMetricValue : minMetricValue));
        const legendTitleText = metricOptions?.find(opt => opt.value === selectedMetric)?.label || 'Métrica';
      legendGroup
        .append('text')
        .attr('x', legendWidth / 2)
        .attr('y', -3)
        .attr('font-size', '11px')
        .attr('font-weight', '500')
        .attr('fill', '#1e293b')
        .attr('text-anchor', 'middle')
        .text(legendTitleText);
    } catch (error) {
      console.error('📍🗺️ [BrazilMap Effect] Erro ao renderizar D3:', error);
      setErrorGeoJson('Erro ao desenhar o mapa.');
    }
  }, [
    data,
    geoJsonData,
    loadingGeoJson,
    errorGeoJson,
    displayMode,
    selectedMetric,
    selectedMapRegion,
    metricOptions,
    ufToRegionMap
  ]);

   const handleMouseMove = useCallback((event) => {
        if (tooltip.show && tooltipRef.current) {
             setTooltip(prev => ({ ...prev, x: event.pageX, y: event.pageY }));
        }
    }, [tooltip.show]);

  return (
    <div
      data-name="brazil-map-container"
      className="w-full h-full flex flex-col items-center"
       onMouseMove={displayMode === 'navigation' ? handleMouseMove : null}
       onMouseOut={displayMode === 'navigation' ? () => setTooltip({ show: false, content: '', x: 0, y: 0 }) : null}
    >
      {loadingGeoJson && (
        <div className="flex-grow flex items-center justify-center text-slate-500 text-sm p-4">
          <i className="fas fa-spinner fa-spin mr-2"></i> Carregando mapa...
        </div>
      )}
      {errorGeoJson && !loadingGeoJson && (
        <div className="flex-grow flex flex-col items-center justify-center text-red-600 bg-red-50 border border-red-200 rounded-md p-4 text-center text-sm w-full">
          <i className="fas fa-exclamation-triangle mb-2 text-lg"></i>
          <strong>Falha ao carregar o mapa:</strong>
          <span className="block mt-1">{errorGeoJson}</span>
        </div>
      )}
      {!loadingGeoJson && !errorGeoJson && geoJsonData && (
        <>
          <div className="flex-grow relative w-full max-w-[600px]">
             {Object.keys(data || {}).length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                     Sem dados geográficos para o período/filters selecionados.
                   </div>
             ) : (
                <svg ref={mapRef} className="w-full h-auto"></svg>
             )}
          </div>
          {Object.keys(data || {}).length > 0 && (
              <div className="flex-shrink-0 mt-4 self-center">
                <svg ref={legendRef} width="200" height="35"></svg>
              </div>
          )}
        </>
      )}
       {displayMode === 'navigation' && tooltip.show && (
        <div
          ref={tooltipRef}
          className="fixed bg-slate-800 text-white px-2.5 py-1.5 rounded-md text-xs shadow-lg pointer-events-none z-50 transition-opacity duration-150"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(15px, -25px)',
            visibility: tooltip.show ? 'visible' : 'hidden',
          }}
          dangerouslySetInnerHTML={{ __html: tooltip.content }}
        />
      )}
    </div>
  );
}
export default BrazilMap;