import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'; // Added useMemo
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import dataUtils from '../../utils/dataUtils'; // Adjusted import path


const stateRegions = {
    'AC': 'Norte', 'AM': 'Norte', 'AP': 'Norte', 'PA': 'Norte', 'RO': 'Norte', 'RR': 'Norte', 'TO': 'Norte',
    'AL': 'Nordeste', 'BA': 'Nordeste', 'CE': 'Nordeste', 'MA': 'Nordeste', 'PB': 'Paraíba', 'PE': 'Pernambuco', 'PI': 'Piauí', 'RN': 'Rio Grande do Norte', 'SE': 'Sergipe', // Added full names as found in geojson if different
    'GO': 'Centro-Oeste', 'MT': 'Centro-Oeste', 'MS': 'Centro-Oeste', 'DF': 'Centro-Oeste',
    'ES': 'Sudeste', 'MG': 'Sudeste', 'RJ': 'Sudeste', 'SP': 'Sudeste',
    'PR': 'Sul', 'SC': 'Sul', 'RS': 'Sul'
};


function BrazilMap({
  data, // stateMetrics (objeto com dados por UF, ex: { 'SP': { totalLigações: 100, ... }, ... })
  displayMode = 'navigation',
  selectedMetric = 'totalLigações', // Default to totalLigações
  metricOptions, // Array of { value, label } for metrics
  selectedMapRegion = 'all',
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

  // --- LOGS DE DEBUG ---
  console.warn("📍🗺️ [BrazilMap] Render. Data received:", data);
  console.warn("📍🗺️ [BrazilMap] Render. Selected Metric:", selectedMetric);
  console.warn("📍🗺️ [BrazilMap] Render. Selected Region for highlight:", selectedMapRegion);
  console.warn("📍🗺️ [BrazilMap] Render. GeoJSON state:", { loadingGeoJson, geoJsonLoaded: !!geoJsonData, errorGeoJson });
  // --- END LOGS DE DEBUG ---


  useEffect(() => {
    console.log("📍🗺️ [BrazilMap Effect] Fetching GeoJSON...");
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
             // Map the GeoJSON sigla to the region name for filtering
             feature.properties.region = stateRegions[feature.properties.sigla] || 'Desconhecida';
          }
        });
        setGeoJsonData(json);
        console.log("📍🗺️ [BrazilMap Effect] GeoJSON fetched successfully.", json);
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
        console.log("📍🗺️ [BrazilMap Effect] GeoJSON loading finished.");
      }
    }
    fetchGeoJson();
  }, []); // Empty dependency array means this effect runs only once on mount


  useEffect(() => {
    const stateMetrics = data || {}; // Should be an object keyed by UF, e.g., { 'SP': { ... } }
    console.log("📍🗺️ [BrazilMap Effect] Data/Metric/Region Changed. Data:", stateMetrics);
    console.log("📍🗺️ [BrazilMap Effect] Selected Metric:", selectedMetric);
    console.log("📍🗺️ [BrazilMap Effect] Selected Region:", selectedMapRegion);


    const svg = d3.select(mapRef.current);
    const legendSvg = d3.select(legendRef.current);
    svg.selectAll('*').remove();
    legendSvg.selectAll('*').remove();

    if (loadingGeoJson || !geoJsonData || errorGeoJson) {
       console.log("📍🗺️ [BrazilMap Effect] Exiting render effect early. GeoJSON not ready or error.");
      return;
    }
    console.log("📍🗺️ [BrazilMap Effect] Proceeding with D3 render...");


    try {
      // Accessor function to get the correct metric value from state data
      const metricAccessor = (d) => d?.[selectedMetric]; // Access data using selectedMetric string

      // Calculate metric domain based on the values for the selected metric in the provided data
      const metricValues = Object.keys(stateMetrics)
        .map((stateKey) => metricAccessor(stateMetrics[stateKey]))
        .filter((value) => typeof value === 'number' && !isNaN(value));

      let minMetricValue =
        metricValues.length > 0 ? d3.min(metricValues) : 0; // Use d3.min
      let maxMetricValue =
        metricValues.length > 0 ? d3.max(metricValues) : 1; // Use d3.max

      // Adjust domain for single value or zero values
      if (minMetricValue === maxMetricValue) {
        if (maxMetricValue !== 0) {
          minMetricValue = maxMetricValue * 0.9; // Small range around the value
          maxMetricValue = maxMetricValue * 1.1;
        } else { // All values are zero
           minMetricValue = 0;
           maxMetricValue = 1; // Default to 0-1 range
        }
      }
       // Ensure max is greater than min even if values were all the same non-zero number
       if (minMetricValue === maxMetricValue) {
           maxMetricValue = minMetricValue + (minMetricValue === 0 ? 1 : Math.abs(minMetricValue) * 0.1); // Add a small offset if min/max are the same
       }


      console.log(`📍🗺️ [BrazilMap Effect] Metric for coloring: "${selectedMetric}", Calculated Domain: [${minMetricValue}, ${maxMetricValue}]`);


      // Determine color scale based on the selected metric
      const colorInterpolator = selectedMetric === 'taxaSucesso' ? d3.interpolateGreens :
                                selectedMetric === 'taxaAbandono' || selectedMetric === 'taxaNaoEfetivo' ? d3.interpolateReds :
                                d3.interpolateBlues; // Default for counts like totalLigações

      // Determine if higher values mean 'better' result for color scale direction
      const higherIsBetter = selectedMetric === 'taxaSucesso' || selectedMetric === 'totalLigações';

      // Configure the color scale domain
      const colorScale = d3
        .scaleSequential(colorInterpolator)
        .domain(higherIsBetter ? [minMetricValue, maxMetricValue] : [maxMetricValue, minMetricValue]); // Invert domain for 'lower is better' metrics


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
        const stateName = feature.properties.name; // Full name from GeoJSON
        const centroid = feature.properties.centroid
          ? projection(feature.properties.centroid)
          : null;
        const geojsonRegion = feature.properties.region; // Region from GeoJSON properties

        if (!stateAbbr) {
             console.warn(`📍🗺️ [BrazilMap Effect] Skipping feature with no state abbreviation:`, feature);
            return;
        }

        const stateInfo = stateMetrics[stateAbbr]; // Get the metric data for this state using its abbreviation
        const metricValue = stateInfo ? metricAccessor(stateInfo) : undefined; // Get the value for the selected metric

        const isHighlighted = selectedMapRegion === 'all' || (geojsonRegion && selectedMapRegion === geojsonRegion); // Highlight based on GeoJSON region


        let fillColor = '#E5E7EB'; // Default neutral color
        let strokeColor = '#FFFFFF';
        let strokeWidth = 0.5;
        let fillOpacity = 1;

        // Color the state based on the metric value for the selected metric
        if (stateInfo && metricValue !== undefined && metricValue !== null && typeof metricValue === 'number' && !isNaN(metricValue)) {
            try {
                fillColor = colorScale(metricValue);
                if (!fillColor || String(fillColor).includes('NaN')) {
                  fillColor = '#E5E7EB'; // Fallback if color scale returns invalid color
                }
                 console.log(`📍🗺️ [BrazilMap Effect] State: ${stateAbbr}, Metric "${selectedMetric}" Value: ${metricValue}, Fill Color: ${fillColor}`);
            } catch (scaleError) {
                console.warn(
                  `📍🗺️ [BrazilMap Effect] Color scale error for ${stateAbbr} (Metric "${selectedMetric}" Value: ${metricValue}):`,
                  scaleError
                );
                fillColor = '#E5E7EB'; // Fallback on scale error
            }
        } else {
            fillColor = '#CBD5E1'; // Color for states with no data or invalid metric value
             console.log(`📍🗺️ [BrazilMap Effect] State: ${stateAbbr}, No "${selectedMetric}" data or value invalid (${metricValue}), Fill Color: ${fillColor}`);
        }

        if (isHighlighted && displayMode === 'navigation') {
           strokeColor = '#0f172a'; // Darker stroke when highlighted
           strokeWidth = 1.5;
           fillOpacity = 1;
        } else if (selectedMapRegion !== 'all' && displayMode === 'navigation') {
           fillOpacity = 0.6; // Dim non-highlighted states
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
           .order() // Ensure states are rendered before labels

          .on(
            'mouseover',
            (displayMode === 'navigation' && isHighlighted)
              ? (event) => {
                     d3.select(event.currentTarget)
                       .attr('stroke-width', 2.5)
                       .attr('stroke', '#000');

                  // Tooltip content - show multiple metrics if available
                  let tooltipContent = stateInfo
                    ? `${stateName} (${stateAbbr})<br/>Total Ligações: ${stateInfo.totalLigações !== undefined && stateInfo.totalLigações !== null ? stateInfo.totalLigações.toLocaleString('pt-BR') : 'N/A'}<br/>Taxa Sucesso: ${stateInfo.taxaSucesso !== undefined && stateInfo.taxaSucesso !== null ? dataUtils.formatPercentage(stateInfo.taxaSucesso) : 'N/A'}`
                    // Add other relevant metrics to the tooltip as needed
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
                   // Restore original stroke based on highlight state
                   const originalStrokeWidth = (selectedMapRegion !== 'all' && displayMode === 'navigation' && selectedMapRegion === geojsonRegion) ? 1.5 : 0.5;
                   const originalStrokeColor = (selectedMapRegion !== 'all' && displayMode === 'navigation' && selectedMapRegion === geojsonRegion) ? '#0f172a' : '#FFFFFF';


                   d3.select(event.currentTarget)
                     .attr('stroke-width', originalStrokeWidth)
                     .attr('stroke', originalStrokeColor);
                }
              : null
          );


        // State Labels
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
            .attr('fill', '#1e293b') // Dark text color
            .style('pointer-events', 'none') // Text should not interfere with mouse events on paths
            .style('text-shadow', '0px 0px 2px rgba(255,255,255,0.7)') // Add white text shadow for visibility
            .raise(); // Bring text to front
        }
      });

      // --- Legend ---
      const legendHeight = 12;
      const legendWidth = 180;
      const legendGroup = legendSvg
        .append('g')
        .attr('transform', `translate(10, 8)`); // Position legend

      const defs = legendSvg.append('defs'); // Define gradient
      const safeMetricName = selectedMetric ? selectedMetric.replace(/[^a-zA-Z0-9]/g, '_') : 'metric';
      const linearGradientId = `map-gradient-${safeMetricName}-${Date.now()}`;
      const linearGradient = defs
        .append('linearGradient')
        .attr('id', linearGradientId)
        .attr('x1', '0%') // Horizontal gradient
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '0%');

      // Create gradient stops based on the color scale and direction
      const colorScaleForGradient = d3.scaleSequential(colorInterpolator)
          .domain(higherIsBetter ? [0, 1] : [1, 0]); // Scale from 0 to 1 for gradient stops, inverted if lowerIsBetter


      const gradientStops = d3.range(0, 1.01, 0.05).map(t => ({ // More stops for smoother gradient
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
        .attr('rx', 2) // Rounded corners for legend bar
        .attr('ry', 2);


      // Legend Labels (Min and Max values)
      const formatLegendValue = (value) => {
        if (typeof value !== 'number' || isNaN(value)) return '-';
        // Format percentage metrics
        if (selectedMetric === 'taxaSucesso' || selectedMetric === 'taxaAbandono' || selectedMetric === 'taxaNaoEfetivo') {
             return dataUtils.formatPercentage(value);
        }
         // Format count metrics
        if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
        if (value >= 1000) return (value / 1000).toFixed(0) + 'k';
        return Math.round(value).toLocaleString('pt-BR'); // Format counts
      };

       // Use the calculated min/max metric values for labels, formatted
      const legendMinLabel = formatLegendValue(minMetricValue);
      const legendMaxLabel = formatLegendValue(maxMetricValue);


      const valueLabelY = legendHeight + 10;
      legendGroup
        .append('text')
        .attr('x', 0)
        .attr('y', valueLabelY)
        .attr('font-size', '10px')
        .attr('fill', '#475569') // Text color
        .text(formatLegendValue(higherIsBetter ? minMetricValue : maxMetricValue)); // Label for the start of the gradient
      legendGroup
        .append('text')
        .attr('x', legendWidth)
        .attr('y', valueLabelY)
        .attr('font-size', '10px')
        .attr('fill', '#475569') // Text color
        .attr('text-anchor', 'end') // Align text to the end
        .text(formatLegendValue(higherIsBetter ? maxMetricValue : minMetricValue)); // Label for the end of the gradient

       // Legend Title (based on selected metric label)
        const legendTitleText = metricOptions?.find(opt => opt.value === selectedMetric)?.label || 'Métrica';


      legendGroup
        .append('text')
        .attr('x', legendWidth / 2)
        .attr('y', -3) // Position title above the gradient bar
        .attr('font-size', '11px')
        .attr('font-weight', '500')
        .attr('fill', '#1e293b') // Title color
        .attr('text-anchor', 'middle')
        .text(legendTitleText);

    } catch (error) {
      console.error('📍🗺️ [BrazilMap Effect] Erro ao renderizar D3:', error);
      setErrorGeoJson('Erro ao desenhar o mapa.');
    }
  }, [
    data, // Dependency on data changes
    geoJsonData, // Dependency on GeoJSON data loading
    loadingGeoJson, // Dependency on GeoJSON loading state
    errorGeoJson, // Dependency on GeoJSON error state
    displayMode, // Dependency on display mode for pointer events/highlighting
    selectedMetric, // Dependency on selected metric for coloring
    selectedMapRegion, // Dependency on selected region for highlighting
    metricOptions // Dependency on metric options for legend title/formatting lookup
  ]); // Added all necessary dependencies


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

       {/* Render map only if GeoJSON is loaded and no errors */}
      {!loadingGeoJson && !errorGeoJson && geoJsonData && (
        <>
          {/* Container for the map SVG */}
          <div className="flex-grow relative w-full max-w-[600px]">
             {/* Add condition to show placeholder if data is empty */}
             {Object.keys(data || {}).length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                     Sem dados geográficos para o período/filters selecionados.
                   </div>
             ) : (
                <svg ref={mapRef} className="w-full h-auto"></svg>
             )}
          </div>
          {/* Container for the legend SVG - Show legend only if data is not empty */}
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